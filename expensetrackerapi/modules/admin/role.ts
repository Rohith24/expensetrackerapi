import express = require('express');
import coreModule = require('../coreModule');
import logger = require('../../controllers/logger');
import mongoose = require('mongoose');
const uuid = require('uuid');

var SchemaTypes = mongoose.Schema.Types;
var Schema = mongoose.Schema;


// create a roleschema
var roleSchema = new Schema({
    "_id": { type: String },
    "objectCode": { type: String, required: true, maxlength: 50, index: true },
    "description": { type: String, maxlength: 300 },
    "createdBy": { type: String, required: true },
    "dateCreated": { type: Date },
    "lastModifiedBy": { type: String, required: true },
    "lastModifiedDate": { type: Date },
    "deleteMark": { type: Number, required: true, default: 0 },//0 = available 1= deleted
    "isActive": { type: Number, required: true, default: 1 },//1=Active , 0= inActive
    "changeCount": { type: Number, required: true, default: 0 },
    "tenantId": { type: Number },
    "acl": [
        {
            "type": { type: String, maxlength: 50 },
            "code": { type: String, maxlength: 50 },
            "securityCode": { type: Number },
            "statusInd": { type: Number, default: 100 },
            "objectType": { type: String, maxlength: 50 },
            "_id": false
        }
    ],
    "rolePages": [
        {
            "pageCode": { type: String, maxlength: 50 },
            "securityCode": { type: Number },
            "inUse": { type: Number },
            "_id": false
        }
    ],
    "properties": [
        {
            "lineNo": { type: Number },
            "propertyCode": { type: String, maxlength: 50 },
            "description": { type: "String" },
            "value": { type: String },
            "level": { type: Number },
            "min": { type: Number },
            "max": { type: Number },
            "uomCode": { type: String, maxlength: 20 },
            "rollupInd": { type: String, maxlength: 50 },
            "lineType": { type: Number },
            "propertyType": { type: Number },      //0 = TPLINES, 1 = attributes, 2 = ContextAttributes, 3 = CustomAttributes
            "_id": false,
            "attributes": {
            }
        }
    ],
    "objectLinks": [
        {
            "lineNo": { type: Number },
            "objectId": { type: String, maxlength: 50 },
            "objectType": { type: String, maxlength: 50 },
            "linkObjectId": { type: String, maxlength: 50 },
            "linkObjectType": { type: String, maxlength: 50 },
            "secureMode": { type: Boolean, default: false },
            "linkObjectDesc": { type: String },
            "_id": false
        }
    ],
    "supplementObjects": {}
}, { timestamps: { createdAt: 'dateCreated', updatedAt: 'lastModifiedDate' }, strict: true });

var roleModel = mongoose.model('role', roleSchema);

export class roleFactory extends coreModule {

    private collectionName: string;
    constructor(request: express.Request) {
        super(request);
        this.collectionName = "role";
    }

    public getSchema = async () => {

        var model = await this.dal.model('role');

        return model.getSchema();
    }

    public getModelName = async () => {

        var model = await this.dal.model('role');

        return model.getModelName();
    }

    /**
    * DAL Call get from mongodb
    * @query mongodb query to get the role's
    * @options mongodb projections (optional)
    * return array of roles
    */
    public get = async (query: any, optional?: any) => {
        query = query || {};
        try {
            var model = await this.dal.model('role');

            var ret = await model.find(query, optional);
        } catch (err) {
            logger.error(this.request, "Error while executing get : " + err.toString(), 'role', "", "catch", '1', query,err);
            console.log(err);
        }
        return ret;
    }

    /**
      * get role from database
      * @param roleId  role ID
      * return role from database
      */
    public findById = async (roleId) => {
        try {
            let model = await this.dal.model('role');
            let obj = await model.findById("" + roleId);
            return obj;
        } catch (ex) {
            logger.error(this.request, "Error while executing findById : " + ex.toString(), 'role', "", "catch", '1', roleId,ex);
        }
    }

