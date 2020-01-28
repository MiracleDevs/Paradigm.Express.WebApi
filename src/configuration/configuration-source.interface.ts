export interface IConfigurationSource<T = any>
{
    get(): T;
}