import { Request, Response } from 'express';

export class HttpContext
{
    public get closed(): boolean { return this.response && this.response.finished; }

    constructor(public readonly request: Request, public readonly response: Response)
    {
    }
}
