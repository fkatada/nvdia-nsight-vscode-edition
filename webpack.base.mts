/* ---------------------------------------------------------------------------------- *\
|                                                                                      |
|  Copyright (c) 2021, NVIDIA CORPORATION. All rights reserved.                        |
|                                                                                      |
|  The contents of this file are licensed under the Eclipse Public License 2.0.        |
|  The full terms of the license are available at https://eclipse.org/legal/epl-2.0/   |
|                                                                                      |
|  SPDX-License-Identifier: EPL-2.0                                                    |
|                                                                                      |
\* ---------------------------------------------------------------------------------- */

import { fileURLToPath } from 'node:url';
import { type Configuration } from 'webpack';

const config: Configuration = {
    // VSCode extensions run in Electron with Node.js as the runtime.
    target: 'node',
    entry: {
        // The main entry point of this extension used by VSCode.
        main: {
            import: './src/extension.ts',
            filename: 'extension.js'
        },
        // Entry point for the standalone debug adapter, used by test suite.
        debugAdapter: {
            import: './src/debugger/cudaGdbAdapter.ts',
            filename: 'debugAdapter.js'
        }
    },
    // We want the bundle to include source maps for better diagnostics and debugging even in release builds, but
    // we don't want the source maps to include the original source code. Instead, "devtoolModuleFilenameTemplate"
    // is used below to point to the original source files in the source tree during development.
    devtool: 'nosources-source-map',
    output: {
        // VSCode extensions must be CommonJS modules.
        library: { type: 'commonjs2' },
        // The bundle is stored in dist/, whence "main" in package.json references it.
        path: fileURLToPath(new URL('dist', import.meta.url)),
        // Source map should resolve filenames relative to the root of the source tree.
        devtoolModuleFilenameTemplate: '../[resource-path]',
        // Chunking the output is unnecessary for a VSCode extension.
        chunkFormat: false
    },
    // Packages that shouldn't be bundled, and how the bundler should resolve references to them.
    externals: {
        // The "vscode" module is provided by VSCode itself and exposed via require().
        vscode: 'commonjs vscode'
    },
    resolve: {
        // File extensions to consider for extensionless imports, in order.
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: 'tsconfig.json'
                        }
                    }
                ]
            },
            {
                test: /\.node$/,
                loader: 'node-loader'
            },
            {
                // Extract and re-bundle source maps for JS files in node_modules.
                // Required to get correct line numbers for cdt-gdb-adapter tracebacks & debugging.
                test: /\.m?js$/,
                enforce: 'pre',
                use: ['source-map-loader']
            }
        ]
    }
};

export default config;
