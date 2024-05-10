import auditsFactory = require('./audit');

//this will combile all type in all files as single namesapce for better reference in other files.
export namespace audit {
    export class audits extends auditsFactory.audit { }

}