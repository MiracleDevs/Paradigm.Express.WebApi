# Paradigm.Express.WebApi [![Build Status](https://travis-ci.org/MiracleDevs/Paradigm.Express.WebApi.svg?branch=master)](https://travis-ci.org/MiracleDevs/Paradigm.Express.WebApi)
Basically is framework built on top of express to structure the work with apis, in an MVC fashion.
Taking some Typescript features, and using our own [DI library](https://github.com/miracledevs/Paradigm.Web.DI) we are able to create controllers, and treat routing similarly to .NET core MVC.

# Getting Started
There are 4 basic entities that form the framework that you'll be using extensively:

## Host Builder
Is the entry point of the application. The host builder allows you to create the API Server, and configure some subjacent objects. In the most simple way, you just need to have an `ApiServer` class, and you can create and start your app:

```typescript
import { HostBuilder } from "@miracledevs/paradigm-express-webapi";

 new HostBuilder()
    .build(Server)
    .start();
```

The host builder let you customize the application logging, dependency injection and configuration. Some things can be changed latter, but we recommend doing it here:

```typescript
import { HostBuilder, ConfigurationBuilder, Logger } from "@miracledevs/paradigm-express-webapi";
import { DependencyCollection } from "@miracledevs/paradigm-web-di";
import { FoodServer } from './food-server';

new HostBuilder()
    .useConfiguration((config: ConfigurationBuilder) =>
    {
        config.addJsonFile('config.json')
            .addEnvironmentFile('.env', 'my_app__')
            .addEnvironmentVariables('my_app__');
    })
    .useLogging((logger: Logger) => logger.setMinimumLevel(LogType.Trace))
    .useDependencyInjection(() => return new DependencyCollection())
    .build(FoodServer)
    .start();
```

1) In this case, we use `useConfiguration` to initialize the `ConfigurationBuilder` to intialize our configuration. We are telling the framework to open `config.json`, then `.env` and the environment variables, and merge them all into one configuration object. We are telling the configuration to look only for .env variables that start with `my_app__`. We'll see this later when exploring how the configuration works.

2) Then we are telling the app that we can configure the logger by calling `useLogging`. We setup the
logger to log everything from Trace up (Trace, Debug, Information, Warning, Error). You can also configure the message format, or change the log provider. By default, the logger logs to the  console terminal.

3) Then we are telling the host that we want to use a custom dependency collection, by calling `useDependencyInjection`. If not, the host will use `DependencyCollection.globalCollection`. We recommend not call this method, and let the host use the globalCollection.

4) Then we call `build` and we pass which class we want to create. This class must inherit from `ApiServer`. The host will instantiate the class and inject the logger, dependency container and configuration to the server instance.

5) The last method is the `start` method. At this point we already have an instance of our api server, and we can start the app.

## Api Server
The api server is the class we need to extend in order to create our server application. Internally maintains references to a logger, a dependency container, a configuration builder, and all the referenced controllers. Is also the instance that maintains the express application, and all the routing information. Your `HostBuilder` and `ApiServer` will be the application entry point, and so you should register which controllers you want here. You'll also want to configure your express application:

```typescript
import { ApiServer } from '@miracledevs/paradigm-express-webapi';
import { FoodConfiguration } from './food-configuration';
import { LoginController } from './controllers/login-controller';
import { MenuController } from './controllers/menu-controller';
import { OrderController } from './controllers/order-controller';
import express from 'express';
import cors from 'cors';

export class FoodServer extends ApiServer
{
    protected configureApplication(): void
    {
        this.logger.debug("Configuring application...");
        const configuration = this.configurationBuilder.build(FoodConfiguration);

        this.expressApplication
            .disable('etag')
            .set('port', configuration.port)
            .use(cors())
            .use(express.urlencoded({ extended: false }))
            .use(express.json())
            .listen(configuration.port, () => this.logger.debug(`Server on port: ${configuration.port}`));

        this.registerControllers([
            LoginController,
            ProductController
        ]);
    }
}
```

Most of the logic inside the ApiServer happens behind the curtains. Your only responsibility is to configure the express application, and register your controllers. You can do so by overriding the `configureApplication` application inside your `ApiServer` class. Inside, we are:

1) Initializing our configuration object, by asking the configuration builder to create our object: `this.configurationBuilder.build()`. When we call this line, the configuration builder executes each configuration source step configured in the `HostBuilder` and then merges the results into one object.  We can ask the framework to instantiate a specific configuration class instead of just returning a generic object. That's why we are calling build and passing `FoodConfiguration` as parameter. `FoodConfiguration` is a class with all the proper fields:

```typescript
export class FoodConfiguration
{
    development: boolean;
    port: number;
    adminSecret: string;
}
```

2) Once we have a configuration instance, we can configure our express application. We can setup which type of responses and request are we expecting, if we want cors or not, which port to use, etc.

3) Finally, we register which controllers do we want to have in scope. We are just putting them on scope for the tree shacking algorithms.

That's it. We should have a working express application up and running.

## Controllers and Actions
Controllers and actions are the most common type of objects under this structure. Instead of just laying your routes altogether, our framework allows you a modular separation for your routes, with some other goodies will see. We'll create an example controller:

```typescript
@Controller({ route: "api/product" })
export class ProductController
{
    constructor(private readonly productService: ProductService)
    {
    }

    @Action({ route: "single/:id" })
    async get(id: number): Promise<Product>
    {
        return await this.productService.get(id);
    }

    @Action({ route: "all", method: HttpMethod.GET })
    async getAll(id: number): Promise<Product[]>
    {
        return await this.productService.getAll();
    }

    @Action({ fromBody: true })
    async post(product: Product): Promise<void>
    {
        await this.productService.save(product);
    }

    @Action({ route: ":id" })
    async delete(product: Product): Promise<void>
    {
        await this.productService.delete(id);
    }
}
```

Each controller is a class that contains a set of actions, that will be routed or called. Each action will define an endpoint. Its url will be the composition of the controller and action routes. By convention, the framework can infer the http method by the action name. The are plenty of configurations possible for you to play with, but lets list some of the most important:
- Our framework can automatically match and cast your route and query string parameters and pass them to the action method. No more request and response parameters in your routing methods. The framework will take care of parameters for you. You can use parameters of type `number`, `string`, `boolean` or `Date`.
- Like with route and query string parameters, the framework can extract an object from the body, and inject it on your action. In order to inject the body object, you must provide the option `fromBody: true` and expect the first parameter to be the object. You can mix route and query string parameters with the body object, just make sure the object to be the first parameter.
- You don't need to manually call `this.httpContext.response.status(200).send(...)`. The framework can do it for you. Just expose a http agnostic interface. Do you want to return an array of products? make your action return products. The framework will take them and serialize it on the response body.
- You can work with sync or async methods. You can choose which one fit you best, the framework will work either way.
- Controllers are registered in the `DependencyCollection.globalCollection` by default, and the framework which resolve them via DI resolution. That means that you can inject your services or helper classes on the controller constructor, and have them ready to use.
