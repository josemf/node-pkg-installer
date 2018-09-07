#!/bin/bash

echo "** Cloning git repository from url $repo to path $to"

mkdir -p $to

if [ -d $to/.git ]; then
    echo "Repository already in place. Skip installation."    
else
    echo "GIT Cloning $repo $to GO"

    ( set -o posix ; set )
    
    git clone $repo $to
    echo "Repository cloning successfuly"    
fi
