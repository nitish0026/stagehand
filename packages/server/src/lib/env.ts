import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

// Temporarily defining here until browserbase zod package is updated to 3.25.0+
// "remote" indicates a self‑hosted/remote deployment where the server
// still handles sessions locally but may be managed by external infra.
const bbEnvSchema = z.enum(["local", "dev", "prod", "remote"]);

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production", "staging", "test"]),
    BB_ENV: bbEnvSchema,
  },
  client: {},
  clientPrefix: "PUBLIC_",
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    BB_ENV: process.env.BB_ENV,
  },
});
