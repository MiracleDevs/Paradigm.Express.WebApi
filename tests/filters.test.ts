import { IFilter } from "../src/filters/filter.interface";
import { HttpContext } from "../src/shared/http-context";
import { Injectable } from "@miracledevs/paradigm-web-di";
import { ApiController } from "../src/controllers/api-controller";
import { Controller } from "../src/decorators/controller";
import { Action } from "../src/decorators/action";
import { Application } from "express";
import { ApiRouter } from "../src/api-router";
import httpMocks from "node-mocks-http";
import express from "express";
import { RoutingContext } from "../src/shared/routing-context";

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
});