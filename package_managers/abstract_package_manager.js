const commandExistsSync = require('command-exists').sync;
const spawn = require('child_process').spawn;

class AbstractPackageManager {

    constructor(command, commandlines) {
        this._command = command;
        this._commandlines = commandlines
    }

    installed() {
        return new Promise((resolve, reject) => {        
            return commandExistsSync(this._command)
                && this.version().then(version => {                    
                    let supported = this.supported(version);
                    resolve(supported);
                });
        });
    }

    prepare() {
        console.log("Preparing package manager ${this._command}");

        if(!this._commandlines.prepare) {
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {            
            let cmd = this._buildCommand(this._commandlines.prepare)
            cmd().then((output) => resolve(output));
        });        
    }
    
    install(name, app, version, options) {

        console.log("Running install", name);
        
        return new Promise((resolve, reject) => {

            console.log("Building command for install", name);
            
            let cmd = this._buildCommand(this._commandlines.install, app, name, version, options)
            cmd().then((output) => resolve(output));
        });
    }
    
    version() {
        let cmd = this._buildCommand(this._commandlines.version);
        return cmd().then((output) => this.parseVersion(output));
    }

    parseVersion(output) {
        // Will try to fetch the version number using the output first line and format N.N.N?
        // Package manager classes override as seen fit

        let outputParts = output.split("\n"),
            versionLine = outputParts[0],
            matched = versionLine.match(/(\d+\.\d+(\.\d+)?)/);
        
        return matched && matched[1] || false;
    }
    
    // Should be overrided when needing some specific package manager version    
    supported(version) {
        return true;
    }

    command() {
        return this._command;
    }
    
    _buildCommand(spec, app, name, version, options) {
        return (() => {

            console.log("Executing Command for install", name);
            
            return new Promise((resolve, reject) => {

                console.log("Spawning command process for install", name);
                
                let command = this._serializesCommandline(spec, app, name, version, options),
                    envs    = this._getEnvironmentVariables(spec, app, name, version, options),
                    child   = spawn(this._command, command, {
                        pwd: process.env.PROJECT_ROOT,
                        env: envs 
                    }),
                    output  = '', error = '';                
                
                console.log("Executing CMD", command, envs);
                
                child.on('close', function (code) {

                    if(code > 0) {
                        console.log(`Package ${name} failed to install with code ${code} and output: `);
                        console.log(error);
                        
                        return reject();
                    }
                    
                    console.log("Exiting from command to install", app);
                    console.log("Error: " + error);
                    
                    return resolve(output);
                });

                child.stdout.on('data', (data) => {

                    let text = data.toString().trim();                    
                    if(text) {
                        console.log('#', text);
                    }
                    
                    output += text;
                });

                child.stderr.on('data', (data) => {

                    let text = data.toString().trim();                    
                    if(text) {
                        console.log('!', text);
                    }
                    
                    error += text;
                });                
            });
        });
    }

    _getEnvironmentVariables(spec, app, name, version, options) {

        let vars = Object.assign({}, spec[2], {
            
            // some defaults
            
            PATH: process.env.PATH,
            PWD: process.env.PWD,
            HOME: process.env.HOME,
            
            name: name,
            packageName: app,
            app_version: version !== '__latest' && version,            
            project_root: process.env.PROJECT_ROOT            
        });
        
        if(this.environmentVariables) {
            vars = this.environmentVariables(vars, app, version, options);
        }
        
        return vars;
    }
    
    _serializesCommandline(spec, app, name, version, options) {
        let args = [];

        if(spec[0]) {
            args.push(spec[0]);
        }

        if(spec[1]) {
            if(spec[1] instanceof Array) {
                args = args.concat(spec[1]);
            } else {
                args.push(spec[1]);
            }
        }
        
        if(app) {
            args.push(app);
        }

        if(this.commandLineArguments) {
            args = this.commandLineArguments(args, app, name, version, options);
        }
        
        return args;
    }
    
}

module.exports = AbstractPackageManager;
