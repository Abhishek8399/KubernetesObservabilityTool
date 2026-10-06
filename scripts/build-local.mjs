import { spawnSync } from "node:child_process";
const result = spawnSync(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "build",
    "--config",
    "vite.static.config.ts",
  ],
  { stdio: "inherit", env: { ...process.env, PUBLIC_BASE_PATH: "/" } },
);
if (result.error) {
  console.error(result.error.message);
  process.exitCode = 1;
} else process.exitCode = result.status ?? 1;
