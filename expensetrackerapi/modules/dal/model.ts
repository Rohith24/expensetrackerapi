// Bring Mongoose into the app
import mongoose = require('mongoose');

// Build the connection string

import { dal } from './dal';
import logger = require('../../controllers/logger');
import utilities = require('../../lib/utilities');

/** model for database communication
*/
export class model {

    private model: mongoose.Model<mongoose.Document>;
    private dal: dal;
    private modelName: string;
    private isCacheable: boolean = false;
    private tenant: any;
    private request = {} as any;

    constructor(model: mongoose.Model<mongoose.Document>, dal: dal) {
        this.tenant = dal.tenant;
        this.model = model;
        this.dal = dal;
        this.modelName = model.modelName;
        this.request.tenant = dal.tenant;
        this.request.tenantName = dal.tenantName;
    }

    /**
       * Get the Model Name 
       */
    public getModelName = (): string => {
        return this.modelName;
    }

    /**
       * Get the Schema of the Model
       */
    public getSchema = (): any => {
        return JSON.parse(JSON.stringify(this.model.schema)).obj;
    }

    public insertMany = async (docs: Array<any>, callback?: (err: any, res: any) => void): Promise<Array<any>> => {
        var error, retObj;
        try {
            //var _id = docs[0]._id;

            //logger.info(this.request, `${this.modelName} insertMany request`, `${this.modelName}/insertMany`, utilities.getLoggerId(docs), "insertMany request", '4', docs);
            retObj = await this.model.insertMany(docs);
            if (retObj == null) {
                console.log(`unable to insertMany object at collection ${this.model.collection.name}`);
                throw `unable to insertMany object at collection ${this.model.collection.name}`;
            } else {
                console.log(`insertMany object at collection ${this.model.collection.name}`);
            }/*if (this.isCacheable) {
                this.cache.set(this.modelName.toUpperCase() + ":" + _id, JSON.stringify(docs[0]));
            }*/
            //logger.info(this.request, `${this.modelName} insertMany response`, `${this.modelName}/insertMany`, utilities.getLoggerId(retObj), "insertMany response", '4', '');
        }
        catch (ex) {
            logger.error(this.request, `Error while executing ${this.modelName} insertMany: ` + ex.toString(), `${this.modelName}/insertMany`, utilities.getLoggerId(docs), "catch", '1', "", ex);
            error = ex;
            if (!callback)
                throw ex;
        }
        if (callback)
            callback(error, retObj);
        return retObj;
    }

    public create = async (docs: Array<any>, useVersionForCache = false, callback?: (err: any, res: any) => void): Promise<Array<any>> => {
        var error, retObj;
        try {
            var _id = docs[0]._id;
            //logger.info(this.request, `${this.modelName} create request`, `${this.modelName}/create`, utilities.getLoggerId(docs), "create request", '4', docs);
            retObj = await this._create(docs);

            _id = _id || retObj[0]._id;
            if (retObj == null) {
                throw `unable to create object at collection ${this.model.collection.name} with _id ${_id}`;
            } else if (this.isCacheable) {
                let id = this.modelName.toUpperCase() + ":" + retObj[0].objectCode;
                if (useVersionForCache) {
                    id += '-' + retObj[0].version;
                }
            }
        }
        catch (ex) {
            error = ex;
            logger.error(this.request, `Error while executing ${this.modelName} create: ` + ex.toString(), `${this.modelName}/create`, utilities.getLoggerId(docs), "catch", '1', docs, ex);
            if (!callback)
                throw ex;
        }

        if (callback)
            callback(error, retObj);
        retObj = JSON.parse(JSON.stringify(retObj));
        return retObj;
    }
    
    public aggregate = async (query: any, projection?: any, callback?: (err: any, res: any) => void): Promise<Array<any>> => {
        var error = null;
        var retObj = [];

        try {
            retObj = await this._aggregate(query, projection)
        }
        catch (ex) {
            logger.error(this.request, `Error while executing aggregate find: ` + ex.toString(), `find`, query, "catch", '1', query, ex);

            error = ex;
            if (!callback)
                throw ex;
        }


        if (callback)
            callback(error, retObj);

        return retObj;

    }

