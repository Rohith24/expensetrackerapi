
import mongoose = require('mongoose');
import express = require('express');
import config = require('../../config');
import coreModule = require('../coreModule');
import logger = require('../../controllers/logger');
import { admin } from "../admin";

var bcrypt = require('bcryptjs');
const uuid = require('uuid');

var SchemaTypes = mongoose.Schema.Types;
var Schema = mongoose.Schema;

// create a Calc USERschema
var userSchema = new Schema({
    "_id": String,
    "userCode": { type: String, required: true, unique: true },
    "title": { type: String, required: true, maxlength: 300 },
    "firstName": { type: String, required: true },
    "lastName": { type: String, required: true },
    "password": String,
    "emailId": { type: String, required: true },
    "phone": String,
    "officePhone": String,
    "fax": String,

    "isLocked": { type: Boolean, default: false },
    "expirationDate": Date,
    "passwordModifiedDate": { type: Date },
    "lastLoggedIn": { type: Date },
    "lastFailedLogin": { type: Date },
    "invalidLoginCount": { type: Number },

    "createdBy": { type: String, required: true },
    "dateCreated": { type: Date },
    "lastModifiedBy": { type: String, required: true },
    "lastModifiedDate": { type: Date },
    "deleteMark": { type: Number, required: true, default: 0 },//0 = available 1= deleted
    "isActive": { type: Number, required: true, default: 1 },//1=Active , 0= incative
    "changeCount": { type: Number, required: true, default: 0 },
    "tenantCode": { type: String },
    "isSuperAdmin": { type: Boolean, default: false },
    "organizationCodes": [{ "code": { type: String, maxlength: 50 }, "securityCode": { type: Number } }],
    "acl": [
        {
            "type": { type: String, maxlength: 50 },
            "code": { type: String, maxlength: 50 },
            "securityCode": { type: Number }, // 0 - None, 1 - Read, 2 - Write, 4 - ReadWrite, 8 - ALL,
            "_id": false
        }
    ],

    groups: [],
    roles: []
}, { timestamps: { createdAt: 'dateCreated', updatedAt: 'lastModifiedDate' }, strict: true });

var userModel = mongoose.model("user", userSchema);


//moved password policy related columns to password policy object. 
var passwordPlicy = {
    minpasswordlength: Number,
    minimumnonalpha: Number,
    maxpasswordfailedattempt: Number,
    passwordexpireinterval: Number,
    minimumspecialchars: Number
}



export class user extends coreModule {
    private collectionName: string;

    constructor(request: express.Request) {
        super(request);
        this.collectionName = "user";
    }

    public findOne = async (query: any, projection?: any, callback?: Function) => {
        query = query || {};
        projection = projection || {};
        var model = await this.dal.model("user");
        let ret = await model.findOne(query, projection, callback);
        return ret;
    }

    /**
    * DAL Call get from mongodb
    * @query mongodb query to get the user's
    * @options mongodb projections (optional)
    * return array of users
    */
    public get = async (query: any, optional?: any) => {
        query = query || {};
        var ret = [];
        try {
            var model = await this.dal.model("user");
            ret = await model.find(query, optional);
        } catch (err) {
            logger.error(this.request, "Error while get " + err.toString(), "USER", "userObject", "error", "1", query, err);

            console.log(err);
        }
        return ret;
    }

    /**
    * updating Calc USER into mongodb
    * @param  user object
    * return  updated user object
    */
    public update = async (userObject: any) => {
        try {
            var model = await this.dal.model("user");
            if (userObject) {
                userObject.lastModifiedDate = new Date().toISOString();
                var resData = await model.findByIdAndUpdate(userObject);
                // logger.info(this.request, "user Updating into mongodb and redis cache.", "Calc USER", userObject._id, "save", "5");
                return resData;
            }
        } catch (err) {
            console.log(err);
            if (err.message) {
                return { code: "-1", message: "Error while updating Calc USER" };
            }
            logger.error(this.request, "Error while Updating user in CoreEngine Module " + err.toString(), "Calc USER", "userObject", "error", "1", userObject, err);
            throw err;
        }
    }

    public getSchema = async () => {

        var model = await this.dal.model("user");

        return model.getSchema();
    }

    public getModelName = async () => {

        var model = await this.dal.model("user");

        return model.getModelName();
    }

