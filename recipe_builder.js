
const PreparedIngredient = require('./prepared_ingredient');

class RecipeBuilder {

    constructor(platform, packageManagers, ingredientLoader, handler) {
        this._platform = platform;
        this._packageManagers = packageManagers;
        this._ingredientLoader = ingredientLoader;
        this._handler = handler;

        // Format [ ingredient, rule, dependencies, parent ]
        this._dependenciesTree = [];
        this._prepared = null;

        this._parent = null;
        this._current = this._dependenciesTree;
        this._satisfiableP = null;

        // Its possible to try enable build() even when there are some dependencies issues.
        this._protectBuild = false;
        this._issues = [];
    }

    addAndExpandDependencies(ingredient) {

        ingredient = this._ingredientLoader(ingredient);

        let rule = this._resolve(ingredient.rules()),
            oldParent  = this._parent,
            oldCurrent = this._current,
            currentDependencies = [];

        if(!rule) {
            this._handler(`Ingredient ${ingredient.name()} cant be satisfied as a dependency`);
            rule = {
                dependencies: [],
                errno: "__cannot_satisfy"
            };
        }

        if(this._detectCircularDependency(ingredient, this._parent)) {

            this._handler(`Ingredient ${ingredient.name()} results in a circular dependency`);
            rule = {
                dependencies: [],
                errno: "__circular"
            };
        }

        let struct = [ ingredient, rule, currentDependencies, this._parent ];
        this._current.push(struct);

        this._parent  = struct;
        this._current = currentDependencies;

        this._expandDependencies(rule);

        this._current = oldCurrent;
        this._parent  = oldParent;
    }

    prepare(node) {

        let tree = node ? node[2] : this._dependenciesTree;

        let buildSequence = [];

        // recur depth first

        tree.forEach(n => {
            buildSequence = buildSequence.concat(this.prepare(n));
        })

        // root node

        if(node) {
            // Self add after dependencies

            buildSequence.push(new PreparedIngredient(node[0], node[1]));
        }

        // Remove duplicates

        buildSequence = this._removeDuplicateDependencies(buildSequence);
        
        if(!node) {
            // Save root state
            this._prepared = buildSequence;

            // Get required package managers
            this._requiredPackageManagers = this._getRequiredPackageManagers(buildSequence);
            
            return this;
        }

        return buildSequence;
    }

    _getRequiredPackageManagers(buildSequence) {
        return buildSequence.reduce((accum, pi) => {

            let packageInstallerName = pi.packageInstaller();

            if(!accum[packageInstallerName]) {
                                    
                let installer = this._getPackageInstaller(packageInstallerName);
                    
                if(!installer) {
                    return reject(`Package Installer ${packageInstallerName} not supported.`)
                }
                
                accum[packageInstallerName] = installer;                
            }
            
            return accum;
            
        }, {});        
    }

    satisfiable(cb) {

        this._satisfiableP = new Promise((resolve, reject) => {

            cb = cb || this._handleBuildIssues.bind(this);

            // Check if the build tree is prepared
            
            if(!this._prepared) {
                this._issues.push('__need_prepare_first');
                this._protectBuild = cb(this._issues);

                return reject(this._issues);
            }

            // For each build step, check if there was any issue and if all needed package managers are installed

            this._everythingOk(this._prepared)
                .then(this._allRequiredPackageManagersOk.bind(this))
                .catch((error) => reject(error))                    
                .then(() => {
                    if(this._issues.length > 0) {
                        this._protectBuild = cb(this._issues);
                        return reject(this._issues);
                    }
                    
                    return resolve();
                });
        });
        
        return this;
    }

    _everythingOk(buildSteps) {
        
        return buildSteps.reduce((chain, pi) => {
            
            return chain.then(() => {
                pi.hasIssue() && this._issues.push(pi.issue());
            });

        }, Promise.resolve());                    
    }

    _allRequiredPackageManagersOk() {
        
        return Object.values(this._requiredPackageManagers).reduce((chain, pm) => {
            
            return chain.then(async () => {

                let installed = await pm.installed()
                        
                if(!installed) {
                    throw Error(`Package Installer ${pm.command()} not installed.`);
                }
                
                console.log("##################### Package Manager is installed", pm.command());                                        
            });

        }, Promise.resolve());                    
    }
    
    _getPackageInstaller(installerName) {
        return this._packageManagers[installerName] || null;
    }
    
    build() {

        let satisfiable = this._satisfiableP || Promise.resolve();

        satisfiable.then(() => {

            console.log("Pre install tasks");

            let preInstallP = this._preInstall();
            
            console.log("Now we're ready to install [Yn] Y");

            let commandSequence = this._prepared.reduce((chain, pi) => {

                return chain.then(async () => {

                    console.log("Chain next package", pi.name());
                    
                    let results = await this._buildPackage(pi);
                    
                    console.log("End build package", pi.name());                    
                });

                    
            }, preInstallP);

            commandSequence.then(() => {
                console.log("Everything was installed successfuly", commandSequence);
            });
        });
    }

    _preInstall() {

        // Preparing package manager
        // They might need to update sources or other preparing tasks
        
        return Object.values(this._requiredPackageManagers).reduce((chain, pm) => {
            
            return chain.then(async () => {
                await pm.prepare()                                  
            });

        }, Promise.resolve());                            
    }
    
    _buildPackage(pi) {
        
        let instructions = pi.instructions(),
            version = pi.version(),
            options = pi.options(),
            
            packageInstallerName = instructions[0],
            installerCommand = instructions[1],
            packageName = instructions[2],
            packageInstaller = this._getPackageInstaller(packageInstallerName);

        if(!packageInstaller) {
            throw Error(`Package Installer ${packageInstallerName} not found.`);
        }
        
        return packageInstaller[installerCommand](pi.name(), packageName, version, options);        
    }
    
    _removeDuplicateDependencies(sequence) {

        let cleanedSequence = [],
            seen = {};

        sequence.forEach(n => {
            if(seen[n.name()] && !n.hasIssue()) {
                return;
            }

            seen[n.name()] = true;

            cleanedSequence.push(n);
        });

        return cleanedSequence;
    }

    _expandDependencies(rule) {

        if(rule.dependencies && rule.dependencies.length > 0) {
            rule.dependencies.forEach(d => {
                this.addAndExpandDependencies(d);
            });
        }
    }

    _detectCircularDependency(ingredient, parent) {
        let tmp = parent;

        if(!parent) {
            return false;
        }

        do {
            let pi = tmp[0];

            // TODO:
            // This doesnt take in account versions of software.
            // To be troughly about this we would have to take this dependency and list all its dependecy tree see it would popup later or finalize

            if(pi.name()
               === ingredient.name()) {
                return true;
            }

            tmp = tmp[3];
        } while(tmp);

        return false;
    }

    _handleBuildIssues(issues) {
        // Just make build() fail
        return true;
    }

    _resolve(rules) {
        let rule = rules.get(this._platform.os(), this._platform.distribution(), this._platform.release());

        if(!rule.buildable()) {
            rule.errno = "__cannot_build";
        }

        return rule;
    }

    dump(tree, spaces) {

        spaces = spaces || '#';
        tree   = tree   || this._dependenciesTree;

        tree.forEach(n => {

            let i = n[0],
                r = n[1],
                d = n[2],
                p = n[3];

            console.log(spaces + ' ' + i.name() + '[' + i.version() + '] ('+ (p && p[0].name()) +')'+(r.errno ? ' *'+r.errno+'*' : ''));

            if(d.length > 0) {
                this.dump(d, spaces + "--");
            }

        });

    }
}

module.exports = RecipeBuilder;
