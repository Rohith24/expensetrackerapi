import budgetsFactory = require('./budget');

//this will combile all type in all files as single namesapce for better reference in other files.
export namespace budget {
    export class budgets extends budgetsFactory.budgetFactory { }

}