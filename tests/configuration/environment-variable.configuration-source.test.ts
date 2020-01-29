import { JsonConfigurationSource } from "../../src/configuration/json.configuration-source";
import { EnvironmentVariableConfigurationSource } from "../../src/configuration/environment-variable.configuration-source";

describe("Environment Variable Configuration Source", () =>
{
    it("should instantiate an environment variable configuration source", () => expect(new EnvironmentVariableConfigurationSource()).not.toBeNull());

    it("should open the configuration from a json file", () =>
    {
        const configurationSource = new EnvironmentVariableConfigurationSource("paradigm_test__");

        process.env.paradigm_test__value1 = "Env object 1";
        process.env.paradigm_test__value2 = "Env object 2";

        const object = configurationSource.get();

        expect(object).not.toBeNull();
        expect(object.value1).toBe("Env object 1");
        expect(object.value2).toBe("Env object 2");
    });
});