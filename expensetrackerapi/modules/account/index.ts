import accountsFactory = require('./account');

//this will combile all type in all files as single namesapce for better reference in other files.
export namespace account {
    export class accounts extends accountsFactory.accountFactory { }

}