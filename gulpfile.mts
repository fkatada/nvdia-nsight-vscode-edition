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

import { chmod, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import spawn from 'await-spawn';
import { deleteAsync } from 'del';
import { move, readJson, remove, writeJson } from 'fs-extra/esm';
import gulp, { type TaskFunction, type TaskFunctionCallback } from 'gulp';
import * as execa from 'gulp-execa';
import * as semver from 'semver';
import * as vsce from '@vscode/vsce';
import webpack from 'webpack';
import { merge } from 'webpack-merge';
import makeArgv, * as yargs from 'yargs';
import webpackProdConfig from './webpack.prod.mts';

const argv = makeArgv(process.argv.slice(2));

const exportOptions = ['Public', 'Internal', 'NDA'] as const;
const configOptions = ['Release', 'Debug'] as const;

const testProgramsBase = 'src/test/testPrograms/';
const licenseFileName = 'LICENSE';
const thirdPartyNoticesFileName = 'third-party-notices.txt';
const webpackLicenseFileName = 'extension.js.LICENSE.txt';

const webpackOutputUrl = new URL('dist/', import.meta.url);

type OptionDefinitions = { [key: string]: yargs.Options } | undefined;

type TaskDefinition<OD extends OptionDefinitions> = {
    displayName: string;
    description?: string;
    options?: OD;
};

type TaskResult = ReturnType<TaskFunction>;

/*
 * Strongly typed builder for Gulp tasks.
 * Given the yargs options definition in def.options, it automatically generates flags for the task,
 * and exposes the strongly typed yargs parse result to the task function via `this`.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function task<const OD extends OptionDefinitions>(def: TaskDefinition<OD>) {
    const { options } = def;
    if (options === undefined) {
        return task({ ...def, options: {} });
    }

    const flags = Object.fromEntries(
        Object.entries(options).map(([name, option]) => {
            const arg = option.choices ? option.choices.map((s) => JSON.stringify(s)).join(' | ') : `<${option.type}>`;

            let key = `--${name} ${arg}`;
            if (!option.demandOption) {
                key = `[${key}]`;
            }

            let description = option.description ?? '';
            if (option.default !== undefined) {
                description += ` (default: ${JSON.stringify(option.default)})`;
            }

            return [key, description];
        })
    );

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const parseArgv = () => argv.options(options).parseSync();

    type UnboundTaskFunction = (this: ReturnType<typeof parseArgv>, callback: TaskFunctionCallback) => TaskResult;

    return {
        does<F extends UnboundTaskFunction>(func: F): TaskFunction {
            const taskFunc: TaskFunction = (callback) => {
                const boundFunc = func.bind(parseArgv());
                return boundFunc(callback);
            };
            taskFunc.displayName = def.displayName;
            taskFunc.description = def.description;
            if (flags) {
                taskFunc.flags = flags;
            }
            return taskFunc;
        }
    };
}

async function webpackAsync(firstConfiguration: webpack.Configuration | webpack.Configuration[], ...configurations: webpack.Configuration[]): Promise<void> {
    const config = merge(firstConfiguration, ...configurations);
    const compiler = webpack(config);
    const stats = await promisify(compiler.run).call(compiler);

    if (stats) {
        console.log(
            stats.toString({
                chunks: false,
                colors: true
            })
        );
    }

    if (!stats || stats.hasErrors() || stats.hasWarnings()) {
        throw new Error('Errors/warnings present after compiling for webpack.');
    }
}

function getDayOfYear(date?: Date): number {
    const startDate = date ?? new Date();
    const firstDate = new Date(startDate.getFullYear(), 0, 1);
    const msInDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor((startDate.getTime() - firstDate.getTime()) / msInDay);
    return dayOfYear;
}

function updateVersion(packageJson: any, patchNumber: number): void {
    const version = semver.parse(packageJson.version);
    if (!version) {
        throw new Error(`Version '${packageJson.version}' is not in a correct format`);
    }

    const newVersion = `${version.major}.${version.minor}.${patchNumber}`;
    packageJson.version = newVersion;
}

export const compileTestsTask = task({
    displayName: 'compile:tests',
    description: 'Compile all test programs'
}).does(async function () {
    await execa.exec('make', { cwd: testProgramsBase });
});

export const cleanTestsTask = task({
    displayName: 'clean:tests'
}).does(async function () {
    await execa.exec('make clean', { cwd: testProgramsBase });
});

export const recompileTestsTask = task({
    displayName: 'recompile:tests',
    description: 'Delete all test artifacts and recompile the tests'
}).does(gulp.series(cleanTestsTask, compileTestsTask));

export const cleanWebpackTask = task({
    displayName: 'clean:webpack',
    description: 'Clean artifacts generated by webpack'
}).does(async function () {
    await deleteAsync(['dist']);
});

export const packageTask = task({
    displayName: 'package',
    description: 'Package extension into a deployable .vsix',
    options: {
        exportLevel: {
            choices: exportOptions,
            default: 'Public'
        },
        config: {
            choices: configOptions,
            default: 'Release'
        },
        changelist: {
            type: 'number',
            description: 'The current P4 changelist number to derive version number from; if not specified, version is derived from current date.'
        }
    }
}).does(async function () {
    const patchNumber = this.changelist ?? getDayOfYear();

    // Update patch number in package.json for .vsix package, then revert
    // to original version

    try {
        await copyFile('package.json', '__package.json');
        await chmod('package.json', 0o666);

        const packageJson = await readJson('package.json');
        updateVersion(packageJson, patchNumber);
        await writeJson('package.json', packageJson, { spaces: 4 });

        await webpackAsync(webpackProdConfig);

        const original = {
            licenseFileUrl: new URL(licenseFileName, import.meta.url),
            thirdPartyNoticesFileUrl: new URL(thirdPartyNoticesFileName, import.meta.url)
        };
        const webpackOutput = {
            licenseFileUrl: new URL(licenseFileName, webpackOutputUrl),
            mangledlicenseFileUrl: new URL(webpackLicenseFileName, webpackOutputUrl),
            thirdPartyNoticesFileUrl: new URL(thirdPartyNoticesFileName, webpackOutputUrl)
        };

        await remove(fileURLToPath(webpackOutput.mangledlicenseFileUrl));
        await copyFile(original.licenseFileUrl, webpackOutput.licenseFileUrl);
        await copyFile(original.thirdPartyNoticesFileUrl, webpackOutput.thirdPartyNoticesFileUrl);

        const vsixFileName = `${packageJson.name}-${packageJson.version}.vsix`;
        await vsce.createVSIX({
            packagePath: vsixFileName,
            baseImagesUrl: 'https://developer.nvidia.com/sites/default/files/akamai/tools/nsvsce'
        });

        const zipFileName = `Rubicon-${this.exportLevel}-${this.config}.zip`;
        await spawn('zip', [zipFileName, vsixFileName]);
    } finally {
        await move('__package.json', 'package.json', { overwrite: true });
    }
});

export const cleanPackageTask = task({
    displayName: 'clean:package'
}).does(async function () {
    await deleteAsync(['*.vsix', 'Rubicon*.zip']);
});

export const cleanOutputTask = task({
    displayName: 'clean:out',
    description: 'Delete all files under out/'
}).does(async function () {
    await deleteAsync(['out']);
});

export const cleanTask = task({
    displayName: 'clean',
    description: 'Delete all build/test/publish artifacts'
}).does(
    gulp.parallel(
        //
        gulp.series(cleanTestsTask, cleanOutputTask),
        cleanWebpackTask,
        cleanPackageTask
    )
);
