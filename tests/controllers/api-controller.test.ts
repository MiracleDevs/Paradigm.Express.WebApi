import { ApiController } from "../../src/controllers/api-controller";
import { ControllerType } from "../../src/decorators/controller-type";
import { HttpContext } from "../../src/shared/http-context";
import { Request, Response } from "express";

describe("API Controller", () =>
{
    class Controller extends ApiController
    {

    }

    it("should instantiate the controller", () => expect(new Controller()).not.toBeNull());

    it("should set and get the http context", () =>
    {
        const controller = new Controller();
        const context = new HttpContext({} as Request, {} as Response);

        expect(() => controller.setHttpContext(context)).not.toThrowError();
        expect(controller.httpContext).toBe(context);
    });

    it("shouldn't let change the http context twice", () =>
    {
        const controller = new Controller();
        const context1 = new HttpContext({} as Request, {} as Response);
        const context2 = new HttpContext({} as Request, {} as Response);

        expect(() => controller.setHttpContext(context1)).not.toThrowError();
        expect(() => controller.setHttpContext(context2)).toThrowError("The http context can't be changed.");
        expect(controller.httpContext).toBe(context1);
    });
});