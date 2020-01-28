import { IConfigurationSource } from "./configuration-source.interface";

export class EnvironmentVariableConfigurationSource<T = any> implements IConfigurationSource<T>
{
    constructor(protected readonly settingsPrefix: string) { }

    get(): T
    {
        const keys = this.settingsPrefix
            ? Object.keys(process.env).filter(key => key.toUpperCase().startsWith(this.settingsPrefix.toUpperCase()))
            : Object.keys(process.env);

        return keys.reduce((obj, key) => this.mergeDeep(obj, this.processConfigurationValue(key)), {});
    }

    private processConfigurationValue(key: string, keySections?: string[]): any
    {
        const objKey = this.settingsPrefix ? key.toUpperCase().replace(this.settingsPrefix.toUpperCase(), '') : key;
        keySections = keySections || objKey.split('__');

        if (keySections.length === 1)
            return { [keySections[0]]: process.env[key] };

        return { [keySections[0]]: this.processConfigurationValue(key, keySections.slice(1)) };
    }

    private mergeDeep(target: any, ...sources: any): any
    {
        if (!sources.length)
            return target;

        const source = sources.shift();

        if (this.isObject(target) && this.isObject(source))
        {
            for (const key in source)
            {
                if (this.isObject(source[key]))
                {
                    if (!target[key])
                        Object.assign(target, { [key]: {} });

                    this.mergeDeep(target[key], source[key]);
                }
                else
                {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }

        return this.mergeDeep(target, ...sources);
    }

    private isObject(item: any): boolean
    {
        return item && typeof item === 'object' && !Array.isArray(item);
    }
}

