import { createAppServer } from "./http.ts";
const port = Number(process.env.PORT ?? 8788);
const host = process.env.HOST ?? "127.0.0.1";
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT must be an integer from 1 to 65535.");
if (!["127.0.0.1", "0.0.0.0", "::1"].includes(host))
  throw new Error("HOST must be 127.0.0.1, ::1, or 0.0.0.0.");
const server = createAppServer();
server.on("error", (error) => {
  console.error("Local simulation server:", error.message);
  process.exitCode = 1;
});
server.listen(port, host, () =>
  console.log(
    `Kubernetes simulation app: http://${host === "::1" ? "[::1]" : host}:${port}/`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    server.close();
    server.closeIdleConnections();
  });
