import mongoose = require('mongoose');
import config = require('../../config');

import _dal = require('./');

import logger = require('../../controllers/logger');
import utilities = require('../../lib/utilities');


/**
 * Data access layer
 */

export class dal {
    public dbConnection: mongoose.Connection;

    private request;

    //TODO: need to reconsider
    private businessObjects = [];//["material", "formula", "item", "company", "luminaformula", "explodeandcombine", "formulabreakdown", "ruletemplate", "supplementobject", "reportsview", "customfield", "materialreplace"];//"FORMULA", "ITEM"


    private _tenant; any;
    get tenant(): any {
        return this._tenant;
    }

    public get tenantName(): string {
        return this._tenant.code.toUpperCase();
    }

    /**
     * do not use "new" for creating dal instance, use dal.create(tenant)
     */
    protected constructor() {
        this.request = {} as any;
    }



    public static async create(tenant: any): Promise<dal> {
        if (tenant.dal instanceof dal) {
            return tenant.dal as dal;
        }
        else {

            var dalObj = new dal();

            //adding tenant reference
            dalObj._tenant = tenant;
            dalObj.request.tenant = tenant;
            dalObj.request.tenantName = dalObj.tenantName;
            tenant._dal = dalObj;
            var mopt = {
                useNewUrlParser: true,
                connectTimeoutMS: 90000,
                socketTimeoutMS: 90000
            } as mongoose.ConnectOptions;

            //opens the db connection for tenant;
            //console.log("tenant DB URL" + config.dbConnection + "/" + tenant.database);
            dalObj.dbConnection = mongoose.createConnection(config.dbConnection + "/" + tenant.database[0].database, mopt);

            //adding mongoose event like connect,disconnect and error
            dal.addMongooseEvents(dalObj.dbConnection);

            await dalObj.loadTenantConfig();

            //loads the models;
            await dalObj.loadModels();


            return dalObj;
        }
    }

    public getNextSequence = async (name: string) => {
        var sequences;
        if (!this.dbConnection.modelNames().contains("sequences")) {
            var sch = new mongoose.Schema({
                _id: { type: String, required: true }
            }, {
                strict: false
            });
            sequences = this.dbConnection.model("sequences", sch);
        } else {
            sequences = this.dbConnection.model("sequences");
        }
        var findSeq = await sequences.findByIdAndUpdate({ _id: name }, { $inc: { seq: 1 } });

        if (findSeq == null && findSeq == undefined) {

            var nwcont = new sequences({ _id: name, seq: 1 });
            var seqRes = await nwcont.save();

            var parseSeq = JSON.parse(JSON.stringify(seqRes));

            return parseSeq.seq;
        } else {
            var parseSeq = JSON.parse(JSON.stringify(findSeq));

            return parseSeq.seq;
        }

    }

    public getNextCodeSequence = async (name: string, type: string) => {
        var sequences;
        if (!this.dbConnection.modelNames().contains("sequences")) {
            var sch = new mongoose.Schema({
                _id: { type: String, required: true }
            }, {
                strict: false
            });
            sequences = this.dbConnection.model("sequences", sch);
        } else {
            sequences = this.dbConnection.model("sequences");
        }
        let queryString = {};
        queryString['codeSeq.' + type]=1;
        var findSeq = await sequences.findByIdAndUpdate({ _id: name}, { $inc: queryString });

        if (findSeq != null && findSeq != undefined) {
            var parseSeq = JSON.parse(JSON.stringify(findSeq));
            let prefix = this.tenant.configuration.objectType[name][type].codePrefix;
            let suffix = this.tenant.configuration.objectType[name][type].codeSuffix || '';
            return prefix + parseSeq['codeSeq'][type] + suffix;
        }

    }

    public model = (objectType: string): Promise<_dal.model> => { //TODO: maybe required to add user instance
        return new Promise((resolve, reject) => {

            //if the object type is businessobject it will return from the connection
            if (this.businessObjects.indexOf(objectType.toLowerCase()) == -1) {
                if (!this.dbConnection.modelNames().contains(objectType.toLowerCase())) {
                    var sch = new mongoose.Schema({}, {
                        strict: false
                    });
                    if ((this.dbConnection as any).base?.models[objectType]?.schema != undefined) {
                        sch = (this.dbConnection as any).base.models[objectType].schema;
                    }
                    this.dbConnection.model(objectType, sch);
                }
                resolve(new _dal.model(this.dbConnection.model(objectType.toLowerCase()), this));
            }
            else {
                try {
                    var _model = this.dbConnection.model(objectType);

                } catch (ex) {
                    console.log(ex);
                }
            }
        });
    }

