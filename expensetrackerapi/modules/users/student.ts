import express = require('express');
import coreModule = require('../coreModule');
import logger = require('../../controllers/logger');
import mongoose = require('mongoose');
import { organization } from "../organization";
import { audit } from "../audit";
import { getPreviousFinancialYear, getNextFinancialYear, getFinancialYearFromDate } from '../../lib/utilities';
import { admin } from '../admin';
const uuid = require('uuid');
const moment = require('moment');

var SchemaTypes = mongoose.Schema.Types;
var Schema = mongoose.Schema;


// create a studentsschema
var studentsSchema = new Schema({
    "_id": { type: String },
    "name": { type: String, required: true },
    "dob": { type: Date },
    "gender": { type: String },
    "rollno": { type: String },
    "fatherName": { type: String },
    "mobileNumber": { type: String },
    "category": { type: String },
    "joiningYear": { type: Number, required: true },
    "outgoingYear": { type: Number },
    "course": { type: String, required: true },
    "typeOfAdmission": { type: String, required: true },
    "currentYear": { type: Number },
    "organizationCode": { type: String, required: true },
    "educationalYear": {},
    "yearWiseFees": {},
    "financialYearWiseFeesPaid": {},
    "totalFeesPaid": {},
    "createdBy": { type: String, required: true },
    "dateCreated": { type: Date },
    "lastModifiedBy": { type: String, required: true },
    "lastModifiedDate": { type: Date },
    "deleteMark": { type: Number, required: true, default: 0 },//0 = available 1= deleted
    "isActive": { type: Number, required: true, default: 1 },//1=Active , 0= inActive
    "changeCount": { type: Number, required: true, default: 0 },
    "tenantCode": { type: String, required: true },
    "history": [{
        "historyId": { type: String },
        "user": { type: String },
        "comments": { type: String },
        "dateCreated": { type: Date },
    }],
    "acl": [
        {
            "type": { type: String, maxlength: 50 },
            "code": { type: String, maxlength: 50 },
            "securityCode": { type: Number },
            "statusInd": { type: Number, default: 100 },
            "objectType": { type: String, maxlength: 50 },
            "_id": false
        }
    ]
}, { timestamps: { createdAt: 'dateCreated', updatedAt: 'lastModifiedDate' }, strict: true });

var studentModel = mongoose.model('student', studentsSchema);

export class studentFactory extends coreModule {

    private collectionName: string;
    constructor(request: express.Request) {
        super(request);
        this.collectionName = "student";
    }

    public getSchema = async () => {

        var model = await this.dal.model('student');

        return model.getSchema();
    }

    public getModelName = async () => {

        var model = await this.dal.model('student');

        return model.getModelName();
    }

    /**
    * DAL Call get from mongodb
    * @query mongodb query to get the student's
    * @options mongodb projections (optional)
    * return array of students
    */
    public find = async (query: any, optional?: any) => {
        query = query || {};
        try {
            var model = await this.dal.model('student');

            var ret = await model.find(query, optional);
        } catch (err) {
            logger.error(this.request, "Error while executing get : " + err.toString(), 'student', "", "catch", '1', query, err);
            console.log(err);
        }
        return ret;
    }

    /**
      * get student from database
      * @param studentId  student ID
      * return student from database
      */
    public findById = async (studentId) => {
        try {
            let model = await this.dal.model('student');
            let obj = await model.findById("" + studentId);
            return obj;
        } catch (ex) {
            logger.error(this.request, "Error while executing findById : " + ex.toString(), 'student', "", "catch", '1', studentId, ex);
        }
    }

    /**
    * DAL Call findByCode from mongodb based on objectCode
    * @objectCode objectCode
    * return student object.
    */
    public findByCode = async (objectCode: string) => {
        try {
            var model = await this.dal.model("student");
            var ret = await model.findByCode(objectCode);
        } catch (err) {
            logger.error(this.request, "Error while executing findByCode : " + err.toString(), 'student', "", "catch", '1', objectCode, err);

            console.log(err);
        }
        return ret;
    }

    /**
      * get student from database
      * @param query query to get data from database
      * @param projection optional fields to return
      * return student from database
      */
    public findOne = async (query: any, projection?: any) => {
        try {
            query = query || {};
            projection = projection || {};
            var model = await this.dal.model('student');
            let ret = await model.findOne(query, projection);
            return ret;
        } catch (ex) {
            logger.error(this.request, "Error while executing findOne : " + ex.toString(), 'student', "", "catch", '1', query, ex);
        }
    }

