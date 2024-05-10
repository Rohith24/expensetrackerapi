import http = require('http');
import path = require('path');
import express = require('express');
const cluster = require('cluster');
var bodyParser = require('body-parser');
import fs = require('fs');
var cors = require('cors');

global.isPortChecked = false;

global.Promise = require('bluebird');
const numCPUs = require('os').cpus().length;

import config = require('./config');
import routing = require('./appStart/routing');

import { system } from './modules/system';
import dal = require('./modules/dal');
var cors = require('cors')
require('./appStart/extensions');


var app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger-output.json')

//app.use(bodyParser.urlencoded({ extended: false }))
//app.use(bodyParser.json());
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

//app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

app.set('port', process.env.PORT || config.port || 3000);


//app.use(lib.utilities.logRequestBody);

// development only
if ('development' == app.get('env')) {
    // app.use(express.errorHandler());
}

var args = process.argv.slice(2);

var isClusterMode = args.indexOf("cluster") >= 0;

var autoFork = args.indexOf("autofork") >= 0;

if (!cluster.isMaster || !isClusterMode) {

    //intializes the data access layer and opens the mongodb connection
    dal.dal.initialize();
    var server;
    //loads the tenants, creates dal (data access layer) open db connection and initialized cache
    system.tenant.loadTenants()
        .then((res) => {
            //auto routing for api
            routing.initialize(app);

            var expressServer = app.listen(app.get('port'), function () {
                console.log('Express server listening on port ' + app.get('port'));
            });

            expressServer.timeout = 1800000;
            process.send = process.send;

            server = http.createServer(async (request, response) => {
                var port = server.address().port
                console.log("port:" + port + " process id:" + process.pid);
                if (request.method === 'POST') {
                    let body = '';
                    request.on('data', chunk => {
                        body += chunk.toString(); // convert Buffer to string
                    });
                }
            })

            server.listen(0);
            server.on('listening', async function () {
            });
        })
        .catch((errDoc) => {
            console.log("Error Happend while executing loadTenants in app" + errDoc.toString());
        })

}



if (isClusterMode && cluster.isMaster) {
    console.log("master process: " + process.pid);
    for (var i = 0; i < numCPUs; i++) {
        var wrkr = cluster.fork();
    }

    for (var prpty in cluster.workers) {
        cluster.workers[prpty].on('message', function (arr) {
            console.log(arr);
        });

    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
        if (autoFork) {
            var wrkr = cluster.fork();
            console.log(`new worker ${wrkr.process.pid} created`);
        }
    });

}
