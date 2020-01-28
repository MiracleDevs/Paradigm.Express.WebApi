import { IFilter } from "../filters/filter.interface";
import { ObjectType } from "@miracledevs/paradigm-web-di";

export interface IControllerDescriptor
{
    route: string;
    scope?: string;
    filters?: ObjectType<IFilter>[];
}