    /**
    * saving student into mongodb
    * @studentObject  student
    * return  saved student
    */
    public _create = async (studentObject: any) => {
        try {
            var model = await this.dal.model('student');
            if (studentObject) {
                //var _id = await this.dal.getNextSequence('student');
                //studentObject._id = uuid.v4();
                var resData = await model.create([studentObject]);

                // logger.info(this.request, "student saving into mongodb and redis cache.", 'student', studentObject._id, "save", "5");
                return resData[0] || {};
            }
        } catch (err) {
            console.log(err);

            //logger.error(this.request, "Error while Create student in student Module" + err.toString(), 'student', "studentObject", "error", "1", studentObject,err);
            throw err;
        }
    }

    /**
    * updating student into mongodb
    * @param  studentObject
    * return  updated student
    */
    public _update = async (studentObject: any) => {
        try {
            var model = await this.dal.model('student');
            if (studentObject) {
                studentObject.lastModifiedDate = new Date().toISOString();
                var resData = await model.findByIdAndUpdate(studentObject);
                // logger.info(this.request, "student Updating into mongodb and redis cache.", 'student', studentObject._id, "save", "5");
                return resData;
            }
        } catch (err) {
            console.log(err);

            //logger.error(this.request, "Error while Updating student in student Module " + err.toString(), 'student', "studentObject", "error", "1", studentObject,err);
            throw err;
        }
    }

    /**
      * This save method will create or update the student based on input json.
      * @param studentObj - student
      * @returns return created or updated student
      */
    public save = async (studentObj: any) => {
        try {
            var studentExists = await this.findById(studentObj._id);
            let result, changeCount = studentObj.changeCount;

            if (changeCount == 0 || changeCount == null || changeCount == undefined) {
                if (!studentExists) {
                    try {
                        //Check whether user has permission to save
                        studentObj.changeCount = 1;
                        var studentData = await this._create(studentObj);
                        result = { code: "0", message: "Student Created", Student: studentData };
                    } catch (ex) {
                        result = { code: "-1", message: "Error while saving Student", "error": ex };
                    }
                } else if (studentExists.deleteMark != 0) {
                    result = { code: "-1", message: "object has been already used and logically deleted", Student: studentExists };
                } else if (studentExists.isActive != 1) {
                    result = { code: "-1", message: "code already exists and is inactive", Student: studentExists };
                } else {
                    result = { code: "-1", message: "object already exists with the given code", Student: studentExists };
                }
            } else {
                if (!studentExists) {
                    result = { code: "-1", message: "code could not be found" };
                } else if (studentExists.deleteMark != 0) {
                    result = { code: "-1", message: "object has been already used and logically deleted", Student: studentExists };
                } else if (studentExists.isActive != 1) {
                    result = { code: "-1", message: "object already exists with the given code", Student: studentExists };
                } else {
                    if (studentExists.changeCount == changeCount) {
                        try {
                            //Check whether user has permission to update
                            //studentExists = await this.ACLPrecedence(studentExists, true);
                            //if (studentExists.securityCode == null || studentExists.securityCode < 7) {
                            //    return { code: "-1", message: "You don't have access to perform this action." };
                            //}
                            //delete studentExists.securityCode;
                            //delete studentExists.precedenceAcl;

                            studentObj.changeCount = studentObj.changeCount + 1;
                            studentObj._id = studentExists._id;
                            studentObj.createdBy = studentObj.createdBy || studentExists.createdBy;

                            let auditModel = new audit.audits(this.request);
                            let auditData = JSON.parse(JSON.stringify(studentObj));
                            auditData.studentId = studentObj._id;
                            delete auditData._id;
                            delete auditData.dateCreated;
                            delete auditData.lastModifiedDate;
                            delete auditData.deleteMark;
                            delete auditData.isActive;
                            delete auditData.changeCount;
                            delete auditData.history;
                            auditData.createdBy = this.request.currentUser?.userCode || "crradmin";
                            auditData.lastModifiedBy = this.request.currentUser?.userCode || "crradmin";

                            let auditResponse = await auditModel.save(auditData);
                            if (auditResponse.code == "0") {
                                if (!studentExists.history) studentExists.history = [];
                                studentExists.history.push({ "historyId": auditResponse.Audit._id, "user": this.request.currentUser?.userCode || "crradmin", "comments": studentObj.auditComments, "dateCreated": new Date().toISOString() });
                                studentObj.history = studentExists.history; 
                                let studentData = await this._update(studentObj);
                                result = { code: "0", message: "Student updated", Student: studentData };
                            } else {
                                console.log("Error while executing saving Audit. Error: " + JSON.stringify(auditResponse));
                                result = { code: "-1", message: "Error while updating student." };
                            }
                        } catch (ex) {
                            result = { code: "-1", message: "Error while updating student", "error": ex };
                        }
                    } else {
                        result = { code: "-1", message: "A concurrency issues occurred while updating student", Student: studentExists };
                    }

                }
            }
            return result;
        } catch (ex) {
            console.log(ex);
            logger.error(this.request, "Error while executing saving Student error : " + ex.toString(), "student", "/save/", "catch", '1', studentObj, ex);
            return { code: "-1", message: "Error while saving Student." };
        }
    }

