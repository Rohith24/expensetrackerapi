import fs = require('fs');
import path = require('path');
import config = require('../config');
import logger = require('../controllers/logger');
import express = require('express');
import authorize = require('../lib/authorization');
import authentication = require('../controllers/authentication');
import { admin } from '../modules/admin';
import { system } from '../modules/system';
import queryString = require("query-string");

export function initialize(app: express.Application) {

    var prefix = "/api";
    var autoReplace = /api/i;

    evalTenantInfo(app);

    //login is excluded for authorization as it shuold be anonymous
    app.use(prefix, authentication);

    //app.all(prefix + '/*', authorize); //this will redirect all /api/* request to authorization
    //console.log(process.cwd())
    app.use('/api/accounts', require("../controllers/account.controller"));
    app.use('/api/upload', require("../controllers/upload.controller"));
    app.use('/api/student', require("../controllers/student.controller"));
    app.use('/api/transaction', require("../controllers/transaction.controller"));
    app.use('/api/organization', require("../controllers/organization.controller"));
    app.use('/api/user', require("../controllers/user.controller"));

}


function evalTenantInfo(app: express.Application) {


    //Evalueates subdomain/tenant information
    app.use(function (req, res, next) {

        //var reqUrl = req.headers["host"];
        //var ipRegEx = /(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])/;
        //reqUrl = reqUrl.replace(ipRegEx, "ipaddress");
        //var index = reqUrl.indexOf(".");
        const [_path, params] = req?.url?.split("?");
        const connectionParams = queryString.parse(params);
        var reqTenant = req.header("tenant") || connectionParams.tenantName as string;

        var tenant = "PROJECTX";
        //if (index < 0) {
        //    tenant = config.defaultTenant.toUpperCase();
        //}
        //else {
        //    var sub = reqUrl.split('.')[0];
        //    if (!(sub == "www" || sub == "mail")) //blacklist or invalid domains
        //    {
        //        tenant = sub.toUpperCase();
        //    }
        //}

        if (reqTenant) {
            tenant = reqTenant;
        } else {
            tenant = config.defaultTenant.toUpperCase();
        }
        //console.log("tenant: " + tenant);
        req.tenantName = tenant;

        req.tenant = global.getTenant(tenant);
        //if (req["sessionStore"] != undefined)
        //    req["sessionStore"].prefix = tenant + ":" + config.session.prefix;

        next();

    });

    /*
    //creates the reference of request and response to global.currentContext 
    //where it can we accesses every where throug global.currentContext
    app.use((request: express.Request, response: express.Response, next) =>
    {
      
        //  global.
        global.currentContext = {
            request: request,
            response: response
        };

        next();
    });*/



}