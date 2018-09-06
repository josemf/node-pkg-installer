const AbstractIngredient = require('../abstract_ingredient')

class Python extends AbstractIngredient {

    setup(version, options) {        
        this.platform('linux', () => {            
            this.build('Ubuntu Linux', this.apt('python'));
        });
    }
}

module.exports = Python;
