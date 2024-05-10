import mongoose = require('mongoose');
import express = require('express');
import config = require('../config');
import logger = require('./logger');
var bcrypt = require('bcryptjs');
import { lib } from '../lib';
import jwt = require('jsonwebtoken');

import { admin } from '../modules/admin';
import authorization = require('../lib/authorization');
var router = express.Router();

export = router;

router.post('/login', async (request: express.Request, response: express.Response) => {
    /*  #swagger.auto = false

        #swagger.path = '/login'
        #swagger.summary = 'Login service'
        #swagger.tags = ['User']
        #swagger.method = 'post'
        #swagger.produces = ['application/json']
        #swagger.consumes = ['application/json']

        #swagger.parameters['userCode'] = {
            in: 'header',
            description: 'User code.',
            required: true,
            type: 'string'
        }

        #swagger.parameters['password'] = {
            in: 'header',
            description: 'Password.',
            required: true,
            type: 'string'
        }
    */
    try {
        var ucode: String = "";
        var pwd: String = "";

        if (request.header("Authorization")) {
            var auth = request.header("Authorization");
            if (auth.indexOf("Basic ") == 0) {
                auth = auth.replace("Basic ", "");
                var up = new Buffer(auth, "base64").toString().split(":");
                ucode = up[0];
                if (up.length > 1) {
                    pwd = up[1];
                }
            }
        }
        else {
            ucode = request.header("userCode") || request.body.userCode || '';
            pwd = request.header("password") || request.body.password || '';
        }
        //console.log(JSON.stringify(request.body));
        var ret = {
            code: '',
            token: "",
            message: "",
            user: null,
        };
        if (ucode == '' || pwd == '') {
            ret.code = '-1';
            ret.message = 'Username or password cannot be empty';
            return response.json(ret);
        }

        var user = new admin.user(request);
        const result = await user.findOne({ "userCode": ucode });
        if (result != undefined) {
            var usr = result;
            if (usr.userCode == ucode) {
                if (bcrypt.compareSync(pwd, usr.password)) {
                    usr.lastLoggedIn = new Date();
                    usr.invalidLoginCount = 0;
                    const errorMsg = ". Please contact Administrator";
                    if (usr.expirationDate != null) {
                        if (new Date(usr.expirationDate).getTime() < usr.lastLoggedIn.getTime()) {
                            ret.code = '-1';
                            ret.message = 'User is Expired';
                            return response.json({ code: '-1', message: 'User is Expired' + errorMsg, user: null });
                        }
                    }
                    if (usr.isLocked != null && usr.isLocked == true) {
                        return response.json({ code: '-1', message: 'User is Locked' + errorMsg, user: null });
                    }
                    if (usr.isActive == null || usr.isActive != 1) {
                        return response.json({ code: '-1', message: 'User is inActive' + errorMsg, user: null });
                    }
                    const res = await user._update(usr);
                    usr.exp = Math.floor(Date.now() / 1000) + (60 * 60);
                    usr.expiresIn = 3600;
                    //let objects = request.tenant.configuration.objectType;
                    delete usr.password; //deleting password property from user object while saving in session.    
                    delete usr.isLocked;
                    delete usr.passwordModifiedDate;
                    delete usr.isActive;
                    delete usr.deleteMark;
                    delete usr.changeCount;
                    delete usr.tenantCode;
                    delete usr.groups;
                    delete usr.roles;
                    delete usr.invalidLoginCount;
                    delete usr.lastFailedLogin;
                    var newToken = jwt.sign(usr, config.encryptionKey);
                    request.currentUser = usr;
                    request.token = newToken;
                    ret.code = '0';
                    ret.message = 'successfully logined';
                    ret.token = newToken;
                } else {
                    usr.lastFailedLogin = new Date();
                    usr.invalidLoginCount = (usr.invalidLoginCount || 0) + 1;
                    const res = await user._update(usr);

                    ret.code = '-1';
                    ret.message = 'password is incorrect';
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
        // #swagger.responses[200] = { description: 'User logged in successfully.' }
        //logger.info(request, "Response", "login", result.objectCode, "response", '5', result)
        response.end();
    } catch (ex) {
        logger.error(request, "Error occurred while login : " + ex.toString(), "login", "catch", '1', request.body, ex);
        console.log("Error while executing login : " + ex.toString());
        return response.json({ code: "-1", message: "Error occurred while login" });
    }

});

router.post("/logout", (request: express.Request, response: express.Response) => {
    /*  #swagger.auto = false

        #swagger.path = '/logout'
        #swagger.summary = 'Logout service'
        #swagger.tags = ['User']
        #swagger.method = 'post'
        #swagger.produces = ['application/json']
        #swagger.consumes = ['application/json']

        #swagger.parameters['token'] = {
            in: 'header',
            description: 'Token.',
            required: true,
            type: 'string'
        }
    */
    var token = request.header("token") || request.body.token || '';
    // #swagger.responses[200] = { description: 'User logged out successfully.' }
    return response.send({ code: '0', message: 'Session logged out!' });
});

router.get('/login', (req: express.Request, res: express.Response) => {
    // #swagger.ignore = true
    if (config.authenticationMode == "windows") {
        res.writeHead(401, {
            "WWW-Authenticate": "NTLM",
            "Connection": "closed"
        });

        res.end();
    }
    else {
        res.setHeader("encKey", lib.utilities.NewGUID());
        res.send("OK");
    }

});

router.get("/validate", async (request: express.Request, response: express.Response) => {
    /*  #swagger.auto = false

        #swagger.path = '/validate'
        #swagger.summary = 'User Validation service'
        #swagger.tags = ['User']
        #swagger.method = 'get'
        #swagger.produces = ['application/json']
        #swagger.consumes = ['application/json']

        #swagger.parameters['token'] = {
            in: 'header',
            description: 'Token.',
            required: true,
            type: 'string'
        }
    */
    var token = request.header("token") || '';
    var redis = request.tenant.dal.cache;
    var user = await redis.validateSession(token);
    if (user) {
        response.json({ code: '0', message: 'user is authenticated.', user: user });
    } else {
        response.json({ code: '0', message: 'user is not authenticated.' });
    }
    // #swagger.responses[200] = { description: 'User is authenticated.' }
    response.end();
});


router.post('/settoken', authorization, async (request: express.Request, response: express.Response) => {
    /*  #swagger.auto = false
    
        #swagger.path = '/settoken'
        #swagger.summary = 'Set Token service'
        #swagger.tags = ['User']
        #swagger.method = 'post'
        #swagger.produces = ['application/json']
        #swagger.consumes = ['application/json']
    
        #swagger.parameters['token'] = {
            in: 'header',
            description: 'Token.',
            required: true,
            type: 'string'
        }
        #swagger.parameters['usercode'] = {
            in: 'header',
            description: 'User code.',
            required: true,
            type: 'string'
        }
    */
    var token = request.header("token");
    var ucode = request.header("usercode");
    var ret = {
        code: '',
        token: "",
        message: "",
        user: null,
        objects: {},
        accessModels: {}
    };
    if (token == '' || ucode == '') {
        ret.code = '-1';
        ret.message = 'Token cannot be empty';
        response.json(ret);
        response.end();
        return;
    }
    //jwt.verify(token, 'test', (err, decoded) => {
    //    if (err) {
    //        return response.status(401).send({ message: "Unauthorized!" });
    //    }
    //    console.log(decoded.userCode);
    //});


    var user = new admin.user(request);
    var result = await user.findOne({ "userCode": ucode });
    if (result != undefined) {
        var userObject = result;
        if (userObject.userCode == ucode) {
            let objects = request.tenant.configuration.objectType;
            //var redis = request.tenant.dal.cache;
            delete userObject.password; //deleting password property from user object while saving in session.                                        
            //redis.setSession('userinfo_' + request.header("usercode"), JSON.stringify(userObject));
            request.currentUser = userObject;
            request.token = token;
            ret.code = '0';
            ret.message = 'Token Successfully Saved';
            ret.token = token;
            ret.objects = objects;
            ret.user = userObject;
        } else {
            ret.code = '-1';
            ret.message = "User doesn't exists";
        }
    } else {
        ret.code = '-1';
        ret.message = "User doesn't exists";
    }
    response.json(ret);
    // #swagger.responses[200] = { description: 'Token Successfully Saved.' }
    response.end();
});