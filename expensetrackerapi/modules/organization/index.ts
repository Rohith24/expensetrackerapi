import organizationsFactory = require('./organization');

//this will combile all type in all files as single namesapce for better reference in other files.
export namespace organization {
    export class organization extends organizationsFactory.organizationFactory { }

}