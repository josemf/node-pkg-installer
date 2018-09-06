const AbstractPackageManager = require('./abstract_package_manager');

class Apt extends AbstractPackageManager {
    constructor() {
        super('apt-get', {
            prepare: [ "update" ],
            install: [ "install", ['-y', '--no-install-recommends' ]],
            version: [ null, '--version' ]
        });        
    }

    parseVersion(output) {
        let outputParts = output.split("\n"),
            versionLine = outputParts[0],
            matched = versionLine.match(/apt (\d+\.\d+(\.\d+)?)/);
    
        return matched && matched[1] || false;
    }
}

module.exports = Apt;