    /**
      * get user from database
      * @param query query to get data from database
      * @param projection optional fields to return
      * return user object from database
      */
    public find = async (query: any, projection?: any) => {
        try {
            query = query || {};
            projection = projection || {};
            var model = await this.dal.model("user");
            let ret = await model.find(query, projection);
            return ret;
        } catch (ex) {
            logger.error(this.request, "Error while executing find : " + ex.toString(), "user", "", "catch", '1', query, ex);
        }
    }

    /**
    * DAL Call findByCode from mongodb based on objectCode
    * @objectCode objectCode
    * return user object.
    */
    public findByCode = async (objectCode: string) => {
        try {
            var model = await this.dal.model("user");
            var ret = await model.findByCode(objectCode);
        } catch (err) {
            logger.error(this.request, "Error while executing findByCode : " + err.toString(), "user", "", "catch", '1', objectCode, err);
            console.log(err);
        }
        return ret;
    }

    /**
      * get user from database
      * @param userId  user ID
      * return user object from database
      */
    public findById = async (userId) => {
        try {
            let model = await this.dal.model("user");
            let obj = await model.findById("" + userId);
            return obj;
        } catch (ex) {
            logger.error(this.request, "Error while executing findById : " + ex.toString(), "user", "", "catch", '1', userId, ex);
        }
    }

    private updateACLs = (userObj: any) => {
        if (!userObj.acl)
            userObj.acl = userObj.organizationCodes;
        else {
            // TODO: compare acls & organizationCodes
            userObj.acl = userObj.organizationCodes;
        }

    }

    /**
    * saving Calc User into mongodb
    * @userObject  user object
    * return  saved user object
    */
    public save = async (userObj: any) => {
        try {
            var userExists = await this.findOne({ 'userCode': userObj.userCode });
            let result, changeCount = userObj.changeCount;

            if (changeCount == 0 || changeCount == null || changeCount == undefined) {
                if (!userExists) {
                    try {
                        userObj.changeCount = 1;

                        const password = userObj.password;
                        let hashedPassword = bcrypt.hashSync(password, 10);
                        userObj.password = hashedPassword;
                        this.updateACLs(userObj);
                        var userData = await this._create(userObj);
                        result = { code: "0", message: "User Created", User: userData };
                    } catch (ex) {
                        result = { code: "-1", message: "Error while saving User", "error": ex };
                    }
                } else if (userExists.deleteMark != 0) {
                    result = { code: "-1", message: "object has been already used and logically deleted", User: userExists };
                } else if (userExists.isActive != 1) {
                    result = { code: "-1", message: "code already exists and is inactive", User: userExists };
                } else {
                    result = { code: "-1", message: "object already exists with the given code", User: userExists };
                }
            } else {
                if (!userExists) {
                    result = { code: "-1", message: "code could not be found" };
                } else {
                    if (userExists.changeCount == changeCount) {
                        try {
                            //Check whether user has permission to update
                            //userExists = await this.ACLPrecedence(userExists, true);
                            //if (userExists.securityCode == null || userExists.securityCode < 7) {
                            //    return { code: "-1", message: "You don't have access to perform this action." };
                            //}
                            //delete userExists.securityCode;
                            //delete userExists.precedenceAcl;

                            userObj.changeCount = userObj.changeCount + 1;
                            userObj._id = userExists._id;
                            userObj.createdBy = userObj.createdBy || userExists.createdBy;
                            var hash = bcrypt.hashSync(userObj.password || userExists.password, 10);
                            userObj.password = hash;
                            this.updateACLs(userObj);
                            let userData = await this._update(userObj);
                            result = { code: "0", message: "User updated", User: userData };
                        } catch (ex) {
                            result = { code: "-1", message: "Error while updating User", "error": ex };
                        }
                    } else {
                        result = { code: "-1", message: "A concurrency issues occurred while updating user", User: userExists };
                    }

                }
            }
            return result;
        } catch (ex) {
            console.log(ex);
            logger.error(this.request, "Error while executing saving user error : " + ex.toString(), "user", "/save/", "catch", '1', userObj, ex);
            return { code: "-1", message: "Error while saving user." };
        }
    }

