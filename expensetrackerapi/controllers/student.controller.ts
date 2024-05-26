import { user } from "../modules/users";
import { transaction } from "../modules/transactions";

import logger = require('./logger');
import config = require('../config');
import validation = require('../modules/admin/validation');

import express = require('express');
import { organization } from "../modules/organization";
import { admin } from "../modules/admin";
var router = express.Router();
export = router;


//new 
router.get("/retrieve", async (request: express.Request, response: express.Response) => {
    
    let reqQuery: any = request.query;
    if (String.isNullOrWhiteSpace(reqQuery.organizationCode)) {
        return response.send({ code: "-1", message: "organization code is empty" });
    } else if (String.isNullOrWhiteSpace(reqQuery.course)) {
        return response.send({ code: "-1", message: "Course is empty" });
    } else if (String.isNullOrWhiteSpace(reqQuery.year)) {
        return response.send({ code: "-1", message: "Year is empty" });
    } else if (String.isNullOrWhiteSpace(reqQuery.financialYear)) {
        return response.send({ code: "-1", message: "Financial Year is empty" });
    }


    let result;
    var studentModel = new user.students(request);
    var userModel = new admin.user(request);
    try {
        let query = {
            'organizationCode': reqQuery.organizationCode,
            'course': reqQuery.course,
            'currentYear': parseInt(reqQuery.year),
            'joiningYear': { $lte: parseInt(reqQuery.financialYear.slice(0, 4)) },
        };

        let studentData = await studentModel.find(query);
        if (studentData == null || studentData.length == 0) {
            return response.send({ code: "-1", message: `There are no students found. Please upload students.` });
        }
        studentData = await userModel.getAllowedObjects(studentData);
        if (studentData.length == 0) {
            return response.send({ code: "-1", message: `You don't have permission to view students.'` });
        }


        if (studentData && studentData != null) {
            result = { code: "0", message: "Students successfully retrieved", Students: studentData };
        }
        else {
            result = { code: "-1", message: `Students not available` };
        }
        // #swagger.responses[200] = { description: 'User retrieved successfully.' }
        //logger.info(request, "Response", "Students/Retrieve", '', "response", '5', result);
        return response.send(result);
    } catch (ex) {
        //let mongoLogger = new loggerApi.logger(request);
        //mongoLogger.pustToQueue(request.body, 'user', request.query.objectCode, 'fetch', ex.toString());
        logger.error(request, "Error while executing Student retrieve  error : " + ex.toString(), "Students/Retrieve", request.query.objectCode, "catch", '1', request.query, ex);
        console.log(ex);
        return response.send({ code: "-1", message: `Students not available` });
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
    //logger.info(request, "request body", "student/save", (request.body.Student && request.body.Student._id), "request", '5', request.body);
    var studentModel = new user.students(request);

    try {
        let result;
        if (request.body.Student == null || request.body.Student == undefined) {
            return response.json(response.json({ code: "-1", message: "Student json cannot be empty" }));
        }
        // request.body.User = await userModel.dataConversion(request.body.User, "projectX", "save");
        let studentBody = request.body.Student;
        let validations = validation.studentSaveValidations(request.body);
        if (validations.code == "-1") {
            result = { code: "-1", message: validations.message };
            return response.json(result);
        } else {
            var userModel = new admin.user(request);
            studentBody = await userModel.getAllowedObjects([studentBody]);
            if (studentBody.length == 0 || studentBody[0].securityCode < 2)
                return response.send({ code: "-1", message: `You don't have permission to save student ${request.body.Student._id}` });

            studentBody = studentBody[0];

            //Added for user Save As Functionality 
            if (studentBody.changeCount == null || studentBody.changeCount == 0) {
                studentBody.changeCount = 0;
            }
            studentBody.tenantCode = request.tenant.code;
            try {
                if (studentBody.changeCount == 0) {
                    studentBody.createdBy = request.body.user;
                }
                studentBody.lastModifiedBy = request.body.user;
                studentBody.tenantCode = request.tenant.code;
                result = await studentModel.save(studentBody);
                /*if (result.User) {
                    result.User = await userModel.dataConversion(result.User, "tenant", "save");
                }*/
            } catch (ex) {
                console.log(ex);
                result = { code: "-1", message: "Error while saving Student ", error: ex };
            }

            if (result.code == "-1") {
                if (result.error != undefined) {
                    result.message = result.message + "; " + result.error;
                }
                logger.error(request, "Error while executing Student update error : " + result.message, "Student/save", request.body.Student && request.body.Student._id, "catch", '1', request.body, result.message);
            }
            // #swagger.responses[200] = { description: 'Student created successfully.' }
            //logger.info(request, "Response", "Student/save", result._id, "response", '5', result);
            return response.send(result);
        }
    } catch (ex) {
        logger.error(request, "Error while executing Student Save  error : " + ex.toString(), "Student/save", request.body.Student && request.body.Student._id, "catch", '1', request.body, ex);
        console.log(ex);
        return response.send({ code: "-1", message: "Error while saving Student; " + ex });
    }
});

router.delete("/remove", async (request: express.Request, response: express.Response) => {
    // #swagger.ignore = true
    //logger.info(request, "request body", "user", "//", "request", '5', request.body);
    var userModel = new user.students(request);
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
        var deletedata = await userModel.remove(query);
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
router.get("/viewstudenttransactions", async (request: express.Request, response: express.Response) => {
    /*  #swagger.auto = false

        #swagger.path = '/student/viewstudenttransactions'
        #swagger.summary = 'student viewstudenttransactions service'
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
    //logger.info(request, "request body", "Student/viewstudenttransactions", request.query.objectCode, "request", '5');
    let reqQuery: any = request.query;
    if (String.isNullOrWhiteSpace(reqQuery.studentId)) {
        return response.send({ code: "-1", message: "Student Id is empty" });
    }


    let result;
    var transactionsModel = new transaction.transactions(request);
    var studentsModel = new user.students(request);
    var organizationsModel = new organization.organization(request);
    var userModel = new admin.user(request);

    try {
        let query = {
            'studentId': reqQuery.studentId
        };
        let studentData = await studentsModel.findById(reqQuery.studentId);
        if (!studentData || studentData == null) {
            return response.send({ code: "-1", message: `No student found for ${reqQuery.studentId}` });
        }

        studentData = await userModel.getAllowedObjects([studentData]);
        if (studentData.length == 0)
            return response.send({ code: "-1", message: `You don't have permission to view student ${reqQuery.studentId}` });

        studentData = studentData[0];

        let organization = await organizationsModel.findOne({ organizationCode: studentData.organizationCode });
        let tranactionsData = await transactionsModel.find(query);
        if (tranactionsData == null) {
            return response.send({ code: "-1", message: `No transactions found for ${reqQuery.studentId}`, student: studentData });
        }

        if (tranactionsData && tranactionsData != null) {
            result = { code: "0", message: "Transactions successfully retrieved", Transactions: tranactionsData, student: studentData, feeTypes: organization.feesTypes };
        }
        else {
            result = { code: "-1", message: `No transactions available` };
        }
        // #swagger.responses[200] = { description: 'User retrieved successfully.' }
        //logger.info(request, "Response", "Students/viewstudenttransactions", '', "response", '5', result);
        return response.send(result);
    } catch (ex) {
        //let mongoLogger = new loggerApi.logger(request);
        //mongoLogger.pustToQueue(request.body, 'user', request.query.objectCode, 'fetch', ex.toString());
        logger.error(request, "Error while executing Student viewstudenttransactions  error : " + ex.toString(), "Students/viewstudenttransactions", request.query.studentId, "catch", '1', request.query, ex);
        console.log(ex);
        return response.send({ code: "-1", message: `No transactions found for ${request.query.studentId}` });
    }
});


router.get("/viewbyId", async (request: express.Request, response: express.Response) => {
    /*  #swagger.auto = false

        #swagger.path = '/student/viewbyId'
        #swagger.summary = 'student viewbyId service'
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
    //logger.info(request, "request body", "Student/viewbyId", request.query.objectCode, "request", '5');
    let reqQuery: any = request.query;
    if (String.isNullOrWhiteSpace(reqQuery.studentId)) {
        return response.send({ code: "-1", message: "Student Id is empty" });
    }
    let result;
    var studentsModel = new user.students(request);
    var userModel = new admin.user(request);
    var organizationsModel = new organization.organization(request);
    try {
        let studentData = await studentsModel.findById(reqQuery.studentId);
        let organization = await organizationsModel.findOne({ organizationCode: studentData.organizationCode });
        if (!studentData || studentData == null) {
            return response.send({ code: "-1", message: `No student found for ${reqQuery.studentId}` });
        }
        else {
            studentData = await userModel.getAllowedObjects([studentData]);
            if (studentData.length == 0)
                return response.send({ code: "-1", message: `You don't have permission to view student ${reqQuery.studentId}` });

            studentData = studentData[0];
            result = { code: "0", message: "Student successfully retrieved", student: studentData, feeTypes: organization.feesTypes, branches: organization.branches };
        }
        return response.send(result);
    } catch (ex) {
        logger.error(request, "Error while executing Student by id error : " + ex.toString(), "Students/viewbyId", request.query.studentId, "catch", '1', request.query, ex);
        console.log(ex);
        return response.send({ code: "-1", message: `No student found for ${request.query.studentId}` });
    }
});