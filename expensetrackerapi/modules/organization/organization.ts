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


// create a organizationsschema
var organizationsSchema = new Schema({
    "_id": { type: String, required: true },
    "orgID": { type: Number, required: true },
    "organizationName": { type: String, required: true },
    "organizationNameAsPerSBI": { type: String, required: true },
    "organizationCode": { type: String, required: true },
    "address": {},
    "city": { type: String, required: true },
    "district": { type: String, required: true },
    "state": { type: String, required: true },
    "pincode": { type: String, required: true },
    "contactNumber": { type: String, required: true },
    "branches": {},
    "feesTypes": {},//"feesTypes": {"tuitionFee": { "excelColumnName": "Tuition Fee",  "order": 1}}
    "defaultDueFeeType": { type: String, required: true },
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
            "type": { type: String, maxlength: 50 },
            "code": { type: String, maxlength: 50 },
            "securityCode": { type: Number },
            "statusInd": { type: Number, default: 100 },
            "objectType": { type: String, maxlength: 50 },
            "_id": false
        }
    ]
}, { timestamps: { createdAt: 'dateCreated', updatedAt: 'lastModifiedDate' }, strict: true });

var organizationModel = mongoose.model('organization', organizationsSchema);

export class organizationFactory extends coreModule {

    private collectionName: string;
    constructor(request: express.Request) {
        super(request);
        this.collectionName = "organization";
    }

    public getSchema = async () => {

        var model = await this.dal.model('organization');

        return model.getSchema();
    }

    public getModelName = async () => {

        var model = await this.dal.model('organization');

        return model.getModelName();
    }

    /**
    * DAL Call get from mongodb
    * @query mongodb query to get the organization's
    * @options mongodb projections (optional)
    * return array of organizations
    */
    public find = async (query: any, optional?: any) => {
        query = query || {};
        try {
            var model = await this.dal.model('organization');

            var ret = await model.find(query, optional);
        } catch (err) {
            logger.error(this.request, "Error while executing get : " + err.toString(), 'organization', "", "catch", '1', query, err);
            console.log(err);
        }
        return ret;
    }

    /**
      * get organization from database
      * @param organizationId  organization ID
      * return organization from database
      */
    public findById = async (organizationId) => {
        try {
            let model = await this.dal.model('organization');
            let obj = await model.findById("" + organizationId);
            return obj;
        } catch (ex) {
            logger.error(this.request, "Error while executing findById : " + ex.toString(), 'organization', "", "catch", '1', organizationId, ex);
        }
    }

    /**
    * DAL Call findByCode from mongodb based on organizationcode
    * @organizationCode organizationcode
    * return organization object.
    */
    public findByCode = async (organizationCode: string) => {
        try {
            var model = await this.dal.model("organization");
            var ret = await model.findByCode(organizationCode);
        } catch (err) {
            logger.error(this.request, "Error while executing findByCode : " + err.toString(), 'organization', "", "catch", '1', organizationCode, err);

            console.log(err);
        }
        return ret;
    }

    /**
      * get organization from database
      * @param query query to get data from database
      * @param projection optional fields to return
      * return organization from database
      */
    public findOne = async (query: any, projection?: any) => {
        try {
            query = query || {};
            projection = projection || {};
            var model = await this.dal.model('organization');
            let ret = await model.findOne(query, projection);
            return ret;
        } catch (ex) {
            logger.error(this.request, "Error while executing findOne : " + ex.toString(), 'organization', "", "catch", '1', query, ex);
        }
    }

    /**
    * saving organization into mongodb
    * @organizationObject  organization
    * return  saved organization
    */
    public _create = async (organizationObject: any) => {
        try {
            var model = await this.dal.model('organization');
            if (organizationObject) {
                //var _id = await this.dal.getNextSequence('organization');
                organizationObject._id = uuid.v4();
                var resData = await model.create([organizationObject]);

                // logger.info(this.request, "organization saving into mongodb and redis cache.", 'organization', organizationObject._id, "save", "5");
                return resData[0] || {};
            }
        } catch (err) {
            console.log(err);

            //logger.error(this.request, "Error while Create organization in organization Module" + err.toString(), 'organization', "organizationObject", "error", "1", organizationObject,err);
            throw err;
        }
    }

    /**
    * updating organization into mongodb
    * @param  organizationObject
    * return  updated organization
    */
    public _update = async (organizationObject: any) => {
        try {
            var model = await this.dal.model('organization');
            if (organizationObject) {
                organizationObject.lastModifiedDate = new Date().toISOString();
                var resData = await model.findByIdAndUpdate(organizationObject);
                // logger.info(this.request, "organization Updating into mongodb and redis cache.", 'organization', organizationObject._id, "save", "5");
                return resData;
            }
        } catch (err) {
            console.log(err);
            //logger.error(this.request, "Error while Updating organization in organization Module " + err.toString(), 'organization', "organizationObject", "error", "1", organizationObject,err);
            throw err;
        }
    }

