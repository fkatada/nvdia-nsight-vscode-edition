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

module.exports = {
    parserOptions: {
        ecmaVersion: 2022,
        project: true,
        sourceType: 'module',
        tsconfigRootDir: __dirname
    },
    settings: {
        // Resolve warning (https://github.com/yannickcr/eslint-plugin-react/issues/1955)
        react: {
            version: 'latest'
        }
    },
    plugins: ['@typescript-eslint', 'eslint-comments', 'import', 'prettier', 'promise', 'unicorn'],
    extends: ['plugin:@typescript-eslint/strict', 'plugin:eslint-comments/recommended', 'plugin:promise/recommended', 'plugin:unicorn/recommended', 'prettier'],
    rules: {
        // TODO: Temporary during early development, re-enable this once we have logging
        'no-console': 'off',

        // Allow function declaration hoisting
        '@typescript-eslint/no-use-before-define': ['error', { functions: false, classes: true, variables: true }],

        // Prefer named exports, regardless of how many exports there are
        'import/prefer-default-export': 'off',

        // Allow referencing devDependencies in tests and development scripts
        'import/no-extraneous-dependencies': [
            'error',
            {
                devDependencies: ['gulpfile*.*', 'webpack.*', 'src/test/**/*.ts', 'updateThirdPartyNotices.ts']
            }
        ],

        // Allow property names such as `_foo`.
        // Rationale: this is the de facto convention for accessor-backing properties.
        'no-underscore-dangle': 'off',

        // Allow `return await`.
        // Rationale: explicit `await` makes function part of the callstack, which improves stacktraces.
        'no-return-await': 'off',

        // Allow multiple variables in a single `let` or `var` statement.
        // Rationale: it's exactly like function parameters.
        'one-var': 'off',

        // Do not complain about `let ... = undefined`.
        // Rationale: while a no-op, it is useful to clarify intent.
        'no-undef-init': 'off',
        'unicorn/no-useless-undefined': 'off',

        // Do not complain about if (!x) and if (x != y).
        // Rationale: sometimes negated conditions are more readable.
        'unicorn/no-negated-condition': 'off',

        // Do not complain about (await foo).bar.
        // Rationale: simple one-liners can become less readable when broken up.
        'unicorn/no-await-expression-member': 'off',

        radix: 'off',

        // Make Prettier settings lint rules
        'prettier/prettier': ['error'],

        // Prefer specifying return types, but don't require it for inline expressions
        '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],

        // Similar to 'no-use-before-define' above but disallowing using typedefs before they are declared
        '@typescript-eslint/no-use-before-define': ['error', { functions: false, classes: true, variables: true, typedefs: true }],

        '@typescript-eslint/no-explicit-any': 'off',

        // Default is 'kebab-case' but we prefer camel-case
        'unicorn/filename-case': [
            'error',
            {
                case: 'camelCase'
            }
        ],

        'unicorn/prefer-trim-start-end': 'off',

        // Allow abbreviations (judiciously)
        'unicorn/prevent-abbreviations': 0
    }
};
