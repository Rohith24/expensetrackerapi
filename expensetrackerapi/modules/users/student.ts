import express = require('express');
import coreModule = require('../coreModule');
import logger = require('../../controllers/logger');
import mongoose = require('mongoose');
import { organization } from "../organization";
import { audit } from "../audit";
import { capitalize } from '../../lib/utilities';
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
}