    /**
    * remove student into mongodb
    * @param  objectCode object
    * return  updated student
    */
    public remove = async (objectCode: any) => {
        try {
            var model = await this.dal.model('student');

            if (objectCode != null && objectCode != undefined) {
                var retObj = null;
                var query = {
                    objectCode: objectCode
                };
                retObj = await model.find(query, {});
                if (retObj != null && retObj != undefined && retObj[0]) {
                    var userModel = new admin.user(this.request);
                    retObj = await userModel.getAllowedObjects(retObj);
                    if (retObj.length == 0 || retObj[0].securityCode < 8) {
                        return { code: "-1", message: `You don't have permission to remove student.` };
                    }
                    retObj = retObj[0];

                    /*if (retObj.deleteMark && retObj.changeCount != changeCount) { 
                        return { code: "-1", message: "Concurrency issue occured in student.", student: retObj };
                    } */
                    if (retObj.deleteMark && retObj.deleteMark == 1) {
                        return { code: "-1", message: "student has been already deleted." };
                    }
                    if (retObj.isActive && retObj.isActive == 0) {
                        return { code: "-1", message: "student already exists and is inactive." };
                    }


                    retObj.isActive = 0;
                    retObj.deleteMark = 1;
                    if (retObj.changeCount) {
                        retObj.changeCount = retObj.changeCount + 1;
                    } else {
                        retObj.changeCount = 1;
                    }
                    retObj.tenantCode = this.request.tenant.code;
                    var resData = await model.findByIdAndUpdate(retObj);

                    return { code: "0", message: "student deleted successfully", student: resData };

                } else {
                    return { code: "-1", message: "student with given id does not exist." };
                }
            } else {
                return { code: "-1", message: "student with given id does not exist." };
            }
        } catch (err) {
            console.log(err);
            logger.error(this.request, "Error While Removing student " + err.toString(), 'student', "studentObject", "error", "1", objectCode, err);
            return { code: "-1", message: "Catch error:" + err.toString() };
        }
    }

    /**
      * get student from database
      * @param query query to get data from database
      * @param skip skip
      * @param limit limit
      * @param sort sort
      * @param projection optional fields to return
      * return student from database
      */
    public paginate = async (query: any, skip: number, limit: number, sort: any, projection?: any) => {
        try {
            query = query || {};
            projection = projection || {};
            let model = await this.dal.model('student');
            let ret = await model.paginate(query, skip, limit, sort, projection);
            return ret;
        } catch (ex) {
            logger.error(this.request, "Error while executing paginate : " + ex.toString(), 'student', query, "catch", '1', query, ex);
        }
    }

    /**
      * get student count from database
      * @param query  query
      * return student count from database
      */
    public count = async (query) => {
        try {
            let model = await this.dal.model('student');
            let studentCount = await model.count(query);
            return studentCount;
        } catch (ex) {
            logger.error(this.request, "Error while executing count : " + ex.toString(), 'student', query, "catch", '1', query, ex);
        }
    }

    //dal Call to insert student Objects
    public insertMany = async (studentObjects: any) => {
        var model = await this.dal.model('student');
        var resData = await model.insertMany(studentObjects);
        return await resData;
    }

