import _tenant = require('./tenant');

//this will combile all type in all files as single namesapce for better reference in other files.

export namespace system {
    export class tenant extends _tenant { constructor() { super(); }} ;
    export class tenantFactory extends _tenant {
        private constructor() {
            super();
        }
    }

}
