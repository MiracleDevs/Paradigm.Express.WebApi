import express, { Request, Response, Application, Router } from 'express';
import { HttpContext } from './shared/http-context';
import { HttpMethod } from './shared/http-method';
import { IFilter } from './filters/filter.interface';
import { ILogger } from './logging/logger.interface';
import { Logger } from './logging/logger';
import { ControllerTypeCollection } from './decorators/controller-type-collection';
import { ControllerType } from './decorators/controller-type';
import { ActionType } from './decorators/action-type';
import { ApiController } from './controllers/api-controller';
import { ActionTypeCollection } from './decorators/action-type-collection';
import { RouteParameterType } from './decorators/action-url';
import { ActionMethod } from './shared/action-method';
import { DependencyContainer, ObjectType, DependencyCollection } from '@miracledevs/paradigm-web-di';
import { getObjectTypeName } from '@miracledevs/paradigm-web-di/object-type';
import { RoutingContext } from './shared/routing-context';

export class ApiRouter
{
    public static readonly ThreadScope = 'thread';

    private _logger: ILogger;

    private _injector: DependencyContainer;

    private _routers: Map<string, Router>;

    private _globalFilters: ObjectType<IFilter>[];

    private _ignoreClosedResponseOnFilters: boolean;

    constructor(logger?: Logger, injector?: DependencyContainer)
    {
        this._logger = logger ?? new Logger();
        this._injector = injector ?? DependencyCollection.globalCollection.buildContainer();
        this._globalFilters = [];
        this._routers = new Map<string, Router>();
        this._ignoreClosedResponseOnFilters = false;
    }

    public ignoreClosedResponseOnFilters(): void
    {
        this._ignoreClosedResponseOnFilters = true;
    }

    public registerGlobalFilter(filter: ObjectType<IFilter>): void
    {
        this._globalFilters.push(filter);
    }

    public registerGlobalFilters(filters: ObjectType<IFilter>[]): void
    {
        for (const filter of filters)
        {
            this._globalFilters.push(filter);
        }
    }

    public registerRoutes(application: Application): void
    {
        for (const controllerType of ControllerTypeCollection.globalInstance.getControllers())
        {
            for (const actionType of ActionTypeCollection.globalInstance.getForController(controllerType.type.name))
            {
                const routingContext = new RoutingContext(controllerType, actionType);
                const route = this.mergeRoute(routingContext);
                const router = this.getRouter(controllerType, application);
                const method = this.getMethod(actionType, router);

                method.call(application, route, async (request: Request, response: Response) =>
                {
                    const httpContext = new HttpContext(request, response);
                    await this.callAction(httpContext, routingContext);
                });

                this._logger.debug(`Mapping route ${HttpMethod[actionType.descriptor.method]} ${route} to '${routingContext}'.`);
            }
        }
    }

    private getRouter(controllerType: ControllerType, application: Application): Router
    {
        let controllerRoute = controllerType.descriptor.route || "";

        if (controllerRoute.endsWith("/"))
            controllerRoute = controllerRoute.substr(0, controllerRoute.length - 1);

        if (!this._routers.has(controllerRoute))
        {
            const router = express.Router();
            this._routers.set(controllerRoute, router);
            application.use(controllerRoute, router);
            return router;
        }

        return this._routers.get(controllerRoute);
    }

    private async callAction(httpContext: HttpContext, routingContext: RoutingContext): Promise<void>
    {
        // create a new scoped injector
        const injector = this._injector.createScopedInjector(ApiRouter.ThreadScope);

        // join all the filters.
        const filters = this._globalFilters.concat(
            routingContext.controllerType.descriptor.filters ?? [],
            routingContext.actionType.descriptor.filters ?? []);

        // resolve the filter instances
        const filterInstances = filters.map(x => injector.resolve(x) as IFilter);

        try
        {
            this._logger.debug(`Request received '${httpContext.request.url}'`);

            // check if the response is still alive.
            this.checkResponse(httpContext, routingContext);

            // try to instantiate the controller.
            const controllerInstance = this.createControllerInstance(routingContext, injector);

            // try to retrieve the method.
            const actionMethod = this.getActionMethod(routingContext, controllerInstance);

            // sets the http context on the controller.
            controllerInstance.setHttpContext(httpContext);

            // execute before filters.
            await this.executeFilters(filterInstances, httpContext, async (f: IFilter) => { if (f.beforeExecute) await f.beforeExecute(httpContext, routingContext); });

            // reverses the array to execute filters in the in-to-out order instead of out-to-in that we used for the before events.
            filterInstances.reverse();

            // execute the action itself.
            const result = await this.executeMethod(controllerInstance, actionMethod, routingContext, httpContext);

            // execute the after filters.
            await this.executeFilters(filterInstances, httpContext, async (f: IFilter) => { if (f.afterExecute) await f.afterExecute(httpContext, routingContext); });

            // finish the request if wasn't finished already
            this.finishRequest(httpContext, result);

            // log the resulting operation.
            this._logger.debug(`Action returned with code [${httpContext.response.statusCode}].`);
        }
        catch (error)
        {
            // log the exception.
            this._logger.error(error.message);

            // execute the after filters.
            await this.executeFilters(filterInstances, httpContext, async (f: IFilter) => { if (f.onError) await f.onError(httpContext, routingContext, error); });

            if (!httpContext.closed)
            {
                // close with error.
                httpContext.response.status(500).send(error.message);
            }
        }
    }

