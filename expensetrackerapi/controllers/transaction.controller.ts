import { transaction } from "../modules/transactions";
import { account } from "../modules/account";

import logger = require('./logger');
import config = require('../config');
import validation = require('../modules/admin/validation');

import express = require('express');
var router = express.Router();
export = router;


//new 
router.get("/", async (request: express.Request, response: express.Response) => {
    // #swagger.tags = ['Transactions']
    let reqQuery: any = request.query;

    let result;
    var transactionModel = new transaction.transactions(request);
    try {
        let query = {};
        if (!String.isNullOrWhiteSpace(reqQuery.accountId)) {
            query['accountId'] = request.query.accountId;
        }
        if (!String.isNullOrWhiteSpace(reqQuery.type)) {
            query['type'] = request.query.type;
        }
        if (!String.isNullOrWhiteSpace(reqQuery.deleteMark)) {
            query['deleteMark'] = request.query.deleteMark;
        }
        let transactionData = await transactionModel.find(query);
        if (transactionData == null) {
            return response.send({ code: "-1", message: `transactions not available with given search` });
        }

        if (transactionData && transactionData != null) {
            result = { code: "0", message: "transaction successfully retrieved", transactions: transactionData };
        }
        else {
            result = { code: "-1", message: `transaction not available` };
        }
        // #swagger.responses[200] = { description: 'transaction retrieved successfully.' }
        //logger.info(request, "Response", "transactions/Retrieve", '', "response", '5', result);
        return response.send(result);
    } catch (ex) {
        //let mongoLogger = new loggerApi.logger(request);
        //mongoLogger.pustToQueue(request.body, 'user', request.query.transactionId, 'fetch', ex.toString());
        logger.error(request, "Error while executing transaction retrieve  error : " + ex.toString(), "transactions/Retrieve", request.query.transactionId, "catch", '1', request.query, ex);
        console.log(ex);
        return response.send({ code: "-1", message: `transactions not available` });
    }
});

router.post("/", async (request: express.Request, response: express.Response) => {
    // #swagger.tags = ['Transactions']
    //logger.info(request, "request body", "transaction/save", (request.body.Transaction && request.body.Transaction._id), "request", '5', request.body);
    var transactionModel = new transaction.transactions(request);

    try {
        let result;
        if (request.body.Transaction == null || request.body.Transaction == undefined) {
            return response.json(response.json({ code: "-1", message: "Transaction json cannot be empty" }));
        }
        // request.body.User = await userModel.dataConversion(request.body.User, "projectX", "save");
        let transactionBody = request.body.Transaction;
        let validations = validation.SaveValidations(request.body, "Transaction");
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
                if (transactionBody.type == 'Transfer') {
                    result = await transactionModel.save(transactionBody);
                } else {
                    result = await transactionModel.save(transactionBody);
                }
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
    // #swagger.tags = ['Transactions']
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


router.post("/insert", async (request: express.Request, response: express.Response) => {
    // #swagger.tags = ['Transactions']
    var transactionModel = new transaction.transactions(request);
    var accountModel = new account.accounts(request);

    try {
        let result;
        if (request.body.Transaction == null || request.body.Transaction == undefined) {
            return response.json(response.json({ code: "-1", message: "Transaction json cannot be empty" }));
        }

        if ((request.body.Transaction.fromAccountId == null || request.body.Transaction.fromAccountId == undefined) && (request.body.Transaction.toAccountId == null || request.body.Transaction.toAccountId == undefined)) {
            return response.json(response.json({ code: "-1", message: "Atleast One Account is needed to create a transcation" }));
        }

        if ((request.body.Transaction.amount == null || request.body.Transaction.amount == undefined) && typeof request.body.Transaction.amount === 'number') {
            return response.json(response.json({ code: "-1", message: "Please provide the correct Amount" }));
        }

        if (request.body.Transaction.catagory == null || request.body.Transaction.catagory == undefined){
            return response.json(response.json({ code: "-1", message: "Please provide the catagory. If no catagory create one." }));
        }

        let transactionBody = request.body.Transaction;

        let validations = validation.SaveValidations(request.body, "Transaction", false);
        if (validations.code == "-1") {
            result = { code: "-1", message: validations.message };
            return response.json(result);
        } else {
            //Added for user Save As Functionality 
            if (transactionBody.changeCount == undefined || transactionBody.changeCount == null || transactionBody.changeCount == 0) {
                transactionBody.changeCount = 0;
            }
            transactionBody.tenantCode = request.tenant.code;
            try {
                if (transactionBody.changeCount == 0) {
                    transactionBody.createdBy = request.body.user;
                }
                transactionBody.lastModifiedBy = request.body.user;
                transactionBody.tenantCode = request.tenant.code;
                var fromAccount = await accountModel.UpdateAmount(transactionBody.fromAccountId, transactionBody.amount * -1);
                var toAccount = await accountModel.UpdateAmount(transactionBody.toAccountId, transactionBody.amount);
                result = await transactionModel.save(transactionBody);
                result.fromAccount = fromAccount;
                result.toAccount = toAccount;
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
