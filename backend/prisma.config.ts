import "dotenv/config";
import { defineConfig, env } from "prisma/config";
var prisma_config_default = defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    url: env("DATABASE_URL"),
    // Only needed for `prisma migrate dev` / `migrate diff --from-migrations`.
    // Optional so ordinary CLI commands don't require it to be set.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL
  }
});
export {
  prisma_config_default as default
};
