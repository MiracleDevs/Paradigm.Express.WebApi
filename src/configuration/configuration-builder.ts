import { IConfigurationSource } from "./configuration-source.interface";
import { JsonConfigurationSource } from "./json.configuration-source";
import { EnvironmentVariableConfigurationSource } from "./environment-variable.configuration-source";
import { EnvironmentFileConfigurationSource } from "./environment-file.configuration-source";

export class ConfigurationBuilder
{
    private readonly _sources: IConfigurationSource[];

    constructor()
    {
        this._sources = [];
    }

    addJsonFile(filePath?: string): ConfigurationBuilder
    {
        this._sources.push(new JsonConfigurationSource(filePath));
        return this;
    }

    addEnvironmentVariables(settingsPrefix?: string): ConfigurationBuilder
    {
        this._sources.push(new EnvironmentVariableConfigurationSource(settingsPrefix));
        return this;
    }

    addEnvironmentFile(filePath: string, settingsPrefix?: string): ConfigurationBuilder
    {
        this._sources.push(new EnvironmentFileConfigurationSource(filePath, settingsPrefix));
        return this;
    }

    build<TConfiguration>(configurationClass: { new(): TConfiguration; }): TConfiguration
    {
        const configuration = new configurationClass();
        this._sources.forEach(x => Object.assign(configuration, x.get()));
        return configuration;
    }
}
