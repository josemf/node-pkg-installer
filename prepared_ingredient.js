class PreparedIngredient {

    constructor(ingredient, rule) {
        this._name = ingredient.name();
        this._version = ingredient.version();
        this._options = ingredient.options();
        this._verifyInstructions = rule.verify;
        this._buildInstructions = rule.builder;
        this._issue  = rule.errno;
    }

    name() {
        return this._name;
    }

    version() {
        return this._version;
    }

    options() {
        return this._options;
    }
    
    hasIssue() {
        return !!this._issue;        
    }
    
    issue() {
        return this._issue || false;
    }

    packageInstaller() {
        return this._buildInstructions[0];
    }

    instructions() {
        return this._buildInstructions;
    }
}

module.exports = PreparedIngredient;
