var useragent = require('useragent');
import config = require('../config');
var ip = require('ip');

import express = require('express');
var request = require('request');

var router = express.Router();


function log(expressRequest: express.Request, msg: string, objectType: string, objectId: any, event: string, severity: string, logType: string, meta?: any, stackTrace?: any, logLevel?: number) {
    var requestBody;
    if (!expressRequest.headers) {
        requestBody = dalRequestBody(expressRequest, logType, msg, objectType, objectId, event, severity, meta, stackTrace, logLevel);
    } else {
        requestBody = prepareRequestBody(expressRequest, logType, msg, objectType, objectId, event, severity, meta, stackTrace, logLevel);
    }
    //var logUrl = config.logServiceURL.replace("{tenant}", expressRequest.tenantName + ".");
    //var logUrl = config.logService.protocol + expressRequest.tenantName + "." + config.logService.url + ":" + config.logService.port + config.logService.path;
    var logUrl = config.logService.url;
    /*
    error-1
    warn-2
    debug-3
    info-4
    silly-5
    */
    //save(logUrl, requestBody);
}

function save(logUrl: string, requestBody: any) {

    request(logUrl,
        {
            headers: {
                "Content-Type": "application/json"
            },
            'body': JSON.stringify(requestBody),
            'method': 'POST'
        }, (resErr, res, resBody) => {
            if (resErr) {
                console.log(resErr);
            }
        });
}

function prepareRequestBody(expressRequest: express.Request, type: string, msg: string, objectType: string, objectId: any, event: string, severity: string, meta?: any, stackTrace?: any, logLevel?: number) {
    try {
        var userid = "";
        if (expressRequest.currentUser != undefined) {
            userid = expressRequest.currentUser.userCode;
        }

        var requestBody = {
            "source": "PROJECTX",
            "message": msg,
            "userCode": userid,
            "method": objectType,
            "category": type,
            "logLevel": logLevel || expressRequest.tenant.logLevel || 4,//4 is considered as default
            "tenantCode": expressRequest.tenantName.toUpperCase(),
            "additionalInfo": JSON.stringify({
                "eventType": event,
                "meta": meta,
                "stackTrace": stackTrace
            })
        };
        return requestBody;
    } catch (ex) {
        console.log("Error while executing Logger error : " + ex.toString());
        return {};
    }
}

function dalRequestBody(expressRequest: express.Request, type: string, msg: string, objectType: string, objectId: any, event: string, severity: string, meta?: any, stackTrace?: any, logLevel?: number) {
    try {
        var requestBody = {
            "source": "PROJECTX",
            "message": msg,
            "userCode": "SYSTEM",
            "method": objectType,
            "category": type,
            "logLevel": logLevel || expressRequest.tenant.logLevel || 4,//4 is considered as default
            "tenantCode": expressRequest.tenantName.toUpperCase(),
            "additionalInfo": JSON.stringify({
                "eventType": event,
                "meta": meta,
                "stackTrace": stackTrace
            })
        };
        return requestBody;
    } catch (ex) {
        console.log("Error while executing Logger error : " + ex.toString());
        return {};
    }
}


export function debug(expressRequest: express.Request, msg: string, objectType: string, objectId: any, event: string, severity: string, meta?: any, stackTrace?: any, logLevel?: number) {
    log(expressRequest, msg, objectType, objectId, event, severity, "DEBUG", meta, stackTrace, logLevel);
}

export function info(expressRequest: express.Request, msg: string, objectType: string, objectId: any, event: string, severity: string, meta?: any, stackTrace?: any, logLevel?: number) {
    log(expressRequest, msg, objectType, objectId, event, severity, "INFORMATION", meta, stackTrace, logLevel);
}

export function error(expressRequest: express.Request, msg: string, objectType: string, objectId: any, event: string, severity: string, meta?: any, stackTrace?: any, logLevel?: number) {
    log(expressRequest, msg, objectType, objectId, event, severity, "ERROR", meta, stackTrace, logLevel);
}

export function warn(expressRequest: express.Request, msg: string, objectType: string, objectId: any, event: string, severity: string, meta?: any, stackTrace?: any, logLevel?: number) {
    log(expressRequest, msg, objectType, objectId, event, severity, "WARNING", meta, stackTrace, logLevel);
}

export function silly(expressRequest: express.Request, msg: string, objectType: string, objectId: any, event: string, severity: string, meta?: any, stackTrace?: any, logLevel?: number) {
    log(expressRequest, msg, objectType, objectId, event, severity, "none", meta, stackTrace, logLevel);
}

export function critical(expressRequest: express.Request, msg: string, objectType: string, objectId: any, event: string, severity: string, meta?: any, stackTrace?: any, logLevel?: number) {
    log(expressRequest, msg, objectType, objectId, event, severity, "CRITICAL", meta, stackTrace, logLevel);
}


















/*
export function auditLog(request, msg, objectId, event, severity) {

    var requestBody = prepareRequestBodyForAuditLog(request,  msg, objectId, event, severity)
    console.dir(requestBody);
    var csv = new logService.logService(request);
    var options = {
        path: "/api/AuditLog/save/",
        method: "POST",
        headers: {}
    };
    options.headers["data"] = JSON.stringify(requestBody);

    csv.beginRequest(options, (result) => {

    });

}


function prepareRequestBodyForAuditLog(request,  msg, objectId, event, Status) {
    var agent = useragent.parse(request.headers['user-agent'])
    var browsername = useragent.fromJSON(JSON.stringify(agent));
    var requestBody = {
        "data": {           
            "message": msg,
            "event": event,           
            "userid": request.currentUser.userCode,
            "status": Status,
            "objectType": ObjectType,
            "objectId": objectId,
            "tenant": request.tenantName,
            "clientInfo": {
                "clinetURL": '',
                "browsername": '',
                "browserversion": '',
                "operatingSystem": ''
            },
            "duration": "3200"
        }
    };
    return requestBody;
}
*/