    /**
    * DAL Call findByCode from mongodb based on objectCode
    * @objectCode objectCode
    * return role object.
    */
    public findByCode = async (objectCode: string) => {
        try {
            var model = await this.dal.model("role");
            var ret = await model.findByCode(objectCode);
        } catch (err) {
            logger.error(this.request, "Error while executing findByCode : " + err.toString(), 'role', "", "catch", '1', objectCode, err);

            console.log(err);
        }
        return ret;
    }

    /**
      * get role from database
      * @param query query to get data from database
      * @param projection optional fields to return
      * return role from database
      */
    public findOne = async (query: any, projection?: any) => {
        try {
            query = query || {};
            projection = projection || {};
            var model = await this.dal.model('role');
            let ret = await model.findOne(query, projection);
            return ret;
        } catch (ex) {
            logger.error(this.request, "Error while executing findOne : " + ex.toString(), 'role', "", "catch", '1', query,ex);
        }
    }

    /**
    * saving role into mongodb
    * @roleObject  role
    * return  saved role
    */
    public _create = async (roleObject: any) => {
        try {
            var model = await this.dal.model('role');
            if (roleObject) {
                //var _id = await this.dal.getNextSequence('role');
                roleObject._id = uuid.v4();
                var resData = await model.create([roleObject]);

                // logger.info(this.request, "role saving into mongodb and redis cache.", 'role', roleObject._id, "save", "5");
                return resData[0] || {};
            }
        } catch (err) {
            console.log(err);

            logger.error(this.request, "Error while Create role in role Module" + err.toString(), 'role', "roleObject", "error", "1");
            throw err;
        }
    }

    /**
    * updating role into mongodb
    * @param  roleObject
    * return  updated role
    */
    public _update = async (roleObject: any) => {
        try {
            var model = await this.dal.model('role');
            if (roleObject) {
                roleObject.lastModifiedDate = new Date().toISOString();
                var resData = await model.findByIdAndUpdate(roleObject);
                // logger.info(this.request, "role Updating into mongodb and redis cache.", 'role', roleObject._id, "save", "5");
                return resData;
            }
        } catch (err) {
            console.log(err);

            logger.error(this.request, "Error while Updating role in role Module " + err.toString(), 'role', "roleObject", "error", "1");
            throw err;
        }
    }

    /**
      * This save method will create or update the role based on input json.
      * @param roleObj - role
      * @returns return created or updated role
      */
    public save = async (roleObj: any) => {
        try {
            var roleExists = await this.findOne({ 'objectCode': roleObj.objectCode });
            let result, changeCount = roleObj.changeCount;

            if (changeCount == 0 || changeCount == null || changeCount == undefined) {
                if (!roleExists) {
                    try {

                        roleObj.changeCount = 1;
                        var roleData = await this._create(roleObj);
                        result = { code: "0", message: "Role Created", Role: roleData };
                    } catch (ex) {
                        result = { code: "-1", message: "Error while saving Role", "error": ex };
                    }
                } else if (roleExists.deleteMark != 0) {
                    result = { code: "-1", message: "object has been already used and logically deleted", Role: roleExists };
                } else if (roleExists.isActive != 1) {
                    result = { code: "-1", message: "code already exists and is inactive", Role: roleExists };
                } else {
                    result = { code: "-1", message: "object already exists with the given code", Role: roleExists };
                }
            } else {
                if (!roleExists) {
                    result = { code: "-1", message: "code could not be found" };
                } else if (roleExists.deleteMark != 0) {
                    result = { code: "-1", message: "object has been already used and logically deleted", Role: roleExists };
                } else if (roleExists.isActive != 1) {
                    result = { code: "-1", message: "object already exists with the given code", Role: roleExists };
                } else {
                    if (roleExists.changeCount == changeCount) {
                        try {
                            //Check whether user has permission to update
                            //roleExists = await this.ACLPrecedence(roleExists, true);
                            if (roleExists.securityCode == null || roleExists.securityCode < 7) {
                                return { code: "-1", message: "You don't have access to perform this action." };
                            }
                            delete roleExists.securityCode;
                            delete roleExists.precedenceAcl;

                            roleObj.changeCount = roleObj.changeCount + 1;
                            roleObj._id = roleExists._id;
                            roleObj.createdBy = roleObj.createdBy || roleExists.createdBy;
                            let roleData = await this._update(roleObj);
                            result = { code: "0", message: "Role updated", Role: roleData };
                        } catch (ex) {
                            result = { code: "-1", message: "Error while updating role", "error": ex };
                        }
                    } else {
                        result = { code: "-1", message: "A concurrency issues occurred while updating role", Role: roleExists };
                    }

                }
            }
            return result;
        } catch (ex) {
            console.log(ex);
            logger.error(this.request, "Error while executing saving Role error : " + ex.toString(), "Role", "/save/", "catch", '1', roleObj,ex);
            return { code: "-1", message: "Error while saving Role." };
        }
    }

