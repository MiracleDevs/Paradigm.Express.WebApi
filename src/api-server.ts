import { ApiRouter } from "./api-router";
import { Logger } from "./logging/logger";
import { ConfigurationBuilder } from "./configuration/configuration-builder";
import express, { Application } from 'express';
import { DependencyContainer, ObjectType } from "@miracledevs/paradigm-web-di";

export class ApiServer
{
    private readonly _controllers: ObjectType[];

    private _configurationBuilder: ConfigurationBuilder;

    private _dependencyContainer: DependencyContainer;

    private _logger: Logger;

    private _expressApplication: Application;

    private _routing: ApiRouter;

    get configurationBuilder(): ConfigurationBuilder { return this._configurationBuilder; }

    get expressApplication(): Application { return this._expressApplication; }

    get dependencyContainer(): DependencyContainer { return this._dependencyContainer; }

    get routing(): ApiRouter { return this._routing; }

    get logger(): Logger { return this._logger; }

    constructor()
    {
        this._controllers = [];
    }

    public setLogger(logger: Logger): void
    {
        this._logger = logger;
    }

    public setConfigurationBuilder(configurationBuilder: ConfigurationBuilder): void
    {
        this._configurationBuilder = configurationBuilder;
    }

    public setDependencyContainer(injector: DependencyContainer): void
    {
        this._dependencyContainer = injector;
    }

    public start(): void
    {
        this._expressApplication = express();
        this._routing = new ApiRouter(this._logger, this._dependencyContainer);
        this.configureApplication();
        this.routing.registerRoutes(this._expressApplication);
    }

    protected configureApplication(): void
    {
        // override to configure express application.
    }

    protected registerController(controller: ObjectType): void
    {
        this._controllers.push(controller);
    }

    protected registerControllers(controllers: ObjectType[]): void
    {
        for (const controller of controllers)
        {
            this.registerController(controller);
        }
    }
}