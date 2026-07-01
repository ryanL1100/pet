import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "data");
const seedPath = join(dataDir, "seed.json");
const dbPath = join(dataDir, "db.json");

const requiredCollections = ["pets", "logs", "reminders", "training", "expenses", "services"];

export class ApiError extends Error {
  constructor(status, message, code = "api_error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function getRiskLabel(risk) {
  if (risk === "high") return "高风险";
  if (risk === "medium") return "需关注";
  return "稳定";
}

export function metricText(value) {
  if (value >= 5) return "很好";
  if (value >= 4) return "正常";
  if (value >= 3) return "一般";
  return "偏低";
}

export function calculateRisk(input) {
  const text = `${input.stool ?? ""} ${input.symptom ?? ""} ${input.note ?? ""} ${input.text ?? ""}`.toLowerCase();
  const highSignals = ["抽搐", "呼吸困难", "便血", "尿不出", "持续呕吐", "昏迷", "误食", "中毒", "不吃不喝"];
  const mediumSignals = ["呕吐", "腹泻", "咳", "跛", "抓挠", "皮肤", "耳", "软便", "嗜睡", "食欲下降"];
  const appetite = Number(input.appetite ?? 4);
  const hydration = Number(input.hydration ?? 4);
  const mood = Number(input.mood ?? 4);
  const score =
    (appetite <= 2 ? 2 : 0) +
    (hydration <= 2 ? 1 : 0) +
    (mood <= 2 ? 2 : 0) +
    (highSignals.some((signal) => text.includes(signal)) ? 4 : 0) +
    (mediumSignals.some((signal) => text.includes(signal)) ? 2 : 0);

  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  return "low";
}

export function triageText(text) {
  const lowered = String(text ?? "");
  const risk = calculateRisk({
    text: lowered,
    symptom: lowered,
    note: lowered,
    appetite: lowered.includes("不吃") || lowered.includes("食欲下降") ? 2 : 4,
    mood: lowered.includes("嗜睡") || lowered.includes("没精神") ? 2 : 4,
  });

  const copy = {
    high: {
      title: "建议尽快联系兽医",
      advice: "出现急性、持续或排泄异常时，应优先线下就医。请准备近期饮食、排便、用药和照片/视频。",
    },
    medium: {
      title: "建议持续观察并准备就医信息",
      advice: "记录症状持续时间、频率、饮食饮水、精神状态和触发场景；若加重或超过 24 小时未改善，建议预约检查。",
    },
    low: {
      title: "当前可继续日常观察",
      advice: "保持健康日记记录；若症状加重、反复出现或伴随食欲/精神明显变化，再升级处理。",
    },
  };

  return {
    risk,
    label: getRiskLabel(risk),
    ...copy[risk],
    vetSummary: "宠物基础资料、症状出现时间、饮食饮水变化、排便情况、近期用药、照片或视频。",
  };
}

export async function ensureDb() {
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(dbPath)) {
    const seed = await readFile(seedPath, "utf8");
    await writeFile(dbPath, seed, "utf8");
  }
}

export async function readDb() {
  await ensureDb();
  const raw = await readFile(dbPath, "utf8");
  const db = JSON.parse(raw);
  for (const key of requiredCollections) {
    if (!Array.isArray(db[key])) {
      throw new ApiError(500, `数据文件缺少 ${key} 集合`, "invalid_db");
    }
  }
  return db;
}

async function writeDb(db) {
  const tmpPath = `${dbPath}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  await rename(tmpPath, dbPath);
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function assertString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(400, `${field} 不能为空`, "invalid_payload");
  }
  return value.trim();
}

function assertScore(value, field) {
  const score = Number(value);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new ApiError(400, `${field} 必须是 1-5 的整数`, "invalid_payload");
  }
  return score;
}

export async function getBootstrapData() {
  return readDb();
}

export async function addHealthLog(payload) {
  const db = await readDb();
  const petId = assertString(payload?.petId, "petId");
  const pet = db.pets.find((item) => item.id === petId);
  if (!pet) {
    throw new ApiError(404, "宠物不存在", "pet_not_found");
  }

  const log = {
    id: makeId("log"),
    petId,
    date: assertString(payload.date, "date"),
    appetite: assertScore(payload.appetite, "appetite"),
    hydration: assertScore(payload.hydration, "hydration"),
    mood: assertScore(payload.mood, "mood"),
    stool: assertString(payload.stool, "stool"),
    symptom: typeof payload.symptom === "string" ? payload.symptom.trim() : "",
    note: typeof payload.note === "string" ? payload.note.trim() : "",
    risk: "low",
    createdAt: new Date().toISOString(),
  };
  log.risk = calculateRisk(log);
  db.logs.unshift(log);
  await writeDb(db);
  return log;
}

export async function updateReminder(id, payload = {}) {
  const db = await readDb();
  const reminder = db.reminders.find((item) => item.id === id);
  if (!reminder) {
    throw new ApiError(404, "提醒不存在", "reminder_not_found");
  }
  reminder.done = typeof payload.done === "boolean" ? payload.done : !reminder.done;
  await writeDb(db);
  return reminder;
}

export async function updateTraining(id, payload = {}) {
  const db = await readDb();
  const item = db.training.find((entry) => entry.id === id);
  if (!item) {
    throw new ApiError(404, "训练项不存在", "training_not_found");
  }
  item.done = typeof payload.done === "boolean" ? payload.done : !item.done;
  await writeDb(db);
  return item;
}

export async function generateReport(petId) {
  const db = await readDb();
  const pet = db.pets.find((item) => item.id === petId);
  if (!pet) {
    throw new ApiError(404, "宠物不存在", "pet_not_found");
  }

  const logs = db.logs
    .filter((log) => log.petId === pet.id)
    .sort((a, b) => `${b.date}-${b.createdAt ?? ""}`.localeCompare(`${a.date}-${a.createdAt ?? ""}`));
  const reminders = db.reminders.filter((reminder) => reminder.petId === pet.id);
  const expenses = db.expenses.filter((expense) => expense.petId === pet.id);
  const latestLog = logs[0];
  const monthlyCost = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const lines = logs.slice(0, 5).map(
    (log) =>
      `- ${log.date}：${getRiskLabel(log.risk)}，食欲${metricText(log.appetite)}，饮水${metricText(
        log.hydration
      )}，精神${metricText(log.mood)}，排便${log.stool}。${log.symptom || "无明显异常"}`
  );

  const report = [
    `宠物：${pet.name}（${pet.species}，${pet.breed}，${pet.age}，${pet.weight}kg）`,
    `基础情况：${pet.sex}；${pet.traits.join("、")}`,
    `最近状态：${latestLog ? getRiskLabel(latestLog.risk) : "暂无记录"}`,
    "",
    "近期健康记录：",
    lines.length ? lines.join("\n") : "- 暂无记录",
    "",
    `待办提醒：${reminders.filter((reminder) => !reminder.done).map((reminder) => reminder.title).join("、") || "暂无"}`,
    `本月已记录费用：¥${monthlyCost}`,
  ].join("\n");

  return { petId: pet.id, report };
}
