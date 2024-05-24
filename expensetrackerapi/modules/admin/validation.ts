// grab the things we need
import express = require('express');
import logger = require('../../controllers/logger');
import util = require('../../lib/utilities');

/**
* Save Validations
* @requestBody requestBody
* return code => "0" (if validation success)  => -1 (if validation fails)
*/
export function SaveValidations(requestBody: any, type: any, canCheckBasicFields: boolean = true) {
    if (String.isNullOrWhiteSpace(requestBody.user)) {
        return { code: "-1", message: "user is empty" };
    } else if (requestBody[type] == null || requestBody[type] == undefined) {
        return { code: "-1", message: type + " json cannot be empty" };
    }

    if (canCheckBasicFields) {
        let res = userValidations(requestBody[type], type);
        if (res.code == "-1") {
            return res;
        }
    }

    return { code: "0", message: "Validation success" };
}

/**
* Save User
* @requestBody requestBody
* return code => "0" (if validation success)  => -1 (if validation fails)
*/
export function userSaveValidations(requestBody: any) {
    if (String.isNullOrWhiteSpace(requestBody.user)) {
        return { code: "-1", message: "user is empty" };
    } else if (requestBody.User == null || requestBody.User == undefined) {
        return { code: "-1", message: "User json cannot be empty" };
    }

    let res = userValidations(requestBody.User);
    if (res.code == "-1") {
        return res;
    }

    return { code: "0", message: "Validation success" };
}

/**
* Save User
* @requestBody requestBody
* return code => "0" (if validation success)  => -1 (if validation fails)
*/
export function studentSaveValidations(requestBody: any) {
    if (String.isNullOrWhiteSpace(requestBody.user)) {
        return { code: "-1", message: "user is empty" };
    } else if (requestBody.Student == null || requestBody.Student == undefined) {
        return { code: "-1", message: "Student json cannot be empty" };
    }
    return { code: "0", message: "Validation success" };
}


/**
* User Object Validation
* @userObject user Object
* @type type of Object
* return code => "0" (if validation success)  => -1 (if validation fails)
*/
export function userValidations(userObject: any, type: string = "student") {
    try {

        let userNotNullParameters = [];
        let userNotEmptyParameters = [];
        let userNumberedParameters = ["deleteMark", "changeCount", "isActive"];
        return util.validations(userObject, type, userNotNullParameters, userNotEmptyParameters, userNumberedParameters, true);
    } catch (ex) {
        return { code: "-1", message: "Error while exectuing validation in utilites:" + ex };
    }
}


export function groupSaveValidations(requestBody: any) {
    if (String.isNullOrWhiteSpace(requestBody.Group)) {
        return { code: "-1", message: "Group is empty" };
    } else if (String.isNullOrWhiteSpace(requestBody.saveMode)) {
        return { code: "-1", message: "Save mode is empty" };
    } else if (String.isNullOrWhiteSpace(requestBody.objectCode)) {
        return { code: "-1", message: "objectCode cannot be empty" };
    } else if (requestBody.Group == null || requestBody.Group == undefined) {
        return { code: "-1", message: "Group json cannot be empty" };
    }

    let res = groupValidations(requestBody.Group);
    if (res.code == "-1") {
        return res;
    }
    if (requestBody.Group.objectCode != requestBody.objectCode) {
        return { code: "-1", message: "objectCode must be same" };
    }

    return { code: "0", message: "Validation success" };
}

/**
* User Object Validation
* @userObject user Object
* return code => "0" (if validation success)  => -1 (if validation fails)
*/
function groupValidations(groupObject: any) {
    try {

        let userNotNullParameters = [];
        let userNotEmptyParameters = ["objectCode"];
        let userNumberedParameters = ["deleteMark", "changeCount", "isActive"];
        return util.validations(groupObject, "user", userNotNullParameters, userNotEmptyParameters, userNumberedParameters, true);
    } catch (ex) {
        return { code: "-1", message: "Error while exectuing validation in utilites:" + ex };
    }
}

export function roleSaveValidations(requestBody: any) {
    if (String.isNullOrWhiteSpace(requestBody.Role)) {
        return { code: "-1", message: "Role is empty" };
    } else if (String.isNullOrWhiteSpace(requestBody.saveMode)) {
        return { code: "-1", message: "Save mode is empty" };
    } else if (String.isNullOrWhiteSpace(requestBody.objectCode)) {
        return { code: "-1", message: "objectCode cannot be empty" };
    } else if (requestBody.Role == null || requestBody.Role == undefined) {
        return { code: "-1", message: "Role json cannot be empty" };
    }

    let res = roleValidations(requestBody.Role);
    if (res.code == "-1") {
        return res;
    }
    if (requestBody.Role.objectCode != requestBody.objectCode) {
        return { code: "-1", message: "objectCode must be same" };
    }

    return { code: "0", message: "Validation success" };
}

