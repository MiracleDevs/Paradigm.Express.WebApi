import { HttpContext } from "../../src/shared/http-context";
import { Request, Response, request } from 'express';

describe("HTTP Context", () =>
{
    it("Should instantiate the http context", () => expect(new HttpContext({} as Request, {} as Response)).not.toBeNull());
    it("Should inform if the response has been closed", () => expect(new HttpContext({} as Request, { finished: true } as Response).closed).toBeTruthy());
});