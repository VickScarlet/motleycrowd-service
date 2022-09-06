import {Collection, IndexDescription, CreateCollectionOptions} from 'mongodb';

export default class Base extends Collection {
    static options:CreateCollectionOptions;
    static indexes:IndexDescription[];

    constructor(collection: Collection): Base;

    $flat(obj:any, depth?=Infinity, flatArray?=false):any;
}