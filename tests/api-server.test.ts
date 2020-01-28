import { ApiServer } from "../src/api-server";
import { Logger } from "../src/logging/logger";
import { ConfigurationBuilder } from "../src/configuration/configuration-builder";
import { DependencyCollection } from "@miracledevs/paradigm-web-di";
import { ApiController } from "../src/controllers/api-controller";

describe("Api Server", () =>
{
    class Controller1 extends ApiController
    {

    }

    class Controller2 extends ApiController
    {

    }

    class Controller3 extends ApiController
    {

    }

    class Server extends ApiServer
    {
        configured: boolean;

        protected configureApplication(): void
        {
            expect(() => this.registerController(Controller1)).not.toThrowError();
            expect(() => this.registerControllers([Controller2, Controller3])).not.toThrowError();
            expect(this.controllers).toHaveLength(3);
            this.configured = true;
        }
    }

    it("should instantiate the api server", () => expect(new Server()).not.toBeNull());

    it("should set the configuration builder", () =>
    {
        const server = new Server();
        const configurationBuilder = new ConfigurationBuilder();
        expect(() => server.setConfigurationBuilder(configurationBuilder)).not.toThrowError();
        expect(server.configurationBuilder).toBe(configurationBuilder);
    });

    it("should set the logger", () =>
    {
        const server = new Server();
        const logger = new Logger();
        expect(() => server.setLogger(logger)).not.toThrowError();
        expect(server.logger).toBe(logger);
    });

    it("should set the dependency container", () =>
    {
        const server = new Server();
        const dependencyContainer = new DependencyCollection().buildContainer();
        expect(() => server.setDependencyContainer(dependencyContainer)).not.toThrowError();
        expect(server.dependencyContainer).toBe(dependencyContainer);
    });

    it("should start the server", () =>
    {
        const server = new Server();
        expect(() => server.start()).not.toThrowError();
        expect(server.configured).toBeTruthy();
        expect(server.expressApplication).not.toBeNull();
        expect(server.routing).not.toBeNull();
    });
});