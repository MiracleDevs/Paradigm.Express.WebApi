import { JsonConfigurationSource } from "../../src/configuration/json.configuration-source";

describe("JSON Configuration Source", () =>
{
    it("should instantiate a json configuration source", () => expect(new JsonConfigurationSource("./config.json")).not.toBeNull());

    it("shouldn't throw if json file does not exist", () =>
    {
        const jsonConfigurationSource = new JsonConfigurationSource("./tests/configuration/non_existing_config.json");
        expect(() => jsonConfigurationSource.get()).not.toThrow();
        expect(jsonConfigurationSource.get()).not.toBeNull();
        expect(jsonConfigurationSource.get()).not.toBeUndefined();
    });

    it("should open the configuration from a json file", () =>
    {
        const jsonConfigurationSource = new JsonConfigurationSource("./tests/configuration/config.json");
        const object = jsonConfigurationSource.get();

        expect(object).not.toBeNull();
        expect(object.value).toBe("Json object");

        expect(object.complexObject).not.toBeNull();
        expect(object.complexObject.value).toBe("Complex json object value");

        expect(object.complexArray).not.toBeNull();
        expect(object.complexArray).toHaveLength(2);
        expect(object.complexArray[0]).toBe("First json array value");
        expect(object.complexArray[1]).toBe("Second json array value");
    });
});