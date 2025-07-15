#!/usr/bin/env fish

if test "$_" != "source"
    printf "Usage: source %s\n" (status filename)
    exit 1
end

set -l EXTENSION_DIR (status dirname)
set -l NODE_VERSION (cat $EXTENSION_DIR/../target-node-version.txt)

echo "Using node $NODE_VERSION"

set -l NODE_REL_DIR "$EXTENSION_DIR/../../../../Prebuilt/Linux/NodeJS/$NODE_VERSION/bin"
if test ! -d "$NODE_REL_DIR"
    printf "Error: '$NODE_REL_DIR' is not a valid directory."
end

set -l NODE_DIR (realpath "$NODE_REL_DIR")

if contains $NODE_DIR $PATH
    echo "PATH already contains '$NODE_DIR'."
else
    if test -d "$NODE_DIR"
        echo "Adding '$NODE_DIR' to PATH"
        set -g PATH $NODE_DIR $PATH
    else
        echo "$NODE_DIR does not exist, please sync before continuing."
    end
end

set -l EXTENSION_DIR_ABS (realpath $EXTENSION_DIR)
set -l MODULES_DIR "$EXTENSION_DIR_ABS/node_modules/.bin"

if contains $MODULES_DIR $PATH
    echo "PATH already contains '$MODULES_DIR'."
else
    echo "Adding '$MODULES_DIR' to PATH"
    set -g PATH $MODULES_DIR $PATH
end

echo "PATH:" $PATH
