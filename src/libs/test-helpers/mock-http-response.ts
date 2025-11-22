import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

export type MockResponse = jest.Mocked<Response>;
export const createMockResponse = () => mock<Response>();
