import test from "node:test";
import assert from "node:assert/strict";
import { parseEnv } from "./env";

test("parseEnv parses valid environment variables", () => {
  const result = parseEnv({
    NODE_ENV: "production",
    PORT: "8080",
    CORS_ORIGIN: "https://example.com",
  });

  assert.equal(result.NODE_ENV, "production");
  assert.equal(result.PORT, 8080);
  assert.equal(result.CORS_ORIGIN, "https://example.com");
});

test("parseEnv uses sensible defaults when variables are missing", () => {
  const result = parseEnv({});

  assert.equal(result.NODE_ENV, "development");
  assert.equal(result.PORT, 3000);
  assert.equal(result.CORS_ORIGIN, "*");
});
