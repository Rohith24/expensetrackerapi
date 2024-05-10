import transactionsFactory = require('./transactions');

//this will combile all type in all files as single namesapce for better reference in other files.
export namespace transaction {
    export class transactions extends transactionsFactory.transactionFactory { }

}