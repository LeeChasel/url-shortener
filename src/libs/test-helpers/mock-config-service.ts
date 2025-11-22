// src/libs/test-helpers/mock-config-service.helper.ts
import { MockProxy, mock } from 'jest-mock-extended';
import { ConfigService } from 'src/libs/modules/config/config.service';
import { ConfigSchema } from '../modules/config/configuration';

export type MockConfigService = MockProxy<ConfigService>;

export const createMockConfigService = (
  overrides?: Partial<ConfigSchema>,
): MockConfigService => {
  const mockConfig = mock<ConfigService>();

  const config: ConfigSchema = {
    NODE_ENV: 'development',
    APP_PORT: 3000,
    BASE_URL: 'http://localhost:3000',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    ENABLE_SCHEDULER: false,
    ...overrides,
  };

  mockConfig.get.mockImplementation(
    <K extends keyof ConfigSchema>(key: K): ConfigSchema[K] => config[key],
  );

  return mockConfig;
};
