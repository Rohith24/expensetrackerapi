const swaggerAutogen = require('swagger-autogen')();

const doc = {
    info: {
        title: 'Expense Tracker',
        description: 'Expense Tracker'
    },
    host: 'localhost:1337'
};

const outputFile = './swagger-output.json';
const routes = ['./appStart/routing.js'];

/* NOTE: If you are using the express Router, you must pass in the 'routes' only the 
root file where the route starts, such as index.js, app.js, routes.js, etc ... */

swaggerAutogen(outputFile, routes, doc);