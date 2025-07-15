// Can be passed to node --import to enable ts-node support for ESM modules.
// Used by .gulp.js to enable gulpfile.ts.

const { register } = require('node:module');
const { pathToFileURL } = require('node:url');

register('ts-node/esm', pathToFileURL('./'));
