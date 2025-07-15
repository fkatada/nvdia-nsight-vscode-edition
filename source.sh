#!/usr/bin/bash

# Source this script via '. init.sh'
function check_sourced() {
    if [[ ${FUNCNAME[-1]} != "source" ]]; then
        printf "Usage: source %s\n" "$0"
        exit 1
    fi
}
function add_node_path {
    EXTENSION_DIR=$(dirname $BASH_SOURCE[0])
    NODE_VERSION=`cat $EXTENSION_DIR/../target-node-version.txt`

    echo "Using node $NODE_VERSION"

    NODE_REL_DIR="$EXTENSION_DIR/../../../../Prebuilt/Linux/NodeJS/$NODE_VERSION/bin"
    if [ ! -d "$NODE_REL_DIR" ]; then
        printf "Error: $NODE_REL_DIR is not a valid directory."
    fi

    NODE_DIR=`realpath "$NODE_REL_DIR"`

    if [[ "$PATH" =~ (^|:)"$NODE_DIR"(:|$) ]]; then
        echo "PATH already contains $NODE_DIR."
    else
        if [ -d "$NODE_DIR" ]; then
            echo "Adding $NODE_DIR to path"
            export PATH="$NODE_DIR:$PATH"
        else
            echo "$NODE_DIR does not exist, please sync before continuing."
        fi
    fi

    EXTENSION_DIR_ABS=`realpath $EXTENSION_DIR`
    MODULES_DIR="$EXTENSION_DIR_ABS/node_modules/.bin"

    if [[ "$PATH" =~ (^|:)"$MODULES_DIR"(:|$) ]]; then
        echo "PATH already contains $MODULES_DIR."
    else
        echo "Adding $MODULES_DIR to path"
        export PATH="$MODULES_DIR:$PATH"
    fi

    echo "PATH=$PATH"
}

check_sourced
add_node_path
