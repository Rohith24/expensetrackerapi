import mongoose = require('mongoose');
import express = require('express');
import { system } from './system';

import dal = require('./dal');


export = class coreModule
{
    private _tenant: system.tenantFactory;
    private _request: express.Request;

    /**
     * context refers to current request
     */
    constructor(request: express.Request)
    {
        this._tenant = global.getTenant(request.tenantName);
        this._request = request;
    }

    public get tenant(): system.tenantFactory
    {
        return this._tenant;
    }

    protected get request(): express.Request
    {
        return this._request;
    }

    protected get dbConnection(): mongoose.Connection
    {
        return this.dal.dbConnection;
    }

    protected get dal(): dal.dal
    {
        return this.tenant.dal as dal.dal;
    }
}
