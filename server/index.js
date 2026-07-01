import { createServer } from "node:http";
import {
  ApiError,
  addHealthLog,
  ensureDb,
  enhanceTriage,
  generateCarePlan,
  generateReport,
  getAiProviderStatus,
  getBootstrapData,
  getUserByToken,
  loginUser,
  logoutUser,
  registerUser,
  updateReminder,
  updateTraining,
} from "./store.js";

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "127.0.0.1";

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError(400, "请求体不是合法 JSON", "invalid_json");
  }
}

function notFound(res) {
  sendJson(res, 404, { error: { code: "not_found", message: "接口不存在" } });
}

function getBearerToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return "";
  return header.slice("Bearer ".length).trim();
}

async function requireUser(req) {
  return getUserByToken(getBearerToken(req));
}

async function handleRequest(req, res) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? `${host}:${port}`}`);
  const pathname = url.pathname;

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === "GET" && pathname === "/api/health") {
    sendJson(res, 200, { ok: true, service: "pet-health-api", time: new Date().toISOString() });
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/register") {
    sendJson(res, 201, await registerUser(await readJson(req)));
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/login") {
    sendJson(res, 200, await loginUser(await readJson(req)));
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/logout") {
    sendJson(res, 200, await logoutUser(getBearerToken(req)));
    return;
  }

  if (req.method === "GET" && pathname === "/api/me") {
    sendJson(res, 200, { user: await requireUser(req) });
    return;
  }

  if (req.method === "GET" && pathname === "/api/ai/status") {
    await requireUser(req);
    sendJson(res, 200, getAiProviderStatus());
    return;
  }

  if (req.method === "GET" && pathname === "/api/bootstrap") {
    const user = await requireUser(req);
    sendJson(res, 200, await getBootstrapData(user.id));
    return;
  }

  if (req.method === "POST" && pathname === "/api/logs") {
    const user = await requireUser(req);
    sendJson(res, 201, { log: await addHealthLog(user.id, await readJson(req)) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/triage") {
    const user = await requireUser(req);
    const body = await readJson(req);
    sendJson(res, 200, await enhanceTriage(user.id, body));
    return;
  }

  if (req.method === "POST" && pathname === "/api/ai/triage") {
    const user = await requireUser(req);
    sendJson(res, 200, await enhanceTriage(user.id, await readJson(req)));
    return;
  }

  const carePlanMatch = pathname.match(/^\/api\/pets\/([^/]+)\/care-plan$/);
  if (req.method === "GET" && carePlanMatch) {
    const user = await requireUser(req);
    sendJson(res, 200, await generateCarePlan(user.id, decodeURIComponent(carePlanMatch[1])));
    return;
  }

  const reminderMatch = pathname.match(/^\/api\/reminders\/([^/]+)$/);
  if (req.method === "PATCH" && reminderMatch) {
    const user = await requireUser(req);
    sendJson(res, 200, { reminder: await updateReminder(user.id, decodeURIComponent(reminderMatch[1]), await readJson(req)) });
    return;
  }

  const trainingMatch = pathname.match(/^\/api\/training\/([^/]+)$/);
  if (req.method === "PATCH" && trainingMatch) {
    const user = await requireUser(req);
    sendJson(res, 200, { training: await updateTraining(user.id, decodeURIComponent(trainingMatch[1]), await readJson(req)) });
    return;
  }

  const reportMatch = pathname.match(/^\/api\/pets\/([^/]+)\/report$/);
  if (req.method === "GET" && reportMatch) {
    const user = await requireUser(req);
    sendJson(res, 200, await generateReport(user.id, decodeURIComponent(reportMatch[1])));
    return;
  }

  notFound(res);
}

await ensureDb();

const server = createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    if (error instanceof ApiError) {
      sendJson(res, error.status, { error: { code: error.code, message: error.message } });
      return;
    }
    console.error(error);
    sendJson(res, 500, { error: { code: "internal_error", message: "服务器内部错误" } });
  });
});

server.listen(port, host, () => {
  console.log(`Pet Health API listening on http://${host}:${port}`);
});