    private checkResponse(httpContext: HttpContext, routingContext: RoutingContext): void
    {
        if (httpContext.closed)
        {
            this._logger.debug(`The response is already closed, the action '${routingContext}' won't be called.`);
            return;
        }

        this._logger.debug(`The action '${routingContext}' will be executed.`);
    }

    private createControllerInstance(routingContext: RoutingContext, injector: DependencyContainer): ApiController
    {
        return injector.resolve(routingContext.controllerType.type) as ApiController;
    }

    private getActionMethod<T = any>(routingContext: RoutingContext, controllerInstance: ApiController): ActionMethod<T>
    {
        return routingContext.actionType.getExecutableMethod(controllerInstance);
    }

    private async executeMethod(controllerInstance: ApiController, actionMethod: ActionMethod<any>, routingContext: RoutingContext, httpContext: HttpContext): Promise<void>
    {
        const methodArgs: any[] = [];

        if (httpContext.closed)
            return;

        if (routingContext.actionType.descriptor.fromBody)
            methodArgs.push(httpContext.request.body);

        const parameters = this.getParametersArray(routingContext.actionType, httpContext.request);
        return await actionMethod.apply(controllerInstance, methodArgs.concat(parameters));
    }

    private finishRequest(httpContext: HttpContext, result: any): void
    {
        if (httpContext.closed)
            return;

        httpContext.response.status(200).send(result || {});
    }

    private mergeRoute(routingContext: RoutingContext): string
    {
        var controllerRoute = routingContext.controllerType.descriptor.route || "";
        var actionRoute = routingContext.actionType.descriptor.route || "";
        return `${controllerRoute}${!controllerRoute.endsWith("/") && !actionRoute.startsWith("/") ? "/" : ""}${actionRoute}`;
    }

    private getMethod(actionType: ActionType, router: Router): Function
    {
        switch (actionType.descriptor.method)
        {
            case HttpMethod.GET:
                return router.get;

            case HttpMethod.POST:
                return router.post;

            case HttpMethod.PUT:
                return router.put;

            case HttpMethod.DELETE:
                return router.delete;
        }
    }

    private async executeFilters(filterInstances: IFilter[], httpContext: HttpContext, action: (filter: IFilter) => Promise<void>): Promise<void>
    {
        if (!filterInstances || filterInstances.length === 0)
            return;

        for (const filterInstance of filterInstances)
        {
            if (httpContext.closed && !this._ignoreClosedResponseOnFilters)
                break;

            await action(filterInstance);
        }
    }

    private getParametersArray(actionType: ActionType, request: Request): any[]
    {
        return actionType.actionUrl.parameters.map((routeParameter, index) =>
        {
            const parameter = (routeParameter.parameterType === RouteParameterType.Segment
                ? request.params[routeParameter.name]
                : request.query[routeParameter.name]) as string;

            switch (actionType.parameters[index])
            {
                case Number:
                    return parseFloat(parameter);

                case Boolean:
                    return parameter.toLowerCase() === 'true' ||
                        parameter.toLowerCase() === 'yes' ||
                        parameter.toLowerCase() === '1';

                case Date:
                    return new Date(Date.parse(parameter));

                case String:
                    return parameter;

                default:
                    throw new Error(`The parameter '${routeParameter.name}' is of type '${getObjectTypeName(actionType.parameters[index])}'. Only Number, String, Date or Boolean are allowed for route or query string parameters.`);
            }
        });
    }
}