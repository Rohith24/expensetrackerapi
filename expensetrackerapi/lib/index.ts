
import utils = require('./utilities');
import _crypto = require('./crypto');

export namespace lib {
    export var utilities = utils;
    export class crypto extends _crypto.crypto { }

}