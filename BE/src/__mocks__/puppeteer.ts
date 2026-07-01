// src/__mocks__/puppeteer.js
const mockPage = {
  setViewport: jest.fn(),
  setCacheEnabled: jest.fn(),
  goto: jest.fn(),
  emulateMediaType: jest.fn(),
  evaluate: jest.fn(),
  addStyleTag: jest.fn(),
  pdf: jest.fn().mockResolvedValue(Buffer.from('pdf-bytes')),
  close: jest.fn(),
};

const mockBrowser = {
  newPage: jest.fn().mockResolvedValue(mockPage),
  close: jest.fn(),
};

module.exports = {
  __esModule: true,
  default: {
    launch: jest.fn().mockResolvedValue(mockBrowser),
  },
};
