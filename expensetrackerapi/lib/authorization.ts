import express = require('express');
import { admin } from '../modules/admin';
import jsonwebtoken = require('jsonwebtoken');
import queryString = require("query-string");
import logger = require('../controllers/logger');
import config = require('../config');

export = async function (req: express.Request, res: express.Response, next) {
    try {
        var ret = {
            message: ""
        }
        const [_path, params] = req?.url?.split("?");
        const connectionParams = queryString.parse(params);
        var token = req.header("Authorization") || connectionParams.Authorization as string;
        var userCode = req.header("userCode") || connectionParams.userCode as string;
        var tenant = req.header("tenant") || connectionParams.tenantName as string;
        if (userCode == undefined) {
            ret.message = "userCode in header is required.";
            return res.json(ret);
        }
        if (token == undefined) {
            ret.message = "Authorization in header is required.";
            return res.json(ret);
        }
        const jwtToken = token.split(' ')[1];
        try {
            const decoded = jsonwebtoken.verify(jwtToken, config.encryptionKey);
            if (decoded.userCode != userCode) {
                return res.status(401).json('User is not matched!');
            } else {
                var usermodel = new admin.user(req);
                const result = await usermodel.findOne({ "userCode": userCode });
                if (result == null) {
                    return res.sendStatus(401).json('User is not authorized!');
                }
                delete result.password;
                req.isAuthenticated = true;
                req.currentUser = result;
                req.token = token;
                next();
            }
            console.log(decoded.userId);
        } catch (err) {
            console.error(err);
            if (err.name == 'TokenExpiredError') {
                return res.status(401).json({ code: '-1', message: 'Session expired or invalid token. Error :' + err.message });
            }
            return next(err);
        }
    } catch (ex) {
        logger.error(req, "Session expired or invalid token error : " + ex.toString(), "", "", "catch", "1", "", ex);
        console.log(ex);
        return next("Session expired or invalid token");
    }
}