    /**
    * remove Calc User into mongodb
    * @param  objectCode object
    * return  updated user object
    */
    public remove = async (objectCode: any) => {
        try {
            var model = await this.dal.model("user");

            if (objectCode != null && objectCode != undefined) {
                var retObj = null;
                var query = {
                    objectCode: objectCode
                };
                retObj = await model.find(query, {});
                if (retObj != null && retObj != undefined && retObj[0]) {
                    retObj = retObj[0];

                    /*if (retObj.deleteMark && retObj.changeCount != changeCount) { 
                        return { code: "-1", message: "user is concurrency issue", user: retObj };
                    } */
                    if (retObj.deleteMark && retObj.deleteMark == 1) {
                        return { code: "-1", message: "user has been already deleted." };
                    }
                    if (retObj.isActive && retObj.isActive == 0) {
                        return { code: "-1", message: "user already exists and is inactive." };
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

                    return { code: "0", message: "User deleted successfully", user: resData };

                } else {
                    return { code: "-1", message: "User with given id does not exist." };
                }
            } else {
                return { code: "-1", message: "User with given id does not exist." };
            }
        } catch (err) {
            console.log(err);
            logger.info(this.request, "Error While Removing userType in CoreEngine Module" + err.toString(), "userType", "userTypeObject", "error", "1", objectCode, err);
            return { code: "-1", message: "Catch error:" + err.toString() };
        }
    }

    /**
      * get user from database
      * @param query query to get data from database
      * @param skip skip
      * @param limit limit
      * @param sort sort
      * @param projection optional fields to return
      * return user object from database
      */
    public paginate = async (query: any, skip: number, limit: number, sort: any, projection?: any) => {
        try {
            query = query || {};
            projection = projection || {};
            let model = await this.dal.model("user");
            let ret = await model.paginate(query, skip, limit, sort, projection);
            return ret;
        } catch (ex) {
            logger.error(this.request, "Error while executing find : " + ex.toString(), "user", query, "catch", '1', query, ex);
        }
    }

    /**
      * get user count from database
      * @param query  query
      * return user count from database
      */
    public count = async (query) => {
        try {
            let model = await this.dal.model("user");
            let userCount = await model.count(query);
            return userCount;
        } catch (ex) {
            logger.error(this.request, "Error while executing count : " + ex.toString(), "user", query, "catch", '1', query, ex);
        }
    }

    //dal Call to insert user Objects
    public insertMany = async (userObjects: any) => {
        var model = await this.dal.model("user");
        var resData = await model.insertMany(userObjects);
        return await resData;
    }

    public _create = async (userObject: any) => {
        var model = await this.dal.model("user");
        var schema = await this.getSchema();
        userObject.passwordModifiedDate = new Date();
        //userObject.userCode = userObject.userCode.toUpperCase();
        userObject._id = uuid.v4(); //await this.dal.getNextSequence('user');
        var resData = await model.create([userObject]);
        // logger.info(this.request, "User saved into mongodb and redis cache.", "user", userObject._id, "save", "5");
        return resData[0];
    }

    public _update = async (userObject: any) => {
        var model = await this.dal.model("user");
        //userObject.userCode = userObject.userCode.toUpperCase();
        //userObject._id = userObject.userCode;
        userObject.lastModifiedDate = new Date().toISOString();
        var resData = await model.findByIdAndUpdate(userObject);
        // logger.info(this.request, "User updated into mongodb and redis cache.", "user", userObject._id, "update", "5");
        return resData;
    }


    public getAllowedObjects = async (objects: any[]) => {
        let allowedObjs = [];
        for (let obj of objects) {
            let securityCode = 0;
            if (this.request?.currentUser?.isSuperAdmin)
                securityCode = 8;
            else {
                let orgCode = obj.organizationCode;
                let acls = this.request?.currentUser?.acl;
                // 0 - None, 1 - Read, 2 - Write, 4 - ReadWrite, 8 - ALL,
                for (let acl of acls || []) {
                    if (acl.code == orgCode) {
                        securityCode = acl.securityCode;
                        if (securityCode == 8)
                            break;
                    }
                }
            }
            obj.securityCode = securityCode;
            if (securityCode > 0)
                allowedObjs.push(obj);
        }
        return allowedObjs;
    }


    public getPermission = async (organizationCode: any) => {
        if (this.request?.currentUser?.isSuperAdmin)
            return 8;
        let acls = this.request?.currentUser?.acl;
        // 0 - None, 1 - Read, 2 - Write, 4 - ReadWrite, 8 - ALL,
        let securityCode = 0;
        for (let acl of acls || []) {
            if (acl.code == organizationCode) {
                securityCode = acl.securityCode;
                if (securityCode == 8)
                    break;
            }
        }
        return securityCode;
    }
}