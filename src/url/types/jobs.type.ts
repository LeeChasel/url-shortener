export type UrlJobs = { name: 'url:redirected'; data: { shortCode: string } };

export type UrlJobName = UrlJobs['name'];
export type UrlJobData<T extends UrlJobName> = Extract<
  UrlJobs,
  { name: T }
>['data'];