    /**
      * This save method will create or update the organization based on input json.
      * @param organizationObj - organization
      * @returns return created or updated organization
      */
    public save = async (organizationObj: any) => {
        try {
            var organizationExists = await this.findOne({ 'organizationCode': organizationObj.organizationCode });
            let result, changeCount = organizationObj.changeCount;

            if (changeCount == 0 || changeCount == null || changeCount == undefined) {
                if (!organizationExists) {
                    try {
                        //Check whether user has permission to save
                        organizationObj.changeCount = 1;
                        var organizationData = await this._create(organizationObj);
                        result = { code: "0", message: "Organization Created", Organization: organizationData };
                    } catch (ex) {
                        result = { code: "-1", message: "Error while saving Organization", "error": ex };
                    }
                } else if (organizationExists.deleteMark != 0) {
                    result = { code: "-1", message: "object has been already used and logically deleted", Organization: organizationExists };
                } else if (organizationExists.isActive != 1) {
                    result = { code: "-1", message: "code already exists and is inactive", Organization: organizationExists };
                } else {
                    result = { code: "-1", message: "object already exists with the given code", Organization: organizationExists };
                }
            } else {
                if (!organizationExists) {
                    result = { code: "-1", message: "code could not be found" };
                } else if (organizationExists.deleteMark != 0) {
                    result = { code: "-1", message: "object has been already used and logically deleted", Organization: organizationExists };
                } else if (organizationExists.isActive != 1) {
                    result = { code: "-1", message: "object already exists with the given code", Organization: organizationExists };
                } else {
                    if (organizationExists.changeCount == changeCount) {
                        try {
                            //Check whether user has permission to update
                            //organizationExists = await this.ACLPrecedence(organizationExists, true);
                            //if (organizationExists.securityCode == null || organizationExists.securityCode < 7) {
                            //    return { code: "-1", message: "You don't have access to perform this action." };
                            //}
                            //delete organizationExists.securityCode;
                            //delete organizationExists.precedenceAcl;

                            organizationObj.changeCount = organizationObj.changeCount + 1;
                            organizationObj._id = organizationExists._id;
                            organizationObj.createdBy = organizationObj.createdBy || organizationExists.createdBy;
                            let organizationData = await this._update(organizationObj);
                            result = { code: "0", message: "Organization updated", Organization: organizationData };
                        } catch (ex) {
                            result = { code: "-1", message: "Error while updating organization", "error": ex };
                        }
                    } else {
                        result = { code: "-1", message: "A concurrency issues occurred while updating organization", Organization: organizationExists };
                    }

                }
            }
            return result;
        } catch (ex) {
            console.log(ex);
            logger.error(this.request, "Error while executing saving Organization error : " + ex.toString(), "Organization", "/save/", "catch", '1', organizationObj, ex);
            return { code: "-1", message: "Error while saving Organization." };
        }
    }

    private createbranchesObj = async (branchData) => {
        let obj = {};
        for (let branchObj of branchData || []) {
            if (branchObj['branch']) {
                let branchKey = branchObj['code'] == undefined ? branchObj['branch'] : `${branchObj['branch']}_${branchObj['code']}`;
                obj[branchKey] = {};
                obj[branchKey]['name'] = branchObj['name'];
                if (typeof branchObj['years'] === "string") {
                    obj[branchKey]['years'] = branchObj['years'].split(",");
                } else if (typeof branchObj['years'] === "number") {
                    obj[branchKey]['years'] = [branchObj['years']];
                }
            }
        }
        return obj;
    }

    private createFeeTypesObj = async (feeTypeData) => {
        let obj = {};
        let i = 1;
        let key = '1';
        for (let feeTypesObj of feeTypeData || []) {
            if (feeTypesObj['excelColumnName']) {
                if (feeTypesObj['excelColumnName'] == 'Tuition Fee')
                    key = 'tuitionFee';
                else
                    key = String(i);
                obj[key] = {};
                obj[key]['excelColumnName'] = feeTypesObj['excelColumnName'];
                obj[key]['transactionColumnName'] = feeTypesObj['transactionColumnName'];
                obj[key]['order'] = feeTypesObj['order'];
                i++;
            }
        }
        return obj;
    }


