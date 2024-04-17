import { z } from 'zod';

const envServerVarsSchema = z.object({
  DATABASE_URL: z.string(),
  DATABASE_AUTH_TOKEN: z.string().nullish(),
});

const envClientVarsSchema = z.object({});

export const ENV_SERVER_VARS = envServerVarsSchema.parse(process.env);
export const ENV_CLIENT_VARS = envClientVarsSchema.parse(process.env);

type Env = z.infer<typeof envServerVarsSchema> &
  z.infer<typeof envClientVarsSchema>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv extends Env {}
  }
}
