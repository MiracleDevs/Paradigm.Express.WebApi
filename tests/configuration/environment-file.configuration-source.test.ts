import { EnvironmentFileConfigurationSource } from "../../src/configuration/environment-file.configuration-source";

describe("Environment File Configuration Source", () =>
{
    it("should instantiate an environment file configuration source", () => expect(new EnvironmentFileConfigurationSource("./config.env", "paradigm_test__")).not.toBeNull());

    it("should open the configuration from an .env file with a prefix", () =>
    {
        const configurationSource = new EnvironmentFileConfigurationSource("./tests/configuration/config.prefixed.env", "paradigm_test__");
        const object = configurationSource.get();

        expect(object).not.toBeNull();
        expect(object.value).toBe("Env object");

        expect(object.complexObject).not.toBeNull();
        expect(object.complexObject.value).toBe("Complex env object value");

        expect(object.complexArray).not.toBeNull();
        expect(object.complexArray).toHaveLength(2);
        expect(object.complexArray[0]).toBe("First env array value");
        expect(object.complexArray[1]).toBe("Second env array value");
    });

    it("should open the configuration from an .env file without a prefix", () =>
    {
        const configurationSource = new EnvironmentFileConfigurationSource("./tests/configuration/config.unprefixed.env");
        const object = configurationSource.get();

        expect(object).not.toBeNull();
        expect(object.value).toBe("Env object");

        expect(object.complexObject).not.toBeNull();
        expect(object.complexObject.value).toBe("Complex env object value");

        expect(object.complexArray).not.toBeNull();
        expect(object.complexArray).toHaveLength(2);
        expect(object.complexArray[0]).toBe("First env array value");
        expect(object.complexArray[1]).toBe("Second env array value");
    });
});