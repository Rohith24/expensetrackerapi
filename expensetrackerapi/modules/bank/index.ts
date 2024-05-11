import banksFactory = require('./bank');

//this will combile all type in all files as single namesapce for better reference in other files.
export namespace bank {
    export class banks extends banksFactory.bankFactory { }

}