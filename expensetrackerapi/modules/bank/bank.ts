import express = require('express');
import coreModule = require('../coreModule');
import logger = require('../../controllers/logger');
import user = require('../users');

import mongoose = require('mongoose');
import { admin } from '../admin';
const uuid = require('uuid');
const moment = require('moment');

var SchemaTypes = mongoose.Schema.Types;
var Schema = mongoose.Schema;


// create a bankSchema
var bankSchema = new Schema({
    "_id": { type: String },
    "name": { type: String, required: true, index: true },
    "IFSC": { type: String },

    "remarks": { type: String },
    "createdBy": { type: String, required: true },
    "dateCreated": { type: Date },
    "lastModifiedBy": { type: String, required: true },
    "lastModifiedDate": { type: Date },
    "deleteMark": { type: Number, required: true, default: 0 },//0 = available 1= deleted
    "isActive": { type: Number, required: true, default: 1 },//1=Active , 0= inActive
    "changeCount": { type: Number, required: true, default: 0 },
    "tenantCode": { type: String, required: true },
    "acl": [
        {
            "type": { type: String, maxlength: 50 }, //User, Group, Role
            "code": { type: String, maxlength: 50 }, //ID
            "securityCode": { type: Number }, //Read Write
            "statusInd": { type: Number, default: 100 }, // 
            "objectType": { type: String, maxlength: 50 }, //* for all
            "_id": false
        }
    ]
}, { timestamps: { createdAt: 'dateCreated', updatedAt: 'lastModifiedDate' }, strict: true });

var bankModel = mongoose.model('bank', bankSchema);

export class bankFactory extends coreModule {

    private collectionName: string;
    constructor(request: express.Request) {
        super(request);
        this.collectionName = "bank";
    }

    public getSchema = async () => {

        var model = await this.dal.model('bank');

        return model.getSchema();
    }

    public getModelName = async () => {

        var model = await this.dal.model('bank');

        return model.getModelName();
    }

    /**
    * DAL Call get from mongodb
    * @query mongodb query to get the bank's
    * @options mongodb projections (optional)
    * return array of banks
    */
    public find = async (query: any, optional?: any) => {
        query = query || {};
        try {
            var model = await this.dal.model('bank');

            var ret = await model.find(query, optional);
        } catch (err) {
            logger.error(this.request, "Error while executing get : " + err.toString(), 'bank', "", "catch", '1', query, err);
            console.log(err);
        }
        return ret;
    }

    /**
      * get bank from database
      * @param bankId  bank ID
      * return bank from database
      */
    public findById = async (bankId) => {
        try {
            let model = await this.dal.model('bank');
            let obj = await model.findById("" + bankId);
            return obj;
        } catch (ex) {
            logger.error(this.request, "Error while executing findById : " + ex.toString(), 'bank', "", "catch", '1', bankId, ex);
        }
    }

    /**
      * get bank from database
      * @param query query to get data from database
      * @param projection optional fields to return
      * return bank from database
      */
    public findOne = async (query: any, projection?: any) => {
        try {
            query = query || {};
            projection = projection || {};
            var model = await this.dal.model('bank');
            let ret = await model.findOne(query, projection);
            return ret;
        } catch (ex) {
            logger.error(this.request, "Error while executing findOne : " + ex.toString(), 'bank', "", "catch", '1', query, ex);
        }
    }

    /**
    * saving bank into mongodb
    * @bankObject  bank
    * return  saved bank
    */
    public _create = async (bankObject: any) => {
        try {
            var model = await this.dal.model('bank');
            if (bankObject) {
                //var _id = await this.dal.getNextSequence('bank');
                //bankObject._id = uuid.v4();
                var resData = await model.create([bankObject]);

                // logger.info(this.request, "bank saving into mongodb and redis cache.", 'bank', bankObject._id, "save", "5");
                return resData[0] || {};
            }
        } catch (err) {
            console.log(err);

            //logger.error(this.request, "Error while Create bank in bank Module" + err.toString(), 'bank', "bankObject", "error", "1", bankObject,err);
            throw err;
        }
    }

    /**
    * updating bank into mongodb
    * @param  bankObject
    * return  updated bank
    */
    public _update = async (bankObject: any) => {
        try {
            var model = await this.dal.model('bank');
            if (bankObject) {
                bankObject.lastModifiedDate = new Date().toISOString();
                var resData = await model.findByIdAndUpdate(bankObject);
                // logger.info(this.request, "bank Updating into mongodb and redis cache.", 'bank', bankObject._id, "save", "5");
                return resData;
            }
        } catch (err) {
            console.log(err);

            //logger.error(this.request, "Error while Updating bank in bank Module " + err.toString(), 'bank', "bankObject", "error", "1", bankObject,err);
            throw err;
        }
    }

