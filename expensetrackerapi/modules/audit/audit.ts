
import mongoose = require('mongoose');
import express = require('express');
import coreModule = require('../coreModule');
import logger = require('../../controllers/logger');

const uuid = require('uuid');

var SchemaTypes = mongoose.Schema.Types;
var Schema = mongoose.Schema;

// create a AUDITschema
var auditSchema = new Schema({
    "_id": String,

    "createdBy": { type: String, required: true },
    "dateCreated": { type: Date },
    "lastModifiedBy": { type: String, required: true },
    "lastModifiedDate": { type: Date },
    "deleteMark": { type: Number, required: true, default: 0 },//0 = available 1= deleted
    "isActive": { type: Number, required: true, default: 1 },//1=Active , 0= incative
    "changeCount": { type: Number, required: true, default: 0 },
    "tenantId": { type: Number },
}, { timestamps: { createdAt: 'dateCreated', updatedAt: 'lastModifiedDate' }, strict: false });

var auditModel = mongoose.model("audit", auditSchema);

export class audit extends coreModule {
    private collectionName: string;

    constructor(request: express.Request) {
        super(request);
        this.collectionName = "audit";
    }

    public findOne = async (query: any, projection?: any, callback?: Function) => {
        query = query || {};
        projection = projection || {};
        var model = await this.dal.model("audit");
        let ret = await model.findOne(query, projection, callback);
        return ret;
    }

    /**
    * DAL Call get from mongodb
    * @query mongodb query to get the audit's
    * @options mongodb projections (optional)
    * return array of audits
    */
    public get = async (query: any, optional?: any) => {
        query = query || {};
        var ret = [];
        try {
            var model = await this.dal.model("audit");
            ret = await model.find(query, optional);
        } catch (err) {
            logger.error(this.request, "Error while get " + err.toString(), "AUDIT", "auditObject", "error", "1", query, err);

            console.log(err);
        }
        return ret;
    }

    /**
    * updating AUDIT into mongodb
    * @param  audit object
    * return  updated audit object
    */
    public update = async (auditObject: any) => {
        try {
            var model = await this.dal.model("audit");
            if (auditObject) {
                auditObject.lastModifiedDate = new Date().toISOString();
                var resData = await model.findByIdAndUpdate(auditObject);
                // logger.info(this.request, "audit Updating into mongodb and redis cache.", "AUDIT", auditObject._id, "save", "5");
                return resData;
            }
        } catch (err) {
            console.log(err);
            if (err.message) {
                return { code: "-1", message: "Error while updating AUDIT" };
            }
            logger.error(this.request, "Error while Updating audit in CoreEngine Module " + err.toString(), "AUDIT", "auditObject", "error", "1", auditObject, err);
            throw err;
        }
    }

    public getSchema = async () => {

        var model = await this.dal.model("audit");

        return model.getSchema();
    }

    public getModelName = async () => {

        var model = await this.dal.model("audit");

        return model.getModelName();
    }

    /**
      * get audit from database
      * @param query query to get data from database
      * @param projection optional fields to return
      * return audit object from database
      */
    public find = async (query: any, projection?: any) => {
        try {
            query = query || {};
            projection = projection || {};
            var model = await this.dal.model("audit");
            let ret = await model.find(query, projection);
            return ret;
        } catch (ex) {
            logger.error(this.request, "Error while executing find : " + ex.toString(), "audit", "", "catch", '1', query, ex);
        }
    }

    /**
    * DAL Call findByCode from mongodb based on objectCode
    * @objectCode objectCode
    * return audit object.
    */
    public findByCode = async (objectCode: string) => {
        try {
            var model = await this.dal.model("audit");
            var ret = await model.findByCode(objectCode);
        } catch (err) {
            logger.error(this.request, "Error while executing findByCode : " + err.toString(), "audit", "", "catch", '1', objectCode, err);
            console.log(err);
        }
        return ret;
    }

    /**
      * get audit from database
      * @param auditId  audit ID
      * return audit object from database
      */
    public findById = async (auditId) => {
        try {
            let model = await this.dal.model("audit");
            let obj = await model.findById("" + auditId);
            return obj;
        } catch (ex) {
            logger.error(this.request, "Error while executing findById : " + ex.toString(), "audit", "", "catch", '1', auditId, ex);
        }
    }

