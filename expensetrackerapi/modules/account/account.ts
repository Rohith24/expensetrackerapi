import express = require('express');
import coreModule = require('../coreModule');
import logger = require('../../controllers/logger');

import mongoose = require('mongoose');
import { sum } from '../../lib/utilities';

var SchemaTypes = mongoose.Schema.Types;
var Schema = mongoose.Schema;


// create a accountSchema
var accountSchema = new Schema({
    "customerId": { type: String },
    "bankId": { type: String, required: true, index: true },
    "name": { type: String, required: true, index: true },
    "type": { type: String, required: true, index: true },
    "balance": { type: Number, required: true },
    "initBalance": { type: Number, required: true },
    "currency": { type: String, required: true },
    "interest": { type: Number },

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

var accountModel = mongoose.model('account', accountSchema);

export class accountFactory extends coreModule {

    private collectionName: string;
    constructor(request: express.Request) {
        super(request);
        this.collectionName = "account";
    }

    public getSchema = async () => {

        var model = await this.dal.model('account');

        return model.getSchema();
    }

    public getModelName = async () => {

        var model = await this.dal.model('account');

        return model.getModelName();
    }

    /**
    * DAL Call get from mongodb
    * @query mongodb query to get the account's
    * @options mongodb projections (optional)
    * return array of accounts
    */
    public find = async (query: any, optional?: any) => {
        query = query || {};
        try {
            var model = await this.dal.model('account');

            var ret = await model.find(query, optional);
        } catch (err) {
            logger.error(this.request, "Error while executing get : " + err.toString(), 'account', "", "catch", '1', query, err);
            console.log(err);
        }
        return ret;
    }

    /**
      * get account from database
      * @param accountId  account ID
      * return account from database
      */
    public findById = async (accountId) => {
        try {
            let model = await this.dal.model('account');
            let obj = await model.findById("" + accountId);
            return obj;
        } catch (ex) {
            logger.error(this.request, "Error while executing findById : " + ex.toString(), 'account', "", "catch", '1', accountId, ex);
        }
    }

    /**
      * get account from database
      * @param query query to get data from database
      * @param projection optional fields to return
      * return account from database
      */
    public findOne = async (query: any, projection?: any) => {
        try {
            query = query || {};
            projection = projection || {};
            var model = await this.dal.model('account');
            let ret = await model.findOne(query, projection);
            return ret;
        } catch (ex) {
            logger.error(this.request, "Error while executing findOne : " + ex.toString(), 'account', "", "catch", '1', query, ex);
        }
    }

    /**
    * saving account into mongodb
    * @accountObject  account
    * return  saved account
    */
    public _create = async (accountObject: any) => {
        try {
            var model = await this.dal.model('account');
            if (accountObject) {
                //var _id = await this.dal.getNextSequence('account');
                //accountObject._id = uuid.v4();
                var resData = await model.create([accountObject]);

                // logger.info(this.request, "account saving into mongodb and redis cache.", 'account', accountObject._id, "save", "5");
                return resData[0] || {};
            }
        } catch (err) {
            console.log(err);

            //logger.error(this.request, "Error while Create account in account Module" + err.toString(), 'account', "accountObject", "error", "1", accountObject,err);
            throw err;
        }
    }

    /**
    * updating account into mongodb
    * @param  accountObject
    * return  updated account
    */
    public _update = async (accountObject: any) => {
        try {
            var model = await this.dal.model('account');
            if (accountObject) {
                accountObject.lastModifiedDate = new Date().toISOString();
                var resData = await model.findByIdAndUpdate(accountObject);
                // logger.info(this.request, "account Updating into mongodb and redis cache.", 'account', accountObject._id, "save", "5");
                return resData;
            }
        } catch (err) {
            console.log(err);

            //logger.error(this.request, "Error while Updating account in account Module " + err.toString(), 'account', "accountObject", "error", "1", accountObject,err);
            throw err;
        }
    }

    /**
      * This save method will create or update the account based on input json.
      * @param accountObj - account
      * @returns return created or updated account
      */
    public save = async (accountObj: any) => {
        try {
            var accountExists = await this.findById(accountObj._id);
            let result, changeCount = accountObj.changeCount;

            if (changeCount == 0 || changeCount == null || changeCount == undefined) {
                if (!accountExists) {
                    try {
                        //Check whether user has permission to save
                        accountObj.changeCount = 1;
                        var accountData = await this._create(accountObj);
                        result = { code: "0", message: "account Created", account: accountData };
                    } catch (ex) {
                        result = { code: "-1", message: "Error while saving account", "error": ex };
                    }
                } else if (accountExists.deleteMark != 0) {
                    result = { code: "-1", message: "object has been already used and logically deleted", account: accountExists };
                } else if (accountExists.isActive != 1) {
                    result = { code: "-1", message: "code already exists and is inactive", account: accountExists };
                } else {
                    result = { code: "-1", message: "object already exists with the given code", account: accountExists };
                }
            } else {
                if (!accountExists) {
                    result = { code: "-1", message: "code could not be found" };
                } else if (accountExists.deleteMark != 0) {
                    result = { code: "-1", message: "object has been already used and logically deleted", account: accountExists };
                } else if (accountExists.isActive != 1) {
                    result = { code: "-1", message: "Account exists and is inactive", account: accountExists };
                } else {
                    if (accountExists.changeCount == changeCount) {
                        try {
                            accountObj.changeCount = accountObj.changeCount + 1;
                            accountObj._id = accountExists._id;
                            accountObj.createdBy = accountObj.createdBy || accountExists.createdBy;
                            let accountData = await this._update(accountObj);
                            result = { code: "0", message: "account updated", account: accountData };
                        } catch (ex) {
                            result = { code: "-1", message: "Error while updating account", "error": ex };
                        }
                    } else {
                        result = { code: "-1", message: "A concurrency issues occurred while updating account", account: accountExists };
                    }

                }
            }
            return result;
        } catch (ex) {
            console.log(ex);
            logger.error(this.request, "Error while executing saving account error : " + ex.toString(), "account", "/save/", "catch", '1', accountObj, ex);
            return { code: "-1", message: "Error while saving account." };
        }
    }

    /**
    * remove account into mongodb
    * @param  objectCode object
    * return  updated account
    */
    public remove = async (objectCode: any) => {
        try {
            var model = await this.dal.model('account');

            if (objectCode != null && objectCode != undefined) {
                var retObj = null;
                var query = {
                    _id: objectCode
                };
                retObj = await model.find(query, {});
                if (retObj != null && retObj != undefined && retObj[0]) {
                    retObj = retObj[0];

                    /*if (retObj.deleteMark && retObj.changeCount != changeCount) { 
                        return { code: "-1", message: "Concurrency issue occured in account.", account: retObj };
                    } */
                    if (retObj.deleteMark && retObj.deleteMark == 1) {
                        return { code: "-1", message: "account has been already deleted." };
                    }
                    if (retObj.isActive && retObj.isActive == 0) {
                        return { code: "-1", message: "account already exists and is inactive." };
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

                    return { code: "0", message: "account deleted successfully", account: resData };

                } else {
                    return { code: "-1", message: "account with given id does not exist." };
                }
            } else {
                return { code: "-1", message: "account with given id does not exist." };
            }
        } catch (err) {
            console.log(err);
            logger.error(this.request, "Error While Removing account in CoreEngine Module" + err.toString(), 'account', "accountObject", "error", "1", objectCode, err);
            return { code: "-1", message: "Catch error:" + err.toString() };
        }
    }

    /**
      * get account from database
      * @param query query to get data from database
      * @param skip skip
      * @param limit limit
      * @param sort sort
      * @param projection optional fields to return
      * return account from database
      */
    public paginate = async (query: any, skip: number, limit: number, sort: any, projection?: any) => {
        try {
            query = query || {};
            projection = projection || {};
            let model = await this.dal.model('account');
            let ret = await model.paginate(query, skip, limit, sort, projection);
            return ret;
        } catch (ex) {
            logger.error(this.request, "Error while executing paginate : " + ex.toString(), 'account', query, "catch", '1', query, ex);
        }
    }

    /**
      * get account count from database
      * @param query  query
      * return account count from database
      */
    public count = async (query) => {
        try {
            let model = await this.dal.model('account');
            let accountCount = await model.count(query);
            return accountCount;
        } catch (ex) {
            logger.error(this.request, "Error while executing count : " + ex.toString(), 'account', query, "catch", '1', query, ex);
        }
    }

    //dal Call to insert account Objects
    public insertMany = async (accountObjects: any) => {
        var model = await this.dal.model('account');
        var resData = await model.insertMany(accountObjects);
        return await resData;
    }

    public UpdateBalance = async (accountId: any, amount: number) => {
        if (accountId != null && accountId != undefined) {
            var accountExists = await this.findById(accountId);
            if (accountExists) {
                return await this.UpdateAmount(accountExists, amount);
            }
        }
    }

    public UpdateAmount = async (account: any, amount: number) => {
        if (account.balance)
            account.balance = sum(account.balance, amount);
        else
            account.balance = amount;
        return await this._update(account);
    }


    public insertAccountData = async (accountData) => {
        let msg = "";
        try {
            var insertedCount = 0;
            var updatedCount = 0;
            for (let accountObj of accountData || []) {
                let currentMessage = ""
                let accountName = accountObj['AccountName'];
                if (!accountName) continue;
                let accountExists = await this.findOne({ name: accountName });
                let obj: any = {};
                if (!accountExists) {
                    obj["name"] = accountObj['AccountName'];
                    obj["bankId"] = accountObj['Bank'];
                    obj["type"] = accountObj['Type'];
                    obj["initBalance"] = accountObj['Initial Balance'];
                    obj["balance"] = accountObj['Initial Balance'];
                    obj["currency"] = accountObj['Currency'];
                    obj["interest"] = accountObj['Interest'];
                    obj["createdBy"] = this.request?.currentUser?.userCode || "crradmin";
                    obj["lastModifiedBy"] = this.request?.currentUser?.userCode || "crradmin";
                    obj["tenantCode"] = "BudgetTracker";
                    obj["changeCount"] = 1;
                    let accountData = await this._create(obj);
                    insertedCount++;
                }
                else {
                    obj = accountExists;
                    obj["name"] = accountObj['AccountName'];
                    obj["bankId"] = accountObj['Bank'];
                    obj["type"] = accountObj['Type'];
                    obj["initBalance"] = accountObj['Initial Balance'];
                    obj["currency"] = accountObj['Currency'];
                    obj["interest"] = accountObj['Interest'];
                    obj["lastModifiedBy"] = this.request?.currentUser?.userCode || "crradmin";
                    obj.changeCount = obj.changeCount + 1;
                    let accountData = await this._update(obj);
                    updatedCount++;
                }
                if (currentMessage) {
                    msg += `\n${accountName}: \n` + currentMessage + "\n";
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
            return { code: '-1', message: 'Error while inserting account. Details: ' + ex.toString() };
        }
    }
}