    public insertorganizationData = async (organizationData, branchesAndFeeTypes) => {
        try {
            for (let organizationObj of organizationData || []) {
                let id = organizationObj['orgID'];
                let organizationExists = await this.findOne({ orgID: id });
                let obj: any = organizationExists || {};
                obj["tenantCode"] = "Fees";
                obj["orgID"] = id;
                obj["organizationName"] = organizationObj['organizationName'];
                obj["organizationNameAsPerSBI"] = organizationObj['organizationNameAsPerSBI'];
                obj["organizationCode"] = organizationObj['organizationCode'];
                obj["address"] = organizationObj['address'];
                obj["city"] = organizationObj['city'];
                obj["district"] = organizationObj['district'];
                obj["state"] = organizationObj['state'];
                obj["pincode"] = organizationObj['pincode'];
                obj["contactNumber"] = organizationObj['contactNumber'];
                obj["defaultDueFeeType"] = "tuitionFee";
                obj["branches"] = await this.createbranchesObj(branchesAndFeeTypes[id]);
                obj["feesTypes"] = await this.createFeeTypesObj(branchesAndFeeTypes[id]);
                obj["createdBy"] = this.request?.currentUser?.userCode || "crradmin";
                obj["lastModifiedBy"] = this.request?.currentUser?.userCode || "crradmin";

                if (!organizationExists) {
                    obj["changeCount"] = 1;
                    let organizationData = await this._create(obj);
                } else {
                    let organizationData = await this._update(obj);
                }
            }
            return { code: '0', message: 'Inserted successfully.' };
        } catch (ex) {
            console.log('error in insertStudentData: ' + ex.toString());
            return { code: '-1', message: 'Error while inserting student. Details: ' + ex.toString() };
        }
    }



    /**
    * remove organization into mongodb
    * @param  organizationCode object
    * return  updated organization
    */
    public remove = async (organizationCode: any) => {
        try {
            var model = await this.dal.model('organization');

            if (organizationCode != null && organizationCode != undefined) {
                var retObj = null;
                var query = {
                    organizationCode: organizationCode
                };
                retObj = await model.find(query, {});
                if (retObj != null && retObj != undefined && retObj[0]) {

                    var userModel = new admin.user(this.request);
                    retObj = await userModel.getAllowedObjects(retObj);
                    if (retObj.length == 0 || retObj[0].securityCode < 8) {
                        return { code: "-1", message: `You don't have permission to remove Organization.` };
                    }
                    retObj = retObj[0];

                    /*if (retObj.deleteMark && retObj.changeCount != changeCount) {
                        return { code: "-1", message: "Concurrency issue occured in organization.", organization: retObj };
                    } */
                    if (retObj.deleteMark && retObj.deleteMark == 1) {
                        return { code: "-1", message: "organization has been already deleted." };
                    }
                    if (retObj.isActive && retObj.isActive == 0) {
                        return { code: "-1", message: "organization already exists and is inactive." };
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

                    return { code: "0", message: "Organization deleted successfully", organization: resData };

                } else {
                    return { code: "-1", message: "Organization with given id does not exist." };
                }
            } else {
                return { code: "-1", message: "Organization with given id does not exist." };
            }
        } catch (err) {
            console.log(err);
            logger.error(this.request, "Error While Removing organization in CoreEngine Module" + err.toString(), 'organization', "organizationObject", "error", "1", organizationCode, err);
            return { code: "-1", message: "Catch error:" + err.toString() };
        }
    }

    /**
      * get organization from database
      * @param query query to get data from database
      * @param skip skip
      * @param limit limit
      * @param sort sort
      * @param projection optional fields to return
      * return organization from database
      */
    public paginate = async (query: any, skip: number, limit: number, sort: any, projection?: any) => {
        try {
            query = query || {};
            projection = projection || {};
            let model = await this.dal.model('organization');
            let ret = await model.paginate(query, skip, limit, sort, projection);
            return ret;
        } catch (ex) {
            logger.error(this.request, "Error while executing paginate : " + ex.toString(), 'organization', query, "catch", '1', query, ex);
        }
    }

    /**
      * get organization count from database
      * @param query  query
      * return organization count from database
      */
    public count = async (query) => {
        try {
            let model = await this.dal.model('organization');
            let organizationCount = await model.count(query);
            return organizationCount;
        } catch (ex) {
            logger.error(this.request, "Error while executing count : " + ex.toString(), 'organization', query, "catch", '1', query, ex);
        }
    }

    //dal Call to insert organization Objects
    public insertMany = async (organizationObjects: any) => {
        var model = await this.dal.model('organization');
        var resData = await model.insertMany(organizationObjects);
        return await resData;
    }
}