    private validateInputData = async (studentsData, organizationObj) => {
        if (!organizationObj) {
            throw 'Organization is not found. Please contact Administrator.';
        }
        var headers = Object.keys(studentsData[0] || {});
        var listOfHeaders = ["Unique ID", "Roll No", "Name of the Student", "Father Name", "Phone Number", "Date of Birth", "Gender", "Type of Admission (Conv/Spot/Mgt)", "Joining Year", "Branch", "Course", "Out going Year", "Year of Study", "Earlier Dues"];
        var allPresent = listOfHeaders.every(function (str) {
            return headers.includes(str);
        });
        if (!allPresent)
            throw `Please check the headers are present or not. \nThe list of required headers are: \n${listOfHeaders.join(', ')}\nThe headers found in excel are: \n${headers.join(', ')}\n\nIf the Data is not available for these headers please add empty headers in Excel. Headers are case sensitive`;
    }

    public insertStudentData = async (studentData, organizationCode, financialYear) => {
        let msg = "";
        try {
            let organizationModel = new organization.organization(this.request);
            let organizationObj = await organizationModel.findOne({ "organizationCode": organizationCode });
            await this.validateInputData(studentData, organizationObj);
            let previousFinancialYear = getPreviousFinancialYear(financialYear);
            let updatedData = [];
            var insertedCount = 0;
            var updatedCount = 0;
            for (let studentObj of studentData || []) {
                let currentMessage = ""
                let id = studentObj['Unique ID'];
                if (!id) continue;
                if (!id.includes(organizationCode)) throw 'The Student id ' + id + ' not matching with college ID. Please upload correct data';
                let branch_course = studentObj['Branch'];
                if (studentObj['Course'])
                    branch_course = `${branch_course}_${studentObj['Course']}`;
                if (!organizationObj.branches[branch_course]) throw 'The Student ' + id + ' branch not found in organization. Please upload correct data';
                if (financialYear.slice(0, 4) < studentObj["joiningYear"]) {
                    throw `Invalid financial year and joining year for the student id '${id}'`;
                }
                let studentExists = await this.findById(id);
                let obj: any = {};
                if (!studentExists) {
                    obj["_id"] = id;
                    obj["name"] = studentObj['Name of the Student'];
                    obj["fatherName"] = studentObj['Father Name'];
                    obj["category"] = studentObj['Category'];
                    obj["course"] = branch_course;
                    obj["mobileNumber"] = studentObj['Phone Number'];
                    obj["gender"] = studentObj['Gender'];
                    if (studentObj['Date of Birth']) {
                        try {
                            var dateString = studentObj['Date of Birth'];// "01012023";
                            var year = dateString.substr(4, 4);
                            var month = dateString.substr(2, 2) - 1; // Month is zero-based in JavaScript Date
                            var day = dateString.substr(0, 2);
                            var date = new Date(year, month, day);
                            obj["dob"] = date;
                        }
                        catch (Ex) {
                            obj["dob"] = new Date((studentObj['Date of Birth'] - (25567 + 2)) * 86400 * 1000);
                        }
                    }
                    obj["typeOfAdmission"] = studentObj['Type of Admission (Conv/Spot/Mgt)'];
                    obj["joiningYear"] = studentObj['Joining Year'];
                    if (studentObj['Out going Year']) {
                        obj["currentYear"] = -1;
                        obj["outgoingYear"] = studentObj['Out going Year'];
                    } else
                        obj["currentYear"] = studentObj['Year of Study'];
                    obj["rollno"] = studentObj['Roll No'];
                    obj["organizationCode"] = organizationCode;
                    obj["createdBy"] = this.request?.currentUser?.userCode || "crradmin";
                    obj["lastModifiedBy"] = this.request?.currentUser?.userCode || "crradmin";
                    obj["tenantCode"] = "Fees";
                    obj["yearWiseFeesPaid"] = {};
                    obj["totalFeesPaid"] = {};
                    let yearWiseFees = {
                        [financialYear]: {}
                    };
                    for (let feeType in organizationObj.feesTypes || {}) {
                        let obj = organizationObj.feesTypes[feeType];
                        yearWiseFees[financialYear][feeType] = studentObj[obj.excelColumnName] || 0;
                    }
                    obj["yearWiseFees"] = yearWiseFees;
                    let dues = studentObj['Earlier Dues'];
                    if (dues > 0) {
                        if (obj.yearWiseFees[previousFinancialYear] && obj.yearWiseFees[previousFinancialYear][organizationObj.defaultDueFeeType] && obj.yearWiseFees[previousFinancialYear][organizationObj.defaultDueFeeType] > 0)
                            currentMessage += `Dues are already present.`;
                        else
                            obj[`yearWiseFees.${previousFinancialYear}.${organizationObj.defaultDueFeeType}`] = dues;
                    }
                    obj.changeCount = 1;
                    let studentData = await this._create(obj);
                    insertedCount++;
                }
                else {
                    obj = studentExists;
                    if (studentObj['Out going Year']) {
                        obj["currentYear"] = -1;
                        obj["outgoingYear"] = studentObj['Out going Year'];
                    } else {
                        if (studentObj['Year of Study'] < obj["currentYear"])
                            currentMessage += `Year of Study can not be a previous Year`;
                        else
                            obj["currentYear"] = studentObj['Year of Study'];
                    }
                    if (studentObj['Date of Birth']) {
                        try {
                            var dateString = studentObj['Date of Birth'];// "01012023";
                            var year = dateString.substr(4, 4);
                            var month = dateString.substr(2, 2) - 1; // Month is zero-based in JavaScript Date
                            var day = dateString.substr(0, 2);
                            var date = new Date(year, month, day);
                            obj["dob"] = date;
                        }
                        catch (Ex) {
                            obj["dob"] = new Date((studentObj['Date of Birth'] - (25567 + 2)) * 86400 * 1000);
                        }
                    }
                    obj["name"] = studentObj['Name of the Student'];
                    obj["fatherName"] = studentObj['Father Name'];
                    obj["category"] = studentObj['Category'];
                    obj["course"] = branch_course;
                    obj["rollno"] = studentObj['Roll No'];
                    obj["mobileNumber"] = studentObj['Phone Number'];
                    obj["lastModifiedBy"] = this.request?.currentUser?.userCode || "crradmin";
                    let yearWiseFees = obj.yearWiseFees;
                    if (!yearWiseFees[financialYear]) {
                        let dues = studentObj['Earlier Dues'];
                        yearWiseFees[financialYear] = {};
                        for (let feeType in organizationObj.feesTypes || {}) {
                            let obj = organizationObj.feesTypes[feeType];
                            yearWiseFees[financialYear][feeType] = studentObj[obj.excelColumnName] || 0;
                        }
                        obj["yearWiseFees"] = yearWiseFees;
                        if (dues > 0) {
                            if (obj.yearWiseFees[previousFinancialYear][organizationObj.defaultDueFeeType] && obj.yearWiseFees[previousFinancialYear][organizationObj.defaultDueFeeType] > 0)
                                currentMessage += `Dues are already present.`;
                            else
                                obj[`yearWiseFees.${previousFinancialYear}.${organizationObj.defaultDueFeeType}`] = dues;
                        }
                    } else {
                        currentMessage += `Fee strcture already there for financialYear ${financialYear}. So updated only other details (Mobile Number and Current Year). Fee structure can not be changed.`;
                    }
                    obj.changeCount = obj.changeCount + 1;
                    let studentData = await this._update(obj);
                    updatedCount++;
                }
                if (currentMessage) {
                    msg += `\n${id}: \n` + currentMessage + "\n";
                }
            }
            console.log(msg);
            let message = "";
            if (insertedCount > 0)
                message += `Students - ${insertedCount} Inserted successfully.\n`;
            if (updatedCount > 0)
                message += `Students - ${updatedCount} Updated successfully.\n`;
            message += msg;
            if (message)
                return { code: '0', message: message };
            else
                return { code: '-1', message: 'Invalid data given. Please upload correct data' };
        } catch (ex) {
            console.log('error in insertStudentData: ' + ex.toString() + '\nMessage:' + msg);
            return { code: '-1', message: 'Error while inserting student. Details: ' + ex.toString() };
        }
    }

