import express = require('express');
import coreModule = require('../coreModule');
import logger = require('../../controllers/logger');
import user = require('../users');

import mongoose = require('mongoose');
import { organization } from '../organization';
import { admin } from '../admin';
const uuid = require('uuid');
const moment = require('moment');

var SchemaTypes = mongoose.Schema.Types;
var Schema = mongoose.Schema;


// create a transactionsschema
var transactionsSchema = new Schema({
    "_id": { type: String },
    "organizationName": { type: String, required: true },
    "paymentMode": { type: String, required: true },
    "bankReferenceNo": { type: String, required: true, maxlength: 50, index: true },
    "transactionDate": { type: String, required: true },
    "amount": { type: Number, required: true },
    "feesPaid": {},
    "earlierDues": { type: Number, required: true, default: 0 },
    "status": { type: String, required: true },
    "studentId": { type: String, required: true },
    "yearAndBranch": { type: String },
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

var transactionModel = mongoose.model('transaction', transactionsSchema);

export class transactionFactory extends coreModule {

    private collectionName: string;
    constructor(request: express.Request) {
        super(request);
        this.collectionName = "transaction";
    }

    public getSchema = async () => {

        var model = await this.dal.model('transaction');

        return model.getSchema();
    }

    public getModelName = async () => {

        var model = await this.dal.model('transaction');

        return model.getModelName();
    }

    /**
    * DAL Call get from mongodb
    * @query mongodb query to get the transaction's
    * @options mongodb projections (optional)
    * return array of transactions
    */
    public find = async (query: any, optional?: any) => {
        query = query || {};
        try {
            var model = await this.dal.model('transaction');

            var ret = await model.find(query, optional);
        } catch (err) {
            logger.error(this.request, "Error while executing get : " + err.toString(), 'transaction', "", "catch", '1', query, err);
            console.log(err);
        }
        return ret;
    }

    /**
      * get transaction from database
      * @param transactionId  transaction ID
      * return transaction from database
      */
    public findById = async (transactionId) => {
        try {
            let model = await this.dal.model('transaction');
            let obj = await model.findById("" + transactionId);
            return obj;
        } catch (ex) {
            logger.error(this.request, "Error while executing findById : " + ex.toString(), 'transaction', "", "catch", '1', transactionId, ex);
        }
    }

    /**
    * DAL Call findByCode from mongodb based on objectCode
    * @objectCode objectCode
    * return transaction object.
    */
    public findByCode = async (objectCode: string) => {
        try {
            var model = await this.dal.model("transaction");
            var ret = await model.findByCode(objectCode);
        } catch (err) {
            logger.error(this.request, "Error while executing findByCode : " + err.toString(), 'transaction', "", "catch", '1', objectCode, err);

            console.log(err);
        }
        return ret;
    }

    /**
      * get transaction from database
      * @param query query to get data from database
      * @param projection optional fields to return
      * return transaction from database
      */
    public findOne = async (query: any, projection?: any) => {
        try {
            query = query || {};
            projection = projection || {};
            var model = await this.dal.model('transaction');
            let ret = await model.findOne(query, projection);
            return ret;
        } catch (ex) {
            logger.error(this.request, "Error while executing findOne : " + ex.toString(), 'transaction', "", "catch", '1', query, ex);
        }
    }

    /**
    * saving transaction into mongodb
    * @transactionObject  transaction
    * return  saved transaction
    */
    public _create = async (transactionObject: any) => {
        try {
            var model = await this.dal.model('transaction');
            if (transactionObject) {
                //var _id = await this.dal.getNextSequence('transaction');
                //transactionObject._id = uuid.v4();
                var resData = await model.create([transactionObject]);

                // logger.info(this.request, "transaction saving into mongodb and redis cache.", 'transaction', transactionObject._id, "save", "5");
                return resData[0] || {};
            }
        } catch (err) {
            console.log(err);

            //logger.error(this.request, "Error while Create transaction in transaction Module" + err.toString(), 'transaction', "transactionObject", "error", "1", transactionObject,err);
            throw err;
        }
    }

    /**
    * updating transaction into mongodb
    * @param  transactionObject
    * return  updated transaction
    */
    public _update = async (transactionObject: any) => {
        try {
            var model = await this.dal.model('transaction');
            if (transactionObject) {
                transactionObject.lastModifiedDate = new Date().toISOString();
                var resData = await model.findByIdAndUpdate(transactionObject);
                // logger.info(this.request, "transaction Updating into mongodb and redis cache.", 'transaction', transactionObject._id, "save", "5");
                return resData;
            }
        } catch (err) {
            console.log(err);

            //logger.error(this.request, "Error while Updating transaction in transaction Module " + err.toString(), 'transaction', "transactionObject", "error", "1", transactionObject,err);
            throw err;
        }
    }

    /**
      * This save method will create or update the transaction based on input json.
      * @param transactionObj - transaction
      * @returns return created or updated transaction
      */
    public save = async (transactionObj: any) => {
        try {
            var transactionExists = await this.findOne({ 'objectCode': transactionObj.objectCode });
            let result, changeCount = transactionObj.changeCount;

            if (changeCount == 0 || changeCount == null || changeCount == undefined) {
                if (!transactionExists) {
                    try {
                        //Check whether user has permission to save
                        transactionObj.changeCount = 1;
                        var transactionData = await this._create(transactionObj);
                        result = { code: "0", message: "Transaction Created", Transaction: transactionData };
                    } catch (ex) {
                        result = { code: "-1", message: "Error while saving Transaction", "error": ex };
                    }
                } else if (transactionExists.deleteMark != 0) {
                    result = { code: "-1", message: "object has been already used and logically deleted", Transaction: transactionExists };
                } else if (transactionExists.isActive != 1) {
                    result = { code: "-1", message: "code already exists and is inactive", Transaction: transactionExists };
                } else {
                    result = { code: "-1", message: "object already exists with the given code", Transaction: transactionExists };
                }
            } else {
                if (!transactionExists) {
                    result = { code: "-1", message: "code could not be found" };
                } else if (transactionExists.deleteMark != 0) {
                    result = { code: "-1", message: "object has been already used and logically deleted", Transaction: transactionExists };
                } else if (transactionExists.isActive != 1) {
                    result = { code: "-1", message: "object already exists with the given code", Transaction: transactionExists };
                } else {
                    if (transactionExists.changeCount == changeCount) {
                        try {
                            //Check whether user has permission to update
                            //transactionExists = await this.ACLPrecedence(transactionExists, true);
                            if (transactionExists.securityCode == null || transactionExists.securityCode < 7) {
                                return { code: "-1", message: "You don't have access to perform this action." };
                            }
                            delete transactionExists.securityCode;
                            delete transactionExists.precedenceAcl;

                            transactionObj.changeCount = transactionObj.changeCount + 1;
                            transactionObj._id = transactionExists._id;
                            transactionObj.createdBy = transactionObj.createdBy || transactionExists.createdBy;
                            let transactionData = await this._update(transactionObj);
                            result = { code: "0", message: "Transaction updated", Transaction: transactionData };
                        } catch (ex) {
                            result = { code: "-1", message: "Error while updating transaction", "error": ex };
                        }
                    } else {
                        result = { code: "-1", message: "A concurrency issues occurred while updating transaction", Transaction: transactionExists };
                    }

                }
            }
            return result;
        } catch (ex) {
            console.log(ex);
            logger.error(this.request, "Error while executing saving Transaction error : " + ex.toString(), "Transaction", "/save/", "catch", '1', transactionObj, ex);
            return { code: "-1", message: "Error while saving Transaction." };
        }
    }

    /**
    * remove transaction into mongodb
    * @param  objectCode object
    * return  updated transaction
    */
    public remove = async (objectCode: any) => {
        try {
            var model = await this.dal.model('transaction');

            if (objectCode != null && objectCode != undefined) {
                var retObj = null;
                var query = {
                    objectCode: objectCode
                };
                retObj = await model.find(query, {});
                if (retObj != null && retObj != undefined && retObj[0]) {
                    retObj = retObj[0];

                    /*if (retObj.deleteMark && retObj.changeCount != changeCount) { 
                        return { code: "-1", message: "Concurrency issue occured in transaction.", transaction: retObj };
                    } */
                    if (retObj.deleteMark && retObj.deleteMark == 1) {
                        return { code: "-1", message: "transaction has been already deleted." };
                    }
                    if (retObj.isActive && retObj.isActive == 0) {
                        return { code: "-1", message: "transaction already exists and is inactive." };
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

                    return { code: "0", message: "Transaction deleted successfully", transaction: resData };

                } else {
                    return { code: "-1", message: "Transaction with given id does not exist." };
                }
            } else {
                return { code: "-1", message: "Transaction with given id does not exist." };
            }
        } catch (err) {
            console.log(err);
            logger.error(this.request, "Error While Removing transaction in CoreEngine Module" + err.toString(), 'transaction', "transactionObject", "error", "1", objectCode, err);
            return { code: "-1", message: "Catch error:" + err.toString() };
        }
    }

    /**
      * get transaction from database
      * @param query query to get data from database
      * @param skip skip
      * @param limit limit
      * @param sort sort
      * @param projection optional fields to return
      * return transaction from database
      */
    public paginate = async (query: any, skip: number, limit: number, sort: any, projection?: any) => {
        try {
            query = query || {};
            projection = projection || {};
            let model = await this.dal.model('transaction');
            let ret = await model.paginate(query, skip, limit, sort, projection);
            return ret;
        } catch (ex) {
            logger.error(this.request, "Error while executing paginate : " + ex.toString(), 'transaction', query, "catch", '1', query, ex);
        }
    }

    /**
      * get transaction count from database
      * @param query  query
      * return transaction count from database
      */
    public count = async (query) => {
        try {
            let model = await this.dal.model('transaction');
            let transactionCount = await model.count(query);
            return transactionCount;
        } catch (ex) {
            logger.error(this.request, "Error while executing count : " + ex.toString(), 'transaction', query, "catch", '1', query, ex);
        }
    }

    //dal Call to insert transaction Objects
    public insertMany = async (transactionObjects: any) => {
        var model = await this.dal.model('transaction');
        var resData = await model.insertMany(transactionObjects);
        return await resData;
    }

    public insertSBICollectData = async (sbiCollectData, financialYear) => {
        try {
            /**
             * TODO
             * Verify transaction dates in excel before updating in db for checking the financial year they sent matched or not.
             * If not need to throw error message to UI with not valid data.
             * */
            var finStartYear = Number.parseInt(financialYear.split('-')[0]);

            const financialYearStart = new Date(`${finStartYear}-04-01`);
            const financialYearEnd = new Date(`${finStartYear + 1}-03-31`);

            const allInFinancialYear = sbiCollectData.every(obj => {
                const transcationDate = new Date((obj['Transaction Date'] - (25567 + 2)) * 86400 * 1000);
                return transcationDate >= financialYearStart && transcationDate <= financialYearEnd;
            });

            if (!allInFinancialYear)
                throw `The some of transcations are not in the ${financialYear}`;

            let organizationName = sbiCollectData[0]['Category Name'];
            const allInOrganizationName = sbiCollectData.every(obj => obj['Category Name'] == organizationName);

            if (!allInOrganizationName)
                throw `The some of transcations are not in the Organization '${organizationName}'`;



            let updatedData = [];
            let organizationModel = new organization.organization(this.request);
            let studentModel = new user.user.students(this.request);
            let organizationObj = await organizationModel.findOne({ "organizationNameAsPerSBI": organizationName });
            if (!organizationObj)
                throw `The Organization '${organizationName}' not found`;

            var userModel = new admin.user(this.request);
            let permission = await userModel.getPermission(organizationObj.organizationCode);
            if (permission < 8)
                return { code: "-1", message: "You don't have permission to upload transcations" };

            var message = "";
            for (let sbiObj of sbiCollectData || []) {
                let transactionObj = await this.findById(sbiObj['Bank Reference No']);
                if (transactionObj) {
                    continue;
                }

                var transactionStudentID = sbiObj['UNIQUE NUMBER'] || sbiObj['UNIQUE NO'];
                let studentData = await studentModel.findById(transactionStudentID);
                if (!studentData || studentData == null) {
                    message += `\nNo student found for ${transactionStudentID} for transaction id ${sbiObj['Bank Reference No']}`;
                    continue;
                }
                let organizationName = sbiObj['Category Name'];
                let obj = {
                    "_id": sbiObj['Bank Reference No'],
                    "organizationName": organizationName,
                    "paymentMode": sbiObj['Payment Mode'],
                    "bankReferenceNo": sbiObj['Bank Reference No'],
                    "transactionDate": new Date((sbiObj['Transaction Date'] - (25567 + 2)) * 86400 * 1000),
                    "amount": sbiObj['Amount'] || 0,
                    "earlierDues": sbiObj['d EARLIER DUES IF ANY'] != 'null' ? sbiObj['d EARLIER DUES IF ANY'] : 0,
                    "status": sbiObj['Status'],
                    "studentId": sbiObj['UNIQUE NUMBER'] || sbiObj['UNIQUE NO'],
                    "yearAndBranch": sbiObj['YEAR AND  BRANCH OF STUDY'],
                    "remarks": sbiObj['Remarks'],
                    "createdBy": this.request?.currentUser?.userCode || "crradmin",
                    "lastModifiedBy": this.request?.currentUser?.userCode || "crradmin",
                    "tenantCode": "Fees",
                    "changeCount": 1
                };
                let feesPaid = {};
                for (let feeType in organizationObj.feesTypes || {}) {
                    let obj = organizationObj.feesTypes[feeType];
                    feesPaid[feeType] = sbiObj[obj.transactionColumnName] != 'null' ? sbiObj[obj.transactionColumnName] : 0 || 0;
                }
                obj["feesPaid"] = feesPaid;
                updatedData.push(obj);
            }
            if (updatedData.length > 0) {
                let res = await this.insertMany(updatedData);
                await studentModel.updateFeesBasedOnTransactions(updatedData, financialYear);
                return { code: '0', message: `${res.length} transcations inserted successfully.${message}` };
            } else {
                return { code: '0', message: `unable to upload transcations. ${message}` };
            }

        } catch (ex) {
            console.log('error in insertSBICollectData: ' + ex.toString());
            return { code: '-1', message: 'error in while inserting transcations. please check file. Details: ' + ex.toString() };
        }
    }
}
