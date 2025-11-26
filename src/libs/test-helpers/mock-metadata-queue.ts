import { DeepMockProxy, mock } from 'jest-mock-extended';
import { MetadataQueueProducer } from 'src/metadata/queue';

export type MockMetadataQueueProducer = DeepMockProxy<MetadataQueueProducer>;
export const createMockMetadataQueueProducer = () =>
  mock<MetadataQueueProducer>();
