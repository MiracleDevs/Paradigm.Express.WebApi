import { HostBuilder } from "../src/host-builder";

describe("Host Builder", () =>
{
    it("should instantiate the host builder", () => expect(() => new HostBuilder()).not.toBeNull());
});