    /**
    * saving Audit into mongodb
    * @auditObject  audit object
    * return  saved audit object
    */
    public save = async (auditObj: any) => {
        try {
            var auditExists = await this.findOne({ '_id': auditObj._id });
            let result, changeCount = auditObj.changeCount;

            if (changeCount == 0 || changeCount == null || changeCount == undefined) {
                if (!auditExists) {
                    try {
                        auditObj.changeCount = 1;
                        var auditData = await this._create(auditObj);
                        result = { code: "0", message: "Audit Created", Audit: auditData };
                    } catch (ex) {
                        result = { code: "-1", message: "Error while saving Audit", "error": ex };
                    }
                } else if (auditExists.deleteMark != 0) {
                    result = { code: "-1", message: "object has been already used and logically deleted", Audit: auditExists };
                } else if (auditExists.isActive != 1) {
                    result = { code: "-1", message: "code already exists and is inactive", Audit: auditExists };
                } else {
                    result = { code: "-1", message: "object already exists with the given code", Audit: auditExists };
                }
            } else {
                if (!auditExists) {
                    result = { code: "-1", message: "code could not be found" };
                } else {
                    if (auditExists.changeCount == changeCount) {
                        try {
                            //Check whether audit has permission to update
                            //auditExists = await this.ACLPrecedence(auditExists, true);
                            //if (auditExists.securityCode == null || auditExists.securityCode < 7) {
                            //    return { code: "-1", message: "You don't have access to perform this action." };
                            //}
                            //delete auditExists.securityCode;
                            //delete auditExists.precedenceAcl;

                            auditObj.changeCount = auditObj.changeCount + 1;
                            auditObj._id = auditExists._id;
                            auditObj.createdBy = auditObj.createdBy || auditExists.createdBy;
                            let auditData = await this._update(auditObj);
                            result = { code: "0", message: "Audit updated", Audit: auditData };
                        } catch (ex) {
                            result = { code: "-1", message: "Error while updating Audit", "error": ex };
                        }
                    } else {
                        result = { code: "-1", message: "A concurrency issues occurred while updating audit", Audit: auditExists };
                    }

                }
            }
            return result;
        } catch (ex) {
            console.log(ex);
            logger.error(this.request, "Error while executing saving audit error : " + ex.toString(), "audit", "/save/", "catch", '1', auditObj, ex);
            return { code: "-1", message: "Error while saving audit." };
        }
    }

    /**
    * remove Audit into mongodb
    * @param  objectCode object
    * return  updated audit object
    */
    public remove = async (objectCode: any) => {
        try {
            var model = await this.dal.model("audit");

            if (objectCode != null && objectCode != undefined) {
                var retObj = null;
                var query = {
                    objectCode: objectCode
                };
                retObj = await model.find(query, {});
                if (retObj != null && retObj != undefined && retObj[0]) {
                    retObj = retObj[0];

                    /*if (retObj.deleteMark && retObj.changeCount != changeCount) { 
                        return { code: "-1", message: "audit is concurrency issue", audit: retObj };
                    } */
                    if (retObj.deleteMark && retObj.deleteMark == 1) {
                        return { code: "-1", message: "audit has been already deleted." };
                    }
                    if (retObj.isActive && retObj.isActive == 0) {
                        return { code: "-1", message: "audit already exists and is inactive." };
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

                    return { code: "0", message: "Audit deleted successfully", audit: resData };

                } else {
                    return { code: "-1", message: "Audit with given id does not exist." };
                }
            } else {
                return { code: "-1", message: "Audit with given id does not exist." };
            }
        } catch (err) {
            console.log(err);
            logger.info(this.request, "Error While Removing auditType in CoreEngine Module" + err.toString(), "auditType", "auditTypeObject", "error", "1", objectCode, err);
            return { code: "-1", message: "Catch error:" + err.toString() };
        }
    }

    /**
      * get audit from database
      * @param query query to get data from database
      * @param skip skip
      * @param limit limit
      * @param sort sort
      * @param projection optional fields to return
      * return audit object from database
      */
    public paginate = async (query: any, skip: number, limit: number, sort: any, projection?: any) => {
        try {
            query = query || {};
            projection = projection || {};
            let model = await this.dal.model("audit");
            let ret = await model.paginate(query, skip, limit, sort, projection);
            return ret;
        } catch (ex) {
            logger.error(this.request, "Error while executing find : " + ex.toString(), "audit", query, "catch", '1', query, ex);
        }
    }

    /**
      * get audit count from database
      * @param query  query
      * return audit count from database
      */
    public count = async (query) => {
        try {
            let model = await this.dal.model("audit");
            let auditCount = await model.count(query);
            return auditCount;
        } catch (ex) {
            logger.error(this.request, "Error while executing count : " + ex.toString(), "audit", query, "catch", '1', query, ex);
        }
    }

    //dal Call to insert audit Objects
    public insertMany = async (auditObjects: any) => {
        var model = await this.dal.model("audit");
        var resData = await model.insertMany(auditObjects);
        return await resData;
    }

    public _create = async (auditObject: any) => {
        var model = await this.dal.model("audit");
        //auditObject.auditCode = auditObject.auditCode.toUpperCase();
        auditObject._id = uuid.v4(); //await this.dal.getNextSequence('audit');
        var resData = await model.create([auditObject]);
        // logger.info(this.request, "Audit saved into mongodb and redis cache.", "audit", auditObject._id, "save", "5");
        return resData[0];
    }

    public _update = async (auditObject: any) => {
        var model = await this.dal.model("audit");
        //auditObject.auditCode = auditObject.auditCode.toUpperCase();
        //auditObject._id = auditObject.auditCode;
        auditObject.lastModifiedDate = new Date().toISOString();
        var resData = await model.findByIdAndUpdate(auditObject);
        // logger.info(this.request, "Audit updated into mongodb and redis cache.", "audit", auditObject._id, "update", "5");
        return resData;
    }
}