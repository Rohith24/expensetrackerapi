import { transaction } from "../modules/transactions";
import { account } from "../modules/account";

import logger = require('./logger');
import config = require('../config');
import validation = require('../modules/admin/validation');

import express = require('express');
import { budget } from "../modules/budget";
var router = express.Router();
export = router;
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;



//new 
router.get("/", async (request: express.Request, response: express.Response) => {
    // #swagger.tags = ['Transactions']
    let reqQuery: any = request.query;

    let result;
    var transactionModel = new transaction.transactions(request);
    try {
        let query = {};
        if (!String.isNullOrWhiteSpace(request.query.accountId)) {
            let accountId = ObjectId(reqQuery.accountId);
            query = {
                $or: [
                    { fromAccountId: accountId },
                    { toAccountId: accountId }
                ]
            }
        }
        if (!String.isNullOrWhiteSpace(request.query.budget)) {
            query['category'] = ObjectId(reqQuery.budget);
        }
        if (!String.isNullOrWhiteSpace(request.query.type)) {
            query['type'] = reqQuery.type;
        }
        if (!String.isNullOrWhiteSpace(request.query.deleteMark)) {
            query['deleteMark'] = reqQuery.deleteMark;
        } else {
            query['deleteMark'] = 0;
        }

        let transactionData = await transactionModel.defaultAggregate(query);
        if (transactionData && transactionData != null) {
            result = { code: "0", message: "transaction successfully retrieved", transactions: transactionData };
        }
        else {
            result = { code: "-1", message: `Transactions not available. Create new transaction.` };
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

router.get("/get/:transactionId", async (request: express.Request, response: express.Response) => {
    // #swagger.tags = ['Transactions']
    var transactionModel = new transaction.transactions(request);
    let reqParams: any = request.params;
    let result;
    try {
        let query = {};

        let transactionData = await transactionModel.findById(reqParams.transactionId);
        if (transactionData == null) {
            return response.send({ code: "-1", message: `transactions not available with given search` });
        }

        if (transactionData && transactionData != null) {
            result = { code: "0", message: "transaction successfully retrieved", transaction: transactionData };
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

router.get("/latest", async (request: express.Request, response: express.Response) => {
    // #swagger.tags = ['Transactions']
    let result;
    var transactionModel = new transaction.transactions(request);
    try {
        let query = {
            deleteMark: 0
        };
        let transactionData = await transactionModel.paginate(query, 0, 10, {
            transactionDate: -1,
            dateCreated: -1
        }, {
            transactionDate: 1,
            amount: 1,
            category: 1,
            details: 1,
            fromAccountId: 1,
            toAccountId: 1,
            type: {
                $cond: [
                    { $and: [{ $ifNull: ["$fromAccountId", false] }, { $ifNull: ["$toAccountId", false] }] }, // Both fromAccountId and toAccountId have values
                    "Transfer", // If true, return 'Transfer'
                    {
                        $cond: [
                            { $ifNull: ["$toAccountId", false] }, // Only toAccountId has a value
                            "Credit", // If true, return 'Credit'
                            {
                                $cond: [
                                    { $ifNull: ["$fromAccountId", false] }, // Only fromAccountId has a value
                                    "Debit", // If true, return 'Debit'
                                    "Unknown" // Fallback value if none of the conditions match
                                ]
                            }
                        ]
                    }
                ]
            }
        });
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
        logger.error(request, "Error while executing transaction retrieve  error : " + ex.toString(), "transactions/latest", "latest", "catch", '1', request.query, ex);
        console.log(ex);
        return response.send({ code: "-1", message: `transactions not available` });
    }
});


router.patch("/:transactionId", async (request: express.Request, response: express.Response) => {
    // #swagger.tags = ['Transactions']
    //logger.info(request, "request body", "user", "//", "request", '5', request.body);
    var transactionModel = new transaction.transactions(request);
    var accountModel = new account.accounts(request);
    let reqParams: any = request.params;
    let reqUser: any = request.body;
    if (String.isNullOrWhiteSpace(reqUser.user)) {
        return response.send({ code: "-1", message: "user cannot be empty" });
    }
    if (reqParams.transactionId == null || reqParams.transactionId == undefined) {
        return response.send({ code: "-1", message: "transactionId is missing" });
    }
    try {
        var transactionObj = await transactionModel.findById(reqParams.transactionId);
        request.body.transaction.lastModifiedBy = request.body.transaction.lastModifiedBy ?? reqUser.user;
        var savedData = await transactionModel.save(request.body.transaction);
        if (savedData == null) {
            return response.json({ code: "-1", message: "Updating transcation failed." });
        } else {
            if (savedData.code == "0") {
                let savedTransaction = savedData.transaction;
                if (transactionObj.fromAccountId != savedTransaction.fromAccountId) {
                    await accountModel.UpdateBalance(transactionObj.fromAccountId, transactionObj.amount); // Revert previous fromAccount balance
                    savedTransaction.fromAccountId = await accountModel.UpdateBalance(savedTransaction.fromAccountId, -savedTransaction.amount); // Apply new fromAccount balance
                }
                else {
                    savedTransaction.fromAccountId = savedData['fromAccount'] = await accountModel.UpdateBalance(transactionObj.fromAccountId, transactionObj.amount - savedTransaction.amount);
                }
                if (transactionObj.toAccountId != savedTransaction.toAccountId) {
                    await accountModel.UpdateBalance(transactionObj.toAccountId, -transactionObj.amount); // Revert previous fromAccount balance
                    savedTransaction.toAccountId = await accountModel.UpdateBalance(savedTransaction.toAccountId, savedTransaction.amount); // Apply new fromAccount balance
                }
                else {
                    savedTransaction.toAccountId = savedData['toAccount'] = await accountModel.UpdateBalance(transactionObj.toAccountId, savedTransaction.amount - transactionObj.amount);
                }
            }
            //logger.info(request, "Response", "user", "/remove/", "response", '5', savedData);
            return response.json(savedData);
        }
    }
    catch (ex) {
        logger.error(request, "Error while executing patch transcation error : " + ex.toString(), "transcation", "/remove/", "catch", '1', request.body, ex);
        console.log(ex);
        return response.json({ code: "-1", message: "Error while updating transcation." });
    }
});

router.delete("/:transactionId", async (request: express.Request, response: express.Response) => {
    // #swagger.tags = ['Transactions']
    //logger.info(request, "request body", "user", "//", "request", '5', request.body);
    var transactionModel = new transaction.transactions(request);
    var accountModel = new account.accounts(request);
    let reqParams: any = request.params;
    let reqUser: any = request.query;
    if (String.isNullOrWhiteSpace(reqUser.user)) {
        return response.send({ code: "-1", message: "user cannot be empty" });
    }
    if (reqParams.transactionId == null || reqParams.transactionId == undefined) {
        return response.send({ code: "-1", message: "transactionId is missing" });
    }
    try {
        var transactionObj = await transactionModel.findById(reqParams.transactionId);
        var deletedata = await transactionModel.removeObj(transactionObj);
        if (deletedata == null) {
            return response.json({ code: "-1", message: "deleting user id is not found." });
        } else {
            if (deletedata.code == "0") {
                deletedata['fromAccount'] = await accountModel.UpdateBalance(transactionObj.fromAccountId, transactionObj.amount);
                deletedata['toAccount'] = await accountModel.UpdateBalance(transactionObj.toAccountId, transactionObj.amount * -1);
            }
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

router.post("/", async (request: express.Request, response: express.Response) => {
    // #swagger.tags = ['Transactions']
    var transactionModel = new transaction.transactions(request);
    var accountModel = new account.accounts(request);
    var budgetModel = new budget.budgets(request);

    try {
        let result;
        if (request.body.transaction == null || request.body.transaction == undefined) {
            return response.json(response.json({ code: "-1", message: "Transaction json cannot be empty" }));
        }
        if ((request.body.transaction.fromAccountId != null && request.body.transaction.fromAccountId != undefined) && (request.body.transaction.toAccountId != null && request.body.transaction.toAccountId != undefined) && request.body.transaction.fromAccountId == request.body.transaction.toAccountId) {
            return response.json(response.json({ code: "-1", message: "Both from account and to account are same" }));
        }

        if ((request.body.transaction.fromAccountId == null || request.body.transaction.fromAccountId == undefined) && (request.body.transaction.toAccountId == null || request.body.transaction.toAccountId == undefined)) {
            return response.json(response.json({ code: "-1", message: "Atleast One Account is needed to create a transcation" }));
        }

        if ((request.body.transaction.amount == null || request.body.transaction.amount == undefined) && typeof request.body.transaction.amount === 'number') {
            return response.json(response.json({ code: "-1", message: "Please provide the correct Amount" }));
        }

        if (request.body.transaction.category == null || request.body.transaction.category == undefined) {
            return response.json(response.json({ code: "-1", message: "Please provide the category. If no category create one." }));
        }

        let transactionBody = request.body.transaction;

        let validations = validation.SaveValidations(request.body, "transaction", false);
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
                result = await transactionModel.save(transactionBody);
                if (result.code == "0") {
                    result.fromAccount = await accountModel.UpdateBalance(transactionBody.fromAccountId, transactionBody.amount * -1);
                    result.toAccount = await accountModel.UpdateBalance(transactionBody.toAccountId, transactionBody.amount);
                    let amount, isTransfer = 0;
                    if (request.body.transaction.fromAccountId != null  && request.body.transaction.fromAccountId != undefined) {
                        isTransfer += 1;
                        amount = transactionBody.amount * -1;
                    }
                    if (request.body.transaction.toAccountId != null || request.body.transaction.toAccountId != undefined) {
                        isTransfer += 1;
                        amount = transactionBody.amount *1;
                    }
                    if (isTransfer === 1)
                        result.budget = await budgetModel.UpdateAmountById(transactionBody.category, amount);

                }
            } catch (ex) {
                console.log(ex);
                result = { code: "-1", message: "Error while saving Transaction ", error: ex };
            }

            if (result.code == "-1") {
                if (result.error != undefined) {
                    result.message = result.message + "; " + result.error;
                }
                logger.error(request, "Error while executing Transaction update error : " + result.message, "Transaction/save", request.body.transaction && request.body.transaction._id, "catch", '1', request.body, result.message);
            }
            // #swagger.responses[200] = { description: 'Transaction created successfully.' }
            //logger.info(request, "Response", "Transaction/save", result._id, "response", '5', result);
            return response.send(result);
        }
    } catch (ex) {
        logger.error(request, "Error while executing Transaction Save  error : " + ex.toString(), "Transaction/save", request.body.transaction && request.body.transaction._id, "catch", '1', request.body, ex);
        console.log(ex);
        return response.send({ code: "-1", message: "Error while saving Transaction; " + ex });
    }
});
