import { spawn } from "node:child_process";
import { join } from "node:path";

const commands = [
  {
    name: "api",
    command: process.execPath,
    args: [join("server", "index.js")],
  },
  {
    name: "web",
    command: process.execPath,
    args: [join("node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1", "--port", "5173"],
  },
];

const children = commands.map(({ name, command, args }) => {
  const child = spawn(command, args, {
    env: process.env,
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    if (code !== 0 && signal == null) {
      console.error(`[${name}] exited with code ${code}`);
    }
  });

  return child;
});

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});