    public find = async (query: any, projection: any, callback?: (err: any, res: any) => void): Promise<Array<any>> => {
        var error = null;
        var retObj = [];

        try {
            retObj = await this._get(query, projection);
            if (retObj && retObj.length>0) {
                //logger.info(this.request, `${this.modelName} find response`, `${this.modelName}/find`, utilities.getLoggerId(retObj), "find response", '4', '');
            }//if (retObj != null) {
            //    await this.trigger(retObj, "postRetrieve");
            //}
        }
        catch (ex) {
            logger.error(this.request, `Error while executing ${this.modelName} find: ` + ex.toString(), `${this.modelName}/find`, query, "catch", '1', query, ex);
            error = ex;
            if (!callback)
                throw ex;
        }


        if (callback)
            callback(error, retObj);

        return retObj;

    }

    public paginate = async (query: any, skip: number, limit: number,sort : any, projection?: any, callback?: (err: any, res: any) => void): Promise<Array<any>> => {
        var error = null;
        var retObj = [];

        try {

            var retObj = [];
            let docs = await this.model.find(query, projection)
                .limit(limit)
                .skip(skip)
                .sort(sort);
            retObj = JSON.parse(JSON.stringify(docs));
        }
        catch (ex) {
            logger.error(this.request, `Error while executing ${this.modelName} find: ` + ex.toString(), `${this.modelName}/find`, query, "catch", '1', query, ex);
            error = ex;
            if (!callback)
                throw ex;
        }


        if (callback)
            callback(error, retObj);

        return retObj;

    }

    public findOne = async (query: any, projection: any, callback?: Function): Promise<any> => {
        var error, retObj;
        try {
            var mo: any = await this.model.findOne(query, projection);
            retObj = JSON.parse(JSON.stringify(mo));
            //logger.info(this.request, `${this.modelName} findOne response`, `${this.modelName}/findOne`, utilities.getLoggerId(retObj), "findOne response", '4', retObj);
            //if (retObj != null) {
            //    await this.trigger(retObj, "postRetrieve");
            //}
            //if (mo)
            //    retObj = mo._doc;

        }
        catch (ex) {
            logger.error(this.request, `Error while executing ${this.modelName} findOne: ` + ex.toString(), `${this.modelName}/findOne`, query, "catch", '1', query, ex);
            error = ex;
            if (!callback)
                throw ex;
        }

        if (callback)
            callback(error, retObj);

        return retObj;
    }

    public findOneAndUpdate = async (query: any, update: Object, useVersionForCache = false, callback?: Function): Promise<any> => {

        //return this.model.findOneAndUpdate(query, update, callback);
        var error, retObj;
        try {
            var updatedObj: any = await this.model.findOneAndUpdate(query, update);


            if (updatedObj) {
                retObj = JSON.parse(JSON.stringify(updatedObj));
                //retObj = updatedObj._doc;
                if (this.isCacheable) {
                    let id = this.modelName.toUpperCase() + ":" + retObj.objectCode;
                    if (useVersionForCache) {
                        id += '-' + retObj.version;
                    }
                    //this.cache.set(this.modelName.toUpperCase() + ":" + retObj._id, JSON.stringify(retObj));
                }
            }
        }
        catch (ex) {
            logger.error(this.request, `Error while executing ${this.modelName} findOneAndUpdate: ` + ex.toString(), `${this.modelName}/findOneAndUpdate`, query, "catch", '1', query, ex);

            error = ex;
            if (!callback)
                throw ex;
        }

        if (callback)
            callback(error, retObj);

        return retObj;
    }

    public findOneAndRemove = async (query: any, callback?: Function): Promise<any> => {
        //return this.model.findOneAndRemove(query, callback);
        var error, retObj;
        try {
            var removedObj: any = await this.model.findOneAndRemove(query);

            if (removedObj) {
                //retObj = removedObj._doc;
                retObj = JSON.parse(JSON.stringify(removedObj));
            }
        }
        catch (ex) {
            logger.error(this.request, `Error while executing ${this.modelName} findOneAndRemove: ` + ex.toString(), `${this.modelName}/findOneAndRemove`, query, "catch", '1', query, ex);
            error = ex;
            if (!callback)
                throw ex;
        }

        if (callback)
            callback(error, retObj);

        return retObj;
    }

