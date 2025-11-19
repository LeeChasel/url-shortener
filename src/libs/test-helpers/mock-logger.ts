import { Logger } from '@nestjs/common';

export function mockLogger() {
  const methods = [
    'log',
    'error',
    'warn',
    'debug',
    'verbose',
    'fatal',
  ] as const;

  methods.forEach((method) => {
    jest.spyOn(Logger.prototype, method).mockImplementation();
  });
}

export function restoreLogger() {
  jest.restoreAllMocks();
}
