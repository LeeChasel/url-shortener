import { DeepMockProxy, mock } from 'jest-mock-extended';
import { MetadataService } from 'src/metadata';

export type MockMetadataService = DeepMockProxy<MetadataService>;
export const createMockMetadataService = () => mock<MetadataService>();
