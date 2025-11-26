import { FetchStatus } from 'generated/prisma';

export type OpenGraphMetadata = {
  title: string;
  description: string;
  image?: string;
  siteName?: string;
  type?: string;
  locale?: string;
};

export type MetadataFetchResult =
  | {
      status: Extract<FetchStatus, 'SUCCESS'>;
      metadata: OpenGraphMetadata;
    }
  | {
      status: Extract<FetchStatus, 'NO_METADATA'>;
    }
  | {
      status: Extract<FetchStatus, 'FAILED'>;
      error: Error;
    };