    public updateFeesOfStudent = async (studentObj, organizationObj, currentFinancialYear, amount) => {
        if (amount == 0) return;
        if (!organizationObj.sortedFeeTypes)
            this.sortOrganizationFeeTypes(organizationObj);
        try {
            const sortedKeys = Object.keys(studentObj.yearWiseFees).sort();
            const sortedFeesOnFinancialYear = {};
            sortedKeys.forEach(key => {
                sortedFeesOnFinancialYear[key] = studentObj.yearWiseFees[key];
            });
            let amountPaidInCurrentTransactions = amount;
            if (amountPaidInCurrentTransactions > 0) {
                for (let financialYear in sortedFeesOnFinancialYear) {
                    if (financialYear <= currentFinancialYear) {
                        for (let feeType in organizationObj.sortedFeeTypes || {}) {
                            studentObj["yearWiseFeesPaid"] = studentObj["yearWiseFeesPaid"] || {};
                            studentObj["yearWiseFeesPaid"][financialYear] = studentObj["yearWiseFeesPaid"][financialYear] || {};
                            studentObj["financialYearWiseFeesPaid"] = studentObj["financialYearWiseFeesPaid"] || {};
                            studentObj["financialYearWiseFeesPaid"][currentFinancialYear] = studentObj["financialYearWiseFeesPaid"][currentFinancialYear] || {};
                            if ((studentObj["yearWiseFeesPaid"][financialYear][feeType] || 0) < (studentObj["yearWiseFees"][financialYear][feeType] || 0) && amountPaidInCurrentTransactions > 0) {
                                let diffAmount = (studentObj["yearWiseFees"][financialYear][feeType] || 0) - (studentObj["yearWiseFeesPaid"][financialYear][feeType] || 0);
                                if (diffAmount <= amountPaidInCurrentTransactions) {
                                    studentObj["financialYearWiseFeesPaid"][currentFinancialYear][feeType] = (studentObj["financialYearWiseFeesPaid"][currentFinancialYear][feeType] || 0) + diffAmount;
                                    amountPaidInCurrentTransactions = amountPaidInCurrentTransactions - diffAmount;
                                } else {
                                    studentObj["financialYearWiseFeesPaid"][currentFinancialYear][feeType] = (studentObj["financialYearWiseFeesPaid"][currentFinancialYear][feeType] || 0) + amountPaidInCurrentTransactions;
                                    amountPaidInCurrentTransactions = 0;
                                }
                                //previousYearDues[feeType] = (previousYearDues[feeType] || 0) + ((studentObj["yearWiseFees"][financialYear][feeType] || 0) - (studentObj["yearWiseFeesPaid"][financialYear][feeType] || 0));
                            }
                        }
                    }
                }
                if (amountPaidInCurrentTransactions > 0) {
                    studentObj["financialYearWiseFeesPaid"][currentFinancialYear][organizationObj.defaultDueFeeType] = (studentObj["financialYearWiseFeesPaid"][currentFinancialYear][organizationObj.defaultDueFeeType] || 0) + amountPaidInCurrentTransactions;
                }
            }
            if (amount) {
                for (let financialYear in sortedFeesOnFinancialYear) {
                    if (financialYear <= currentFinancialYear && amount > 0) {
                        for (let feeType in organizationObj.sortedFeeTypes || {}) {
                            studentObj["yearWiseFeesPaid"] = studentObj["yearWiseFeesPaid"] || {};
                            studentObj["yearWiseFeesPaid"][financialYear] = studentObj["yearWiseFeesPaid"][financialYear] || {};
                            if (amount > 0 && (studentObj["yearWiseFeesPaid"][financialYear][feeType] || 0) < studentObj["yearWiseFees"][financialYear][feeType]) {
                                studentObj["yearWiseFeesPaid"][financialYear][feeType] = (studentObj["yearWiseFeesPaid"][financialYear][feeType] || 0) + amount;
                                amount = 0;
                                if ((studentObj["yearWiseFeesPaid"][financialYear][feeType] || 0) > studentObj["yearWiseFees"][financialYear][feeType]) {
                                    amount = studentObj["yearWiseFeesPaid"][financialYear][feeType] - studentObj["yearWiseFees"][financialYear][feeType];
                                    studentObj["yearWiseFeesPaid"][financialYear][feeType] -= amount;
                                } else {
                                    break;
                                }
                            } else if (amount == 0) {
                                break;
                            }
                        }
                    }
                }
            }
        } catch (ex) {
            console.log('error in update studentFees BasedOnTransactions: ' + ex.toString());
        }
    }

