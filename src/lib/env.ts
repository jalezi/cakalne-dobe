import { z } from "zod";

const envServerVarsSchema = z.object({
  NODE_ENV: z.string(),
  WAITING_TIMES_URL: z.string(),
});

const envClientVarsSchema = z.object({});

export const ENV_SERVER_VARS = envServerVarsSchema.parse(process.env);
export const ENV_CLIENT_VARS = envClientVarsSchema.parse(process.env);

type Env = z.infer<typeof envServerVarsSchema> &
  z.infer<typeof envClientVarsSchema>;

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Env {}
  }
}
