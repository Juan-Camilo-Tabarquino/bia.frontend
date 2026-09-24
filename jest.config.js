module.exports = {
  moduleNameMapper: {
    "\\.(scss|sass|css)$": "identity-obj-proxy"
  },
  testEnvironment: 'jsdom',
  transform: {'\.tsx?$': 'ts-jest'},
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'scss'],
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts?(x)'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};