    public updateFeesBasedOnTransactions = async (transactionData, currentFinancialYear) => {
        try {
            let studentsData = await this.listOfUniqueStudentsFromTransactions(transactionData);

            let studentTransactions = this.combineTransactionsOfSameStudent(transactionData, studentsData);

            //let organizationsList = await this.sortOrganizationsBasedOnFeeTypes();
            for (let studentObj of studentsData || []) {
                //let organizationObj = organizationsList.filter((orgObj) => orgObj.organizationCode == studentObj.organizationCode)[0] || {};
                //await this.updateFeesOfStudent(studentObj, organizationObj, currentFinancialYear, studentTransactions[studentObj._id].amount, studentTransactions[studentObj._id].amount);
                studentObj.changeCount += 1;
                let res = await this._update(studentObj);
            }
        } catch (ex) {
            console.log('error in updateFeesBasedOnTransactions: ' + ex.toString());
            return { code: '-1', message: 'error in updateFeesBasedOnTransactions: ' + ex.toString() };
        }
    }

    private listOfUniqueStudentsFromTransactions = async (transactionData) => {
        try {
            let studentIds = [];
            for (let transaction of transactionData) {
                if (!studentIds.contains(transaction.studentId)) {
                    studentIds.push(transaction.studentId);
                }
            }
            let query = { _id: { $in: studentIds } };
            let studentsData = await this.find(query);
            return studentsData;
        } catch (ex) {
            console.log('error in listOfUniqueStudentsFromTransactions: ' + ex.toString());
            throw ex;
        }
    }

