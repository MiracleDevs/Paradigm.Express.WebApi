import { IFilter } from "../src/filters/filter.interface";
import { HttpContext } from "../src/shared/http-context";
import { DependencyCollection, DependencyLifeTime, Injectable } from "@miracledevs/paradigm-web-di";
import { ApiController } from "../src/controllers/api-controller";
import { Controller } from "../src/decorators/controller";
import { Action } from "../src/decorators/action";
import { Application } from "express";
import { ApiRouter } from "../src/api-router";
import httpMocks from "node-mocks-http";
import express from "express";
import { RoutingContext } from "../src/shared/routing-context";
import { Logger } from "../src/logging/logger";

describe("Filters", () =>
{
    @Injectable()
    class OnlyBeforeFilter implements IFilter
    {
        static called: boolean;

        static reset(): void
        {
            OnlyBeforeFilter.called = false;
        }

        beforeExecute(httpContext: HttpContext, routingContext: RoutingContext): void
        {
            expect(httpContext).not.toBeNull();
            expect(httpContext.request).not.toBeNull();
            expect(httpContext.response).not.toBeNull();

            expect(routingContext).not.toBeNull();
            expect(routingContext.controllerType).not.toBeNull();
            expect(routingContext.actionType).not.toBeNull();

            OnlyBeforeFilter.called = true;
        }
    }

    @Injectable()
    class OnlyAfterFilter implements IFilter
    {
        static called: boolean;

        static reset(): void
        {
            OnlyAfterFilter.called = false;
        }

        afterExecute(httpContext: HttpContext, routingContext: RoutingContext): void
        {
            expect(httpContext).not.toBeNull();
            expect(httpContext.request).not.toBeNull();
            expect(httpContext.response).not.toBeNull();

            expect(routingContext).not.toBeNull();
            expect(routingContext.controllerType).not.toBeNull();
            expect(routingContext.actionType).not.toBeNull();

            OnlyAfterFilter.called = true;
        }
    }

    @Injectable()
    class BreakBeforeFilter implements IFilter
    {
        beforeExecute(httpContext: HttpContext, routingContext: RoutingContext): void
        {
            httpContext.response.status(200).send("closed before");
        }
    }

    @Injectable()
    class BreakAfterFilter implements IFilter
    {
        afterExecute(httpContext: HttpContext, routingContext: RoutingContext): void
        {
            httpContext.response.status(200).send("closed after");
        }
    }

    @Injectable({ lifeTime: DependencyLifeTime.Singleton })
    class LogGlobalFilter implements IFilter
    {
        executedBefore: boolean = false;

        executedAfter: boolean = false;

        executedError: boolean = false;

        beforeExecute(): void
        {
            this.executedBefore = true;
        }

        afterExecute(): void
        {
            this.executedAfter = true;
        }

        onError(): void
        {
            this.executedError = true;
        }

        clean(): void {
            this.executedBefore = false;
            this.executedAfter = false;
            this.executedError = false;
        }
    }

    @Injectable({ lifeTime: DependencyLifeTime.Singleton })
    class LogControllerFilter extends LogGlobalFilter
    {
    }

    @Injectable({ lifeTime: DependencyLifeTime.Singleton })
    class LogActionFilter extends LogGlobalFilter
    {
    }

    @Injectable()
    class ThrowBeforeFilter implements IFilter
    {
        beforeExecute(httpContext: HttpContext, routingContext: RoutingContext): void
        {
            throw new Error("throw on before");
        }
    }

    @Injectable()
    class ThrowAfterFilter implements IFilter
    {
        afterExecute(httpContext: HttpContext, routingContext: RoutingContext): void
        {
            throw new Error("throw on after");
        }
    }

    @Controller({ route: "before-filter", filters: [OnlyBeforeFilter] })
    class BeforeFilterController extends ApiController
    {
        @Action({ filters: [OnlyBeforeFilter] })
        get(): void
        {
        }
    }

    @Controller({ route: "after-filter", filters: [OnlyAfterFilter] })
    class AfterFilterController extends ApiController
    {
        @Action({ filters: [OnlyAfterFilter] })
        get(): void
        {
        }
    }

    @Controller({ route: "break-before-global-filter" })
    class BreakBeforeGlobalController extends ApiController
    {
        @Action()
        get(): void
        {
        }
    }

    @Controller({ route: "break-before-filter", filters: [BreakBeforeFilter] })
    class BreakBeforeController extends ApiController
    {
        @Action()
        get(): void
        {
        }
    }

    @Controller({ route: "break-before-action-filter" })
    class BreakBeforeActionController extends ApiController
    {
        @Action({ filters: [BreakBeforeFilter] })
        get(): void
        {
        }
    }

    @Controller({ route: "break-after-global-filter" })
    class BreakAfterGlobalController extends ApiController
    {
        @Action()
        get(): void
        {
        }
    }

    @Controller({ route: "break-after-filter", filters: [BreakAfterFilter] })
    class BreakAfterController extends ApiController
    {
        @Action()
        get(): void
        {
        }
    }

    @Controller({ route: "break-after-action-filter" })
    class BreakAfterActionController extends ApiController
    {
        @Action({ filters: [BreakAfterFilter] })
        get(): void
        {
        }
    }

    @Controller({ route: "ignore-break-before-global-filter", filters: [LogControllerFilter] })
    class IgnoreBreakBeforeGlobalController extends ApiController
    {
        @Action({ filters: [LogActionFilter] })
        get(): void
        {
        }
    }

    @Controller({ route: "ignore-break-before-controller-filter", filters: [BreakBeforeFilter] })
    class IgnoreBreakBeforeControllerController extends ApiController
    {
        @Action({ filters: [LogActionFilter] })
        get(): void
        {
        }
    }

    @Controller({ route: "ignore-break-before-action-filter", filters: [LogControllerFilter] })
    class IgnoreBreakBeforeActionController extends ApiController
    {
        @Action({ filters: [BreakBeforeFilter, LogActionFilter] })
        get(): void
        {
        }
    }

    @Controller({ route: "ignore-break-on-action-filter", filters: [LogControllerFilter] })
    class IgnoreBreakOnActionController extends ApiController
    {
        @Action({ filters: [LogActionFilter] })
        get(): void
        {
            this.httpContext.response.status(200).send("closed on action");
        }
    }

    @Controller({ route: "ignore-break-on-after-action-filter", filters: [LogControllerFilter] })
    class IgnoreBreakOnAfterActionController extends ApiController
    {
        @Action({ filters: [BreakAfterFilter] })
        get(): void
        {
        }
    }

    @Controller({ route: "ignore-break-on-after-controller-filter", filters: [BreakAfterFilter] })
    class IgnoreBreakOnAfterControllerController extends ApiController
    {
        @Action()
        get(): void
        {
        }
    }

    @Controller({ route: "throw-on-before-global-filter", filters: [LogControllerFilter] })
    class ThrowOnBeforeGlobalController extends ApiController
    {
        @Action({ filters: [LogActionFilter] })
        get(): void
        {
        }
    }

    @Controller({ route: "throw-on-before-controller-filter", filters: [ThrowBeforeFilter, LogControllerFilter] })
    class ThrowOnBeforeControllerController extends ApiController
    {
        @Action({ filters: [LogActionFilter] })
        get(): void
        {
        }
    }

    @Controller({ route: "throw-on-before-action-filter", filters: [LogControllerFilter] })
    class ThrowOnBeforeActionController extends ApiController
    {
        @Action({ filters: [ThrowBeforeFilter, LogActionFilter] })
        get(): void
        {
        }
    }

    @Controller({ route: "throw-on-action-filter", filters: [LogControllerFilter] })
    class ThrowOnActionController extends ApiController
    {
        @Action({ filters: [LogActionFilter] })
        get(): void
        {
            throw new Error("throw on action");
        }
    }

    @Controller({ route: "throw-on-after-action-filter", filters: [LogControllerFilter] })
    class ThrowOnAfterActionController extends ApiController
    {
        @Action({ filters: [ThrowAfterFilter, LogActionFilter] })
        get(): void
        {
        }
    }

    @Controller({ route: "throw-on-after-controller-filter", filters: [ThrowAfterFilter, LogControllerFilter] })
    class ThrowOnAfterControllerController extends ApiController
    {
        @Action({ filters: [LogActionFilter] })
        get(): void
        {
        }
    }

    @Controller({ route: "throw-on-after-global-filter", filters: [LogControllerFilter] })
    class ThrowOnAfterGlobalController extends ApiController
    {
        @Action({ filters: [LogActionFilter] })
        get(): void
        {
        }
    }

    it("should execute if only before filters are present", (done) =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "before-filter", method: "GET" });
        const response = httpMocks.createResponse();

        router.registerRoutes(app);
        router.registerGlobalFilter(OnlyBeforeFilter);

        OnlyBeforeFilter.reset();
        expect(() => app._router.handle(request, response, null)).not.toThrowError();

        setTimeout(() =>
        {
            try
            {
                expect(response.statusCode).toBe(200);
                done();
            }
            catch (e)
            {
                done(e);
            }
        }, 100);
    });

    it("should execute if only after filters are present", (done) =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "after-filter", method: "GET" });
        const response = httpMocks.createResponse();

        router.registerRoutes(app);
        router.registerGlobalFilter(OnlyAfterFilter);

        OnlyBeforeFilter.reset();
        expect(() => app._router.handle(request, response, null)).not.toThrowError();

        setTimeout(() =>
        {
            try
            {
                expect(response.statusCode).toBe(200);
                done();
            }
            catch (e)
            {
                done(e);
            }
        }, 100);
    });

    it("should allow to break on the before method on a global filter", (done) =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "break-before-global-filter", method: "GET" });
        const response = httpMocks.createResponse();

        router.registerRoutes(app);
        router.registerGlobalFilter(BreakBeforeFilter);

        OnlyBeforeFilter.reset();
        expect(() => app._router.handle(request, response, null)).not.toThrowError();

        setTimeout(() =>
        {
            try
            {
                expect(response.statusCode).toBe(200);
                expect(response._getData()).toBe("closed before");
                done();
            }
            catch (e)
            {
                done(e);
            }
        }, 100);
    });

    it("should allow to break on the before method on a controller filter", (done) =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "break-before-filter", method: "GET" });
        const response = httpMocks.createResponse();

        router.registerRoutes(app);

        OnlyBeforeFilter.reset();
        expect(() => app._router.handle(request, response, null)).not.toThrowError();

        setTimeout(() =>
        {
            try
            {
                expect(response.statusCode).toBe(200);
                expect(response._getData()).toBe("closed before");
                done();
            }
            catch (e)
            {
                done(e);
            }
        }, 100);
    });

    it("should allow to break on the before method on an action filter", (done) =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "break-before-action-filter", method: "GET" });
        const response = httpMocks.createResponse();

        router.registerRoutes(app);

        OnlyBeforeFilter.reset();
        expect(() => app._router.handle(request, response, null)).not.toThrowError();

        setTimeout(() =>
        {
            try
            {
                expect(response.statusCode).toBe(200);
                expect(response._getData()).toBe("closed before");
                done();
            }
            catch (e)
            {
                done(e);
            }
        }, 100);
    });

    it("should allow to break on the after method on a global filter", (done) =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "break-after-global-filter", method: "GET" });
        const response = httpMocks.createResponse();

        router.registerRoutes(app);
        router.registerGlobalFilter(BreakAfterFilter);

        OnlyAfterFilter.reset();
        expect(() => app._router.handle(request, response, null)).not.toThrowError();

        setTimeout(() =>
        {
            try
            {
                expect(response.statusCode).toBe(200);
                expect(response._getData()).toBe("closed after");
                done();
            }
            catch (e)
            {
                done(e);
            }
        }, 100);
    });

    it("should allow to break on the after method on a controller filter", (done) =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "break-after-filter", method: "GET" });
        const response = httpMocks.createResponse();

        router.registerRoutes(app);

        OnlyAfterFilter.reset();
        expect(() => app._router.handle(request, response, null)).not.toThrowError();

        setTimeout(() =>
        {
            try
            {
                expect(response.statusCode).toBe(200);
                expect(response._getData()).toBe("closed after");
                done();
            }
            catch (e)
            {
                done(e);
            }
        }, 100);
    });

    it("should allow to break on the after method on an action filter", (done) =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "break-after-action-filter", method: "GET" });
        const response = httpMocks.createResponse();

        router.registerRoutes(app);

        OnlyAfterFilter.reset();
        expect(() => app._router.handle(request, response, null)).not.toThrowError();

        setTimeout(() =>
        {
            try
            {
                expect(response.statusCode).toBe(200);
                expect(response._getData()).toBe("closed after");
                done();
            }
            catch (e)
            {
                done(e);
            }
        }, 100);
    });

    it("should ignore closed response on the before method on a global filter", (done) =>
    {
        const app: Application = express();
        const logger = new Logger();
        const injector = DependencyCollection.globalCollection.buildContainer();
        const router: ApiRouter = new ApiRouter(logger, injector);
        const request = httpMocks.createRequest({ url: "ignore-break-before-global-filter", method: "GET" });
        const response = httpMocks.createResponse();

        router.ignoreClosedResponseOnFilters();
        router.registerRoutes(app);
        router.registerGlobalFilters([BreakBeforeFilter, LogGlobalFilter]);

        OnlyBeforeFilter.reset();
        expect(() => app._router.handle(request, response, null)).not.toThrowError();

        setTimeout(() =>
        {
            try
            {
                expect(injector.resolve(LogControllerFilter).executedBefore).toBe(true);
                expect(injector.resolve(LogActionFilter).executedBefore).toBe(true);
                expect(injector.resolve(LogActionFilter).executedAfter).toBe(true);
                expect(injector.resolve(LogControllerFilter).executedAfter).toBe(true);
                expect(injector.resolve(LogGlobalFilter).executedAfter).toBe(true);
                expect(response.statusCode).toBe(200);
                expect(response._getData()).toBe("closed before");
                done();
            }
            catch (e)
            {
                done(e);
            }
        }, 100);
    });

    it("should ignore closed response on the before method on a controller filter", (done) =>
    {
        const app: Application = express();
        const logger = new Logger();
        const injector = DependencyCollection.globalCollection.buildContainer();
        const router: ApiRouter = new ApiRouter(logger, injector);
        const request = httpMocks.createRequest({ url: "ignore-break-before-controller-filter", method: "GET" });
        const response = httpMocks.createResponse();

        router.ignoreClosedResponseOnFilters();
        router.registerRoutes(app);
        router.registerGlobalFilter(LogGlobalFilter);

        OnlyBeforeFilter.reset();
        expect(() => app._router.handle(request, response, null)).not.toThrowError();

        setTimeout(() =>
        {
            try
            {
                expect(injector.resolve(LogActionFilter).executedBefore).toBe(true);
                expect(injector.resolve(LogActionFilter).executedAfter).toBe(true);
                expect(injector.resolve(LogControllerFilter).executedAfter).toBe(true);
                expect(injector.resolve(LogGlobalFilter).executedAfter).toBe(true);
                expect(response.statusCode).toBe(200);
                expect(response._getData()).toBe("closed before");
                done();
            }
            catch (e)
            {
                done(e);
            }
        }, 100);
    });

    it("should ignore closed response on the before method on an action filter", (done) =>
    {
        const app: Application = express();
        const logger = new Logger();
        const injector = DependencyCollection.globalCollection.buildContainer();
        const router: ApiRouter = new ApiRouter(logger, injector);
        const request = httpMocks.createRequest({ url: "ignore-break-before-action-filter", method: "GET" });
        const response = httpMocks.createResponse();

        router.ignoreClosedResponseOnFilters();
        router.registerRoutes(app);
        router.registerGlobalFilter(LogGlobalFilter);

        OnlyBeforeFilter.reset();
        expect(() => app._router.handle(request, response, null)).not.toThrowError();

        setTimeout(() =>
        {
            try
            {
                expect(injector.resolve(LogActionFilter).executedAfter).toBe(true);
                expect(injector.resolve(LogControllerFilter).executedAfter).toBe(true);
                expect(injector.resolve(LogGlobalFilter).executedAfter).toBe(true);
                expect(response.statusCode).toBe(200);
                expect(response._getData()).toBe("closed before");
                done();
            }
            catch (e)
            {
                done(e);
            }
        }, 100);
    });

    it("should ignore closed response on the action", (done) =>
    {
        const app: Application = express();
        const logger = new Logger();
        const injector = DependencyCollection.globalCollection.buildContainer();
        const router: ApiRouter = new ApiRouter(logger, injector);
        const request = httpMocks.createRequest({ url: "ignore-break-on-action-filter", method: "GET" });
        const response = httpMocks.createResponse();

        router.ignoreClosedResponseOnFilters();
        router.registerRoutes(app);
        router.registerGlobalFilter(LogGlobalFilter);

        OnlyBeforeFilter.reset();
        expect(() => app._router.handle(request, response, null)).not.toThrowError();

        setTimeout(() =>
        {
            try
            {
                expect(injector.resolve(LogActionFilter).executedAfter).toBe(true);
                expect(injector.resolve(LogControllerFilter).executedAfter).toBe(true);
                expect(injector.resolve(LogGlobalFilter).executedAfter).toBe(true);
                expect(response.statusCode).toBe(200);
                expect(response._getData()).toBe("closed on action");
                done();
            }
            catch (e)
            {
                done(e);
            }
        }, 100);
    });

    it("should ignore closed response on the after action filter", (done) =>
    {
        const app: Application = express();
        const logger = new Logger();
        const injector = DependencyCollection.globalCollection.buildContainer();
        const router: ApiRouter = new ApiRouter(logger, injector);
        const request = httpMocks.createRequest({ url: "ignore-break-on-after-action-filter", method: "GET" });
        const response = httpMocks.createResponse();

        router.ignoreClosedResponseOnFilters();
        router.registerRoutes(app);
        router.registerGlobalFilter(LogGlobalFilter);

        OnlyBeforeFilter.reset();
        expect(() => app._router.handle(request, response, null)).not.toThrowError();

        setTimeout(() =>
        {
            try
            {
                expect(injector.resolve(LogControllerFilter).executedAfter).toBe(true);
                expect(injector.resolve(LogGlobalFilter).executedAfter).toBe(true);
                expect(response.statusCode).toBe(200);
                expect(response._getData()).toBe("closed after");
                done();
            }
            catch (e)
            {
                done(e);
            }
        }, 100);
    });

    it("should ignore closed response on the after controller filter", (done) =>
    {
        const app: Application = express();
        const logger = new Logger();
        const injector = DependencyCollection.globalCollection.buildContainer();
        const router: ApiRouter = new ApiRouter(logger, injector);
        const request = httpMocks.createRequest({ url: "ignore-break-on-after-controller-filter", method: "GET" });
        const response = httpMocks.createResponse();

        router.ignoreClosedResponseOnFilters();
        router.registerRoutes(app);
        router.registerGlobalFilter(LogGlobalFilter);

        OnlyBeforeFilter.reset();
        expect(() => app._router.handle(request, response, null)).not.toThrowError();

        setTimeout(() =>
        {
            try
            {
                expect(injector.resolve(LogGlobalFilter).executedAfter).toBe(true);
                expect(response.statusCode).toBe(200);
                expect(response._getData()).toBe("closed after");
                done();
            }
            catch (e)
            {
                done(e);
            }
        }, 100);
    });

    it("should notify error on the before method on a global filter", (done) =>
    {
        const app: Application = express();
        const logger = new Logger();
        const injector = DependencyCollection.globalCollection.buildContainer();
        const router: ApiRouter = new ApiRouter(logger, injector);
        const request = httpMocks.createRequest({ url: "throw-on-before-global-filter", method: "GET" });
        const response = httpMocks.createResponse();

        injector.resolve(LogGlobalFilter).clean();
        injector.resolve(LogControllerFilter).clean();
        injector.resolve(LogActionFilter).clean();

        router.registerRoutes(app);
        router.registerGlobalFilters([ThrowBeforeFilter, LogGlobalFilter]);

        OnlyBeforeFilter.reset();
        expect(() => app._router.handle(request, response, null)).not.toThrowError();

        setTimeout(() =>
        {
            try
            {
                expect(injector.resolve(LogGlobalFilter).executedError).toBe(true);
                expect(injector.resolve(LogControllerFilter).executedError).toBe(true);
                expect(injector.resolve(LogActionFilter).executedError).toBe(true);

                expect(injector.resolve(LogControllerFilter).executedBefore).toBe(false);
                expect(injector.resolve(LogActionFilter).executedBefore).toBe(false);

                expect(injector.resolve(LogActionFilter).executedAfter).toBe(false);
                expect(injector.resolve(LogControllerFilter).executedAfter).toBe(false);
                expect(injector.resolve(LogGlobalFilter).executedAfter).toBe(false);

                expect(response.statusCode).toBe(500);
                expect(response._getData()).toBe("throw on before");
                done();
            }
            catch (e)
            {
                done(e);
            }
        }, 100);
    });
    // TODO: Test OnError method.
    // TODO: Test Filter order.
});