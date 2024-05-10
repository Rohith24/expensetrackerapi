


interface Array<T> {
    /**returns true if specified item is available in the Array<T>
    @item array Item
    */
    contains(item: T): boolean;

    /**removes the item from Array<T> and returns true item was avaible in the Array<T>
    @item array Item
    */
    remove(...args: any[]): this;

    where(callbackfn: (value: T) => boolean): Array<T>;
    select(callbackfn: (value: T) => any): Array<any>;
    distinct(): Array<T>;
    sortBy(sortColumns: Array<any>): Array<T>;
    groupBy(column: string): any;
}

declare namespace NodeJS {
    //export interface currentContext
    //{
    //    request: Express.Request;
    //    response: Express.Response;
    //}

    export interface Global {
        // Tenants: any;
        getTenant(name: string): any;
        isPortChecked: boolean;
        connectedUserList: any;
        //currentContext: currentContext;
    }



}

interface String {
    contains(inputString: string): boolean;
}

interface StringConstructor {
    isNullOrWhiteSpace(str: string): boolean;
}

interface Number {
    countDecimals(): number;
    toFixedNoRounding(n: number): number;
}

declare module "mongoose"
{
    export interface Model<T> {
        dateModified;
    }
}
//import mongodb = require('mongodb');

declare namespace Express {

    export interface Request {
        tenantName: string;
        tenant: any;
        token: string;
        isAuthenticated: boolean;
        currentUser: any;

    }

    //export interface Response
    //{

    //}
}





