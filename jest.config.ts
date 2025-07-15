import { type JestConfigWithTsJest } from 'ts-jest';

export default {
    testEnvironment: 'node',
    testMatch: ['<rootDir>/src/test/**/*.test.ts'],
    transform: {
        '^.+.m?[jt]sx?$': ['ts-jest', { tsconfig: '<rootDir>/src/test/tsconfig.json' }]
    },
    transformIgnorePatterns: [],
    setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
    testTimeout: 10_000
} satisfies JestConfigWithTsJest;
