import express = require('express');
import coreModule = require('../coreModule');
import logger = require('../../controllers/logger');
import mongoose = require('mongoose');
const uuid = require('uuid');

var SchemaTypes = mongoose.Schema.Types;
var Schema = mongoose.Schema;


// create a groupschema
var groupSchema = new Schema({
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

var groupModel = mongoose.model('group', groupSchema);

export class groupFactory extends coreModule {

    private collectionName: string;
    constructor(request: express.Request) {
        super(request);
        this.collectionName = "group";
    }

    public getSchema = async () => {

        var model = await this.dal.model('group');

        return model.getSchema();
    }

    public getModelName = async () => {

        var model = await this.dal.model('group');

        return model.getModelName();
    }

    /**
    * DAL Call get from mongodb
    * @query mongodb query to get the group's
    * @options mongodb projections (optional)
    * return array of groups
    */
    public get = async (query: any, optional?: any) => {
        query = query || {};
        try {
            var model = await this.dal.model('group');

            var ret = await model.find(query, optional);
        } catch (err) {
            logger.error(this.request, "Error while executing get : " + err.toString(), 'group', "", "catch", '1', query,err);
            console.log(err);
        }
        return ret;
    }

    /**
      * get group from database
      * @param groupId  group ID
      * return group from database
      */
    public findById = async (groupId) => {
        try {
            let model = await this.dal.model('group');
            let obj = await model.findById("" + groupId);
            return obj;
        } catch (ex) {
            logger.error(this.request, "Error while executing findById : " + ex.toString(), 'group', "", "catch", '1', groupId,ex);
        }
    }

    /**
    * DAL Call findByCode from mongodb based on objectCode
    * @objectCode objectCode
    * return group object.
    */
    public findByCode = async (objectCode: string) => {
        try {
            var model = await this.dal.model("group");
            var ret = await model.findByCode(objectCode);
        } catch (err) {
            logger.error(this.request, "Error while executing findByCode : " + err.toString(), 'group', "", "catch", '1', objectCode, err);

            console.log(err);
        }
        return ret;
    }

    /**
      * get group from database
      * @param query query to get data from database
      * @param projection optional fields to return
      * return group from database
      */
    public findOne = async (query: any, projection?: any) => {
        try {
            query = query || {};
            projection = projection || {};
            var model = await this.dal.model('group');
            let ret = await model.findOne(query, projection);
            return ret;
        } catch (ex) {
            logger.error(this.request, "Error while executing findOne : " + ex.toString(), 'group', "", "catch", '1', query,ex);
        }
    }

    /**
    * saving group into mongodb
    * @groupObject  group
    * return  saved group
    */
    public _create = async (groupObject: any) => {
        try {
            var model = await this.dal.model('group');
            if (groupObject) {
                //var _id = await this.dal.getNextSequence('group');
                groupObject._id = uuid.v4();
                var resData = await model.create([groupObject]);

                // logger.info(this.request, "group saving into mongodb and redis cache.", 'group', groupObject._id, "save", "5");
                return resData[0] || {};
            }
        } catch (err) {
            console.log(err);

            //logger.error(this.request, "Error while Create group in group Module" + err.toString(), 'group', "groupObject", "error", "1", groupObject,err);
            throw err;
        }
    }

    /**
    * updating group into mongodb
    * @param  groupObject
    * return  updated group
    */
    public _update = async (groupObject: any) => {
        try {
            var model = await this.dal.model('group');
            if (groupObject) {
                groupObject.lastModifiedDate = new Date().toISOString();
                var resData = await model.findByIdAndUpdate(groupObject);
                // logger.info(this.request, "group Updating into mongodb and redis cache.", 'group', groupObject._id, "save", "5");
                return resData;
            }
        } catch (err) {
            console.log(err);

            //logger.error(this.request, "Error while Updating group in group Module " + err.toString(), 'group', "groupObject", "error", "1", groupObject,err);
            throw err;
        }
    }

    /**
      * This save method will create or update the group based on input json.
      * @param groupObj - group
      * @returns return created or updated group
      */
    public save = async (groupObj: any) => {
        try {
            var groupExists = await this.findOne({ 'objectCode': groupObj.objectCode });
            let result, changeCount = groupObj.changeCount;

            if (changeCount == 0 || changeCount == null || changeCount == undefined) {
                if (!groupExists) {
                    try {
                        //Check whether user has permission to save
                        groupObj.changeCount = 1;
                        var groupData = await this._create(groupObj);
                        result = { code: "0", message: "Group Created", Group: groupData };
                    } catch (ex) {
                        result = { code: "-1", message: "Error while saving Group", "error": ex };
                    }
                } else if (groupExists.deleteMark != 0) {
                    result = { code: "-1", message: "object has been already used and logically deleted", Group: groupExists };
                } else if (groupExists.isActive != 1) {
                    result = { code: "-1", message: "code already exists and is inactive", Group: groupExists };
                } else {
                    result = { code: "-1", message: "object already exists with the given code", Group: groupExists };
                }
            } else {
                if (!groupExists) {
                    result = { code: "-1", message: "code could not be found" };
                } else if (groupExists.deleteMark != 0) {
                    result = { code: "-1", message: "object has been already used and logically deleted", Group: groupExists };
                } else if (groupExists.isActive != 1) {
                    result = { code: "-1", message: "object already exists with the given code", Group: groupExists };
                } else {
                    if (groupExists.changeCount == changeCount) {
                        try {
                            //Check whether user has permission to update
                            //groupExists = await this.ACLPrecedence(groupExists, true);
                            if (groupExists.securityCode == null || groupExists.securityCode < 7) {
                                return { code: "-1", message: "You don't have access to perform this action." };
                            }
                            delete groupExists.securityCode;
                            delete groupExists.precedenceAcl;

                            groupObj.changeCount = groupObj.changeCount + 1;
                            groupObj._id = groupExists._id;
                            groupObj.createdBy = groupObj.createdBy || groupExists.createdBy;
                            let groupData = await this._update(groupObj);
                            result = { code: "0", message: "Group updated", Group: groupData };
                        } catch (ex) {
                            result = { code: "-1", message: "Error while updating group", "error": ex };
                        }
                    } else {
                        result = { code: "-1", message: "A concurrency issues occurred while updating group", Group: groupExists };
                    }

                }
            }
            return result;
        } catch (ex) {
            console.log(ex);
            logger.error(this.request, "Error while executing saving Group error : " + ex.toString(), "Group", "/save/", "catch", '1', groupObj,ex);
            return { code: "-1", message: "Error while saving Group." };
        }
    }

    /**
    * remove group into mongodb
    * @param  objectCode object
    * return  updated group
    */
    public remove = async (objectCode: any) => {
        try {
            var model = await this.dal.model('group');

            if (objectCode != null && objectCode != undefined) {
                var retObj = null;
                var query = {
                    objectCode: objectCode
                };
                retObj = await model.find(query, {});
                if (retObj != null && retObj != undefined && retObj[0]) {
                    retObj = retObj[0];

                    /*if (retObj.deleteMark && retObj.changeCount != changeCount) { 
                        return { code: "-1", message: "Concurrency issue occured in group.", group: retObj };
                    } */
                    if (retObj.deleteMark && retObj.deleteMark == 1) {
                        return { code: "-1", message: "group has been already deleted." };
                    }
                    if (retObj.isActive && retObj.isActive == 0) {
                        return { code: "-1", message: "group already exists and is inactive." };
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

                    return { code: "0", message: "Group deleted successfully", group: resData };

                } else {
                    return { code: "-1", message: "Group with given id does not exist." };
                }
            } else {
                return { code: "-1", message: "Group with given id does not exist." };
            }
        } catch (err) {
            console.log(err);
            logger.error(this.request, "Error While Removing group in CoreEngine Module" + err.toString(), 'group', "groupObject", "error", "1", objectCode,err);
            return { code: "-1", message: "Catch error:" + err.toString() };
        }
    }

    /**
      * get group from database
      * @param query query to get data from database
      * @param skip skip
      * @param limit limit
      * @param sort sort
      * @param projection optional fields to return
      * return group from database
      */
    public paginate = async (query: any, skip: number, limit: number, sort: any, projection?: any) => {
        try {
            query = query || {};
            projection = projection || {};
            let model = await this.dal.model('group');
            let ret = await model.paginate(query, skip, limit, sort, projection);
            return ret;
        } catch (ex) {
            logger.error(this.request, "Error while executing paginate : " + ex.toString(), 'group', query, "catch", '1', query, ex);
        }
    }

    /**
      * get group count from database
      * @param query  query
      * return group count from database
      */
    public count = async (query) => {
        try {
            let model = await this.dal.model('group');
            let groupCount = await model.count(query);
            return groupCount;
        } catch (ex) {
            logger.error(this.request, "Error while executing count : " + ex.toString(), 'group', query, "catch", '1', query, ex);
        }
    }

    //dal Call to insert group Objects
    public insertMany = async (groupObjects: any) => {
        var model = await this.dal.model('group');
        var resData = await model.insertMany(groupObjects);
        return await resData;
    }

}
