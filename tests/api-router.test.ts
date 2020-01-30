import { ApiRouter } from "../src/api-router";
import { ApiController } from "../src/controllers/api-controller";
import { IFilter } from "../src/filters/filter.interface";
import { HttpContext } from "../src/shared/http-context";
import { Controller } from "../src/decorators/controller";
import { Injectable, DependencyCollection } from "@miracledevs/paradigm-web-di";
import { Action } from "../src/decorators/action";
import express, { Application } from 'express';
import { HttpMethod } from "../src/shared/http-method";
import httpMocks from "node-mocks-http";
import { Logger } from "../src/logging/logger";

describe("API Router", () =>
{
    @Injectable()
    class RoutingFilter implements IFilter
    {
        public static beforeIndex = 0;

        public static afterIndex = 0;

        static reset(): void
        {
            RoutingFilter.beforeIndex = 0;
            RoutingFilter.afterIndex = 0;
        }

        beforeExecute(httpContext: HttpContext): void
        {
            ++RoutingFilter.beforeIndex;
        }

        afterExecute(httpContext: HttpContext): void
        {
            ++RoutingFilter.afterIndex;
        }
    }

    @Controller({ route: "routing", filters: [RoutingFilter] })
    class RoutingController extends ApiController
    {
        static var1: number;

        static var2: string;

        static var3: boolean;

        static var4: Date;

        static object: any;

        static get: boolean;

        static post: boolean;

        static put: boolean;

        static delete: boolean;

        static resolve: () => void;

        static reset(): void
        {
            RoutingController.var1 = null;
            RoutingController.var2 = null
            RoutingController.var3 = null;
            RoutingController.var4 = null;
            RoutingController.object = null;
            RoutingController.resolve = null;
            RoutingController.get = null;
            RoutingController.post = null;
            RoutingController.put = null;
            RoutingController.delete = null;
        }

        @Action({ route: "action/:var1/:var2", query: ":var3&:var4", method: HttpMethod.GET, fromBody: false, filters: [RoutingFilter] })
        async routingAction(var1: number, var2: string, var3: boolean, var4: Date): Promise<void>
        {
            RoutingController.var1 = var1;
            RoutingController.var2 = var2;
            RoutingController.var3 = var3;
            RoutingController.var4 = var4;
            RoutingController.resolve();
        }

        @Action({ route: "pass-object", method: HttpMethod.POST, fromBody: true, filters: [RoutingFilter] })
        async routingObject(object: Object): Promise<void>
        {
            RoutingController.object = object;
            RoutingController.resolve();
        }

        @Action({ route: "wrong-param/:param" })
        async wrongParam(param: Object): Promise<void>
        {
        }

        @Action({ route: "return-object", method: HttpMethod.GET, fromBody: false, filters: [RoutingFilter] })
        async returnObject(): Promise<any>
        {
            setTimeout(() => RoutingController.resolve(), 100);
            return { value: "a value", name: "a name", array: [1, 2, 3] };
        }

        @Action({ route: "failing", method: HttpMethod.GET, fromBody: false, filters: [RoutingFilter] })
        async failingAction(): Promise<any>
        {
            setTimeout(() => RoutingController.resolve(), 100);
            throw new Error("This is an error");
        }

        @Action({ route: "finishing", method: HttpMethod.GET, fromBody: false, filters: [RoutingFilter] })
        finishingAction(): void
        {
            this.httpContext.response.status(200).send("finished");
            RoutingController.resolve();
        }

        @Action()
        get(): void
        {
            RoutingController.get = true;
            RoutingController.resolve();
        }

        @Action()
        post(): void
        {
            RoutingController.post = true;
            RoutingController.resolve();
        }

        @Action()
        put(): void
        {
            RoutingController.put = true;
            RoutingController.resolve();
        }

        @Action()
        delete(): void
        {
            RoutingController.delete = true;
            RoutingController.resolve();
        }

        @Action({ route: "removable" })
        removableAction(): void
        {
        }
    }

    @Controller({ route: null })
    class EmptyRouteController extends ApiController
    {
        static executed: boolean = false;
        static resolve: () => void;
        @Action()
        get(): void
        {
            EmptyRouteController.executed = true;
            EmptyRouteController.resolve();
        }
    }

    @Controller({ route: "end/" })
    class EndWithBarController extends ApiController
    {
        static executed: boolean = false;
        static resolve: () => void;
        @Action({ route: "action" })
        get(): void
        {
            EndWithBarController.executed = true;
            EndWithBarController.resolve();
        }
    }

    @Controller({ route: "boolean" })
    class BooleanParamController extends ApiController
    {
        static executed: boolean = false;
        static resolve: () => void;
        static ptrue: boolean;
        static pyes: boolean;
        static p1: boolean;

        @Action({ route: ":ptrue/:pyes/:p1" })
        get(ptrue: boolean, pyes: boolean, p1: boolean): void
        {
            EmptyRouteController.executed = true;
            BooleanParamController.ptrue = ptrue;
            BooleanParamController.pyes = pyes;
            BooleanParamController.p1 = p1;
            BooleanParamController.resolve();
        }
    }


    it("should instantiate a new router", () => expect(new ApiRouter()).not.toBeNull());

    it("should instantiate a new router with custom parameters", () => expect(new ApiRouter(new Logger(), DependencyCollection.globalCollection.buildContainer())).not.toBeNull());

    it("should register global filter", () => expect(() => new ApiRouter().registerGlobalFilter(RoutingFilter)).not.toThrowError());

    it("should register global filters", () => expect(() => new ApiRouter().registerGlobalFilters([RoutingFilter, RoutingFilter])).not.toThrowError());

    it("should register the routes", () =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();

        expect(() => router.registerRoutes(app)).not.toThrowError();
        expect((app._router.stack as any[]).find(x => x && x.route && x.route.path === "/action/:var1/:var2")).not.toBeNull();
    });

    it("should call a registered the route", (done) =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "routing/action/1/hello", method: "GET", query: { var3: 'true', var4: '2012-12-12' } });
        const response = httpMocks.createResponse();

        router.registerRoutes(app);

        RoutingController.reset();
        RoutingController.resolve = () =>
        {
            try
            {
                expect(RoutingController.var1).toBe(1);
                expect(RoutingController.var2).toBe("hello");
                expect(RoutingController.var3).toBe(true);
                expect(RoutingController.var4).not.toBeNull();
                done();
            }
            catch (e)
            {
                done(e);
            }
        };

        app._router.handle(request, response, null);
    });

    it("should map body object to parameter", (done) =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "routing/pass-object", method: "POST" });
        const response = httpMocks.createResponse();
        request.headers["content-type"] = "application/json";
        request._setBody({ value: "a value", name: "a name", array: [1, 2, 3] });

        router.registerRoutes(app);

        RoutingController.reset();
        RoutingController.resolve = () =>
        {
            try
            {
                expect(RoutingController.object).not.toBeNull();
                expect(RoutingController.object.value).toBe("a value");
                expect(RoutingController.object.name).toBe("a name");
                expect(RoutingController.object.array).toHaveLength(3);
                done();
            }
            catch (e)
            {
                done(e);
            }
        };

        app._router.handle(request, response, null);
    });

    it("should return an object", (done) =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "routing/return-object", method: "GET" });
        const response = httpMocks.createResponse();
        request.headers["content-type"] = "application/json";

        router.registerRoutes(app);

        RoutingController.reset();
        RoutingController.resolve = () =>
        {
            try
            {
                expect(response.finished).toBeTruthy();
                expect(response.statusCode).toBe(200);

                const result = response._getData();

                expect(result).not.toBeNull();
                expect(result.value).toBe("a value");
                expect(result.name).toBe("a name");
                expect(result.array).toHaveLength(3);
                done();
            }
            catch (e)
            {
                done(e);
            }
        };

        app._router.handle(request, response, null);
    });

    it("should allow a method to fail", (done) =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "routing/failing", method: "GET" });
        const response = httpMocks.createResponse();
        request.headers["content-type"] = "application/json";

        router.registerRoutes(app);

        RoutingController.reset();
        RoutingController.resolve = () =>
        {
            try
            {
                expect(response.finished).toBeTruthy();
                expect(response.statusCode).toBe(500);

                const result = response._getData();
                expect(result).toBe("This is an error");
                done();
            }
            catch (e)
            {
                done(e);
            }
        };

        app._router.handle(request, response, null);
    });

    it("should call all the filters", (done) =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "routing/action/1/hello", method: "GET", query: { var3: 'true', var4: '2012-12-12' } });
        const response = httpMocks.createResponse();

        router.registerRoutes(app);
        router.registerGlobalFilter(RoutingFilter);

        RoutingFilter.reset();
        RoutingController.reset();
        RoutingController.resolve = () =>
        {
            try
            {
                expect(RoutingFilter.beforeIndex).toBe(3);
                setTimeout(() =>
                {
                    try
                    {
                        expect(RoutingFilter.afterIndex).toBe(3);
                        done();
                    }
                    catch (e)
                    {
                        done(e);
                    }
                }, 1000);
            }
            catch (e)
            {
                done(e);
            }
        };

        app._router.handle(request, response, null);
    });

    it("should fail if a method does not exist", () =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "routing/removable", method: "GET" });
        const response = httpMocks.createResponse();

        router.registerRoutes(app);
        router.registerGlobalFilter(RoutingFilter);

        RoutingController.prototype.removableAction = null;

        app._router.handle(request, response, null);

        expect(response.statusCode).toBe(500);
        expect(response._getData()).toBe("The method or action 'removableAction' does not exist in 'RoutingController'.");
    });

    it("shouldn't execute if response is finished", () =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "routing/action/1/hello", method: "GET", query: { var3: 'true', var4: '2012-12-12' } });
        const response = httpMocks.createResponse();
        response.finished = true;
        router.registerRoutes(app);
        router.registerGlobalFilter(RoutingFilter);

        RoutingFilter.reset();
        RoutingController.reset();

        app._router.handle(request, response, null);

        expect(RoutingFilter.beforeIndex).toBe(0);
        expect(RoutingFilter.afterIndex).toBe(0);
        expect(RoutingController.var1).toBe(null);
    });

    it("should finish the response in the controller", (done) =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "routing/finishing", method: "GET" });
        const response = httpMocks.createResponse();

        router.registerRoutes(app);
        router.registerGlobalFilter(RoutingFilter);
        RoutingFilter.reset();
        RoutingController.reset();
        RoutingController.resolve = () =>
        {
            try
            {
                expect(response.statusCode).toBe(200);
                expect(response._getData()).toBe("finished");
                done();
            }
            catch (e)
            {
                done(e);
            }
        }

        app._router.handle(request, response, null);
    });

    it("should execute a get method", (done) =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "routing", method: "GET" });
        const response = httpMocks.createResponse();

        router.registerRoutes(app);
        RoutingController.reset();
        RoutingController.resolve = () =>
        {
            try
            {
                expect(response.statusCode).toBe(200);
                expect(RoutingController.get).toBeTruthy();
                done();
            }
            catch (e)
            {
                done(e);
            }
        }

        app._router.handle(request, response, null);
    });

    it("should execute a post method", (done) =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "routing", method: "POST" });
        const response = httpMocks.createResponse();

        router.registerRoutes(app);
        RoutingController.reset();
        RoutingController.resolve = () =>
        {
            try
            {
                expect(response.statusCode).toBe(200);
                expect(RoutingController.post).toBeTruthy();
                done();
            }
            catch (e)
            {
                done(e);
            }
        }

        app._router.handle(request, response, null);
    });

    it("should execute a put method", (done) =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "routing", method: "PUT" });
        const response = httpMocks.createResponse();

        router.registerRoutes(app);
        RoutingController.reset();
        RoutingController.resolve = () =>
        {
            try
            {
                expect(response.statusCode).toBe(200);
                expect(RoutingController.put).toBeTruthy();
                done();
            }
            catch (e)
            {
                done(e);
            }
        }

        app._router.handle(request, response, null);
    });

    it("should execute a delete method", (done) =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "routing", method: "DELETE" });
        const response = httpMocks.createResponse();

        router.registerRoutes(app);
        RoutingController.reset();
        RoutingController.resolve = () =>
        {
            try
            {
                expect(response.statusCode).toBe(200);
                expect(RoutingController.delete).toBeTruthy();
                done();
            }
            catch (e)
            {
                done(e);
            }
        }

        app._router.handle(request, response, null);
    });

    it("should fail if parameter type is not recognized", (done) =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "routing/wrong-param/1", method: "GET" });
        const response = httpMocks.createResponse();

        router.registerRoutes(app);
        RoutingFilter.reset();
        RoutingController.reset();

        app._router.handle(request, response, null);

        setTimeout(() =>
        {
            try
            {
                expect(response.statusCode).toBe(500);
                expect(response._getData()).toBe("The parameter 'param' is of type 'Object'. Only Number, String, Date or Boolean are allowed for route or query string parameters.");
                done();
            }
            catch (e)
            {
                done(e);
            }
        }, 100);
    });

    it("should execute an action from a controller without route", (done) =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "/", method: "GET" });
        const response = httpMocks.createResponse();

        router.registerRoutes(app);
        RoutingFilter.reset();
        RoutingController.reset();
        EmptyRouteController.resolve = () =>
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
        };

        app._router.handle(request, response, null);
    });

    it("should execute an action from a controller that ends with a /.", (done) =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "end/action", method: "GET" });
        const response = httpMocks.createResponse();

        router.registerRoutes(app);
        RoutingFilter.reset();
        RoutingController.reset();
        EndWithBarController.resolve = () =>
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
        };

        app._router.handle(request, response, null);
    });

    it("should convert all types of boolean to be true", (done) =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "boolean/true/yes/1", method: "GET" });
        const response = httpMocks.createResponse();

        router.registerRoutes(app);
        RoutingFilter.reset();
        RoutingController.reset();
        BooleanParamController.resolve = () =>
        {
            try
            {
                expect(response.statusCode).toBe(200);
                expect(BooleanParamController.ptrue).toBeTruthy();
                expect(BooleanParamController.pyes).toBeTruthy();
                expect(BooleanParamController.p1).toBeTruthy();
                done();
            }
            catch (e)
            {
                done(e);
            }
        };

        app._router.handle(request, response, null);
    });

    it("should convert all types of boolean to be false", (done) =>
    {
        const app: Application = express();
        const router: ApiRouter = new ApiRouter();
        const request = httpMocks.createRequest({ url: "boolean/false/no/0", method: "GET" });
        const response = httpMocks.createResponse();

        router.registerRoutes(app);
        RoutingFilter.reset();
        RoutingController.reset();
        BooleanParamController.resolve = () =>
        {
            try
            {
                expect(response.statusCode).toBe(200);
                expect(BooleanParamController.ptrue).toBeFalsy();
                expect(BooleanParamController.pyes).toBeFalsy();
                expect(BooleanParamController.p1).toBeFalsy();
                done();
            }
            catch (e)
            {
                done(e);
            }
        };

        app._router.handle(request, response, null);
    });
});