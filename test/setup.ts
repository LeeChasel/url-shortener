// Mock BullMQ to prevent Redis connections during tests
jest.mock('bullmq', () => {
  const mockQueue = jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({}),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  }));

  const mockWorker = jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  }));

  return {
    Queue: mockQueue,
    Worker: mockWorker,
  };
});
