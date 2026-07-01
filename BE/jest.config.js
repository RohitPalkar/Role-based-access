module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
  },
  moduleDirectories: ['node_modules', 'src'],
  modulePaths: ['<rootDir>'],
  testPathIgnorePatterns: ['/node_modules/'],
  setupFilesAfterEnv: [],
  transformIgnorePatterns: [
    'node_modules/(?!(puppeteer|@puppeteer)/)',
  ],
}; 