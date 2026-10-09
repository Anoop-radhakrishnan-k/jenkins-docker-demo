const assert = require("node:assert/strict");
const fs = require("node:fs");

const app = fs.readFileSync("app.js", "utf8");

assert.ok(app.includes("/health"), "Health endpoint exists");
assert.ok(app.includes("APP_VERSION"), "Version is configurable");
assert.ok(
    app.includes("Jenkins CI/CD Deployment Successful"),
    "Application page exists"
);

console.log("All application tests passed.");