    public findById = async (id: Object | number | string, callback?: (err: any, res: any) => void) => {
        var retObj = null;
        var err = null;
        try {
            if (retObj == null) {
                //retObj = await this.model.findById(id);
                retObj = await this._findById(id);
                if (retObj != null) {
                    //retObj = retObj._doc;
                    if (this.isCacheable) {
                        let id = this.modelName.toUpperCase() + ":" + retObj.objectCode;
                        if (retObj.version) {
                            id += '-' + retObj.version;
                        }
                    }
                }

            }
            //logger.info(this.request, `${this.modelName} findById response`, `${this.modelName}/findById`, utilities.getLoggerId(retObj), "findById response", '4', retObj);
            //if (retObj != null) {
            //    await this.trigger(retObj, "postRetrieve");
            //}
        }
        catch (ex) {
            logger.error(this.request, `Error while executing ${this.modelName} findById: ` + ex.toString(), `${this.modelName}/findById`, id, "catch", '1', id, ex);
            err = ex;
            if (!callback) throw ex;
        }

        //if using normal callback
        if (callback) {
            callback(err, retObj);
        }

        return retObj;

    }

    public findByCode = async (objectCode: string, version?: string, callback?: (err: any, res: any) => void) => {
        var retObj = null;
        var err = null;
        try {
            if (retObj == null) {
                retObj = await this._findByCode(objectCode, version);
                if (retObj != null) {
                }

            }
            //logger.info(this.request, `${this.modelName} findById response`, `${this.modelName}/findById`, utilities.getLoggerId(retObj), "findById response", '4', retObj);
            //if (retObj != null) {
            //    await this.trigger(retObj, "postRetrieve");
            //}
        }
        catch (ex) {
            logger.error(this.request, `Error while executing ${this.modelName} findByCode: ` + ex.toString(), `${this.modelName}/findByCode`, objectCode, "catch", '1', objectCode, ex);
            err = ex;
            if (!callback) throw ex;
        }

        //if using normal callback
        if (callback) {
            callback(err, retObj);
        }

        return retObj;

    }

    public findByIdAndRemove = async (id: Object | number | string, callback?: Function): Promise<any> => {
        var error, retObj;
        try {
            var removedObj: any = await this.model.findByIdAndRemove(id);

            if (removedObj) {
                retObj = JSON.parse(JSON.stringify(removedObj));
            }
            //logger.info(this.request, `${this.modelName} findByIdAndRemove response`, `${this.modelName}/findByIdAndRemove`, utilities.getLoggerId(retObj), "findByIdAndRemove response", '4', retObj);
        }
        catch (ex) {
            logger.error(this.request, `Error while executing ${this.modelName} findByIdAndRemove: ` + ex.toString(), `${this.modelName}/findByIdAndRemove`, id, "catch", '1', id, ex);
            error = ex;
            if (!callback)
                throw ex;
        }

        if (callback)
            callback(error, retObj);

        return retObj;
    }

    public findByIdAndUpdate = async (updateObject: any, useVersionForCache = false, callback?: (err: any, res: any) => void) => {
        var retObj = null;
        var err = null;

        try {

            //TODO: get reference of currentUser information 
            //TODO: do concurrency check
            var _id = updateObject._id;
            //logger.info(this.request, `${this.modelName} findByIdAndUpdate update request`, `${this.modelName}/findByIdAndUpdate`, utilities.getLoggerId(updateObject), "update request", '4', updateObject);
            var res = await this._findByIdAndUpdate(updateObject);          
            if (res == null) {
                throw `unable to find object at collection ${this.model.collection.name} with _id ${_id}`;
            }
            retObj = res;
            if (res != null) {
                //await this.dal.pushToDbInHierarchy(this.modelName, "UPDATE", [res]);
                //await this.dal.createQueue(this.modelName, "UPDATE", [res]);                
            }
            //logger.info(this.request, `${this.modelName} findByIdAndUpdate response`, `${this.modelName}/findByIdAndUpdate`, utilities.getLoggerId(retObj), "findByIdAndUpdate response", '4', retObj);
        }
        catch (ex) {
            logger.error(this.request, `Error while executing ${this.modelName} findByIdAndUpdate: ` + ex.toString(), `${this.modelName}/findByIdAndUpdate`, utilities.getLoggerId(updateObject), "catch", '1', updateObject, ex);
            err = ex;
        }

        if (callback)
            callback(err, retObj);
        else if (err)
            throw err;

        return retObj;
    }

    //public where = (path: string, value?: Object): mongoose.Query<any> => {
    //    return this.model.where(path, value);
    //}

