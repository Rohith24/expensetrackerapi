import { account } from "../modules/account";

import logger = require('./logger');
import config = require('../config');
import validation = require('../modules/admin/validation');

import express = require('express');
import { transaction } from "../modules/transactions";
var router = express.Router();
export = router;

router.get("/", async (request: express.Request, response: express.Response) => {
    // #swagger.tags = ['Accounts']
    let reqQuery: any = request.query;
    
    let result;
    var accountModel = new account.accounts(request);
    try {
        let query = {};
        if (!String.isNullOrWhiteSpace(reqQuery.customerId)) {
            query['customerId'] = request.query.customerId;
        } 
        if (!String.isNullOrWhiteSpace(reqQuery.type)) {
            query['type'] = request.query.type;
        } 
        if (!String.isNullOrWhiteSpace(reqQuery.currency)) {
            query['currency'] = request.query.currency;
        } 
        if (!String.isNullOrWhiteSpace(reqQuery.accountId)) {
            query['_id'] = request.query.accountId;
        } 
        if (!String.isNullOrWhiteSpace(reqQuery.deleteMark)) {
            query['deleteMark'] = request.query.deleteMark;
        } 
        let accountData = await accountModel.find(query);
        if (accountData == null) {
            return response.send({ code: "-1", message: `accounts not available with given search` });
        }

        if (accountData && accountData != null) {
            result = { code: "0", message: "account successfully retrieved", accounts: accountData };
        }
        else {
            result = { code: "-1", message: `account not available` };
        }
        // #swagger.responses[200] = { description: 'account retrieved successfully.' }
        //logger.info(request, "Response", "accounts/Retrieve", '', "response", '5', result);
        return response.send(result);
    } catch (ex) {
        //let mongoLogger = new loggerApi.logger(request);
        //mongoLogger.pustToQueue(request.body, 'user', request.query.accountId, 'fetch', ex.toString());
        logger.error(request, "Error while executing account retrieve  error : " + ex.toString(), "accounts/Retrieve", request.query.accountId, "catch", '1', request.query, ex);
        console.log(ex);
        return response.send({ code: "-1", message: `accounts not available` });
    }
});

router.get("/:accountId", async (request: express.Request, response: express.Response) => {
    // #swagger.tags = ['Accounts']

    let reqParams: any = request.params;
    if (String.isNullOrWhiteSpace(reqParams.accountId)) {
        return response.send({ code: "-1", message: "Account ID is empty" });
    }
    let reqQuery: any = request.query;

    let result;
    var accountModel = new account.accounts(request);
    var transcationModel = new transaction.transactions(request);
    try {
        let accountData = await accountModel.findById(reqParams.accountId);

        if (accountData == null) {
            return response.send({ code: "-1", message: `account with ID ${reqParams.accountId} not available` });
        }

        if (accountData && accountData != null) {
            if (reqQuery.includeTransactions = 1) {
                let query = { $or: [{ fromAccountId: reqParams.accountId }, { toAccountId: reqParams.accountId }], deleteMark: 0 };
                let transactions = await transcationModel.paginate(query, 0, 10, { transactionDate: -1 }, {
                    transactionDate: 1,
                    amount: 1,
                    catagory: 1,
                    accountId: reqParams.accountId,
                    Type: {
                        $cond: [
                            { $eq: ["$fromAccountId", reqParams.accountId] }, // Condition 1
                            "Debit",                         // If Condition 1 is true
                            {
                                $cond: [
                                    { $eq: ["$toAccountId", reqParams.accountId] }, // Condition 2
                                    "Credit",                     // If Condition 2 is true
                                    null                          // If neither condition is true
                                ]
                            }
                        ]
                    }
                });
                let transactionCount = await transcationModel.count(query)
                accountData.Transactions = transactions;
                accountData.TransactionCount = transactionCount;
            }
            result = { code: "0", message: "account successfully retrieved", accounts: accountData };
        }
        else {
            result = { code: "-1", message: `account not available` };
        }
        // #swagger.responses[200] = { description: 'User retrieved successfully.' }
        //logger.info(request, "Response", "accounts/Retrieve", '', "response", '5', result);
        return response.send(result);
    } catch (ex) {
        //let mongoLogger = new loggerApi.logger(request);
        //mongoLogger.pustToQueue(request.body, 'user', request.query.accountId, 'fetch', ex.toString());
        logger.error(request, "Error while executing account retrieve  error : " + ex.toString(), "accounts/Retrieve", request.params.accountId, "catch", '1', request.query, ex);
        console.log(ex);
        return response.send({ code: "-1", message: `accounts not available` });
    }
});

router.post("/", async (request: express.Request, response: express.Response) => {
    // #swagger.tags = ['Accounts']

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

router.patch("/:accountId", async (request: express.Request, response: express.Response) => {
    // #swagger.tags = ['Accounts']

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
            try {
                accountBody.lastModifiedBy = request.body.user;
                accountBody.tenantCode = "BudgetTracker";
                result = await accountModel._update(accountBody);
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

router.delete("/:accountId", async (request: express.Request, response: express.Response) => {
    // #swagger.tags = ['Accounts']

    let reqQuery: any = request.params;

    var accountModel = new account.accounts(request);
    if (reqQuery.accountId == undefined || String.isNullOrWhiteSpace(reqQuery.accountId)) {
        return response.send({ code: "-1", message: "accountId is missing" });
    }
    try {
        var deletedata = await accountModel.remove(reqQuery.accountId);
        if (deletedata == null) {
            return response.json({ code: "-1", message: "deleting account Id is not found." });
        } else {
            return response.json(deletedata);
        }
    }
    catch (ex) {
        logger.error(request, "Error while executing user error : " + ex.toString(), "user", "/remove/", "catch", '1', reqQuery.accountId, ex);
        console.log(ex);
        return response.json({ code: "-1", message: "Error while executing user delete." });
    }
});
