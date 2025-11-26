import { MetadataFetchResult } from '../types/metadata.type';

export interface MetadataFetcher {
  fetchMetadata(url: string): Promise<MetadataFetchResult>;
}

export const METADATA_FETCHER = Symbol('METADATA_FETCHER');
