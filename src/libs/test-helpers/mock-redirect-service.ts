import { DeepMockProxy, mock } from 'jest-mock-extended';
import { RedirectService } from 'src/redirect';

export type MockRedirectService = DeepMockProxy<RedirectService>;
export const createMockRedirectService = () => mock<RedirectService>();
