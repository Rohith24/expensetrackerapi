import express = require('express');
import coreModule = require('../coreModule');
import logger = require('../../controllers/logger');
import user = require('../users');

import mongoose = require('mongoose');

var SchemaTypes = mongoose.Schema.Types;
var Schema = mongoose.Schema;


// create a transactionsschema
var transactionsSchema = new Schema({
    "_id": { type: String },
    "accountId": { type: String, required: true, index: true },
    "bankReferenceNo": { type: String, required: false, maxlength: 200 },
    "bankTranSummary": { type: String, required: true, maxlength: 200 },
    "transactionDate": { type: Date, required: true, index: true },
    "transactionValueDate": { type: Date, required: true },
    "type": { type: String, required: true, index: true },
    "amount": { type: Number, required: true },

    "catagory": { type: String, index: true },
    "details": { type: String },
    "additionalDetails": { type: String },

    "remarks": { type: String },
    "createdBy": { type: String, required: true },
    "dateCreated": { type: Date, default: Date.now },
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
}
