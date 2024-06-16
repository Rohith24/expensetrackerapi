import mongoose = require('mongoose');
import config = require('../../config');
import dal = require('../dal');

var tenantSchema = {
    _id: { type: Number, required: true },
    //code: { type: String, required: true },
    //name: { type: String, requred: true },
    //description: { type: String, required: true },
    //database: { type: String },
    "tenantSchemeCode": { type: String },
    "tenantCode": { type: String, required: true },
    "tenantName": { type: String, required: true },
    "description": { type: String, required: true },
    "tenantType": { type: String },
    "tenantStatus": { type: String },
    "monikor": { type: String },
    "region": { type: String },
    "adminId": { type: String },
    "contactName": { type: String },
    "contactEmail": { type: String },
    "contactPhone": { type: String },
    "startDate": { type: Date },
    "expirationDate": { type: Date },
    "theme": { type: String },
    "enableCSFLE": { type: Boolean },
    "dataProtectKey": { type: String },
    "privateKey": { type: String },
    "keyVaultLocation": { type: String },
    "logo": { type: String },
    "logLevel": { type: Number },
    "messageCategory": { type: String },
    "changeCount": { type: Number, required: true, default: 0 },
    "deleteMark": { type: Number, required: true, default: 0 },//0 = available 1= deleted
    "modules": [
        {
            "module": { type: String }
        }
    ],
    "acl": [
        {
            "type": { type: String, maxlength: 50 },
            "code": { type: String, maxlength: 50 },
            "securityCode": { type: Number },
            "statusInd": { type: Number, default: 100 },
            "objectType": { type: String, maxlength: 50 },
            "_id": false
        }
    ],
    "login": [
        {
            "authenticationMode": { type: String },
            "mfa": { type: String },
            "ssoUrl": { type: String },
            "ssoLogoutUrl": { type: String },
            "certificate": { type: String },
            "_id": false
        }
    ],
    "database": [
        {
            "provider": { type: String },
            "connectionString": { type: String },
            "userName": { type: String },
            "password": { type: String },
            "database": { type: String },
            "_id": false
        }
    ],
    "sharePoint": [
        {
            "provider": { type: String },
            "serverAddress": { type: String },
            "spUserName": { type: String },
            "spPassword": { type: String },
            "_id": false
        }
    ]
};


var tenantModel = mongoose.model("tenant", new mongoose.Schema(tenantSchema, {strict: true}));




class tenant {

    public static Tenants = new Map<string, tenant>();

    public _id: any;
    public code: string;
    public name: string;
    public description: string;
    public database: string;
    public configuration: any;
    public logLevel: number;

    private _dal: dal.dal;

    //adding get for dal will prevent write access from unwanted places
    public get dal(): dal.dal {
        return this._dal;
    }

    protected constructor() {     
        this.configuration = {} as any;
    }
   
    private static async create(dc: any) {
               
        var tnt= new tenant();
        tnt._id = dc._id;
        tnt.code = dc.tenantCode;
        tnt.name = dc.tenantName;
        tnt.description = dc.description;
        tnt.database = dc.database;
        //var _scripts = new scripts();
        //tnt.scripts = _scripts;

        //let scripts = {};
        //tnt.scripts = scripts;
        var tenantName = tnt.code.toUpperCase();

        //stores tenant in the globals (process memeory)
        //global.Tenants[tenantName] = tnt;
        tenant.Tenants.set(tenantName, tnt);

        //creating dal (data access layer) to the tenant
        //adding dal instance to _dal will prevent dal write access from unwanted places

        await dal.dal.create(tnt);
        try {
            //loading the tenant configuration from mongoDB
            let configurationRes = tnt.configuration;//  await tenant.getConfigurationObj(tnt, tenantName, {});
        }
        catch (ex) {
            console.log("Error while executing Script Loading in tenant " + ex.toString());
        }
        return tnt;
    }

    public static async loadList() {
        let docs = await tenantModel.find({});
        return docs;
    }

    //get the configurationObj from mongoDB
    public static getConfigurationObj = async (tnt, tenantName, query): Promise<any> => {
        let configurationModel = await tnt._dal.model("configuration");
        let configurationDocs = await configurationModel.find(query, {});
        //console.log(`scriptDocs:${scriptDocs.length} `);
        if (configurationDocs.length > 0) {
            let configurationDoc = configurationDocs[0];
            for (let configKey in configurationDoc) {
                tnt.configuration[configKey] = configurationDoc[configKey];
            }
            return true;
        } else {
            return false;
        }
    }

    public static async loadTenants() {
        try {
            global.getTenant = (code: string): tenant => {
                try {
                    code = (code || '').toUpperCase();

                    var ret = tenant.Tenants.get(code) || tenant.Tenants.get(config.defaultTenant.toUpperCase()) || tenant.Tenants.get("Fees");

                    return ret;
                }
                catch (e) {

                }
            };

            //let docs: any[] = await tenant.loadList();
            tenant.Tenants.clear();
            let dc = {
                "_id": 4,
                "tenantCode": "BudgetTracker",
                "tenantName": "BudgetTracker",
                "description": "BudgetTracker",
                "logLevel": 4,
                "database": [
                    {
                        "database": "BudgetTracker"
                    }
                ]
            }
            await tenant.create(dc);
            dc = {
                "_id": 4,
                "tenantCode": "BudgetTracker1",
                "tenantName": "BudgetTracker1",
                "description": "BudgetTracker1",
                "logLevel": 4,
                "database": [
                    {
                        "database": "BudgetTracker1"
                    }
                ]
            }
            await tenant.create(dc);
        }
        catch (ex) {
            console.log("Error while executing loadTenants in tenant " + ex.toString());
        }

    }
}

export = tenant;