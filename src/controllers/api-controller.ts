import { HttpContext } from "../shared/http-context";

export abstract class ApiController
{
    private _httpContext: HttpContext;

    public get httpContext(): HttpContext { return this._httpContext; }

    setHttpContext(httpContext: HttpContext)
    {
        this._httpContext = httpContext;
    }
}