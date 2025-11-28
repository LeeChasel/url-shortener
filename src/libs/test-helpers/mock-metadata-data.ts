import type { OpenGraphMetadata } from 'src/metadata/types';

/**
 * Factory function to create mock OpenGraph metadata objects for testing
 *
 * @param overrides - Partial metadata to override default values
 * @returns Complete OpenGraphMetadata object
 */
export const createMockOpenGraphMetadata = (
  overrides?: Partial<OpenGraphMetadata>,
): OpenGraphMetadata => ({
  title: 'Example Title',
  description: 'Example Description',
  image: 'https://example.com/image.jpg',
  siteName: 'Example Site',
  type: 'website',
  locale: 'en_US',
  ...overrides,
});
