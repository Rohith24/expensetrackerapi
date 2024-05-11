import { account } from "../modules/account";

import logger = require('./logger');
import config = require('../config');
import validation = require('../modules/admin/validation');

import express = require('express');
var router = express.Router();
export = router;


//new 
router.get("/retrieve", async (request: express.Request, response: express.Response) => {
    let reqQuery: any = request.query;
    if (String.isNullOrWhiteSpace(reqQuery.organizationName)) {
        return response.send({ code: "-1", message: "organization Name is empty" });
    } else if (String.isNullOrWhiteSpace(reqQuery.course)) {
        return response.send({ code: "-1", message: "Course is empty" });
    } else if (String.isNullOrWhiteSpace(reqQuery.year)) {
        return response.send({ code: "-1", message: "Year is empty" });
    }


    let result;
    var accountModel = new account.accounts(request);
    try {
        let query = {
            'organizationName': reqQuery.organizationName,
            'course': reqQuery.course,
            'year': reqQuery.year
        };

        let accountData = await accountModel.find(query);
        if (accountData == null) {
            return response.send({ code: "-1", message: `accounts in organization ${reqQuery.organizationName} not available` });
        }

        if (accountData && accountData != null) {
            result = { code: "0", message: "accounts successfully retrieved", accounts: accountData };
        }
        else {
            result = { code: "-1", message: `accounts not available` };
        }
        // #swagger.responses[200] = { description: 'User retrieved successfully.' }
        //logger.info(request, "Response", "accounts/Retrieve", '', "response", '5', result);
        return response.send(result);
    } catch (ex) {
        //let mongoLogger = new loggerApi.logger(request);
        //mongoLogger.pustToQueue(request.body, 'user', request.query.objectCode, 'fetch', ex.toString());
        logger.error(request, "Error while executing account retrieve  error : " + ex.toString(), "accounts/Retrieve", request.query.objectCode, "catch", '1', request.query, ex);
        console.log(ex);
        return response.send({ code: "-1", message: `accounts not available` });
    }
});

router.post("/save", async (request: express.Request, response: express.Response) => {
    var accountModel = new account.accounts(request);

    try {
        let result;
        if (request.body.account == null || request.body.account == undefined) {
            return response.json(response.json({ code: "-1", message: "account json cannot be empty" }));
        }
        // request.body.User = await userModel.dataConversion(request.body.User, "projectX", "save");
        let accountBody = request.body.account;
        let validations = validation.SaveValidations(request.body, "account");
        if (validations.code == "-1") {
            result = { code: "-1", message: validations.message };
            return response.json(result);
        } else {
            //Added for user Save As Functionality 
            if (accountBody.changeCount == null || accountBody.changeCount == 0) {
                accountBody.changeCount = 0;
            }
            try {
                if (accountBody.changeCount == 0) {
                    accountBody.createdBy = request.body.user;
                }
                accountBody.lastModifiedBy = request.body.user;
                accountBody.tenantCode = "BudgetTracker";
                result = await accountModel.save(accountBody);
                /*if (result.User) {
                    result.User = await userModel.dataConversion(result.User, "tenant", "save");
                }*/
            } catch (ex) {
                console.log(ex);
                result = { code: "-1", message: "Error while saving account ", error: ex };
            }

            if (result.code == "-1") {
                if (result.error != undefined) {
                    result.message = result.message + "; " + result.error;
                }
                logger.error(request, "Error while executing account update error : " + result.message, "account/save", request.body.account && request.body.account._id, "catch", '1', request.body, result.message);
            }
            // #swagger.responses[200] = { description: 'account created successfully.' }
            //logger.info(request, "Response", "account/save", result._id, "response", '5', result);
            return response.send(result);
        }
    } catch (ex) {
        logger.error(request, "Error while executing account Save  error : " + ex.toString(), "account/save", request.body.account && request.body.account._id, "catch", '1', request.body, ex);
        console.log(ex);
        return response.send({ code: "-1", message: "Error while saving account; " + ex });
    }
});

router.delete("/remove", async (request: express.Request, response: express.Response) => {
    //logger.info(request, "request body", "user", "//", "request", '5', request.body);
    var accountModel = new account.accounts(request);
    request.body.tenantId = request.tenant._id;
    let reqUser: any = request.query;
    if (String.isNullOrWhiteSpace(reqUser.user)) {
        return response.send({ code: "-1", message: "user cannot be empty" });
    } else if (request.query.objectKey == undefined && request.query.id == undefined) {
        if (request.query.objectKey == undefined || String.isNullOrWhiteSpace(reqUser.objectKey)) {
            return response.send({ code: "-1", message: "objectKey is missing" });
        } else if (request.query.id == undefined || String.isNullOrWhiteSpace(reqUser.id)) {
            return response.send({ code: "-1", message: "id is missing" });
        }
    }
    try {
        let query;
        if (request.query.objectKey) {
            query = { objectCode: request.query.objectKey };
        } else if (request.query.id) {
            query = { _id: request.query.id };
        }
        var deletedata = await accountModel.remove(query);
        if (deletedata == null) {
            return response.json({ code: "-1", message: "deleting user id is not found." });
        } else {
            //logger.info(request, "Response", "user", "/remove/", "response", '5', deletedata);
            return response.json(deletedata);
        }
    }
    catch (ex) {
        logger.error(request, "Error while executing user error : " + ex.toString(), "user", "/remove/", "catch", '1', request.body, ex);
        console.log(ex);
        return response.json({ code: "-1", message: "Error while executing user delete." });
    }
});
