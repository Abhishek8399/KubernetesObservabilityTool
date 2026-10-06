import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill();
}
function run(args) {
  const child = spawn(process.execPath, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: "8788",
      PUBLIC_BASE_PATH: "/",
    },
  });
  children.push(child);
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code) => stop(code ?? 0));
  return child;
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop());
run(["--experimental-strip-types", "server/index.ts"]);
let healthy = false;
for (let i = 0; i < 30 && !stopping; i++) {
  try {
    const r = await fetch("http://127.0.0.1:8788/api/health");
    healthy = r.ok;
  } catch {
    /* The server may still be starting. */
  }
  if (healthy) break;
  await delay(200);
}
if (!healthy || stopping) {
  console.error("The local simulation backend did not start.");
  stop(1);
} else
  run([
    "node_modules/vite/bin/vite.js",
    "--config",
    "vite.static.config.ts",
    "--host",
    "127.0.0.1",
    "--port",
    "5180",
    "--strictPort",
  ]);
