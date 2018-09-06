require('dotenv').config();

const config = {
    
    packages: {        
        ca_certificates: {
            apt: 'ca-certificates'
        },

        curl: {
            apt: 'curl'
        },

        git: {
            apt: 'git'
        },

        gpg: {
            apt: 'gpg'
        },

        nano: {
            apt: 'nano'
        },

        pkg_config: {
            apt: 'pkg-config'
        },
        
        python_dev: {
            apt: 'python-dev'
        },
        
        python_pip: {
            apt: 'python-pip'
        },
        
        python_setuptools: {
            apt: 'python-setuptools'
        },
        
        screen: {
            apt: 'screen'
        },

        software_properties_common: {
            apt: 'software-properties-common'
        },
        
        sudo: {
            apt: 'sudo'
        },

        tmux: {
            apt: 'tmux'
        },
        
        unzip: {
            apt: 'unzip'
        },

        vim: {
            apt: 'vim'
        },

        wget: {
            apt: 'wget'
        },
        
        xz_utils: {
            apt: 'xz_utils'
        }
    }    
};

module.exports = config;
