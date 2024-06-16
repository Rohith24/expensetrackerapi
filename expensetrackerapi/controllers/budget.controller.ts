import { budget } from "../modules/budget";

import logger = require('./logger');
import config = require('../config');
import validation = require('../modules/admin/validation');

import express = require('express');
import { transaction } from "../modules/transactions";
var router = express.Router();
export = router;

router.get("/", async (request: express.Request, response: express.Response) => {
    // #swagger.tags = ['Budgets']
    let reqQuery: any = request.query;
    
    let result;
    var budgetModel = new budget.budgets(request);
    try {
        let query = {};
        if (!String.isNullOrWhiteSpace(reqQuery.name)) {
            query['name'] = request.query.name;
        } 
        if (!String.isNullOrWhiteSpace(reqQuery.deleteMark)) {
            query['deleteMark'] = request.query.deleteMark;
        } else {
            query['deleteMark'] = 0;
        }
        let budgetData = await budgetModel.find(query);
       
        if (budgetData && budgetData != null) {
            result = { code: "0", message: "Budgets successfully retrieved", budgets: budgetData };
        }
        else {
            result = { code: "-1", message: `Budgets not available. Create new budget` };
        }
        // #swagger.responses[200] = { description: 'budget retrieved successfully.' }
        //logger.info(request, "Response", "budgets/Retrieve", '', "response", '5', result);
        return response.send(result);
    } catch (ex) {
        //let mongoLogger = new loggerApi.logger(request);
        //mongoLogger.pustToQueue(request.body, 'user', request.query.budgetId, 'fetch', ex.toString());
        logger.error(request, "Error while executing budget retrieve  error : " + ex.toString(), "budgets/Retrieve", request.query.budgetId, "catch", '1', request.query, ex);
        console.log(ex);
        return response.send({ code: "-1", message: `budgets not available` });
    }
});

router.get("/:budgetId", async (request: express.Request, response: express.Response) => {
    // #swagger.tags = ['Budgets']

    let reqParams: any = request.params;
    if (String.isNullOrWhiteSpace(reqParams.budgetId)) {
        return response.send({ code: "-1", message: "Budget ID is empty" });
    }
    let reqQuery: any = request.query;

    let result;
    var budgetModel = new budget.budgets(request);
    var transcationModel = new transaction.transactions(request);
    try {
        let budgetData = await budgetModel.findById(reqParams.budgetId);

        if (budgetData == null) {
            return response.send({ code: "-1", message: `budget with ID ${reqParams.budgetId} not available` });
        }

        if (budgetData && budgetData != null) {
            result = { code: "0", message: "budget successfully retrieved", budget: budgetData };
        }
        else {
            result = { code: "-1", message: `budget not available` };
        }
        // #swagger.responses[200] = { description: 'User retrieved successfully.' }
        //logger.info(request, "Response", "budgets/Retrieve", '', "response", '5', result);
        return response.send(result);
    } catch (ex) {
        //let mongoLogger = new loggerApi.logger(request);
        //mongoLogger.pustToQueue(request.body, 'user', request.query.budgetId, 'fetch', ex.toString());
        logger.error(request, "Error while executing budget retrieve  error : " + ex.toString(), "budgets/Retrieve", request.params.budgetId, "catch", '1', request.query, ex);
        console.log(ex);
        return response.send({ code: "-1", message: `budgets not available` });
    }
});

