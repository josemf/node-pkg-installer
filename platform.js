const getos = require('getos');
const commandExistsSync = require('command-exists').sync;

const PACKAGE_MANAGER_COMMANDS = [
    'apt', 'dpkg', 'apk', 'rpm', 'yum', 'pacman', 'emerge', 'npm', 'gem', 'pip'
];

class Platform {

    constructor(platformOs, packageManagers) {

        this._platformOs = platformOs;
        this._packageManagers = packageManagers;
        
    }
    
    static Resolve() {

        // Os Platform and Distro

        let platformOsPromise = new Promise((resolve, reject) => {
        
            getos((e,os) => {
                if(e) {
                    return reject(e);
                }
                
                return resolve(os);
            });
            
        });

        // Package Managers

        let packageManagers = {};
        
        PACKAGE_MANAGER_COMMANDS.forEach(pmc =>  {
            packageManagers[pmc] = commandExistsSync(pmc);
        });
        
        return Promise.all([ platformOsPromise, packageManagers ])
            .then(platformOsAndPM => {
                return new Platform(platformOsAndPM[0], platformOsAndPM[1]);
            });
    }

    os() {
        return this._platformOs.os;
    }

    distribution() {
        return this._platformOs.dist;
    }

    release() {
        return this._platformOs.release;
    }

    supports(pm) {
        return this.packageManagers[pm] && this.packageManagers[pm] === true;
    }
}

module.exports = Platform;
