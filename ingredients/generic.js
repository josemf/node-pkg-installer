const AbstractIngredient = require('../abstract_ingredient')

class Generic extends AbstractIngredient {

    constructor(packageNames, i, version, options) {
        super(i, version, options);

        this._packageNames = packageNames;
    }
    
    setup(version, options, object) {

        if(object._packageNames.apt) {
        
            this.platform('linux', () => {
                this.build('Ubuntu Linux', this.apt(object._packageNames.apt));
            });

        }
    }
}

module.exports = Generic;
