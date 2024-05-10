

import userClass = require('./user');
import _group = require('./group');
import _role = require('./role');


//this will combile all type in all files as single namesapce for better reference in other files.
export namespace admin
{
    export class user extends userClass.user { }
    export class groupFactory extends _group.groupFactory { }
    export class roleFactory extends _role.roleFactory { }

}