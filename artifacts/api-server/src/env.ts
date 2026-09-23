import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default("*"),
  DATABASE_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(target: Record<string, string | undefined> = process.env): Env {
  const parsed = envSchema.safeParse(target);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.format());
    throw new Error("Invalid environment configuration.");
  }
  return parsed.data;
}

export const env = parseEnv(process.env);
