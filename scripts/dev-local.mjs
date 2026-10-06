import { spawn } from "node:child_process";
const children = [];
let ending = false;
function run(file, args = [], env = {}) {
  const c = spawn(process.execPath, [file, ...args], {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  children.push(c);
  c.on("exit", () => {
    if (!ending) stop();
  });
  return c;
}
function stop() {
  ending = true;
  for (const c of children) c.kill("SIGTERM");
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
const bots = process.argv.includes("--bots");
const port = process.env.CAMPUS_LOCAL_PORT || "8787";
const vitePort = process.env.CAMPUS_VITE_PORT || "5173";
run("tests/local-server.mjs", [], {
  CAMPUS_ENABLE_TEST_BOTS: bots ? "true" : "false",
  CAMPUS_VITE_PORT: vitePort,
});
run(
  "node_modules/vite/bin/vite.js",
  ["--host", "127.0.0.1", "--port", vitePort, "--strictPort"],
  {
    VITE_LOCAL_SERVER_URL: `http://localhost:${port}`,
    VITE_ENABLE_TEST_BOTS: bots ? "true" : "false",
  },
);
