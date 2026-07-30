import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
process.env.NODE_ENV = "test";
const testEnvPath = path.resolve(import.meta.dirname, "../.env.test");
dotenv.config({ path: testEnvPath });
const testUrl = new URL(process.env.DATABASE_URL);
if (!testUrl.password) {
  const mainEnv = dotenv.parse(fs.readFileSync(path.resolve(import.meta.dirname, "../.env")));
  const mainUrl = new URL(mainEnv.DATABASE_URL);
  if (mainUrl.hostname === testUrl.hostname) {
    testUrl.username = mainUrl.username;
    testUrl.password = mainUrl.password;
    process.env.DATABASE_URL = testUrl.toString();
  }
}
if (!/akazi_test/.test(process.env.DATABASE_URL || "")) {
  throw new Error(
    "Refusing to run tests: DATABASE_URL is not the akazi_test database. Check .env.test.",
  );
}