    private combineTransactionsOfSameStudent = (transactionData, studentsData) => {
        try {
            let studentTransactions = (transactionData || []).reduce((students, item) => {
                const studentId = item.studentId;
                let studentObj = studentsData.filter((studentObj) => studentObj._id == studentId)[0] || {};
                let educationalYear = getFinancialYearFromDate(item.transactionDate);
                if (!studentObj.totalFeesPaid) {
                    studentObj.totalFeesPaid = {}
                }
                if (studentObj.totalFeesPaid[educationalYear] == undefined) {
                    studentObj.totalFeesPaid[educationalYear] = 0;
                }
                studentObj.totalFeesPaid[educationalYear] += item.amount;
                if (!students[studentId]) {
                    students[studentId] = {
                        "organizationCode": item.organizationCode,
                        "earlierDues": 0,
                        "amount": 0,
                        "yearPaid": [educationalYear]
                    };
                    for (let feeName in item.feesPaid || {}) {
                        students[studentId][feeName] = 0;
                    }
                }
                if (!students[studentId].yearPaid.contains(educationalYear)) {
                    students[studentId].yearPaid.push(educationalYear);
                }
                for (let feeName in item.feesPaid || {}) {
                    students[studentId][feeName] += item.feesPaid[feeName] || 0;
                }
                students[studentId].earlierDues += item.earlierDues;
                students[studentId].amount += item.amount;
                return students;
            }, {});
            return studentTransactions;
        } catch (ex) {
            console.log('error in combineTransactionsOfSameStudent: ' + ex.toString());
            throw ex;
        }
    }

    private sortOrganizationsBasedOnFeeTypes = async () => {
        try {
            let organizationModel = new organization.organization(this.request);
            let organizationsList = await organizationModel.find({});
            for (let organizationObj of organizationsList) {
                this.sortOrganizationFeeTypes(organizationObj);
            }
            return organizationsList;
        } catch (ex) {
            console.log('error in sortOrganizationsBasedOnFeeTypes: ' + ex.toString());
            throw ex;
        }
    }

    private sortOrganizationFeeTypes = (organizationObj) => {
        try {
            let sortedFeeTypes = {};
            Object.keys(organizationObj.feesTypes).sort(function (a, b) {
                return organizationObj.feesTypes[a].order - organizationObj.feesTypes[b].order;
            }).forEach(function (key) {
                sortedFeeTypes[key] = organizationObj.feesTypes[key];
            });
            organizationObj["sortedFeeTypes"] = sortedFeeTypes;
        } catch (ex) {
            console.log('error in sortOrganizationFeeTypes: ' + ex.toString());
            throw ex;
        }
    }

