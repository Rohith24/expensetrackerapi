import { user } from "../modules/admin/user";

import logger = require('./logger');
import config = require('../config');
import validation = require('../modules/admin/validation');

import express = require('express');
import { admin } from "../modules/admin";
var bcrypt = require('bcryptjs');

var router = express.Router();
export = router;

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
    //logger.info(request, "request body", "user/save", (request.body.User && request.body.User._id), "request", '5', request.body);
    var userModel = new user(request);

    try {
        let result;
        if (request.body.user == null || request.body.User == undefined) {
            return response.json(response.json({ code: "-1", message: "User json cannot be empty" }));
        }

        // request.body.User = await userModel.dataConversion(request.body.User, "projectX", "save");
        let userBody = request.body.User;
        let validations = validation.userSaveValidations(request.body);
        if (validations.code == "-1") {
            result = { code: "-1", message: validations.message };
            return response.json(result);
        } else {
            if (!request.currentUser.isSuperAdmin)
                return response.send({ code: "-1", message: "You don't have permission to create user" });

            //Added for user Save As Functionality 
            if (userBody.changeCount == null || userBody.changeCount == 0) {
                userBody.changeCount = 0;
            }
            userBody.tenantCode = request.tenant.code;
            try {
                if (userBody.changeCount == 0) {
                    userBody.createdBy = request.body.user;
                }
                userBody.lastModifiedBy = request.body.user;
                userBody.tenantCode = request.tenant.code;
                result = await userModel.save(userBody);
                /*if (result.User) {
                    result.User = await userModel.dataConversion(result.User, "tenant", "save");
                }*/
            } catch (ex) {
                console.log(ex);
                result = { code: "-1", message: "Error while saving User ", error: ex };
            }

            if (result.code == "-1") {
                if (result.error != undefined) {
                    result.message = result.message + "; " + result.error;
                }
                logger.error(request, "Error while executing User update error : " + result.message, "User/save", request.body.User && request.body.User._id, "catch", '1', request.body, result.message);
            }
            // #swagger.responses[200] = { description: 'User created successfully.' }
            //logger.info(request, "Response", "User/save", result._id, "response", '5', result);
            return response.send(result);
        }
    } catch (ex) {
        logger.error(request, "Error while executing User Save  error : " + ex.toString(), "User/save", request.body.User && request.body.User._id, "catch", '1', request.body, ex);
        console.log(ex);
        return response.send({ code: "-1", message: "Error while saving User; " + ex });
    }
});

router.post('/changepassword', async (request: express.Request, response: express.Response) => {
    // #swagger.ignore = true
    var ucode: String = "";
    var oldpwd: String = "";
    var newpwd: String = "";

    ucode = request.header("userCode") || request.body.userCode || '';
    oldpwd = request.header("currentpassword") || request.body.currentpassword || '';
    newpwd = request.header("newpassword") || request.body.newpassword || '';
    var ret = {
        code: '',
        token: "",
        message: "",
        user: null
    };
    if (ucode == '' || oldpwd == '' || newpwd == '') {
        ret.code = '-1';
        ret.message = 'Username or old password or new password cannot be empty';
        response.json(ret);
        response.end();
        return;
    }

    var user = new admin.user(request);
    var result = await user.findOne({ "userCode": ucode });
    if (result != undefined) {
        var userObject = result;
        if (userObject.userCode == ucode) {
            if (bcrypt.compareSync(oldpwd, userObject.password)) {
                var hash = bcrypt.hashSync(newpwd, 10);
                userObject.password = hash;
                userObject.passwordModifiedDate = new Date().toISOString();
                userObject = await user.update(userObject);
                //var redis = request.tenant.dal.cache;
                //var newToken = lib.utilities.NewGUID();
                delete userObject.password; //deleing password property from user object while saving in session.
                delete userObject.isLocked;
                delete userObject.passwordModifiedDate;
                delete userObject.isActive;
                delete userObject.deleteMark;
                delete userObject.changeCount;
                delete userObject.tenantCode;
                delete userObject.groups;
                delete userObject.roles;
                delete userObject.invalidLoginCount;
                delete userObject.lastFailedLogin;

                //redis.setSession(newToken, JSON.stringify(userObject));
                request.currentUser = userObject;
                /*request.token = newToken;*/
                ret.code = '0';
                ret.message = 'password successfully changed';
                //ret.token = newToken;
                ret.user = userObject;
            } else {
                ret.code = '-1';
                ret.message = 'current password is incorrect';
            }
        } else {
            ret.code = '-1';
            ret.message = "User doesn't exists";
        }
    } else {
        ret.code = '-1';
        ret.message = "User doesn't exists";
    }
    response.json(ret);
    response.end();
});

router.post("/resetpassword", async (request: express.Request, response: express.Response) => {
    var userName: String = "";
    var newpwd: String = "";

    userName = request.header("userName") || request.body.userName || '';
    newpwd = request.header("newpassword") || request.body.newpassword || '';
    var ret = {
        code: '',
        token: "",
        message: "",
        user: null
    };
    if (userName == '' || newpwd == '') {
        ret.code = '-1';
        ret.message = 'Username or new password cannot be empty';
        response.json(ret);
        response.end();
        return;
    }

    var user = new admin.user(request);
    if (!request.currentUser.isSuperAdmin)
        return response.send({ code: "-1", message: "You don't have permission to reset password" });

    let currentUser = await user.findOne({ "userCode": userName });

    if (currentUser != undefined) {
        var hash = bcrypt.hashSync(newpwd, 10);
        currentUser.password = hash;
        currentUser.passwordModifiedDate = new Date().toISOString();
        currentUser = await user.update(currentUser);

        //var redis = request.tenant.dal.cache;
        //var newToken = lib.utilities.NewGUID();
        delete currentUser.password; //deleing password property from user object while saving in session.
        delete currentUser.isLocked;
        delete currentUser.passwordModifiedDate;
        delete currentUser.isActive;
        delete currentUser.deleteMark;
        delete currentUser.changeCount;
        delete currentUser.tenantCode;
        delete currentUser.groups;
        delete currentUser.roles;
        delete currentUser.invalidLoginCount;
        delete currentUser.lastFailedLogin;

        //redis.setSession(newToken, JSON.stringify(userObject));
        request.currentUser = currentUser;
        /*request.token = newToken;*/
        ret.code = '0';
        ret.message = 'password successfully changed';
        //ret.token = newToken;
        ret.user = currentUser;
    }
    else {
        ret.code = '-1';
        ret.message = `User '${userName}' doesn't exists`;
    }
    response.json(ret);
    response.end();
});
