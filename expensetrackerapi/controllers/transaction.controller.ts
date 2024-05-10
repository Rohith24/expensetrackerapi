import { transaction } from "../modules/transactions";

import logger = require('./logger');
import config = require('../config');
import validation = require('../modules/admin/validation');

import express = require('express');
var router = express.Router();
export = router;


//new 
router.get("/retrieve", async (request: express.Request, response: express.Response) => {
    /*  #swagger.auto = false

        #swagger.path = '/transactions/retrieve'
        #swagger.summary = 'transactions retrieve service'
        #swagger.tags = ['User']
        #swagger.method = 'get'
        #swagger.produces = ['application/json']
        #swagger.consumes = ['application/json']

        #swagger.parameters['user'] = {
            in: 'query',
            description: 'User.',
            required: true,
            type: 'string'
        }

        #swagger.parameters['objectCode'] = {
            in: 'query',
            description: 'Object Code.',
            required: true,
            type: 'string'
        }
        #swagger.parameters['skipACL'] = {
            in: 'query',
            description: 'skip ACL.',
            required: true,
            type: 'string'
        }
    */
    //logger.info(request, "request body", "transactions/Retrieve", request.query.objectCode, "request", '5');
    let reqQuery: any = request.query;
    if (String.isNullOrWhiteSpace(reqQuery.organizationName)) {
        return response.send({ code: "-1", message: "organization Name is empty" });
    } else if (String.isNullOrWhiteSpace(reqQuery.course)) {
        return response.send({ code: "-1", message: "Course is empty" });
    } else if (String.isNullOrWhiteSpace(reqQuery.year)) {
        return response.send({ code: "-1", message: "Year is empty" });
    }


    let result;
    var transactionModel = new transaction.transactions(request);
    try {
        let query = {
            'organizationName': reqQuery.organizationName,
            'course': reqQuery.course,
            'year': reqQuery.year
        };

        let transactionData = await transactionModel.find(query);
        if (transactionData == null) {
            return response.send({ code: "-1", message: `Transactions in organization ${reqQuery.organizationName} not available` });
        }

        if (transactionData && transactionData != null) {
            result = { code: "0", message: "Transactions successfully retrieved", Transactions: transactionData };
        }
        else {
            result = { code: "-1", message: `Transactions not available` };
        }
        // #swagger.responses[200] = { description: 'User retrieved successfully.' }
        //logger.info(request, "Response", "Transactions/Retrieve", '', "response", '5', result);
        return response.send(result);
    } catch (ex) {
        //let mongoLogger = new loggerApi.logger(request);
        //mongoLogger.pustToQueue(request.body, 'user', request.query.objectCode, 'fetch', ex.toString());
        logger.error(request, "Error while executing Transaction retrieve  error : " + ex.toString(), "Transactions/Retrieve", request.query.objectCode, "catch", '1', request.query, ex);
        console.log(ex);
        return response.send({ code: "-1", message: `Transactions not available` });
    }
});

router.post("/save", async (request: express.Request, response: express.Response) => {
    /*  #swagger.auto = false

        #swagger.path = '/user/save'
        #swagger.summary = 'User save service'
        #swagger.tags = ['User']
        #swagger.method = 'post'
        #swagger.produces = ['application/json']
        #swagger.consumes = ['application/json']

        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Request body.',
            schema: { $ref: '#/definitions/userSave' }
        }
    */
    //logger.info(request, "request body", "transaction/save", (request.body.Transaction && request.body.Transaction._id), "request", '5', request.body);
    var transactionModel = new transaction.transactions(request);

    try {
        let result;
        if (request.body.Transaction == null || request.body.Transaction == undefined) {
            return response.json(response.json({ code: "-1", message: "Transaction json cannot be empty" }));
        }
        // request.body.User = await userModel.dataConversion(request.body.User, "projectX", "save");
        let transactionBody = request.body.Transaction;
        let validations = validation.studentSaveValidations(request.body);
        if (validations.code == "-1") {
            result = { code: "-1", message: validations.message };
            return response.json(result);
        } else {
            //Added for user Save As Functionality 
            if (transactionBody.changeCount == null || transactionBody.changeCount == 0) {
                transactionBody.changeCount = 0;
            }
            transactionBody.tenantCode = request.tenant.code;
            try {
                if (transactionBody.changeCount == 0) {
                    transactionBody.createdBy = request.body.user;
                }
                transactionBody.lastModifiedBy = request.body.user;
                transactionBody.tenantCode = request.tenant.code;
                result = await transactionModel.save(transactionBody);
                /*if (result.User) {
                    result.User = await userModel.dataConversion(result.User, "tenant", "save");
                }*/
            } catch (ex) {
                console.log(ex);
                result = { code: "-1", message: "Error while saving Transaction ", error: ex };
            }

            if (result.code == "-1") {
                if (result.error != undefined) {
                    result.message = result.message + "; " + result.error;
                }
                logger.error(request, "Error while executing Transaction update error : " + result.message, "Transaction/save", request.body.Transaction && request.body.Transaction._id, "catch", '1', request.body, result.message);
            }
            // #swagger.responses[200] = { description: 'Transaction created successfully.' }
            //logger.info(request, "Response", "Transaction/save", result._id, "response", '5', result);
            return response.send(result);
        }
    } catch (ex) {
        logger.error(request, "Error while executing Transaction Save  error : " + ex.toString(), "Transaction/save", request.body.Transaction && request.body.Transaction._id, "catch", '1', request.body, ex);
        console.log(ex);
        return response.send({ code: "-1", message: "Error while saving Transaction; " + ex });
    }
});

router.delete("/remove", async (request: express.Request, response: express.Response) => {
    // #swagger.ignore = true
    //logger.info(request, "request body", "user", "//", "request", '5', request.body);
    var transactionModel = new transaction.transactions(request);
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
        var deletedata = await transactionModel.remove(query);
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
