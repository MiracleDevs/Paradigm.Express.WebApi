import { HttpContext } from "../shared/http-context";

export abstract class ApiController
{
    private _httpContext: HttpContext;

    public get httpContext(): HttpContext { return this._httpContext; }

    setHttpContext(httpContext: HttpContext)
    {
        if (this.httpContext)
            throw new Error("The http context can't be changed.");

        this._httpContext = httpContext;
    }
}