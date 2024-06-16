
export = {
    authenticationMode: "",
    port: 1337,
    resultSize: 50,
    masterDB: process.env.masterDB || "BudgetTracker1",
    database: process.env.dbType || "mongo",
    dbConnection: process.env.dbURL || "mongodb://127.0.0.1:18535",
    defaultTenant: 'BudgetTracker1',
    loadBalancing: [
    ],
    cache: {
    },
    logService: {
        url: process.env.logURL || "http://localhost:1339",
        path: process.env.logPath || "/api/ApplicationLog/save",
        logType: process.env.logType || "info",
        severity: ['1', '5']
    },
    encryptionKey: "qazhS6teeJ3Zw4TCy8i36z6JiP7TqmZGhPNVp/oYfAI="
};