/**
* User Object Validation
* @userObject user Object
* return code => "0" (if validation success)  => -1 (if validation fails)
*/
function roleValidations(roleObject: any) {
    try {

        let userNotNullParameters = [];
        let userNotEmptyParameters = ["objectCode"];
        let userNumberedParameters = ["deleteMark", "changeCount", "isActive"];
        return util.validations(roleObject, "user", userNotNullParameters, userNotEmptyParameters, userNumberedParameters, true);
    } catch (ex) {
        return { code: "-1", message: "Error while exectuing validation in utilites:" + ex };
    }
}

export function pageSaveValidations(requestBody: any) {
    if (String.isNullOrWhiteSpace(requestBody.Page)) {
        return { code: "-1", message: "Page is empty" };
    } else if (String.isNullOrWhiteSpace(requestBody.saveMode)) {
        return { code: "-1", message: "Save mode is empty" };
    } else if (String.isNullOrWhiteSpace(requestBody.objectCode)) {
        return { code: "-1", message: "objectCode cannot be empty" };
    } else if (requestBody.Page == null || requestBody.Page == undefined) {
        return { code: "-1", message: "Page json cannot be empty" };
    }

    let res = pageValidations(requestBody.Page);
    if (res.code == "-1") {
        return res;
    }
    if (requestBody.Page.objectCode != requestBody.objectCode) {
        return { code: "-1", message: "objectCode must be same" };
    }

    return { code: "0", message: "Validation success" };
}

/**
* User Object Validation
* @userObject user Object
* return code => "0" (if validation success)  => -1 (if validation fails)
*/
function pageValidations(pageObject: any) {
    try {

        let pageNotNullParameters = [];
        let pageNotEmptyParameters = ["objectCode"];
        let pageNumberedParameters = ["deleteMark", "changeCount", "isActive"];
        return util.validations(pageObject, "user", pageNotNullParameters, pageNotEmptyParameters, pageNumberedParameters, true);
    } catch (ex) {
        return { code: "-1", message: "Error while exectuing validation in utilites:" + ex };
    }
}

export function pageGroupingSaveValidations(requestBody: any) {
    if (String.isNullOrWhiteSpace(requestBody.PageGrouping)) {
        return { code: "-1", message: "PageGrouping is empty" };
    } else if (String.isNullOrWhiteSpace(requestBody.saveMode)) {
        return { code: "-1", message: "Save mode is empty" };
    } else if (String.isNullOrWhiteSpace(requestBody.objectCode)) {
        return { code: "-1", message: "objectCode cannot be empty" };
    } else if (requestBody.PageGrouping == null || requestBody.PageGrouping == undefined) {
        return { code: "-1", message: "PageGrouping json cannot be empty" };
    }

    let res = pageGroupingValidations(requestBody.PageGrouping);
    if (res.code == "-1") {
        return res;
    }
    if (requestBody.PageGrouping.objectCode != requestBody.objectCode) {
        return { code: "-1", message: "objectCode must be same" };
    }

    return { code: "0", message: "Validation success" };
}

/**
* pageGrouping Object Validation
* @pageGroupingObject pageGrouping Object
* return code => "0" (if validation success)  => -1 (if validation fails)
*/
function pageGroupingValidations(pageGroupingObject: any) {
    try {

        let pageGroupingNotNullParameters = [];
        let pageGroupingNotEmptyParameters = ["objectCode"];
        let pageGroupingNumberedParameters = ["deleteMark", "changeCount", "isActive"];
        return util.validations(pageGroupingObject, "user", pageGroupingNotNullParameters, pageGroupingNotEmptyParameters, pageGroupingNumberedParameters, true);
    } catch (ex) {
        return { code: "-1", message: "Error while exectuing validation in utilites:" + ex };
    }
}

export function userPreferenceSaveValidations(requestBody: any) {
    if (String.isNullOrWhiteSpace(requestBody.UserPreference)) {
        return { code: "-1", message: "UserPreference is empty" };
    } else if (String.isNullOrWhiteSpace(requestBody.saveMode)) {
        return { code: "-1", message: "Save mode is empty" };
    } else if (String.isNullOrWhiteSpace(requestBody.objectCode)) {
        return { code: "-1", message: "objectCode cannot be empty" };
    } else if (requestBody.UserPreference == null || requestBody.UserPreference == undefined) {
        return { code: "-1", message: "UserPreference json cannot be empty" };
    }

    let res = userPreferenceValidations(requestBody.UserPreference);
    if (res.code == "-1") {
        return res;
    }
    if (requestBody.UserPreference.objectCode != requestBody.objectCode) {
        return { code: "-1", message: "objectCode must be same" };
    }

    return { code: "0", message: "Validation success" };
}

/**
* UserPreference Object Validation
* @userPreferenceObject UserPreference Object
* return code => "0" (if validation success)  => -1 (if validation fails)
*/
function userPreferenceValidations(userPreferenceObject: any) {
    try {

        let userPreferenceNotNullParameters = [];
        let userPreferenceNotEmptyParameters = ["objectCode"];
        let userPreferenceNumberedParameters = ["deleteMark", "changeCount", "isActive"];
        return util.validations(userPreferenceObject, "user", userPreferenceNotNullParameters, userPreferenceNotEmptyParameters, userPreferenceNumberedParameters, true);
    } catch (ex) {
        return { code: "-1", message: "Error while exectuing validation in utilites:" + ex };
    }
}