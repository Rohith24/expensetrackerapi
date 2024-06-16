import express = require('express');
import coreModule = require('../coreModule');
import logger = require('../../controllers/logger');
import { budget } from '../budget';

import mongoose = require('mongoose');
import { account } from '../account';
import { capitalize } from '../../lib/utilities';
import config = require('../../config');

var SchemaTypes = mongoose.Schema.Types;
var Schema = mongoose.Schema;

enum TransactionType {
    Credit = 'Credit',
    Debit = 'Debit',
    Transfer = 'Transfer'
}
// create a transactionsschema
var transactionsSchema = new Schema({
    "fromAccountId": { type: Schema.Types.ObjectId, index: true },
    "toAccountId": { type: Schema.Types.ObjectId, index: true },
    "bankReferenceNo": { type: String, required: false, maxlength: 200 },
    "bankTranSummary": { type: String, required: false, maxlength: 500 },
    "transactionDate": { type: Date, required: true },
    "transactionValueDate": { type: Date, required: false },
    "amount": { type: Number, required: true },
    "subTranscationIds": [Schema.Types.ObjectId],

    "category": { type: Schema.Types.ObjectId, index: true },
    "details": { type: String },
    "additionalDetails": { type: String },
    "whom": { type: String },

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
            var transactionExists = await this.findById(transactionObj._id);
            let result, changeCount = transactionObj.changeCount;

            if (changeCount == 0 || changeCount == null || changeCount == undefined) {
                if (!transactionExists) {
                    try {
                        //Check whether user has permission to save
                        transactionObj.changeCount = 1;
                        var transactionData = await this._create(transactionObj);
                        result = { code: "0", message: "Transaction Created", transaction: transactionData };
                    } catch (ex) {
                        result = { code: "-1", message: "Error while saving Transaction", "error": ex };
                    }
                } else if (transactionExists.deleteMark != 0) {
                    result = { code: "-1", message: "object has been already used and logically deleted", transaction: transactionExists };
                } else if (transactionExists.isActive != 1) {
                    result = { code: "-1", message: "code already exists and is inactive", transaction: transactionExists };
                } else {
                    result = { code: "-1", message: "object already exists with the given code", transaction: transactionExists };
                }
            } else {
                if (!transactionExists) {
                    result = { code: "-1", message: "code could not be found" };
                } else if (transactionExists.deleteMark != 0) {
                    result = { code: "-1", message: "object has been already used and logically deleted", transaction: transactionExists };
                } else if (transactionExists.isActive != 1) {
                    result = { code: "-1", message: "object already exists with the given code", transaction: transactionExists };
                } else {
                    if (transactionExists.changeCount == changeCount) {
                        try {
                            transactionObj.changeCount = transactionObj.changeCount + 1;
                            transactionObj._id = transactionExists._id;
                            transactionObj.createdBy = transactionObj.createdBy || transactionExists.createdBy;
                            let transactionData = await this._update(transactionObj);
                            result = { code: "0", message: "Transaction updated", transaction: transactionData };
                        } catch (ex) {
                            result = { code: "-1", message: "Error while updating transaction", "error": ex };
                        }
                    } else {
                        result = { code: "-1", message: "A concurrency issues occurred while updating transaction", transaction: transactionExists };
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
    * @param  transactionId object
    * return  updated transaction
    */
    public remove = async (transactionId: any) => {
        try {
            var model = await this.dal.model('transaction');

            if (transactionId != null && transactionId != undefined) {
                var retObj = null;
                var query = {
                    _id: transactionId
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
            logger.error(this.request, "Error While Removing transaction in CoreEngine Module" + err.toString(), 'transaction', "transactionObject", "error", "1", transactionId, err);
            return { code: "-1", message: "Catch error:" + err.toString() };
        }
    }

    /**
* remove transaction into mongodb
* @param  transcationObj object
* return  updated transaction
*/
    public removeObj = async (transcationObj: any) => {
        try {
            var model = await this.dal.model('transaction');

            if (transcationObj != null && transcationObj != undefined) {

                /*if (retObj.deleteMark && retObj.changeCount != changeCount) { 
                    return { code: "-1", message: "Concurrency issue occured in transaction.", transaction: retObj };
                } */
                if (transcationObj.deleteMark && transcationObj.deleteMark == 1) {
                    return { code: "-1", message: "transaction has been already deleted." };
                }
                if (transcationObj.isActive && transcationObj.isActive == 0) {
                    return { code: "-1", message: "transaction already exists and is inactive." };
                }


                transcationObj.isActive = 0;
                transcationObj.deleteMark = 1;
                if (transcationObj.changeCount) {
                    transcationObj.changeCount = transcationObj.changeCount + 1;
                } else {
                    transcationObj.changeCount = 1;
                }
                transcationObj.tenantId = this.request.tenant._id;
                var resData = await model.findByIdAndUpdate(transcationObj);

                return { code: "0", message: "Transaction deleted successfully", transaction: resData };

            } else {
                return { code: "-1", message: "Transaction with given id does not exist." };
            }
            
        } catch (err) {
            console.log(err);
            logger.error(this.request, "Error While Removing transaction in CoreEngine Module" + err.toString(), 'transaction', "transactionObject", "error", "1", transcationObj._id, err);
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
      * get transaction from database
      * @param query query to get data from database
      * @param skip skip
      * @param limit limit
      * @param sort sort
      * @param projection optional fields to return
      * return transaction from database
      */
    public aggregate = async (query: any, projection?: any) => {
        try {
            query = query || {};
            projection = projection || {};
            let model = await this.dal.model('transaction');
            let ret = await model.aggregate(query, projection);
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

    public defaultAggregate = async (matchQuery: any, projection?: any) => {
        try {
            let query = [
                {
                    $match: matchQuery
                },
                {
                    $lookup:
                    {
                        from: "accounts",
                        localField: "toAccountId",
                        foreignField: "_id",
                        as: "toAccount"
                    }
                },
                {
                    $unwind: {
                        path: '$toAccount',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup:
                    {
                        from: "accounts",
                        localField: "fromAccountId",
                        foreignField: "_id",
                        as: "fromAccount"
                    }
                },
                {
                    $unwind: {
                        path: '$fromAccount',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup:
                    {
                        from: "budgets",
                        localField: "category",
                        foreignField: "_id",
                        as: "budget"
                    }
                },
                {
                    $unwind: {
                        path: '$budget',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $replaceRoot: { newRoot: "$$ROOT" }
                },
                {
                    $set:
                    /**
                     * field: The field name
                     * expression: The expression.
                     */
                    {
                        type: {
                            $cond: [
                                {
                                    $and: [
                                        {
                                            $ifNull: [
                                                "$fromAccountId",
                                                false
                                            ]
                                        },
                                        {
                                            $ifNull: ["$toAccountId", false]
                                        }
                                    ]
                                },
                                // Both fromAccountId and toAccountId have values
                                "Transfer",
                                // If true, return 'Transfer'
                                {
                                    $cond: [
                                        {
                                            $ifNull: ["$toAccountId", false]
                                        },
                                        // Only toAccountId has a value
                                        "Credit",
                                        // If true, return 'Credit'
                                        {
                                            $cond: [
                                                {
                                                    $ifNull: [
                                                        "$fromAccountId",
                                                        false
                                                    ]
                                                },
                                                // Only fromAccountId has a value
                                                "Debit",
                                                // If true, return 'Debit'
                                                "Unknown" // Fallback value if none of the conditions match
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                },
                {
                    $sort:
                    {
                        transactionDate: -1
                    }
                }
            ]

            projection = projection || {};
            let model = await this.dal.model('transaction');
            let ret = await model.aggregate(query, projection);
            return ret;
        } catch (ex) {
            logger.error(this.request, "Error while executing defaultAggregate : " + ex.toString(), 'transaction', matchQuery, "catch", '1', matchQuery, ex);
        }
    }


    public insertTransactionsData = async (transactionData) => {
        let msg = "";
        let accountModel = new account.accounts(this.request);
        let budgetModel = new budget.budgets(this.request);
        try {
            var insertedCount = 0;
            var updatedCount = 0;
            for (let transactionObj of transactionData || []) {
                let currentMessage = ""
                try {
                    let obj: any = {};
                    if (transactionObj['Date']) {
                        try {
                            obj["transactionDate"] = new Date((transactionObj['Date'] - (25567 + 2)) * 86400 * 1000);
                        }
                        catch (Ex) {
                            var dateString = transactionObj['Date'];// "01012023";
                            var year = dateString.substr(4, 4);
                            var month = dateString.substr(2, 2) - 1; // Month is zero-based in JavaScript Date
                            var day = dateString.substr(0, 2);
                            var date = new Date(year, month, day);
                            obj["transactionDate"] = date;
                        }
                    }
                    let transactionType = capitalize(transactionObj['Transaction Type']);

                    var toAccount = await accountModel.findOne({ "name": { "$regex": `^${transactionObj['To Account']}$`, "$options": "i" } });
                    var fromAccount = await accountModel.findOne({ "name": { "$regex": `^${transactionObj['From Account']}$`, "$options": "i" } });
                    var budgetDetails = await budgetModel.findOne({ "name": { "$regex": `^${transactionObj['Category']}$`, "$options": "i" } });
                    var amount = transactionObj['Amount'];
                    obj["amount"] = Math.abs(amount);
                    
                    if (transactionType == TransactionType.Credit) {
                        if (toAccount) {
                            obj["toAccountId"] = toAccount._id;
                            await accountModel.UpdateAmount(toAccount, amount);
                        } else {
                            obj["toAccountId"] = transactionObj['To Account'];
                        }
                    } else if (transactionType == TransactionType.Debit) {
                        if (toAccount) {
                            obj["fromAccountId"] = toAccount._id;
                            await accountModel.UpdateAmount(toAccount, amount);
                        } else {
                            obj["fromAccountId"] = transactionObj['To Account'];
                        }
                    } else if (transactionType == TransactionType.Transfer) {
                        if (toAccount) {
                            obj["toAccountId"] = toAccount._id;
                            await accountModel.UpdateAmount(toAccount, amount);
                        } else {
                            obj["toAccountId"] = transactionObj['To Account'];
                        }
                        if (fromAccount) {
                            obj["fromAccountId"] = fromAccount._id;
                            await accountModel.UpdateAmount(fromAccount, amount * -1);
                        } else {
                            obj["fromAccountId"] = transactionObj['From Account'];
                        }
                    }
                    if (budgetDetails) {
                        await budgetModel.UpdateAmount(budgetDetails, amount);
                        obj["category"] = budgetDetails._id;
                    } else {
                        obj["category"] = transactionObj['Category'];
                    }
                    obj["details"] = transactionObj['Details'];
                    obj["whom"] = transactionObj['Whom'];
                    obj["additionalDetails"] = transactionObj['SubDetails'];
                    obj["createdBy"] = this.request?.currentUser?.userCode || "crradmin";
                    obj["lastModifiedBy"] = this.request?.currentUser?.userCode || "crradmin";
                    obj["tenantCode"] = config.defaultTenant;
                
                    let transactionData = await this._create(obj);
                    insertedCount++;
                } catch (ex) {
                    currentMessage = ex.toString();
                    console.log('error in insertAccountData: ' + ex.toString() + '\nMessage:' + msg);
                }
                if (currentMessage) {
                    msg += `\n${transactionObj}: \n` + currentMessage + "\n";
                }
            }
            console.log(msg);
            let message = "";
            if (insertedCount > 0)
                message += `Accounts - ${insertedCount} Inserted successfully.\n`;
            if (updatedCount > 0)
                message += `Accounts - ${updatedCount} Updated successfully.\n`;
            message += msg;
            if (message)
                return { code: '0', message: message };
            else
                return { code: '-1', message: 'Invalid data given. Please upload correct data' };
        } catch (ex) {
            console.log('error in insertAccountData: ' + ex.toString() + '\nMessage:' + msg);
            return { code: '-1', message: 'Error while inserting transaction. Details: ' + ex.toString() };
        }
    }
}
