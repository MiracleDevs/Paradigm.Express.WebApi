import { HttpContext } from '../shared/http-context';

export interface IFilter
{
    beforeExecute?(httpContext: HttpContext): Promise<void> | void;
    afterExecute?(httpContext: HttpContext): Promise<void> | void;
}
