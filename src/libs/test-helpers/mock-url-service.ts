import { DeepMockProxy, mock } from 'jest-mock-extended';
import { UrlService } from 'src/url';

export type MockUrlService = DeepMockProxy<UrlService>;
export const createMockUrlService = () => mock<UrlService>();
