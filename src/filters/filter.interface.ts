import { HttpContext } from '../shared/http-context';
import { RoutingContext } from '../shared/routing-context';

export interface IFilter
{
    beforeExecute?(httpContext: HttpContext, routingContext: RoutingContext): Promise<void> | void;
    afterExecute?(httpContext: HttpContext, routingContext: RoutingContext): Promise<void> | void;
}
