import { IConfigurationSource } from "./configuration-source.interface";
import fs from 'fs';

export class JsonConfigurationSource implements IConfigurationSource
{
    constructor(private readonly filePath: string)
    {
    }

    get(): any
    {
        const rawData = fs.readFileSync(this.filePath, '');
        return JSON.parse(rawData);
    }
}