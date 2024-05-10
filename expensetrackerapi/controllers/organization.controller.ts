import { organization } from "../modules/organization";

import logger = require('./logger');
import config = require('../config');

import express = require('express');
import { admin } from "../modules/admin";
var router = express.Router();
export = router;


//new
router.get("/retrieve", async (request: express.Request, response: express.Response) => {
    /*  #swagger.auto = false

        #swagger.path = '/organizations/retrieve'
        #swagger.summary = 'organizations retrieve service'
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
    //logger.info(request, "request body", "organizations/Retrieve", request.query.objectCode, "request", '5');
    let reqQuery: any = request.query;
    if (String.isNullOrWhiteSpace(reqQuery.organizationName)) {
        return response.send({ code: "-1", message: "organization Name is empty" });
    } else if (String.isNullOrWhiteSpace(reqQuery.course)) {
        return response.send({ code: "-1", message: "Course is empty" });
    } else if (String.isNullOrWhiteSpace(reqQuery.year)) {
        return response.send({ code: "-1", message: "Year is empty" });
    }


    let result;
    var organizationModel = new organization.organization(request);
    try {
        let query = {
            'organizationName': reqQuery.organizationName,
            'course': reqQuery.course,
            'year': reqQuery.year
        };

        let organizationData = await organizationModel.find(query);
        if (organizationData == null || organizationData.length == 0) {
            return response.send({ code: "-1", message: `Organizations ${reqQuery.organizationName} not available` });
        }

        var userModel = new admin.user(request);
        organizationData = await userModel.getAllowedObjects(organizationData);
        if (organizationData.length == 0) {
            return response.send({ code: "-1", message: `You don't have permission to view Organizations.'` });
        }

        if (organizationData && organizationData != null) {
            result = { code: "0", message: "Organizations successfully retrieved", Organizations: organizationData };
        }
        else {
            result = { code: "-1", message: `Organizations not available` };
        }
        // #swagger.responses[200] = { description: 'User retrieved successfully.' }
        //logger.info(request, "Response", "Organizations/Retrieve", '', "response", '5', result);
        return response.send(result);
    } catch (ex) {
        //let mongoLogger = new loggerApi.logger(request);
        //mongoLogger.pustToQueue(request.body, 'user', request.query.objectCode, 'fetch', ex.toString());
        logger.error(request, "Error while executing Organization retrieve  error : " + ex.toString(), "Organizations/Retrieve", request.query.objectCode, "catch", '1', request.query, ex);
        console.log(ex);
        return response.send({ code: "-1", message: `Organizations not available` });
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
    //logger.info(request, "request body", "organization/save", (request.body.Organization && request.body.Organization._id), "request", '5', request.body);
    var organizationModel = new organization.organization(request);

    try {
        let result;
        if (request.body.Organization == null || request.body.Organization == undefined) {
            return response.json(response.json({ code: "-1", message: "Organization json cannot be empty" }));
        }
        // request.body.User = await userModel.dataConversion(request.body.User, "projectX", "save");
        let organizationBody = request.body.Organization;
        var userModel = new admin.user(request);
        organizationBody = await userModel.getAllowedObjects([organizationBody]);
        if (organizationBody.length == 0 || organizationBody[0].securityCode < 8) {
            return response.send({ code: "-1", message: `You don't have permission to save Organizations.` });
        }
        organizationBody = organizationBody[0];

        //Added for user Save As Functionality
        if (organizationBody.changeCount == null || organizationBody.changeCount == 0) {
            organizationBody.changeCount = 0;
        }
        organizationBody.tenantCode = request.tenant.code;
        try {
            if (organizationBody.changeCount == 0) {
                organizationBody.createdBy = request.body.user;
            }
            organizationBody.lastModifiedBy = request.body.user;
            organizationBody.tenantCode = request.tenant.code;
            result = await organizationModel.save(organizationBody);
            /*if (result.User) {
                result.User = await userModel.dataConversion(result.User, "tenant", "save");
            }*/
        } catch (ex) {
            console.log(ex);
            result = { code: "-1", message: "Error while saving Organization ", error: ex };
        }

        if (result.code == "-1") {
            if (result.error != undefined) {
                result.message = result.message + "; " + result.error;
            }
            logger.error(request, "Error while executing Organization update error : " + result.message, "Organization/save", request.body.Organization && request.body.Organization._id, "catch", '1', request.body, result.message);
        }
        // #swagger.responses[200] = { description: 'Organization created successfully.' }
        //logger.info(request, "Response", "Organization/save", result._id, "response", '5', result);
        return response.send(result);
    } catch (ex) {
        logger.error(request, "Error while executing Organization Save  error : " + ex.toString(), "Organization/save", request.body.Organization && request.body.Organization._id, "catch", '1', request.body, ex);
        console.log(ex);
        return response.send({ code: "-1", message: "Error while saving Organization; " + ex });
    }
});

router.delete("/remove", async (request: express.Request, response: express.Response) => {
    // #swagger.ignore = true
    //logger.info(request, "request body", "user", "//", "request", '5', request.body);
    var organizationModel = new organization.organization(request);
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

        var deletedata = await organizationModel.remove(query);
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

//new
router.get("/vieworganizations", async (request: express.Request, response: express.Response) => {
    /*  #swagger.auto = false

        #swagger.path = '/organization/vieworganizations'
        #swagger.summary = 'organization vieworganizations service'
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
    //logger.info(request, "request body", "Organization/vieworganizations", request.query.objectCode, "request", '5');
    let reqQuery: any = request.query;
    let result;
    var organizationsModel = new organization.organization(request);
    try {
        let query = {};
        // if (!String.isNullOrWhiteSpace(reqQuery.organizationId)) {
        //     query = {
        //         'organizationId': reqQuery.organizationId
        //     };
        // }

        let organizationData = await organizationsModel.find(query);
        if (organizationData == null) {
            return response.send({ code: "-1", message: `No organizations found` });
        }

        if (organizationData && organizationData != null) {
            var userModel = new admin.user(request);
            organizationData = await userModel.getAllowedObjects(organizationData);
            if (organizationData.length == 0) {
                return response.send({ code: "-1", message: `You don't have permission to view Organizations.` });
            }
            result = { code: "0", message: "Organizations successfully retrieved", Organizations: organizationData };
        }
        else {
            result = { code: "-1", message: `No organizations available` };
        }
        // #swagger.responses[200] = { description: 'User retrieved successfully.' }
        //logger.info(request, "Response", "Organizations/vieworganizations", '', "response", '5', result);
        return response.send(result);
    } catch (ex) {
        //let mongoLogger = new loggerApi.logger(request);
        //mongoLogger.pustToQueue(request.body, 'user', request.query.objectCode, 'fetch', ex.toString());
        logger.error(request, "Error while executing Organization vieworganizations  error : " + ex.toString(), "Organizations/vieworganizations", request.query.organizationId, "catch", '1', request.query, ex);
        console.log(ex);
        return response.send({ code: "-1", message: `No organizations found` });
    }
});