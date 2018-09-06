const AbstractIngredient = require('../abstract_ingredient')

class GitRepo extends AbstractIngredient {

    setup(version, options) {

        // Uses options
        // repo: git repository url
        // to: path to install repository
        
        this.platform('linux', () => {
            this.build('Ubuntu Linux', this.bash(__dirname+'/git_repo/ubuntu.sh'));
        });
    }
    
}

module.exports = GitRepo;