    /**loads the business object models with custom schema
    @tenantName tenant name
    */
    private loadModels = async (query: any = {}) => {
        //console.log("query:" + JSON.stringify(query));
        var db = this.dbConnection;
        //var model = await this.model("businessobject");

        //var bos = await model.find(query, {}) as Array<any>;
        /*if (this.tenant.configuration.dataMapping.dataMappingEnabled) {
            for (var i = 0; bos && i < bos.length; i++) {

                try {
                    var bod = bos[i];
                    //creating mongoose schema dynamically
                    var sch = eval("new mongoose.Schema(" + bod.schema + ", {  timestamps: { createdAt: 'dateCreated', updatedAt: 'lastModifiedDate' }, strict: true , useNestedStrict: true,  validateBeforeSave: true})");

                    if (db.modelNames().indexOf(bod.objecttype) == -1) {
                        db.model(bod.objectType, sch);
                    }
                    else {
                        db.model(bod.objectType).schema = sch;
                    }

                    db.model(bod.objectType).dateModified = bod.dateModified;
                    //if (this.tenantName == "PROJECTX")
                    //    this.floodRedis();
                }
                catch (ex) {
                    logger.error(this.request, "Error while executing loadModels : " + ex.toString(), "dal/loadModels", query, "catch", '1', query, ex);
                    console.log(ex);
                }

            }
        }*/
    }


    /// loads teant configuration when db initialized for tenant
    private loadTenantConfig = (): Promise<void> => {

        return new Promise((resolve, reject) => {
            let configurationModel = this.dbConnection.collection("configurations");

            let configurationDocs = configurationModel.findOne({}, (err, doc) => {

                if (doc) {
                    for (let configKey in doc) {
                        this._tenant.configuration[configKey] = doc[configKey];
                    }
                }

                resolve();
            });

        });

    }


    /**initializes the mongodb connection
    */
    public static initialize = () => {
        dal.openConnection();
    }

    /** Opens the db connection for master
    */
    private static openConnection = () => {


        //adding mongoose event like connect,disconnect and error
        dal.addMongooseEvents(mongoose.connection);
        // If the Node process ends, close the Mongoose connection
        process.on('SIGINT', function () {
            mongoose.connection.close(function () {
                console.log('Mongoose connection disconnected through app termination');
                process.exit(0);
            });
        });
        //  console.log(JSON.stringify(global.Promise));
        // Create the database connection
        mongoose.Promise = global.Promise;

        //opens connection for master database
        var mopt = {
            useNewUrlParser: true,
            connectTimeoutMS: 90000,
            socketTimeoutMS: 90000
        } as mongoose.ConnectOptions;
        console.log(config.dbConnection);
        var conn = mongoose.connect(config.dbConnection + "/" + config.masterDB, mopt);

        //extends db connections
        //dal.exntendConnection();


        return conn;
    }

    /**adding mongoose event like connect,disconnect and error
    @connection mongoose connection
    */

    private static addMongooseEvents(connection: mongoose.Connection) {

        // CONNECTION EVENTS
        // When successfully connected
        connection.on('connected', function () {
            console.log(`Mongoose connected for database  '${connection.db.databaseName}'`, new Date().toISOString());
        });

        // If the connection throws an error
        connection.on('error', function (err) {
            console.log(`Mongoose connection error for database '${connection.db.databaseName}'`, new Date().toISOString(), '\nerror:', err);
        });

        // When the connection is disconnected
        connection.on('disconnected', function (err) {
            console.log(`Mongoose connection disconnected for database `, new Date().toISOString());
        });

    }

    /** extends the db connection
    */
    private static exntendConnection = () => {

        var couterSchema = { _id: { type: String, required: true }, seq: { type: Number, default: 1 } };
        var Counter = mongoose.model("counter", new mongoose.Schema(couterSchema, { strict: false }));

        mongoose.mongo.Db.constructor.prototype.getNextSequence = function (name: String, callback: Function) {

            Counter.findByIdAndUpdate({ _id: name }, { $inc: { seq: 1 } }, function (error, cnter: any) {
                var ret: any = 1;

                if (error) {
                    ret = -1;
                }
                else {
                    if (cnter == null) {
                        var nwcont = new Counter({
                            _id: name,
                            seq: 1
                        });
                        nwcont.save((err, nc: any) => {
                            if (err) {
                                ret = -1;
                            }
                            else {
                                ret = nc.seq;
                            }

                            callback(nc);
                        });
                    }
                    else {
                        ret = cnter.seq;
                    }
                }


                callback(ret);


            });


        };

    }
}
