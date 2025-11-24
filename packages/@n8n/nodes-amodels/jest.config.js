/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/test'],
    collectCoverageFrom: ['nodes/**/*.ts', '!**/*.d.ts'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    clearMocks: true,
};

