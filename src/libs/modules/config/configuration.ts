import { z } from 'zod';

const DEFAULT_APP_PORT = 3000;

const configSchema = z.object({
  APP_PORT: z.coerce.number().int().min(1).max(65535).default(DEFAULT_APP_PORT),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
});

export type ConfigSchema = z.infer<typeof configSchema>;

export default () => {
  const config = configSchema.safeParse(process.env);
  if (!config.success) {
    const errMsg = `Invalid environment variables: ${z.prettifyError(
      config.error,
    )}`;
    console.error(errMsg);
    throw new Error(errMsg);
  }

  return config.data;
};
