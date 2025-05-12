module.exports = {
  testEnvironment: 'node',
  preset: 'ts-jest',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleDirectories: ['node_modules', '<rootDir>'],
  testMatch: ['**/services/**/*.test.ts'],
  collectCoverageFrom: [
    'lib/db/services/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
}; 