    public update = async (condition: Object, doc: Object, callback?: Function): Promise<any> => {
        //return this.model.update(condition, doc, callback);
        var error, retObj;
        try {
            var updatedObj: any = await this.model.update(condition, doc, { multi: true });
            if (updatedObj) {
                //retObj = updatedObj._doc;
                retObj = JSON.parse(JSON.stringify(updatedObj));
            }
        }
        catch (ex) {
            logger.error(this.request, `Error while executing ${this.modelName} update: ` + ex.toString(), `${this.modelName}/update`, 'update', "catch", '1', doc, ex);
            error = ex;
            if (!callback)
                throw ex;
        }

        if (callback)
            callback(error, retObj);

        return retObj;
    }

    //MongoDB Calls 
    public _get = async (query: any, optional?: any) => {
        var retObj = [];
        let docs = await this.model.find(query, optional);
        retObj = JSON.parse(JSON.stringify(docs));
        return retObj;
    }

    public _findById = async (id: Object | number | string) => {
        let ret = await this.model.findById(id);
        ret = JSON.parse(JSON.stringify(ret));
        return ret;
    }

    public _findByCode = async (objectCode: string, version: string) => {
        let query = {};
        if (version) {
            query = {
                "objectCode": objectCode,
                "version": version
            };
        } else {
            query = {
                "objectCode": objectCode
            };
        }
        let ret = await this.model.findOne(query);
        ret = JSON.parse(JSON.stringify(ret));
        return ret;
    }

    public _create = async (docs: Array<any>) => {
        try {
            var resData = await this.model.create(docs);
            resData = JSON.parse(JSON.stringify(resData));
            return resData;
        } catch (ex) {
            throw ex;
        }
    }

    public validateObj = (updateObject: any): any => {
        var modelObj = new this.model(updateObject);
        var validations = modelObj.validateSync();
        if (!validations) {
            return validations;
        }
        return validations;
    }

    public updateOne = async (query, object) => {
        try {
            var resData = await this.model.updateOne(query, object);
            resData = JSON.parse(JSON.stringify(resData));
            return resData;
        } catch (ex) {
            throw ex;
        }
    }

    public _findByIdAndUpdate = async (updateObject: any) => {
        var modelObj = new this.model(updateObject);

        var validations = modelObj.validateSync();

        if (updateObject.tenantCode != this.tenant.code) {
            throw "Tenant validation failed: object does not belongs to the tenant";
        }
        if (validations) {
            throw validations;
        }
        else {
            try {
                var _id = updateObject._id;
               
                //delete (modelObj as any)._doc._id;
                delete (modelObj as any)._doc.dateCreated;// Updating the path 'dateCreated' would create a conflict at 'dateCreated'              
                delete (modelObj as any)._doc.__v;//  Updating the path '__v' would create a conflict at '__v'
                var res = await this.model.findByIdAndUpdate(_id, modelObj, { new: true, upsert:false }); // new - true to return the modified document rather than the original. defaults is false
                res = JSON.parse(JSON.stringify(res));
                return res;
            } catch (ex) {
                throw ex;
            }
        }
    }

    //public _aggregateold = async (query: any, projection?: any): Promise<any> => {
    //    var retObj = [];
    //    retObj = await this.model.aggregate(query)
    //        .exec(function (err, data) {
    //            if (err) {
    //                console.log('Error in DAL aggregate:' + err);
    //                return err;
    //            }
    //            data = JSON.parse(JSON.stringify(data));
    //            return data;//JSON.parse(data.toString());
    //        });
    //}

    public _aggregate = async (query: any, projection?: any): Promise<any> => {
        let result = []
        const cursor = await this.model.aggregate(query)
            .cursor({ batchSize: 1000 })
            .eachAsync(function (doc) {
            result.push(doc);
            });
        
        //result = await cursor.toArray();
        return result;
    }
	
	public count = async (query: any): Promise<number> => {
        try {
            var countRes = await this.model.count(query);
            return countRes;
        } catch (ex) {
            throw ex;
        }
    }
}


var sequenceSchema = {
    _id: {
        type: String,
        required: true
    },
    seq: {
        type: Number,
        default: 1
    }
};

var configurationSchema = {
    _id: {
        type: String,
        required: true
    }
};

var sequences = mongoose.model("sequences", new mongoose.Schema(sequenceSchema, { strict: false }));
var configurations = mongoose.model("configurations", new mongoose.Schema(configurationSchema, { strict: false }));