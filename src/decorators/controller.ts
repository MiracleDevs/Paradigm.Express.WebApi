import { IControllerDescriptor } from './controller-descriptor.interface';
import { controllerTypeCollection } from './controller-type-collection';
import { ControllerType } from './controller-type';
import { Injectable, DependencyLifeTime, ObjectType } from '@miracledevs/paradigm-web-di';

export function Controller(descriptor: IControllerDescriptor): <T>(controller: ObjectType<T>) => void
{
    return <T>(controller: ObjectType<T>): void =>
    {
        if (!controller)
            throw new Error('Can not decorate a null or undefined value as a controller.');

        if (controllerTypeCollection.contains(controller))
            throw new Error(`The controller ${controller.constructor.name} is already registered.`);

        controllerTypeCollection.register(new ControllerType(controller, descriptor));
        Injectable({ lifeTime: DependencyLifeTime.Scoped })(controller);
    };
}