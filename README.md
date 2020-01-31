# Paradigm.Express.WebApi [![Build Status](https://travis-ci.org/MiracleDevs/Paradigm.Express.WebApi.svg?branch=master)](https://travis-ci.org/MiracleDevs/Paradigm.Express.WebApi)
Basically, is framework built on top of express to structure the work with apis, in an MVC fashion.
Taking some Typescript features, and using our own [DI library](https://github.com/miracledevs/Paradigm.Web.DI) we are able to create controllers, and treat routing similarly to .NET core MVC.


# Installing

```shell
$ npm i @miracledevs/paradigm-express-webapi
```

# Getting Started
There are 4 basic entities that form the framework that you'll be using extensively:
1. Host Builders
2. ApiServers
3. Controller and Actions
4. Filters

## Host Builder
Is the entry point of the application. The host builder allows you to create the API Server, and configure some subjacent objects. In the most simple way, you just need to have an `ApiServer` class, and you can create and start your app:

```typescript
 new HostBuilder()
    .build(Server)
    .start();
```

The host builder let you customize the application logging, dependency injection and configuration. Some things can be changed latter, but we recommend doing it here:

```typescript
new HostBuilder()
    .useConfiguration((config: ConfigurationBuilder) =>
    {
        config.addJsonFile('config.json')
            .addEnvironmentFile('.env', 'my_app__')
            .addEnvironmentVariables('my_app__');
    })
    .useLogging((logger: Logger) => logger.setMinimumLevel(LogType.Trace))
    /* best not to change the DI unless you know what you are doing */
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
export class FooServer extends ApiServer
{
    protected configureApplication(): void
    {
        this.logger.debug("Configuring application...");
        const configuration = this.configurationBuilder.build(FooConfiguration);

        this.expressApplication
            .disable('etag')
            .set('port', configuration.port)
            .use(cors())
            .use(express.urlencoded({ extended: false }))
            .use(express.json())
            .listen(configuration.port, () => this.logger.debug(`Server listening on port: ${configuration.port}`));

        this.registerControllers([
            LoginController,
            ProductController
        ]);
    }
}
```

Most of the logic inside the ApiServer happens behind the curtains. Your only responsibility is to configure the express application, and register your controllers. You can do so by overriding the `configureApplication` application inside your `ApiServer` class. Inside, we are:

1) Initializing our configuration object, by asking the configuration builder to create our object: `this.configurationBuilder.build()`. When we call this line, the configuration builder executes each configuration source step configured in the `HostBuilder` and then merges the results into one object.  We can ask the framework to instantiate a specific configuration class instead of just returning a generic object. That's why we are calling build and passing `FooConfiguration` as parameter. `FooConfiguration` is a class with all the proper fields:

```typescript
export class FooConfiguration
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

## Filters
The last important group of elements you need to know, are the filters. Filters can be attached to all the controllers, to all the actions inside a controller, or to a specific action. Filters act like a middleware that happens after the MVC routing happened. With them you can execute code before and after an action is called.
Suppose you want to filter requests that need to be authenticated, and not allow unauthenticated users to execute certain actions or controllers:

```typescript
@Injectable({ lifeTime: DependencyLifeTime.Scoped })
export class SecurityFilter implements IFilter
{
    constructor(
        private readonly configurationBuilder: ConfigurationBuilder,
        private readonly loggedUser: LoggedUser
    )
    {
    }

    beforeExecute(httpContext: HttpContext): void
    {
        const headerAuth = httpContext.request.headers['x-auth'];
        const configuration = this.configurationBuilder.build(FooConfiguration);

        if (headerAuth === configuration.adminSecret)
        {
            this.loggedUser.role = Roles.Admin;
            return;
        }

        httpContext.response.status(401).send('The user is not authenticated.');
    }
}
```

This filter is asking to be executed before the actual action. There is two types of methods you can override in a filter:
- `beforeExecute`: Executes before any given action.
- `afterExecute`: Executes after any given action has been executed.

> You can execute both as sync or async methods as well. The type of return can be `void` or `Promise<void>`.

And before anything happens, the filter looks for a special request header, and evaluates if the header value is equal to a given client secret. If it is, sets up the logged user role, and if it's not, finishes the request and return a 401. By setting the status and sending a response, we are closing the context, and mvc routing will not execute any more filters or actions. Instead of checking a client secret, you could look inside a database, or check with third party o-auth service, the subjacent idea is the same.

Now, how can we configure this filter on a real case scenario? let's take the `ProductController` example, and see how we can configure. In our first scenario, let's suppose that our product catalog is available to everyone, but only collaborators can add, modify or remove products from the catalog. In that case, we need to block only some actions:

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

    @Action({ fromBody: true, filters: [ SecurityFilter ] })
    async post(product: Product): Promise<void>
    {
        await this.productService.save(product);
    }

    @Action({ route: ":id", filters: [ SecurityFilter ] })
    async delete(product: Product): Promise<void>
    {
        await this.productService.delete(id);
    }
}
```

