import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const viteBin = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const servers = [
  spawn(process.execPath, [viteBin, "--host", "0.0.0.0"], { stdio: "inherit" }),
  spawn(process.execPath, [viteBin, "--config", "vite.http.config.ts"], { stdio: "inherit" }),
];

let stopping = false;
function stopAll(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const server of servers) {
    if (server.exitCode === null) server.kill();
  }
  process.exitCode = code;
}

for (const server of servers) {
  server.on("error", (error) => {
    console.error(error);
    stopAll(1);
  });
  server.on("exit", (code) => {
    if (!stopping) stopAll(code ?? 1);
  });
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
