import { MetadataFetcher } from '../interfaces/metadata-fetcher.interface';
import { MetadataFetchResult } from '../types';
import ogs from 'open-graph-scraper';
import { first, isEmpty } from 'lodash';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MetadataFetcherAdapter implements MetadataFetcher {
  async fetchMetadata(url: string): Promise<MetadataFetchResult> {
    try {
      const { result, error } = await ogs({
        url: url,
        timeout: 10,
        onlyGetOpenGraphInfo: true,
      });

      // Cannot access the URL
      if (error && !result) {
        return {
          status: 'FAILED',
          error: new Error(
            `Failed to fetch metadata, cannot access URL: ${url}`,
          ),
        };
      }

      if (!result || isEmpty(result)) {
        return {
          status: 'NO_METADATA',
        };
      }

      // At least one of title or description must be present
      if (!result.ogTitle && !result.ogDescription) {
        return {
          status: 'NO_METADATA',
        };
      }

      return {
        status: 'SUCCESS',
        metadata: {
          title: result.ogTitle!,
          description: result.ogDescription!,
          image: first(result.ogImage)?.url,
          siteName: result.ogSiteName,
          type: result.ogType,
          locale: result.ogLocale,
        },
      };
    } catch (error) {
      throw new Error(`Metadata fetch failed: ${(error as Error).message}`);
    }
  }
}