    public calculatePendingFees = async (studentData, currentFinancialYear) => {
        try {
            let organizationsList = await this.sortOrganizationsBasedOnFeeTypes();
            for (let studentObj of studentData || []) {
                delete studentObj.history;
                let organizationObj = organizationsList.filter((orgObj) => orgObj.organizationCode == studentObj.organizationCode)[0] || {};
                await this.calculateStudentPendingFees(studentObj, organizationObj, currentFinancialYear);
            }
        } catch (ex) {
            console.log('error in calculatePendingFees: ' + ex.toString());
            throw ex;
        }
    }

    private getFinancialYearsFromTo = (studentObj) => {
        let combinedYears = [studentObj.yearWiseFees, studentObj.totalFeesPaid];
        const maxFinancialYear = combinedYears.reduce((maxYear, currentObject) => {
            if (currentObject) {
                const currentYear = Object.keys(currentObject).reduce((maxKey, currentKey) => {
                    if (currentKey > maxKey) {
                        return currentKey;
                    }
                    return maxKey;
                }, "");
                if (currentYear > maxYear) {
                    return currentYear;
                }
            }
            return maxYear;
        }, "");
        var year = parseInt(maxFinancialYear.slice(0, 4));
        const financialYears = [];
        let currentYear;
        if (studentObj.currentYear < 0) {
            currentYear = combinedYears.reduce((minYear, currentObject) => {
                if (currentObject) {
                    const currentYear = Object.keys(currentObject).reduce((minKey, currentKey) => {
                        if (currentKey <= minKey) {
                            return currentKey;
                        }
                        return minKey;
                    }, "");
                    if (currentYear <= minYear) {
                        return currentYear;
                    }
                }
                return minYear;
            }, "");
        }
        for (let i = 0; (i < studentObj.currentYear) || (currentYear < year); i++) {
            currentYear = studentObj.joiningYear + i;
            const financialYear = `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
            financialYears.push(financialYear);
        }

        studentObj.educationalYear = financialYears;
    }

    public calculateStudentPendingFees = async (studentObj, organizationObj, currentFinancialYear) => {
        try {
            this.getFinancialYearsFromTo(studentObj);
            if (!currentFinancialYear)
                currentFinancialYear = Object.values(studentObj.educationalYear).reduce((maxYear, currentYear) => currentYear > maxYear ? currentYear : maxYear);
            if (!organizationObj.sortedFeeTypes)
                this.sortOrganizationFeeTypes(organizationObj);
            for (let finYear of studentObj.educationalYear) {
                if (studentObj.totalFeesPaid)
                    await this.updateFeesOfStudent(studentObj, organizationObj, finYear, studentObj.totalFeesPaid[finYear] || 0);
            }
            studentObj.pendingFees = JSON.parse(JSON.stringify(studentObj.yearWiseFees));

            let paidFees = JSON.parse(JSON.stringify(studentObj.totalFeesPaid || {}));
            var financialYear = Object.keys(studentObj.pendingFees).reduce((minYear, currentYear) => currentYear < minYear ? currentYear : minYear);

            if (parseInt(financialYear.slice(0, 4)) > parseInt(currentFinancialYear.slice(0, 4))) {
                return studentObj;
            }
            let prevFinancialYear;
            while (!prevFinancialYear || (parseInt(prevFinancialYear.slice(0, 4)) < parseInt(currentFinancialYear.slice(0, 4)))) {
                for (let feeType in organizationObj.sortedFeeTypes || {}) {
                    let yearWiseFee = studentObj?.["yearWiseFees"]?.[financialYear]?.[feeType] || 0;
                    let paidFee = studentObj?.financialYearWiseFeesPaid?.[financialYear]?.[feeType] || 0;
                    let totalDue = prevFinancialYear ? studentObj.pendingFees[prevFinancialYear][feeType] + yearWiseFee : yearWiseFee;
                    if (!studentObj.pendingFees[financialYear]) {
                        studentObj.pendingFees[financialYear] = JSON.parse(JSON.stringify(studentObj.pendingFees[prevFinancialYear]));
                    }
                    studentObj.pendingFees[financialYear][feeType] = totalDue - paidFee;
                    if (paidFees[financialYear])
                        paidFees[financialYear] -= paidFee;
                }
                prevFinancialYear = financialYear;
                financialYear = getNextFinancialYear(prevFinancialYear);
            }
            studentObj.excessFees = paidFees;
        } catch (ex) {
            console.log('error in calculatePendingFees: ' + ex.toString());
            throw ex;
        }
        return studentObj;
    }
}
