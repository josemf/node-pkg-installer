const parseSemver = require('parse-semver')

class Rule {
    constructor(dependencies, verify, builder) {
        this.dependencies = dependencies;
        this.verify = verify;
        this.builder = builder;
    }

    buildable() {
        return !!this.builder;
    }
}

class PlatformRulesBuilder {

    constructor() {
        this._rules = {};
        this._current = null;
    }

    platform(os, callback) {
        
        this._rules[os] = this._makePlatformObject();

        this._current = this._rules[os]; 
        
        let result = callback.call(this);

        Promise.resolve(result)
            .then(() => {
                this._current = null;                
            });
    }

    onlyNeeds() {
        if(!this._context) {
            throw Error("OnlyNeeds method needs a build context");
        }

        this._context.onlyNeeds = true;

        return this;
    }
    
    needs(ingredient, options) {

        let semVer = parseSemver(ingredient),
            dependency = {
                ingredient: semVer.name,
                version: semVer.original,
                options: options
            };
        
        if(this._context) {
            this._context.dependencies.push(dependency);
        } else {

            if(!this._current) {
                throw Error("Needs method needs a platform context");
            }
            
            this._current.dependencies.push(dependency);
        }

        return this;
    }
    
    verify(callback) {
        if(this._context) {
            this._context.verify = callback;
        } else {

            if(!this._current) {
                throw Error("Verify method needs a platform context");
            }
            
            this._current.verify = callback;
        }

        return true;
    }
    
    build(dist, release, builder) {
        
        let context = null;
        
        // Generic OS build script
        
        if(dist instanceof Array) {
            builder = dist;            
            dist = null;
            release = null;
        }

        // Generic dist build script
        
        if(release instanceof Array) {
            builder = release;            
            release = null;
        }        

        // Release build
        
        if(release) {
            
            if(!this._current.dists[dist]) {                
                this._current.dists[dist] = this._makeDistObject();
                this._current.dists[dist].parent = this._current;
            }

            this._current.dists[dist].releases[release] = this._makeReleaseObject();
            this._current.dists[dist].releases[release].builder = builder;
            this._current.dists[dist].releases[release].parent = this._current.dists[dist];
            
            context = this._current.dists[dist].releases[release];
            
        } else if(dist) {

            if(!this._current.dists[dist]) {                
                this._current.dists[dist] = this._makeDistObject();
                this._current.dists[dist].parent = this._current;                
            }            
            
            this._current.dists[dist].builder = builder;
            context = this._current.dists[dist];
            
        } else {            
            this._current.builder = builder;
        }

        return this._buildCallContext(context);
    }

    get(platform, distribution, release) {

        let matched = null;
        
        if(this._rules[platform]) {

            if(this._rules[platform].dists[distribution]) {
                if(this._rules[platform].dists[distribution].releases[release]) {
                    matched = this._rules[platform].dists[distribution].releases[release];
                } else {
                    matched = this._rules[platform].dists[distribution];
                }
            } else {
                matched = this._rules[platform];
            }
            
        } else {
            return null;
        }
        
        let dependencies = this._getRuleDependencies(matched),
            verify = this._getRuleVerify(matched);
        
        return new Rule(dependencies, verify, matched.builder);
    }

    _getRuleDependencies(rule) {

        let tmp = rule,
            dependencies = [];

        if(rule.onlyNeeds) {
            return rule.dependencies;
        }
        
        do {
            dependencies = tmp.dependencies.concat(dependencies);
            tmp = tmp.parent;            
        } while(!!tmp);

        return dependencies;
    }

    _getRuleVerify(rule) {
        
        let tmp = rule,
            verify = null;
        
        do {
            verify = tmp.verify;
            tmp = tmp.parent;            
        } while(!verify && !!tmp);

        return verify;        
    }    
    
    toString() {

        console.log("* Platform Rules Configuration");
        
        for(let platform in this._rules) {
            if(this._rules.hasOwnProperty(platform)) {

                console.log("** Platform: " + platform);
                console.log("** Dependencies: " + JSON.stringify(this._rules[platform].dependencies));
                console.log("** Verify: " + this._rules[platform].verify);
                console.log("** Build: " + this._rules[platform].builder);                

                for(let distro in this._rules[platform].dists) {
                    if(this._rules[platform].dists.hasOwnProperty(distro)) {
                        console.log("\t** Distro: " + distro);
                        console.log("\t** Dependencies: " + JSON.stringify(this._rules[platform].dists[distro].dependencies));
                        console.log("\t** Verify: " + this._rules[platform].dists[distro].verify);
                        console.log("\t** Build: " + this._rules[platform].dists[distro].builder);                                        

                        for(let release in this._rules[platform].dists[distro].releases) {
                            if(this._rules[platform].dists[distro].releases.hasOwnProperty(release)) {
                                console.log("\t\t** Release: " + release);
                                console.log("\t\t** Dependencies: " + JSON.stringify(this._rules[platform].dists[distro].releases[release].dependencies));
                                console.log("\t\t** Verify: " + this._rules[platform].dists[distro].releases[release].verify);
                                console.log("\t\t** Build: " + this._rules[platform].dists[distro].releases[release].builder);                                
                            }
                        }
                    }
                }
            }
        }
    }
    
    _buildCallContext(context) {

        if(!context) {
            return this;
        }
        
        let callContext = null;
        
        callContext = {

            _context: context,

            onlyNeeds: (() => {
                this.onlyNeeds.apply(callContext);
                return callContext;
            }),
            
            needs: ((...args) => {                
                this.needs.apply(callContext, args);
                return callContext;
            }),

            verify: ((...args) => {
                this.verify.apply(callContext, args);
                return callContext;
            })
        };

        return callContext;
    }
    
    // Builder methods
    
    bash(script) {
        return ['bash', 'install', script];
    }

    apt(name) {
        return ['apt', 'install', name]
    }
    
    _makePlatformObject() {
        return {
            dependencies: [],
            dists: {},
            builder: null,
            verify: null
        };
    }
    
    _makeDistObject() {
        return {
            parent: null,            
            releases: {},
            dependencies: [],                    
            builder: null,
            verify: null
        };
    }

    _makeReleaseObject() {
        return {
            parent: null,            
            dependencies: [],
            builder: null,
            verify: null
        };
    }
}

module.exports = PlatformRulesBuilder;
