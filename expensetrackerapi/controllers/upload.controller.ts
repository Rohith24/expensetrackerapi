import { transaction } from "../modules/transactions";
import { user } from "../modules/users";
import { organization } from "../modules/organization";
import logger = require('./logger');
const multer = require('multer');
const fs = require('fs');
import path = require('path');
const os = require("os");
const xlsx = require('xlsx');

import express = require('express');
import { admin } from "../modules/admin";
var router = express.Router();
export = router;

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    // reject a file
    let allowedTypes = [
        ".xlsx",
        ".csv",
        ".xls"
    ]
    let extname = path.extname(file.originalname)
    if (allowedTypes.indexOf(extname) != -1) {
        cb(null, true);
    } else {
        let errorMsg = "Please upload xlsx file.";
        cb(new Error(errorMsg), false);
    }
};

const uploadMulter = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 15  //50MB
    },
    fileFilter: fileFilter
});

function uploadFile(request, response, next) {
    try {
        var upload = uploadMulter.single('Attachment');
        upload(request, response, function (err) {
            if (err) {
                console.log("Err:" + err.toString());
                let error = err.toString();
                let semiColonIndex = error.indexOf(":");
                if (semiColonIndex != -1) {
                    error = error.substring(semiColonIndex + 2, error.length);
                }
                response.send({ code: "-1", message: error });
            } else {
                next();
            }
        })
    } catch (err) {
        console.log("Err:" + err.toString());
        response.send({ code: "-1", message: err.toString() });
    }
}

/**
 *   upload service
 *   POST method
 */
router.post("/:dataType", uploadFile, async (req: express.Request, response: express.Response) => {
    //logger.info(req, "request body", "upload", req, "request", '5', '');

    try {
        let dataType = req.params.dataType;
        let reqQuery: any = req.query;
        let result;
        if (req.file) {
            console.log(os.type());
            const workbook = xlsx.readFile(req.file.path);
            const sheet_name_list = workbook.SheetNames;
            const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]], { header: 1 });
            const headers = jsonData[0].filter(header => header.trim() !== '');

            const data = jsonData.slice(1).map(row => {
                const rowData = {};
                headers.forEach((header, index) => {
                    rowData[header] = row[index];
                });
                return rowData;
            });
            if (dataType == 'transactions') {
                if (String.isNullOrWhiteSpace(reqQuery.financialYear)) {
                    return response.send({ code: "-1", message: "Financial Year is empty" });
                }
                let transactionModel = new transaction.transactions(req);
                result = await transactionModel.insertSBICollectData(data, reqQuery.financialYear);
            } else if (dataType == 'students') {
                if (String.isNullOrWhiteSpace(reqQuery.organizationName)) {
                    return response.send({ code: "-1", message: "organization Name is empty" });
                }
                if (String.isNullOrWhiteSpace(reqQuery.financialYear)) {
                    return response.send({ code: "-1", message: "Financial Year is empty" });
                }
                var userModel = new admin.user(req);
                let permission = await userModel.getPermission(reqQuery.organizationName);
                if (permission < 8)
                    return response.send({ code: "-1", message: "You don't have permission to upload" });

                let studentModel = new user.students(req);
                result = await studentModel.insertStudentData(data, reqQuery.organizationName, reqQuery.financialYear);
            } else if (dataType == 'organizations') {
                if (!req.currentUser.isSuperAdmin)
                    return response.send({ code: "-1", message: "You don't have permission to upload" });
                let branches = {};
                let i = 1;
                var sheets = sheet_name_list.slice(1);
                for (let sheet in sheets) {
                    branches[sheets[sheet]] = xlsx.utils.sheet_to_json(workbook.Sheets[sheets[sheet]]);
                }
                let organizationModel = new organization.organization(req);
                result = await organizationModel.insertorganizationData(data, branches);
            }
        } else {
            result = { code: "-1", message: `Error while uploading to ${dataType}` };
        }

        if (result.code == "-1") {
            if (result.error != undefined) {
                result.message = result.message + "; " + result.error;
            }
            logger.error(req, `Error while executing ${dataType} upload error : ` + result.message, `Upload/${dataType}`, '', "catch", '1', req.body, result.message);
        }
        if (fs.existsSync(req.file.path)) {
            fs.unlink(req.file.path, (err) => {
                if (err) {
                    console.log(err);
                }
                console.log('deleted');
            })
        }
        //logger.info(req, "Response", `Upload/${dataType}`, result.objectCode, "response", '5', result.data);
        return response.send(result);

    } catch (ex) {
        if (fs.existsSync(req.file.path)) {
            fs.unlink(req.file.path, (err) => {
                if (err) {
                    console.log(err);
                }
                console.log('deleted');
            })
        }
        logger.error(req, `Error while executing ${req.params.dataType} upload error : ` + ex.toString(), "upload", '', "catch", '1', req.body, ex);
        console.log(ex);
        return response.json({
            "code": "-1", "message": `Error while ${req.params.dataType} upload. ` + ex
        });
    }
});