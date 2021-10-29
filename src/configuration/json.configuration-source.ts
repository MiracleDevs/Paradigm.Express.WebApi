import { IConfigurationSource } from "./configuration-source.interface";
import fs from 'fs';

export class JsonConfigurationSource implements IConfigurationSource
{
    constructor(private readonly filePath: string)
    {
    }

    get(): any
    {
        try
        {
            const rawData = fs.readFileSync(this.filePath, 'utf-8');
            return JSON.parse(rawData);
        }
        catch
        {
            return {};
        }
    }
}