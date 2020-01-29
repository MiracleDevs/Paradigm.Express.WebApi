import { IActionDescriptor } from "./action-descriptor.interface";
import { ApiController } from "../controllers/api-controller";
import { ActionUrl } from "./action-url";
import { ActionMethod } from "../shared/action-method";
import { ObjectType } from "@miracledevs/paradigm-web-di";
import { getObjectTypeName } from "@miracledevs/paradigm-web-di/object-type";

export class ActionType
{
    public readonly actionUrl: ActionUrl;

    public readonly controllerName: string;

    constructor(
        public readonly controllerType: ObjectType,
        public readonly methodName: string,
        public readonly descriptor: IActionDescriptor,
        public readonly parameters: ObjectType[],
        public readonly returnType: ObjectType)
    {
        this.controllerName = getObjectTypeName(controllerType);
        this.actionUrl = ActionUrl.parse(descriptor.route, descriptor.query, this);
    }

    getExecutableMethod<T = any>(instance: ApiController): ActionMethod<T>
    {
        const method = (instance as any)[this.methodName];

        if (!method)
            throw new Error(`The method or action '${this.methodName}' does not exist in '${this.controllerName}'.`);

        return method;
    }
}
