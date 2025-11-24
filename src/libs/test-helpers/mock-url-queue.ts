import { DeepMockProxy, mock } from 'jest-mock-extended';
import { UrlQueueProducer } from 'src/url';

export type MockUrlQueueProducer = DeepMockProxy<UrlQueueProducer>;
export const createMockUrlQueueProducer = () => mock<UrlQueueProducer>();
