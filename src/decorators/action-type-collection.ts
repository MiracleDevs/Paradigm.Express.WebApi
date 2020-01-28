import { ActionType } from "./action-type";

class ActionTypeCollection
{
    private readonly _registeredTypes: ActionType[];

    constructor()
    {
        this._registeredTypes = [];
    }

    register(actionType: ActionType): void
    {
        this._registeredTypes.push(actionType);
    }

    get(controllerName: string, actionName: string): ActionType
    {
        return this._registeredTypes.find(x => x.methodName === actionName && x.controllerName === controllerName);
    }

    getForController(controllerName: string): ActionType[]
    {
        return this._registeredTypes.filter(x => x.controllerName === controllerName);
    }

    getRegisteredActionTypes(): ActionType[]
    {
        return [...this._registeredTypes];
    }
}

export const actionTypeCollection = new ActionTypeCollection();
