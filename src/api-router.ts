import { Request, Response, Application } from 'express';
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

    private _globalFilters: ObjectType<IFilter>[];

    constructor(logger?: Logger, injector?: DependencyContainer)
    {
        this._logger = logger ?? new Logger();
        this._injector = injector ?? DependencyCollection.globalCollection.buildContainer();
        this._globalFilters = [];
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

    public registerRoutes(app: Application): void
    {
        for (const controllerType of ControllerTypeCollection.globalInstance.getControllers())
        {
            for (const actionType of ActionTypeCollection.globalInstance.getForController(controllerType.type.name))
            {
                const routingContext = new RoutingContext(controllerType, actionType);
                const route = this.mergeRoute(routingContext);
                const method = this.getMethod(actionType, app);

                this._logger.debug(`Mapping route ${HttpMethod[actionType.descriptor.method]} ${route} to '${routingContext}'.`);

                method.call(app, route, async (request: Request, response: Response) =>
                {
                    const httpContext = new HttpContext(request, response);
                    await this.callAction(httpContext, routingContext);
                });
            }
        }
    }

    private async callAction(httpContext: HttpContext, routingContext: RoutingContext): Promise<void>
    {
        try
        {
            this._logger.debug(`Request received '${httpContext.request.url}'`);

            // check if the response is still alive.
            this.checkResponse(httpContext, routingContext);

            // create a new scoped injector
            const injector = this._injector.createScopedInjector(ApiRouter.ThreadScope);

            // try to instantiate the controller.
            const controllerInstance = this.createControllerInstance(routingContext, injector);

            // try to retrieve the method.
            const actionMethod = this.getActionMethod(routingContext, controllerInstance);

            // sets the http context on the controller.
            controllerInstance.setHttpContext(httpContext);

            // execute before filters.
            await this.executeBeforeFilters(injector, routingContext, httpContext);

            // execute the action itself.
            var result = await this.executeMethod(controllerInstance, actionMethod, routingContext, httpContext);

            // execute the after filters.
            await this.executeAfterFilters(injector, routingContext, httpContext);

            // finish the request if wasn't finished already
            this.finishRequest(httpContext, result);

            this._logger.debug(`Action returned with code [${httpContext.response.statusCode}].`);
        }
        catch (error)
        {
            this._logger.error(error.message);
            httpContext.response.status(500).send(error.message);
        }
    }

    private checkResponse(httpContext: HttpContext, routingContext: RoutingContext): void
    {
        if (httpContext.response.finished)
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

    private async executeBeforeFilters(injector: DependencyContainer, routingContext: RoutingContext, httpContext: HttpContext): Promise<void>
    {
        await this.executeFilters(injector, this._globalFilters, httpContext, routingContext, async (f: IFilter, c: HttpContext, r: RoutingContext) => { if (f.beforeExecute) await f.beforeExecute(c, r); });
        await this.executeFilters(injector, routingContext.controllerType.descriptor.filters, httpContext, routingContext, async (f: IFilter, c: HttpContext, r: RoutingContext) => { if (f.beforeExecute) await f.beforeExecute(c, r); });
        await this.executeFilters(injector, routingContext.actionType.descriptor.filters, httpContext, routingContext, async (f: IFilter, c: HttpContext, r: RoutingContext) => { if (f.beforeExecute) await f.beforeExecute(c, r); });
    }

    private async executeAfterFilters(injector: DependencyContainer, routingContext: RoutingContext, httpContext: HttpContext): Promise<void>
    {
        await this.executeFilters(injector, routingContext.actionType.descriptor.filters, httpContext, routingContext, async (f: IFilter, c: HttpContext, r: RoutingContext) => { if (f.afterExecute) await f.afterExecute(c, r); });
        await this.executeFilters(injector, routingContext.controllerType.descriptor.filters, httpContext, routingContext, async (f: IFilter, c: HttpContext, r: RoutingContext) => { if (f.afterExecute) await f.afterExecute(c, r); });
        await this.executeFilters(injector, this._globalFilters, httpContext, routingContext, async (f: IFilter, c: HttpContext, r: RoutingContext) => { if (f.afterExecute) await f.afterExecute(c, r); });
    }

    private async executeMethod(controllerInstance: ApiController, actionMethod: ActionMethod<any>, routingContext: RoutingContext, httpContext: HttpContext): Promise<void>
    {
        const methodArgs: any[] = [];

        if (routingContext.actionType.descriptor.fromBody)
            methodArgs.push(httpContext.request.body);

        return await this.executeWhenNoFinished(httpContext, async () =>
        {
            const parameters = this.getParametersArray(routingContext.actionType, httpContext.request);
            return await actionMethod.apply(controllerInstance, methodArgs.concat(parameters));
        });
    }

    private finishRequest(httpContext: HttpContext, result: any): void
    {
        if (httpContext.response.finished)
            return;

        httpContext.response.status(200).send(result || {});
    }

    private mergeRoute(routingContext: RoutingContext): string
    {
        var controllerRoute = routingContext.controllerType.descriptor.route || "";
        var actionRoute = routingContext.actionType.descriptor.route || "";
        return `${controllerRoute}${!controllerRoute.endsWith("/") && !actionRoute.startsWith("/") ? "/" : ""}${actionRoute}`;
    }

    private getMethod(actionType: ActionType, app: Application): Function
    {
        switch (actionType.descriptor.method)
        {
            case HttpMethod.GET:
                return app.get;

            case HttpMethod.POST:
                return app.post;

            case HttpMethod.PUT:
                return app.put;

            case HttpMethod.DELETE:
                return app.delete;
        }
    }

    private async executeFilters(
        injector: DependencyContainer,
        filters: ObjectType<IFilter>[],
        httpContext: HttpContext,
        routingContext: RoutingContext,
        action: (filter: IFilter, httpContext: HttpContext, routingContext: RoutingContext) => Promise<void>): Promise<void>
    {
        if (!filters)
            return;

        for (const filter of filters)
        {
            var filterInstance = injector.resolve(filter);
            await this.executeWhenNoFinished(httpContext, async () => await action(filterInstance, httpContext, routingContext));

            if (httpContext.closed)
            {
                break;
            }
        }
    }

    private async executeWhenNoFinished<T = any>(httpContext: HttpContext, actionToExecute: () => Promise<T>): Promise<T>
    {
        if (httpContext.closed)
            return;

        return await actionToExecute();
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