    /**
    * remove role into mongodb
    * @param  objectCode object
    * return  updated role
    */
    public remove = async (objectCode: any) => {
        try {
            var model = await this.dal.model('role');

            if (objectCode != null && objectCode != undefined) {
                var retObj = null;
                var query = {
                    objectCode: objectCode
                };
                retObj = await model.find(query, {});
                if (retObj != null && retObj != undefined && retObj[0]) {
                    retObj = retObj[0];

                    /*if (retObj.deleteMark && retObj.changeCount != changeCount) { 
                        return { code: "-1", message: "Concurrency issue occured in role.", role: retObj };
                    } */
                    if (retObj.deleteMark && retObj.deleteMark == 1) {
                        return { code: "-1", message: "role has been already deleted." };
                    }
                    if (retObj.isActive && retObj.isActive == 0) {
                        return { code: "-1", message: "role already exists and is inactive." };
                    }


                    retObj.isActive = 0;
                    retObj.deleteMark = 1;
                    if (retObj.changeCount) {
                        retObj.changeCount = retObj.changeCount + 1;
                    } else {
                        retObj.changeCount = 1;
                    }
                    retObj.tenantId = this.request.tenant._id;
                    var resData = await model.findByIdAndUpdate(retObj);

                    return { code: "0", message: "Role deleted successfully", role: resData };

                } else {
                    return { code: "-1", message: "Role with given id does not exist." };
                }
            } else {
                return { code: "-1", message: "Role with given id does not exist." };
            }
        } catch (err) {
            console.log(err);
            logger.error(this.request, "Error While Removing role in CoreEngine Module" + err.toString(), 'role', "roleObject", "error", "1", objectCode,err);
            return { code: "-1", message: "Catch error:" + err.toString() };
        }
    }

    /**
      * get role from database
      * @param query query to get data from database
      * @param skip skip
      * @param limit limit
      * @param sort sort
      * @param projection optional fields to return
      * return role from database
      */
    public paginate = async (query: any, skip: number, limit: number, sort: any, projection?: any) => {
        try {
            query = query || {};
            projection = projection || {};
            let model = await this.dal.model('role');
            let ret = await model.paginate(query, skip, limit, sort, projection);
            return ret;
        } catch (ex) {
            logger.error(this.request, "Error while executing paginate : " + ex.toString(), 'role', query, "catch", '1', query, ex);
        }
    }

    /**
      * get role count from database
      * @param query  query
      * return role count from database
      */
    public count = async (query) => {
        try {
            let model = await this.dal.model('role');
            let roleCount = await model.count(query);
            return roleCount;
        } catch (ex) {
            logger.error(this.request, "Error while executing count : " + ex.toString(), 'role', query, "catch", '1', query, ex);
        }
    }

    //dal Call to insert role Objects
    public insertMany = async (roleObjects: any) => {
        var model = await this.dal.model('role');
        var resData = await model.insertMany(roleObjects);
        return await resData;
    }
}