    /**
      * This save method will create or update the bank based on input json.
      * @param bankObj - bank
      * @returns return created or updated bank
      */
    public save = async (bankObj: any) => {
        try {
            var bankExists = await this.findOne({ 'objectCode': bankObj.objectCode });
            let result, changeCount = bankObj.changeCount;

            if (changeCount == 0 || changeCount == null || changeCount == undefined) {
                if (!bankExists) {
                    try {
                        //Check whether user has permission to save
                        bankObj.changeCount = 1;
                        var bankData = await this._create(bankObj);
                        result = { code: "0", message: "bank Created", bank: bankData };
                    } catch (ex) {
                        result = { code: "-1", message: "Error while saving bank", "error": ex };
                    }
                } else if (bankExists.deleteMark != 0) {
                    result = { code: "-1", message: "object has been already used and logically deleted", bank: bankExists };
                } else if (bankExists.isActive != 1) {
                    result = { code: "-1", message: "code already exists and is inactive", bank: bankExists };
                } else {
                    result = { code: "-1", message: "object already exists with the given code", bank: bankExists };
                }
            } else {
                if (!bankExists) {
                    result = { code: "-1", message: "code could not be found" };
                } else if (bankExists.deleteMark != 0) {
                    result = { code: "-1", message: "object has been already used and logically deleted", bank: bankExists };
                } else if (bankExists.isActive != 1) {
                    result = { code: "-1", message: "object already exists with the given code", bank: bankExists };
                } else {
                    if (bankExists.changeCount == changeCount) {
                        try {
                            //Check whether user has permission to update
                            //bankExists = await this.ACLPrecedence(bankExists, true);
                            if (bankExists.securityCode == null || bankExists.securityCode < 7) {
                                return { code: "-1", message: "You don't have access to perform this action." };
                            }
                            delete bankExists.securityCode;
                            delete bankExists.precedenceAcl;

                            bankObj.changeCount = bankObj.changeCount + 1;
                            bankObj._id = bankExists._id;
                            bankObj.createdBy = bankObj.createdBy || bankExists.createdBy;
                            let bankData = await this._update(bankObj);
                            result = { code: "0", message: "bank updated", bank: bankData };
                        } catch (ex) {
                            result = { code: "-1", message: "Error while updating bank", "error": ex };
                        }
                    } else {
                        result = { code: "-1", message: "A concurrency issues occurred while updating bank", bank: bankExists };
                    }

                }
            }
            return result;
        } catch (ex) {
            console.log(ex);
            logger.error(this.request, "Error while executing saving bank error : " + ex.toString(), "bank", "/save/", "catch", '1', bankObj, ex);
            return { code: "-1", message: "Error while saving bank." };
        }
    }

    /**
    * remove bank into mongodb
    * @param  objectCode object
    * return  updated bank
    */
    public remove = async (objectCode: any) => {
        try {
            var model = await this.dal.model('bank');

            if (objectCode != null && objectCode != undefined) {
                var retObj = null;
                var query = {
                    objectCode: objectCode
                };
                retObj = await model.find(query, {});
                if (retObj != null && retObj != undefined && retObj[0]) {
                    retObj = retObj[0];

                    /*if (retObj.deleteMark && retObj.changeCount != changeCount) { 
                        return { code: "-1", message: "Concurrency issue occured in bank.", bank: retObj };
                    } */
                    if (retObj.deleteMark && retObj.deleteMark == 1) {
                        return { code: "-1", message: "bank has been already deleted." };
                    }
                    if (retObj.isActive && retObj.isActive == 0) {
                        return { code: "-1", message: "bank already exists and is inactive." };
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

                    return { code: "0", message: "bank deleted successfully", bank: resData };

                } else {
                    return { code: "-1", message: "bank with given id does not exist." };
                }
            } else {
                return { code: "-1", message: "bank with given id does not exist." };
            }
        } catch (err) {
            console.log(err);
            logger.error(this.request, "Error While Removing bank in CoreEngine Module" + err.toString(), 'bank', "bankObject", "error", "1", objectCode, err);
            return { code: "-1", message: "Catch error:" + err.toString() };
        }
    }

    /**
      * get bank from database
      * @param query query to get data from database
      * @param skip skip
      * @param limit limit
      * @param sort sort
      * @param projection optional fields to return
      * return bank from database
      */
    public paginate = async (query: any, skip: number, limit: number, sort: any, projection?: any) => {
        try {
            query = query || {};
            projection = projection || {};
            let model = await this.dal.model('bank');
            let ret = await model.paginate(query, skip, limit, sort, projection);
            return ret;
        } catch (ex) {
            logger.error(this.request, "Error while executing paginate : " + ex.toString(), 'bank', query, "catch", '1', query, ex);
        }
    }

    /**
      * get bank count from database
      * @param query  query
      * return bank count from database
      */
    public count = async (query) => {
        try {
            let model = await this.dal.model('bank');
            let bankCount = await model.count(query);
            return bankCount;
        } catch (ex) {
            logger.error(this.request, "Error while executing count : " + ex.toString(), 'bank', query, "catch", '1', query, ex);
        }
    }

    //dal Call to insert bank Objects
    public insertMany = async (bankObjects: any) => {
        var model = await this.dal.model('bank');
        var resData = await model.insertMany(bankObjects);
        return await resData;
    }
}
