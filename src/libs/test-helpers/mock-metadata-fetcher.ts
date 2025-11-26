import { DeepMockProxy, mock } from 'jest-mock-extended';
import { MetadataFetcher } from 'src/metadata';

export type MockMetadataFetcher = DeepMockProxy<MetadataFetcher>;
export const createMockMetadataFetcher = () => mock<MetadataFetcher>();
