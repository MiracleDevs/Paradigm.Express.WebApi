import { ControllerTypeCollection } from "../../src/decorators/controller-type-collection";
import { ApiController } from "../../src/controllers/api-controller";
import { ControllerType } from "../../src/decorators/controller-type";

describe("Controller Type Collection", () =>
{
    class Controller extends ApiController
    {
    }

    it("should have a global instance", () => expect(ControllerTypeCollection.globalInstance).not.toBeNull());

    it("should allow register and get controller type", () =>
    {
        const controllerType = new ControllerType(Controller, { route: "" });
        ControllerTypeCollection.globalInstance.register(controllerType);
        expect(ControllerTypeCollection.globalInstance.get(Controller)).toBe(controllerType);
    });

    it("shouldn't allow to register a controller twice", () =>
    {
        const controllerType = new ControllerType(Controller, { route: "" });
        expect(() => ControllerTypeCollection.globalInstance.register(controllerType)).toThrowError("The controller Controller is already registered.");
    });

    it("should indicate if contains or not a controller", () =>
    {
        class MyClass { }
        expect(ControllerTypeCollection.globalInstance.contains(Controller)).toBeTruthy();
        expect(ControllerTypeCollection.globalInstance.contains(MyClass)).toBeFalsy();
    });

    it("should return iterator", () =>
    {
        expect(ControllerTypeCollection.globalInstance.getControllers()).not.toBeNull();
    });
});