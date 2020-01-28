import { ControllerType } from "./controller-type";
import { ObjectType } from "@miracledevs/paradigm-web-di";

class ControllerTypeCollection
{
    private readonly _registeredTypes: Map<ObjectType, ControllerType>;

    constructor()
    {
        this._registeredTypes = new Map<ObjectType, ControllerType>();
    }

    register(controllerType: ControllerType): void
    {
        this._registeredTypes.set(controllerType.type, controllerType);
    }

    get(controller: ObjectType): ControllerType
    {
        return this._registeredTypes.get(controller);
    }

    contains(controller: ObjectType): boolean
    {
        return this._registeredTypes.has(controller);
    }

    getControllers(): IterableIterator<ControllerType>
    {
        return this._registeredTypes.values();
    }
}

export const controllerTypeCollection = new ControllerTypeCollection();
