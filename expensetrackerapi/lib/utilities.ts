const fs = require("fs");
import request = require('request');
import logger = require('../controllers/logger');

function S4() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

export function NewGUID() {
    // then to call it, plus stitch in '4' in the third group
    var guid = (S4() + S4() + "-" + S4() + "-" + S4().substr(0, 4) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
    return guid;
}

export function NewShortGUID() {
    // then to call it, plus stitch in '4' in the third group
    var guid = NewGUID().slice(24);
    return guid;
}


/**
* Multiplication
* @a a
* @b b
* return result
*/
export function mul(a: number | string, b: number | string): number {
    try {
        let aPrecision = ((a + "").split(".")[1] || "").length;
        let bPrecision = ((b + "").split(".")[1] || "").length;
        let result: number;
        let aMul = 1, bMul = 1;

        //console.log("aPrecision:" + aPrecision + "  ,bPrecision" + bPrecision);
        for (let i = 0; i < aPrecision; i++) {
            aMul = aMul * 10;
        }
        for (let i = 0; i < bPrecision; i++) {
            bMul = bMul * 10;
        }
        //console.log("aMul:" + aMul + "  ,bMul" + bMul);
        let aPow = Number(a) * aMul;
        let bPow = Number(b) * bMul;
        //console.log("aPow:" + aPow + "  ,bPow" + bPow);
        result = aPow * bPow;
        //console.log("result:" + result);
        result = result / (aMul * bMul);
        console.log(a + " * " + b + " = " + result);

        return result;
    } catch (ex) {
        logger.error(this.request, "Error while mul error : " + ex.toString(), "", "", "catch", "1", a, ex);
        console.log("Error while mul:" + ex.toString());
    }
}

export function getLoggerId(object: any, objectIdArray?): any {
    let id = '';
    if (object != null) {
        if (object instanceof Array) {
            for (let obj of object) {
                obj = JSON.parse(JSON.stringify(obj));
                if (!objectIdArray) {
                    id = obj.objectCode ? id + obj.objectCode : id;
                    id = obj.version ? id + '/' + obj.version : id;
                } else {
                    for (let objectId of objectIdArray) {
                        id = id != '' ? id + '/' + object[objectId] : id + object[objectId];
                    }
                }
            }
        } else if (typeof (object) == "object") {
            object = JSON.parse(JSON.stringify(object));
            if (!objectIdArray) {
                id = object.objectCode ? id + object.objectCode : id;
                id = object.version ? id + '/' + object.version : id;
            } else {
                for (let objectId of objectIdArray) {
                    id = id != '' ? id + '/' + object[objectId] : id + object[objectId];
                }
            }
        }
    }
    return id;
}

export function logRequestBody(req, res, next) {


    let dir = 'logger';
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    try {
        let reqBody = req.body;
        if (reqBody != null && reqBody != "{}") {
            fs.appendFileSync(getFileName(), "request:" + JSON.stringify(reqBody) + "\n");
        }
    } catch (ex) {
        logger.error(this.request, "Error while logResponseBody error : " + ex.toString(), "", "", "catch", "1", '', ex);
        console.log("Error while logResponseBody:" + ex);
    }
    next();
}

function getFilesizeInBytes(filename) {
    let stats = fs.statSync(filename)
    let fileSizeInBytes = stats["size"];
    let fileSizeInMegabytes = fileSizeInBytes / 1000000;
    return fileSizeInMegabytes
}

function getFileName() {
    let datetime = new Date();
    let currentDate = datetime.toISOString().slice(0, 10);
    for (let i = 0; i < 1000000; i++) {
        let fileName = "logger/logger" + currentDate + "(" + i + ").txt";
        if (!fs.existsSync(fileName)) {
            return fileName;
        } else if (getFilesizeInBytes(fileName) < 5) {
            return fileName;
        }
    }
}

export function logResponseBody(req, res, next) {
    var oldWrite = res.write,
        oldEnd = res.end;

    var chunks = [];

    res.write = function (chunk) {
        chunks.push(new Buffer(chunk));

        oldWrite.apply(res, arguments);
    };

    res.end = function (chunk) {
        if (chunk)
            chunks.push(new Buffer(chunk));

        var body = Buffer.concat(chunks).toString('utf8');
        //console.log(req.path, body);
        let datetime = new Date();
        let currentDate = datetime.toISOString().slice(0, 10);
        let dir = 'logger';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        try {
            fs.appendFileSync(getFileName(), "reponse:" + JSON.stringify(JSON.parse(body)) + "\n");
        } catch (ex) {
            logger.error(this.request, "Error while logResponseBody error : " + ex.toString(), "", "", "catch", "1", chunk, ex);

            console.log("Error while logResponseBody:" + ex);
        }
        oldEnd.apply(res, arguments);
    };

    next();
}

/**
 * Object Validation
 * @object Object
 * @objectName object Name
 * @notNullParameters not Null Parameters
 * @notEmptyParameters not Empty Parameters
 * @numberedParameters not Empty Parameters
 * @isCombineValidation is Combine Validation
 * return code => "0" (if validation success)  => -1 (if validation fails)
*/
export function validations(object: any, objectName: string, notNullParameters: string[], notEmptyParameters: string[], numberedParameters: string[], isCombineValidation: boolean = false) {
    try {
        let missingParameters = [];
        if (object == null || object == undefined) {
            return { code: "-1", message: objectName + " is missing" };
        }

        for (let fieldName of notNullParameters) {
            if (object[fieldName] == null || object[fieldName] == undefined) {
                missingParameters.push(fieldName);
                if (!isCombineValidation) {
                    return { code: "-1", message: objectName + " " + fieldName + " is missing" };
                }
            }
        }

        for (let fieldName of notEmptyParameters) {
            if (String.isNullOrWhiteSpace(object[fieldName])) {
                missingParameters.push(fieldName);
                if (!isCombineValidation) {
                    return { code: "-1", message: objectName + " " + fieldName + " is missing" };
                }
            }
        }

        for (let fieldName of numberedParameters) {
            if (object == null || object == undefined || isNaN(object[fieldName])) {
                missingParameters.push(fieldName);
                if (!isCombineValidation) {
                    return { code: "-1", message: objectName + " " + fieldName + " is missing" };
                }
            }
        }

        if (missingParameters.length > 0) {
            return { code: "-1", message: objectName + " " + missingParameters.join(";") + " is missing" };
        } else {
            return { code: "0", message: "Validation success" };
        }

    } catch (ex) {
        logger.error(this.request, "Error while exectuing validation in utilites error : " + ex.toString(), "", "", "catch", "1", object, ex);
        return { code: "-1", message: "Error while exectuing validation in utilites:" + ex };
    }
}

export async function wait(seconds: number): Promise<any> {
    return new Promise(r => setTimeout(() => r("success"), seconds * 1000));
}

export async function externalAPIRequest(url, options): Promise<any> {
    return new Promise(async (resolve, reject) => {
        request(url, options, (err, resp, body) => {
            try {
                if (err) {
                    console.log('Api request error: ' + err);
                    reject(err);
                } else {
                    console.log('URL: ' + url + ", statusCode: " + resp.statusCode + ", method: " + resp.statusMessage);
                    if (resp.statusCode == 200 || resp.statusCode == 201) {
                        if (body != "") {
                            var res = JSON.parse(body);
                            resolve(res);
                        } else {
                            resolve(body);
                        }
                    } else {
                        reject(body);
                    }
                }
            } catch (ex) {
                logger.error(this.request, "Error : " + ex.toString(), "", "", "catch", "1", '', ex);
                reject(ex);
            }
        });
    });
}

export function getPreviousFinancialYear(year) {
    let splitYearArray = year.split('-');
    splitYearArray[0] = Number.parseInt(splitYearArray[0]) - 1;
    splitYearArray[1] = Number.parseInt(splitYearArray[1]) - 1;
    return splitYearArray.join('-');
}

export function getNextFinancialYear(year) {
    let splitYearArray = year.split('-');
    splitYearArray[0] = Number.parseInt(splitYearArray[0]) + 1;
    splitYearArray[1] = Number.parseInt(splitYearArray[1]) + 1;
    return splitYearArray.join('-');
}

export function getFinancialYearFromDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // Adding 1 because getMonth() returns zero-based month (0-11)

    let financialYear;
    if (month >= 4) {
        // If the month is April or later, it falls into the next financial year
        financialYear = `${year}-${(year + 1).toString().slice(-2)}`;
    } else {
        // If the month is before April, it falls into the current financial year
        financialYear = `${year - 1}-${year.toString().slice(-2)}`;
    }

    return financialYear;
}