Take a look to the `post` and `delete` actions. We added the `filters: [ SecurityFilter ]` parameter, and inside it, we included our filter. By doing so, we are effectively telling the router to execute the filter for that particular action. You may have noticed that filters is an array, you can setup multiple filters per action.

Now lets say on our second case scenario, our product catalog is part of an ERP type system, and it's only accessible to logged users and not guests. In that case, adding the filter to every action is tedious. But trouble not, there is an easier way:

```typescript
@Controller({ route: "api/product", filters: [ SecurityFilter ] })
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

We removed the filters from the `post` and `delete` methods, but we added it to the controller. If you look the `@Controller(...)` decorator, you'll find the same filters array as with the action. The functionality is exactly the same, only that the filter will be executed for all the actions inside `ProductController`.

Suppose that now you want to log every request to your controllers, at least the ones that resolved to a valid action. Decorating every controller is as tedious as decorating every action, and in programming, boring stuff tend to be error prone. As you may have already thought, there is another higher level place you can configure a filter, that will apply to all the controllers. First, let's code our filter:

```typescript
@Injectable()
export class LogFilter implements IFilter
{
    constructor(private readonly logger: Logger)
    {
    }

    beforeExecute(httpContext: HttpContext): void
    {
        this.logger.trace(httpContext.request.url);
    }
}
```

Now, we can configure it as a global filter in our `ApiServer`:

```typescript
export class FooServer extends ApiServer
{
    protected configureApplication(): void
    {
        ...

        this.routing.registerGlobalFilter(LogFilter);
    }
}
```

There are two methods you can use:
- `registerGlobalFilter`: Allows to register only one filter at a time.
- `registerGlobalFilters`: Takes an array of filters to be register.

Another minor thing to mention, is that the framework resolves filter using DI. This means you need to decorate or register your filter in the same `DependencyContainer` that your serve uses. If you don't call 'HostBuilder.useDependencyInjection(() => ...)' then your filters will be registered inside 'DependencyCollection.globalCollection'. Filters will be resolved on a scoped container used for each request, so you could make a filter scoped, or transient, depending on your needs.

Last but not least, is good to understand the order in which the filters are executed, mostly if you end up having the 3 categories at the same time:

1. `before` execute: `global` filter
2. `before` execute: `controller` filter
3. `before` execute:  `action` filter
4. the action is executed.
5. `after` execute: `action` filter
6. `after` execute: `controller` filter
7. `after` execute: `global` filter:



# What's next
There are some areas that may be improved or changed, and we still fill some polishing is required, mostly from an interface standpoint. Some of these changes are:
- Filters should receive not only an HttpContext but also a RoutingContext containing the Controller and method types. This information can be beneficial and useful in certain scenarios.
- Express Router per Controller: A colleague of us has expressed that for intensive scenarios, having all controllers registered under the same express router can be a performance bottleneck. Express uses regular expressions to evaluate routes, if your api has hundreds of methods, and you need two digit ms performance, things can get ugly.
- Typed middlewares: Express comes with an easy and quick way to add middlewares, but they suffer from the same lack of structure and marriage to the http structure. We'll prefer to use middlewares ina more OOP fashion, or at least following the same rules we used for the rest of the api: Dependency resolution, http contexts, run in the same scoped context, to name a few.
- Performance tests: Currently the solution has a 100% coverage rate, but we all know that doesn't mean anything. Both from a test and usage perspective. We'll need to include some performance tests to evaluate every change we make. Sure, we are not thinking of these as a long term solution to do high performance services, we use rust o .net for that, but that doesn't mean we shouldn't try to make it as fast and performant as we can.

# Building and Testing

To build the library:
```shell
$ npm run build
```

To watch-build the library:
```shell
$ npm run watch
```

To test the solution:
```shell
$ npm run test
```

To watch-test the solution:
```shell
$ npm run watch-test
```

To see the test coverage:
```shell
$ npm run coverage
```

To watch-coverage the solution:
```shell
$ npm run watch-coverage
```