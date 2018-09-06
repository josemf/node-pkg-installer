const fs = require('fs');
const path = require('path');

const config = require('./config');

const parseSemver = require('parse-semver');

const AptPackageManager = require('./package_managers/apt.js');
const BashPackageManager = require('./package_managers/bash.js');

const Platform = require('./platform');
const IngredientInterface = require('./abstract_ingredient');
const RecipeBuilder = require('./recipe_builder');

const GenericIngredient = require('./ingredients/generic');

class Installer {

    constructor(logger) {

        this._packageManagers = {
            'apt': new AptPackageManager(),
            'bash': new BashPackageManager(),
        };
        
        this._ingredientsPath = [
            __dirname+path.sep+'ingredients'+path.sep            
        ];
        
        this._logger = logger;

        this._ingredients = [];        
        this._recipe = [];
    }

    garden(path) {
        this._ingredientsPath.push(path);
        return this;
    }
    
    ingredient(i, options) {

        let semVer = parseSemver(i);
        
        this._recipe.push(this._instanciateIngredient(semVer.name, semVer.original, options));        
        return this;
    }

    cook() {
        
        Platform.Resolve().then(platform => {

            let builder = new RecipeBuilder(platform, this._packageManagers, this._instanciateIngredient.bind(this),  error => {
                console.log("Error", error);
            });
            
            this._recipe.forEach(i => {
                builder.addAndExpandDependencies(i);                               
            });

            builder.prepare()
                .satisfiable(issues => {
                    //throw Error("Can't proceed. There are some issues: " + JSON.stringify(issues));
                    return true;
                    
                    // TODO: return true could signal we might want the build to proceed anyway
                })
                .build();

            builder.dump();
                        
        });
        
        return this;
    }

    // This will be called in three context and act as the ingredient builder for "unchanged format" (already created), framework instanciated format, and platform rules builder format
    
    _instanciateIngredient(i, version, options) {

        if(i instanceof IngredientInterface) {
            return i;
        }
        
        if(typeof i === 'object') {
            options = i.options,
            version = i.version,
            i = i.ingredient;
        }

        let IngredientClass = this._loadIngredientClass(i);

        if(IngredientClass instanceof Array) {
            return new (IngredientClass[0])(IngredientClass[1], i, version, options);
        }

        return new IngredientClass(i, version, options);
    }
        
    _loadIngredientClass(i) {
        if(!this._ingredients[i]) {


            // First go for class
            let IngredientClass = this._getIngredientClass(i);

            if(!IngredientClass) {

                // If not look at the config                
                if(config.packages[i]) {
                    this._ingredients[i] = [ GenericIngredient, config.packages[i] ];
                } 
                
            } else {            
                this._ingredients[i] = IngredientClass;
            }            
        }

        if(!this._ingredients[i]) {
            throw Error(`Couldnt find ingredient ${ingredient}.`);
        }
        
        return this._ingredients[i];
    }

    _getIngredientClass(ingredient) {
        
        let paths = this._ingredientsPath;

        for(let i=paths.length - 1; i >= 0; --i) {
            
            let ipath = paths[i]+ingredient+'.js';
            
            if(!fs.existsSync(ipath)) {
                continue;
            }

            let ingredientClass = require(ipath);

            if(ingredientClass.prototype instanceof IngredientInterface) {
                return ingredientClass;
            }                    
        }

        return null;
    }    
}

module.exports = function (logger) {
    return new Installer(logger);
};
