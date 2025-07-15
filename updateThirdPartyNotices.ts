import * as fs from 'node:fs';
import path from 'node:path';
import * as licenseChecker from 'license-checker';

const crawlerOverridesFileName = '.crawler-overrides.json';

// This section is intentionally manually maintained. When you update a version number
// please also ensure that you look up any additional files that need to be included
// in our third-party-notices.txt file
const additionalFiles = [
    { name: '@vscode/debugadapter', version: '1.67.0', files: ['thirdpartynotices.txt'] },
    { name: '@vscode/debugprotocol', version: '1.67.0', files: [] },
    { name: 'axios', version: '1.7.6', files: [] },
    { name: 'cdt-gdb-adapter', version: '0.0.19', files: [] },
    { name: 'uuid', version: '10.0.0', files: [] },
    { name: 'which', version: '3.0.1', files: [] },
    { name: 'combined-stream', version: '1.0.8', files: [] },
    { name: 'delayed-stream', version: '1.0.0', files: [] },
    { name: 'asynckit', version: '0.4.0', files: [] },
    { name: 'follow-redirects', version: '1.15.6', files: [] },
    { name: 'form-data', version: '4.0.0', files: [] },
    { name: 'fs-extra', version: '11.2.0', files: [] },
    { name: 'graceful-fs', version: '4.2.11', files: [] },
    { name: 'isexe', version: '2.0.0', files: [] },
    { name: 'jsonfile', version: '6.1.0', files: [] },
    { name: 'mime-db', version: '1.52.0', files: [] },
    { name: 'mime-types', version: '2.1.35', files: [] },
    { name: 'proxy-from-env', version: '1.1.0', files: [] },
    { name: 'universalify', version: '2.0.1', files: [] }
];

function getPackageNameAndVersion(packageName: string): { name: string; version: string } {
    const match = packageName.match(/(.*)@([\d.]*)/);
    return match ? { name: match[1], version: match[2] } : { name: packageName, version: '' };
}

function readJsonFile(filePath: string): any {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        console.error(`Failed to read JSON file at ${filePath}: ${(error as Error).message}`);
        throw error;
    }
}

async function fetchLicenseContent(licenseFile: string): Promise<string> {
    if (licenseFile.toLowerCase().startsWith('http://') || licenseFile.toLowerCase().startsWith('https://')) {
        const fetch = await import('node-fetch');
        const response = await fetch.default(licenseFile);
        return await response.text();
    } else {
        return fs.readFileSync(licenseFile, 'utf8');
    }
}

function crawlLicenseInformation(workspaceFolder: string, mainPackage: string): Promise<licenseChecker.ModuleInfos> {
    return new Promise((resolve, reject) => {
        licenseChecker.init(
            {
                start: workspaceFolder,
                production: true,
                development: false,
                direct: false,
                unknown: true,
                excludePackages: mainPackage
            },
            (error, moduleInfos) => {
                if (error) {
                    reject(error);
                }
                resolve(moduleInfos);
            }
        );
    });
}

async function updateThirdPartyNotices(workingDirectory: string, outFile: string): Promise<void> {
    try {
        const packageDefinition = readJsonFile(path.resolve(workingDirectory, 'package.json'));
        console.log('Crawling license information...');

        const moduleInfos = await crawlLicenseInformation(workingDirectory, `${packageDefinition.name}@${packageDefinition.version}`);
        let generatedContent = `${packageDefinition.displayName} incorporates third-party components listed below:\n`;

        // Used to separate pacakges
        const starSeparator = `\n${'*'.repeat(80)}\n`;

        // Used to separate additional files associated with package information
        const dashSeparator = `\n${'-'.repeat(80)}\n\n`;

        const crawlerOverrides = fs.existsSync(crawlerOverridesFileName) ? readJsonFile(crawlerOverridesFileName) : {};

        const packageNames = Object.keys(moduleInfos);
        console.log(`${packageNames.length} packages found.`);

        for (const packageName of packageNames) {
            const { name: barePackageName, version } = getPackageNameAndVersion(packageName);
            const moduleInfo = moduleInfos[packageName];
            process.stdout.write(`Processing package: ${packageName}...`);

            if (crawlerOverrides[barePackageName]) {
                Object.assign(moduleInfo, crawlerOverrides[barePackageName]);
            }

            if (moduleInfo['licenses'] === 'UNKNOWN') {
                console.error(`License information unknown for package "${packageName}"`);
                continue;
            }

            const licenseFile = moduleInfo.licenseFile;
            if (!licenseFile) {
                console.error(`No license file found for package "${packageName}"`);
                continue;
            }

            const licenseContents = await fetchLicenseContent(licenseFile);
            const headerData = [starSeparator, packageName, `Publisher: ${moduleInfo.publisher}`, `Repository: ${moduleInfo.repository}`, `License: ${moduleInfo.licenses}`, 'License text:', '', ''].join('\n');
            generatedContent += headerData;
            generatedContent += licenseContents;

            // Check for additional files
            const additionalFileConfig = additionalFiles.find((config) => config.name === barePackageName && config.version === version);

            if (additionalFileConfig) {
                for (const file of additionalFileConfig.files) {
                    const filePath = path.resolve(workingDirectory, 'node_modules', barePackageName, file);
                    if (fs.existsSync(filePath)) {
                        const fileContents = fs.readFileSync(filePath, 'utf8');
                        generatedContent += dashSeparator;
                        generatedContent += fileContents;
                        generatedContent += '\n';
                    } else {
                        console.error(`Expected file ${file} not found for package ${barePackageName}@${version}`);
                    }
                }
            } else {
                console.error(' error!');
                throw new Error(`Version mismatch or missing additional file configuration for package ${barePackageName}@${version}`);
            }

            process.stdout.write(' done.\n');
        }

        // Read existing file content if it exists
        let currentContent = '';
        if (fs.existsSync(outFile)) {
            currentContent = fs.readFileSync(outFile, 'utf8');
        }

        // Write to file only if content has changed
        if (currentContent !== generatedContent) {
            fs.writeFileSync(outFile, generatedContent, 'utf8');
            console.log(`Third-party notices updated successfully in '${outFile}'.`);
        } else {
            console.log(`Third-party notices in '${outFile}' are already up-to-date.`);
        }
    } catch (error) {
        console.error('An internal error occurred while crawling license data:');
        console.error((error as Error).stack);

        // This is a command line tool, so this is appropriate error handling.
        // eslint-disable-next-line unicorn/no-process-exit
        process.exit(1);
    }
}

// Get the path from the command-line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('Please provide the path to the working directory as an argument.');

    // This is a command line tool, so this is appropriate error handling.
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1);
}
const workingDirectory = args[0];
const thirdPartyNoticesPath = path.resolve(workingDirectory, 'third-party-notices.txt');

// Unable to compile with top-level await due to CommonJS module resolution
// eslint-disable-next-line unicorn/prefer-top-level-await
(async () => {
    await updateThirdPartyNotices(workingDirectory, thirdPartyNoticesPath);
})();
