const PlatformRulesBuilder = require('./platform_rules_builder');

class AbstractIngredient {

    constructor(name, version, options) {
        
        if(!version) {
            version = '__latest';
        }

        this._name = name;
        
        this._version = version;
        this._options = options;
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
    
    rules() {

        let rulesBuilder = new PlatformRulesBuilder();
        
        this.setup.call(rulesBuilder, this._version, this._options, this);

        return rulesBuilder;
    }

    setup() {
        throw Error("The ingredient base class must override this method.");
    }
}

module.exports = AbstractIngredient;
