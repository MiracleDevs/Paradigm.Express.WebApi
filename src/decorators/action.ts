import { IActionDescriptor } from './action-descriptor.interface';
import { ActionType } from './action-type';
import { HttpMethod } from '../shared/http-method';
import { actionTypeCollection } from './action-type-collection';
import { ObjectType } from '@miracledevs/paradigm-web-di';
import 'reflect-metadata';

export function Action(actionDescriptor?: IActionDescriptor): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void
{
    return (controller: ObjectType, methodName: string, methodDescriptor: PropertyDescriptor): void =>
    {
        const controllerName = controller.constructor.name;

        if (actionTypeCollection.get(controllerName, methodName))
            throw new Error(`The action '(${controllerName}.${methodName}' was already registered.`);

        if (!actionDescriptor)
            actionDescriptor = {} as IActionDescriptor;

        if (!actionDescriptor.method)
        {
            const methodByConvention: HttpMethod | undefined = (<any>HttpMethod)[methodName.toUpperCase()];
            actionDescriptor.method = methodByConvention ? methodByConvention : HttpMethod.GET;
        }

        const actionType = new ActionType(
            controllerName,
            methodName,
            controller,
            actionDescriptor ? actionDescriptor : {},
            Reflect.getMetadata("design:paramtypes", controller, methodName),
            Reflect.getMetadata("design:returntype", controller, methodName)
        );

        actionTypeCollection.register(actionType);
    };
}
