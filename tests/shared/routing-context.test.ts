import { RoutingContext } from "../../src/shared/routing-context";
import { ControllerType } from "../../src/decorators/controller-type";
import { ActionType } from "../../src/decorators/action-type";

describe("Routing Context", () =>
{
    class Controller
    {
        method(): void
        {

        }
    }

    it("Should instantiate the http context", () => expect(new RoutingContext(new ControllerType(Controller, { route: '' }), new ActionType(Controller, "method", { route: '' }, [], undefined))).not.toBeNull());
    it("Should convert to string", () => expect(new RoutingContext(new ControllerType(Controller, { route: '' }), new ActionType(Controller, "method", { route: '' }, [], undefined)).toString()).toBe('Controller.method'));
});