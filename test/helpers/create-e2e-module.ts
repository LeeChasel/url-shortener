import { forEach } from 'lodash';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService, PrismaModule, PrismaService } from 'src/libs';
import {
  createMockPrismaService,
  createMockConfigService,
  createMockCacheManager,
  type MockPrismaService,
  type MockConfigService,
  type MockCacheManager,
} from 'src/libs/test-helpers';

interface CreateE2EModuleOptions {
  imports: any[];
  providers?: { provide: any; useValue: any }[];
  mockPrisma?: MockPrismaService;
  mockConfig?: MockConfigService;
  mockCache?: MockCacheManager;
}

interface CreateE2EModuleResult {
  module: TestingModule;
  mocks: {
    prisma: MockPrismaService;
    config: MockConfigService;
    cache: MockCacheManager;
  };
}

/**
 * 建立 E2E 測試用的 NestJS module,自動 mock 所有 global services (Prisma, Config, Cache)
 * @returns 編譯後的 module 與所有 mock instances
 */
export const createE2EModule = async (
  options: CreateE2EModuleOptions,
): Promise<CreateE2EModuleResult> => {
  const mockPrisma = options.mockPrisma ?? createMockPrismaService();
  const mockConfig = options.mockConfig ?? createMockConfigService();
  const mockCache = options.mockCache ?? createMockCacheManager();

  const moduleBuilder = Test.createTestingModule({
    imports: [PrismaModule, ...options.imports],
  })
    .overrideProvider(PrismaService)
    .useValue(mockPrisma)
    .overrideProvider(ConfigService)
    .useValue(mockConfig)
    .overrideProvider(CACHE_MANAGER)
    .useValue(mockCache);

  forEach(options.providers, ({ provide, useValue }) => {
    moduleBuilder.overrideProvider(provide).useValue(useValue);
  });

  const module = await moduleBuilder.compile();

  return {
    module,
    mocks: {
      prisma: mockPrisma,
      config: mockConfig,
      cache: mockCache,
    },
  };
};
