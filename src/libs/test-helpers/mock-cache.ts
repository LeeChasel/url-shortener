import { MockProxy, mock } from 'jest-mock-extended';
import { type Cache } from '@nestjs/cache-manager';

export type MockCacheManager = MockProxy<Cache>;

export const createMockCacheManager = (): MockCacheManager => {
  const mockCache = mock<Cache>();

  mockCache.get.mockResolvedValue(undefined);
  mockCache.set.mockResolvedValue(undefined);
  mockCache.del.mockResolvedValue(false);
  mockCache.clear.mockResolvedValue(false);

  return mockCache;
};
