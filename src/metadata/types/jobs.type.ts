export type MetadataJobs = {
  name: 'metadata:fetch';
  data: { urlId: number; url: string };
};

export type MetadataJobName = MetadataJobs['name'];
export type MetadataJobData<T extends MetadataJobName> = Extract<
  MetadataJobs,
  { name: T }
>['data'];