router.post("/", async (request: express.Request, response: express.Response) => {
    // #swagger.tags = ['Budgets']

    var budgetModel = new budget.budgets(request);

    try {
        let result;
        if (request.body.budget == null || request.body.budget == undefined) {
            return response.json(response.json({ code: "-1", message: "budget json cannot be empty" }));
        }
        // request.body.User = await userModel.dataConversion(request.body.User, "projectX", "save");
        let budgetBody = request.body.budget;
        let validations = validation.SaveValidations(request.body, "budget", false);
        if (validations.code == "-1") {
            result = { code: "-1", message: validations.message };
            return response.json(result);
        } else {
            //Added for user Save As Functionality 
            if (budgetBody.changeCount == null || budgetBody.changeCount == 0) {
                budgetBody.changeCount = 0;
            }
            try {
                if (budgetBody.changeCount == 0) {
                    budgetBody.createdBy = request.body.user;
                }
                if (budgetBody.tillNow == null || budgetBody.tillNow == undefined) {
                    budgetBody.tillNow = 0;
                }
                budgetBody.lastModifiedBy = request.body.user;
                budgetBody.tenantCode = config.defaultTenant;
                result = await budgetModel.save(budgetBody);
                /*if (result.User) {
                    result.User = await userModel.dataConversion(result.User, "tenant", "save");
                }*/
            } catch (ex) {
                console.log(ex);
                result = { code: "-1", message: "Error while saving budget ", error: ex };
            }

            if (result.code == "-1") {
                if (result.error != undefined) {
                    result.message = result.message + "; " + result.error;
                }
                logger.error(request, "Error while executing budget update error : " + result.message, "budget/save", request.body.budget && request.body.budget._id, "catch", '1', request.body, result.message);
            }
            // #swagger.responses[200] = { description: 'budget created successfully.' }
            //logger.info(request, "Response", "budget/save", result._id, "response", '5', result);
            return response.send(result);
        }
    } catch (ex) {
        logger.error(request, "Error while executing budget Save  error : " + ex.toString(), "budget/save", request.body.budget && request.body.budget._id, "catch", '1', request.body, ex);
        console.log(ex);
        return response.send({ code: "-1", message: "Error while saving budget; " + ex });
    }
});

router.patch("/:budgetId", async (request: express.Request, response: express.Response) => {
    // #swagger.tags = ['Budgets']

    var budgetModel = new budget.budgets(request);
    try {
        let result;
        if (request.body.budget == null || request.body.budget == undefined) {
            return response.json(response.json({ code: "-1", message: "budget json cannot be empty" }));
        }
        // request.body.User = await userModel.dataConversion(request.body.User, "projectX", "save");
        let budgetBody = request.body.budget;
        let validations = validation.SaveValidations(request.body, "budget");
        if (validations.code == "-1") {
            result = { code: "-1", message: validations.message };
            return response.json(result);
        } else {
            try {
                budgetBody.lastModifiedBy = request.body.user;
                budgetBody.tenantCode = config.defaultTenant;
                result = await budgetModel._update(budgetBody);
                /*if (result.User) {
                    result.User = await userModel.dataConversion(result.User, "tenant", "save");
                }*/
            } catch (ex) {
                console.log(ex);
                result = { code: "-1", message: "Error while saving budget ", error: ex };
            }

            if (result.code == "-1") {
                if (result.error != undefined) {
                    result.message = result.message + "; " + result.error;
                }
                logger.error(request, "Error while executing budget update error : " + result.message, "budget/save", request.body.budget && request.body.budget._id, "catch", '1', request.body, result.message);
            }
            // #swagger.responses[200] = { description: 'budget created successfully.' }
            //logger.info(request, "Response", "budget/save", result._id, "response", '5', result);
            return response.send(result);
        }
    } catch (ex) {
        logger.error(request, "Error while executing budget Save  error : " + ex.toString(), "budget/save", request.body.budget && request.body.budget._id, "catch", '1', request.body, ex);
        console.log(ex);
        return response.send({ code: "-1", message: "Error while saving budget; " + ex });
    }
});

router.delete("/:budgetId", async (request: express.Request, response: express.Response) => {
    // #swagger.tags = ['Budgets']

    let reqQuery: any = request.params;

    var budgetModel = new budget.budgets(request);
    if (reqQuery.budgetId == undefined || String.isNullOrWhiteSpace(reqQuery.budgetId)) {
        return response.send({ code: "-1", message: "budgetId is missing" });
    }
    try {
        var deletedata = await budgetModel.remove(reqQuery.budgetId);
        if (deletedata == null) {
            return response.json({ code: "-1", message: "deleting budget Id is not found." });
        } else {
            return response.json(deletedata);
        }
    }
    catch (ex) {
        logger.error(request, "Error while executing user error : " + ex.toString(), "user", "/remove/", "catch", '1', reqQuery.budgetId, ex);
        console.log(ex);
        return response.json({ code: "-1", message: "Error while executing user delete." });
    }
});
