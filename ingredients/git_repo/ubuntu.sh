#!/bin/bash

echo "** Cloning git repository from url $repo to path $to"

mkdir -p $to

if [ -d $to/.git ]; then
    echo "Repository already in place. Skip installation."    
else
    git clone $repo $to
    echo "Repository cloning successfuly"    
fi
