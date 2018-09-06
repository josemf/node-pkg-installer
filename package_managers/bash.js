const AbstractPackageManager = require('./abstract_package_manager');

class Bash extends AbstractPackageManager {
    constructor() {        
        super('bash', {
            version: [ null, '--version'],
            install: [ null, null, {
                cmd: "install"
            }],            
        });
    }

    parseVersion(output) {
        let outputParts = output.split("\n"),
            versionLine = outputParts[0],
            matched = versionLine.match(/version (\d+\.\d+(\.\d+)?)/);
        
        return matched && matched[1] || false;
    }

    environmentVariables(vars, app, version, options) {        
        return Object.assign({}, vars, options);
    }
}

module.exports = Bash;
