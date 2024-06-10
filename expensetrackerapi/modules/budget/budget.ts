import express = require('express');
import coreModule = require('../coreModule');
import logger = require('../../controllers/logger');

import mongoose = require('mongoose');
import { roundNumber } from '../../lib/utilities';

var SchemaTypes = mongoose.Schema.Types;
var Schema = mongoose.Schema;


// create a budgetSchema
var budgetSchema = new Schema({
    "name": { type: String, required: true, index: true },
    "amount": { type: Number, required: true },
    "tillNow": { type: Number, required: true },

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

var budgetModel = mongoose.model('budget', budgetSchema);

export class budgetFactory extends coreModule {

    private collectionName: string;
    constructor(request: express.Request) {
        super(request);
        this.collectionName = "budget";
    }

    public getSchema = async () => {

        var model = await this.dal.model('budget');

        return model.getSchema();
    }

    public getModelName = async () => {

        var model = await this.dal.model('budget');

        return model.getModelName();
    }

    /**
    * DAL Call get from mongodb
    * @query mongodb query to get the budget's
    * @options mongodb projections (optional)
    * return array of budgets
    */
    public find = async (query: any, optional?: any) => {
        query = query || {};
        try {
            var model = await this.dal.model('budget');

            var ret = await model.find(query, optional);
        } catch (err) {
            logger.error(this.request, "Error while executing get : " + err.toString(), 'budget', "", "catch", '1', query, err);
            console.log(err);
        }
        return ret;
    }

    /**
      * get budget from database
      * @param budgetId  budget ID
      * return budget from database
      */
    public findById = async (budgetId) => {
        try {
            let model = await this.dal.model('budget');
            let obj = await model.findById("" + budgetId);
            return obj;
        } catch (ex) {
            logger.error(this.request, "Error while executing findById : " + ex.toString(), 'budget', "", "catch", '1', budgetId, ex);
        }
    }

    /**
      * get budget from database
      * @param query query to get data from database
      * @param projection optional fields to return
      * return budget from database
      */
    public findOne = async (query: any, projection?: any) => {
        try {
            query = query || {};
            projection = projection || {};
            var model = await this.dal.model('budget');
            let ret = await model.findOne(query, projection);
            return ret;
        } catch (ex) {
            logger.error(this.request, "Error while executing findOne : " + ex.toString(), 'budget', "", "catch", '1', query, ex);
        }
    }

    /**
    * saving budget into mongodb
    * @budgetObject  budget
    * return  saved budget
    */
    public _create = async (budgetObject: any) => {
        try {
            var model = await this.dal.model('budget');
            if (budgetObject) {
                //var _id = await this.dal.getNextSequence('budget');
                //budgetObject._id = uuid.v4();
                var resData = await model.create([budgetObject]);

                // logger.info(this.request, "budget saving into mongodb and redis cache.", 'budget', budgetObject._id, "save", "5");
                return resData[0] || {};
            }
        } catch (err) {
            console.log(err);

            //logger.error(this.request, "Error while Create budget in budget Module" + err.toString(), 'budget', "budgetObject", "error", "1", budgetObject,err);
            throw err;
        }
    }

    /**
    * updating budget into mongodb
    * @param  budgetObject
    * return  updated budget
    */
    public _update = async (budgetObject: any) => {
        try {
            var model = await this.dal.model('budget');
            if (budgetObject) {
                budgetObject.lastModifiedDate = new Date().toISOString();
                var resData = await model.findByIdAndUpdate(budgetObject);
                // logger.info(this.request, "budget Updating into mongodb and redis cache.", 'budget', budgetObject._id, "save", "5");
                return resData;
            }
        } catch (err) {
            console.log(err);

            //logger.error(this.request, "Error while Updating budget in budget Module " + err.toString(), 'budget', "budgetObject", "error", "1", budgetObject,err);
            throw err;
        }
    }

    /**
      * This save method will create or update the budget based on input json.
      * @param budgetObj - budget
      * @returns return created or updated budget
      */
    public save = async (budgetObj: any) => {
        try {
            var budgetExists = await this.findById(budgetObj._id);
            let result, changeCount = budgetObj.changeCount;

            if (changeCount == 0 || changeCount == null || changeCount == undefined) {
                if (!budgetExists) {
                    try {
                        //Check whether user has permission to save
                        budgetObj.changeCount = 1;
                        var budgetData = await this._create(budgetObj);
                        result = { code: "0", message: `Budget '${budgetObj.name}' Created`, budget: budgetData };
                    } catch (ex) {
                        result = { code: "-1", message: "Error while saving budget", "error": ex };
                    }
                } else if (budgetExists.deleteMark != 0) {
                    result = { code: "-1", message: "object has been already used and logically deleted", budget: budgetExists };
                } else if (budgetExists.isActive != 1) {
                    result = { code: "-1", message: "code already exists and is inactive", budget: budgetExists };
                } else {
                    result = { code: "-1", message: "object already exists with the given code", budget: budgetExists };
                }
            } else {
                if (!budgetExists) {
                    result = { code: "-1", message: "code could not be found" };
                } else if (budgetExists.deleteMark != 0) {
                    result = { code: "-1", message: "object has been already used and logically deleted", budget: budgetExists };
                } else if (budgetExists.isActive != 1) {
                    result = { code: "-1", message: "object already exists with the given code", budget: budgetExists };
                } else {
                    if (budgetExists.changeCount == changeCount) {
                        try {
                            //Check whether user has permission to update
                            //budgetExists = await this.ACLPrecedence(budgetExists, true);
                            if (budgetExists.securityCode == null || budgetExists.securityCode < 7) {
                                return { code: "-1", message: "You don't have access to perform this action." };
                            }
                            delete budgetExists.securityCode;
                            delete budgetExists.precedenceAcl;

                            budgetObj.changeCount = budgetObj.changeCount + 1;
                            budgetObj._id = budgetExists._id;
                            budgetObj.createdBy = budgetObj.createdBy || budgetExists.createdBy;
                            let budgetData = await this._update(budgetObj);
                            result = { code: "0", message: "budget updated", budget: budgetData };
                        } catch (ex) {
                            result = { code: "-1", message: "Error while updating budget", "error": ex };
                        }
                    } else {
                        result = { code: "-1", message: "A concurrency issues occurred while updating budget", budget: budgetExists };
                    }

                }
            }
            return result;
        } catch (ex) {
            console.log(ex);
            logger.error(this.request, "Error while executing saving budget error : " + ex.toString(), "budget", "/save/", "catch", '1', budgetObj, ex);
            return { code: "-1", message: "Error while saving budget." };
        }
    }

    /**
    * remove budget into mongodb
    * @param  objectCode object
    * return  updated budget
    */
    public remove = async (objectCode: any) => {
        try {
            var model = await this.dal.model('budget');

            if (objectCode != null && objectCode != undefined) {
                var retObj = null;
                var query = {
                    _id: objectCode
                };
                retObj = await model.find(query, {});
                if (retObj != null && retObj != undefined && retObj[0]) {
                    retObj = retObj[0];

                    /*if (retObj.deleteMark && retObj.changeCount != changeCount) { 
                        return { code: "-1", message: "Concurrency issue occured in budget.", budget: retObj };
                    } */
                    if (retObj.deleteMark && retObj.deleteMark == 1) {
                        return { code: "-1", message: "budget has been already deleted." };
                    }
                    if (retObj.isActive && retObj.isActive == 0) {
                        return { code: "-1", message: "budget already exists and is inactive." };
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

                    return { code: "0", message: "budget deleted successfully", budget: resData };

                } else {
                    return { code: "-1", message: "budget with given id does not exist." };
                }
            } else {
                return { code: "-1", message: "budget with given id does not exist." };
            }
        } catch (err) {
            console.log(err);
            logger.error(this.request, "Error While Removing budget in CoreEngine Module" + err.toString(), 'budget', "budgetObject", "error", "1", objectCode, err);
            return { code: "-1", message: "Catch error:" + err.toString() };
        }
    }

    /**
      * get budget from database
      * @param query query to get data from database
      * @param skip skip
      * @param limit limit
      * @param sort sort
      * @param projection optional fields to return
      * return budget from database
      */
    public paginate = async (query: any, skip: number, limit: number, sort: any, projection?: any) => {
        try {
            query = query || {};
            projection = projection || {};
            let model = await this.dal.model('budget');
            let ret = await model.paginate(query, skip, limit, sort, projection);
            return ret;
        } catch (ex) {
            logger.error(this.request, "Error while executing paginate : " + ex.toString(), 'budget', query, "catch", '1', query, ex);
        }
    }

    /**
      * get budget count from database
      * @param query  query
      * return budget count from database
      */
    public count = async (query) => {
        try {
            let model = await this.dal.model('budget');
            let budgetCount = await model.count(query);
            return budgetCount;
        } catch (ex) {
            logger.error(this.request, "Error while executing count : " + ex.toString(), 'budget', query, "catch", '1', query, ex);
        }
    }

    //dal Call to insert budget Objects
    public insertMany = async (budgetObjects: any) => {
        var model = await this.dal.model('budget');
        var resData = await model.insertMany(budgetObjects);
        return await resData;
    }

    public UpdateBalance = async (budgetId: any, amount: number) => {
        if (budgetId != null && budgetId != undefined) {
            var accountExists = await this.findById(budgetId);
            if (accountExists) {
                return await this.UpdateAmount(accountExists, amount);
            }
        }
    }

    public UpdateAmount = async (account: any, amount: number) => {
        if (account.tillNow)
            account.tillNow = roundNumber(account.tillNow + roundNumber(amount * 1));
        else
            account.tillNow = amount;
        return await this._update(account);
    }
}
