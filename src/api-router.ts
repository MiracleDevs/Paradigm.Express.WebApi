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
import { DependencyContainer, ObjectType } from '@miracledevs/paradigm-web-di';

export class ApiRouter
{
    public static readonly ThreadScope = 'thread';

    private _logger: ILogger;

    private _injector: DependencyContainer;

    private _globalFilters: ObjectType<IFilter>[];

    constructor(logger: Logger, injector: DependencyContainer)
    {
        this._logger = logger;
        this._injector = injector;
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
                const route = this.mergeRoute(controllerType, actionType);
                const method = this.getMethod(actionType, app);

                this._logger.debug(`Mapping route ${HttpMethod[actionType.descriptor.method]} ${route} to '${controllerType.type.name}.${actionType.methodName}'.`);

                method.call(app, route, async (request: Request, response: Response) => await this.callAction(controllerType, actionType, request, response));
            }
        }
    }

    private async callAction(controllerType: ControllerType, actionType: ActionType, request: Request, response: Response): Promise<void>
    {
        try
        {
            this._logger.debug(`Request received '${request.url}'`);

            // create the http context.
            const httpContext = new HttpContext(request, response);

            // check if the response is still alive.
            this.checkResponse(controllerType, actionType, httpContext);

            // create a new scoped injector
            const injector = this._injector.createScopedInjector(ApiRouter.ThreadScope);

            // try to instantiate the controller.
            const controllerInstance = this.createControllerInstance(injector, controllerType);

            // try to retrieve the method.
            const actionMethod = this.getActionMethod(controllerType, actionType, controllerInstance);

            // sets the http context on the controller.
            controllerInstance.setHttpContext(httpContext);

            // execute before filters.
            await this.executeBeforeFilters(injector, controllerType, actionType, httpContext);

            // execute the action itself.
            var result = await this.executeMethod(controllerInstance, actionType, actionMethod, httpContext);

            // execute the after filters.
            await this.executeAfterFilters(injector, controllerType, actionType, httpContext);

            // finish the request if wasn't finished already
            this.finishRequest(httpContext, result);

            this._logger.debug(`Action returned with code [${response.statusCode}].`);
        }
        catch (error)
        {
            this._logger.error(error.message);

            if (!response.finished)
            {
                response.status(500).send(error.message);
            }
        }
    }

    private checkResponse(controllerType: ControllerType, actionType: ActionType, httpContext: HttpContext): void
    {
        if (httpContext.response.finished)
        {
            this._logger.debug(`The response is already closed, the action '${controllerType.type.name}.${actionType.methodName}' won't be called.`);
            return;
        }

        this._logger.debug(`The action '${controllerType.type.name}.${actionType.methodName}' will be executed.`);
    }

    private createControllerInstance(injector: DependencyContainer, controllerType: ControllerType): ApiController
    {
        const controllerInstance = injector.resolve(controllerType.type) as ApiController;

        if (!controllerInstance)
        {
            throw new Error(`Couldn't instantiate the controller ${controllerType.type.name}`);
        }

        return controllerInstance;
    }

    private getActionMethod<T = any>(controllerType: ControllerType, actionType: ActionType, controllerInstance: ApiController): ActionMethod<T>
    {
        const actionMethod = actionType.getExecutableMethod(controllerInstance);

        if (!actionMethod)
        {
            throw new Error(`Couldn't retrieve the action '${controllerType.type.name}.${actionType.methodName}'.`);
        }

        return actionMethod;
    }

    private async executeBeforeFilters(injector: DependencyContainer, controllerType: ControllerType, actionType: ActionType, httpContext: HttpContext): Promise<void>
    {
        await this.executeFilters(injector, this._globalFilters, httpContext, async (f: IFilter, c: HttpContext) => { if (f.beforeExecute) await f.beforeExecute(c); });
        await this.executeFilters(injector, controllerType.descriptor.filters, httpContext, async (f: IFilter, c: HttpContext) => { if (f.beforeExecute) await f.beforeExecute(c); });
        await this.executeFilters(injector, actionType.descriptor.filters, httpContext, async (f: IFilter, c: HttpContext) => { if (f.beforeExecute) await f.beforeExecute(c); });
    }

    private async executeAfterFilters(injector: DependencyContainer, controllerType: ControllerType, actionType: ActionType, httpContext: HttpContext): Promise<void>
    {
        await this.executeFilters(injector, actionType.descriptor.filters, httpContext, async (f: IFilter, c: HttpContext) => { if (f.afterExecute) await f.afterExecute(c); });
        await this.executeFilters(injector, controllerType.descriptor.filters, httpContext, async (f: IFilter, c: HttpContext) => { if (f.afterExecute) await f.afterExecute(c); });
        await this.executeFilters(injector, this._globalFilters, httpContext, async (f: IFilter, c: HttpContext) => { if (f.afterExecute) await f.afterExecute(c); });
    }

    private async executeMethod(controllerInstance: ApiController, actionType: ActionType, actionMethod: ActionMethod<any>, httpContext: HttpContext): Promise<void>
    {
        const methodArgs: any[] = [];

        if (actionType.descriptor.fromBody)
            methodArgs.push(httpContext.request.body);

        return await this.executeWhenNoFinished(httpContext, async () => await actionMethod.apply(controllerInstance, methodArgs.concat(this.getParametersArray(actionType, httpContext.request))));
    }

    private finishRequest(httpContext: HttpContext, result: any): void
    {
        if (!httpContext.response.finished)
        {
            if (!httpContext.response.statusCode)
                httpContext.response.status(200);

            httpContext.response.send(result || {});
        }
    }

    private mergeRoute(controllerType: ControllerType, actionType: ActionType): string
    {
        var controllerRoute = controllerType.descriptor.route || "";
        var actionRoute = actionType.descriptor.route || "";
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

    private async executeFilters<T = any>(injector: DependencyContainer, filters: ObjectType<IFilter>[], httpContext: HttpContext, action: (filter: IFilter, context: HttpContext) => Promise<T>): Promise<T>
    {
        if (!filters)
            return;

        for (const filter of filters)
        {
            var filterInstance = injector.resolve(filter);
            await this.executeWhenNoFinished(httpContext, async () => await action(filterInstance, httpContext));

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
                    return parameter === 'true' || parameter === 'True' || parameter === 'TRUE' ||
                        parameter === 'yes' || parameter === 'Yes' || parameter === 'YES' ||
                        parameter === '1';

                case Date:
                    return new Date(Date.parse(parameter));

                case String:
                    return parameter;

                default:
                    return parameter;
            }
        });
    }
}