import { randomBytes, pbkdf2Sync, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { callLongCatJson, getLongCatStatus } from "./longcat.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "data");
const seedPath = join(dataDir, "seed.json");
const sqlitePath = join(dataDir, "pet-health.sqlite");
const sessionDays = 30;
const demoEmail = "demo@pet.app";
const demoPassword = "demo123456";
const demoUserId = "demo-user";

let db;

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

function fallbackSource(reason = "LongCat 未配置，使用本地规则") {
  return {
    provider: "local-rules",
    model: "rules-v1",
    configured: getLongCatStatus().configured,
    reason,
  };
}

function longCatSource() {
  return {
    provider: "longcat",
    model: getLongCatStatus().model,
    configured: true,
  };
}

export async function ensureDb() {
  await mkdir(dataDir, { recursive: true });
  const database = getDb();
  createSchema(database);
  await seedDemoData(database);
}

function getDb() {
  if (db) return db;
  const firstRun = !existsSync(sqlitePath);
  db = new DatabaseSync(sqlitePath);
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");
  if (firstRun) {
    db.exec("PRAGMA user_version = 1");
  }
  return db;
}

function createSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      species TEXT NOT NULL,
      breed TEXT NOT NULL,
      age TEXT NOT NULL,
      weight REAL NOT NULL,
      sex TEXT NOT NULL,
      traits_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS health_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      appetite INTEGER NOT NULL,
      hydration INTEGER NOT NULL,
      mood INTEGER NOT NULL,
      stool TEXT NOT NULL,
      symptom TEXT NOT NULL,
      note TEXT NOT NULL,
      risk TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      due TEXT NOT NULL,
      type TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS training_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      focus TEXT NOT NULL,
      minutes INTEGER NOT NULL,
      done INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      distance TEXT NOT NULL,
      tag TEXT NOT NULL,
      rating TEXT NOT NULL,
      icon_key TEXT NOT NULL
    );
  `);
}

async function seedDemoData(database) {
  const existingUser = database.prepare("SELECT id FROM users WHERE email = ?").get(demoEmail);
  if (!existingUser) {
    const password = hashPassword(demoPassword);
    database
      .prepare("INSERT INTO users (id, email, name, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(demoUserId, demoEmail, "演示用户", password.hash, password.salt, new Date().toISOString());
  }

  const seed = JSON.parse(await readFile(seedPath, "utf8"));
  const petCount = database.prepare("SELECT COUNT(*) AS count FROM pets WHERE user_id = ?").get(demoUserId).count;
  if (petCount === 0) {
    insertSeedData(database, demoUserId, seed, false);
  }

  const serviceCount = database.prepare("SELECT COUNT(*) AS count FROM services").get().count;
  if (serviceCount === 0) {
    for (const service of seed.services) {
      database
        .prepare("INSERT INTO services (id, title, distance, tag, rating, icon_key) VALUES (?, ?, ?, ?, ?, ?)")
        .run(service.id, service.title, service.distance, service.tag, service.rating, service.iconKey);
    }
  }
}

function insertSeedData(database, userId, seed, uniquifyIds) {
  const suffix = uniquifyIds ? `-${userId.slice(-8)}` : "";
  const petIdMap = new Map();

  for (const pet of seed.pets) {
    const id = `${pet.id}${suffix}`;
    petIdMap.set(pet.id, id);
    database
      .prepare("INSERT INTO pets (id, user_id, name, species, breed, age, weight, sex, traits_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, userId, pet.name, pet.species, pet.breed, pet.age, pet.weight, pet.sex, JSON.stringify(pet.traits));
  }

  for (const log of seed.logs) {
    database
      .prepare(
        "INSERT INTO health_logs (id, user_id, pet_id, date, appetite, hydration, mood, stool, symptom, note, risk, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        `${log.id}${suffix}`,
        userId,
        petIdMap.get(log.petId),
        log.date,
        log.appetite,
        log.hydration,
        log.mood,
        log.stool,
        log.symptom,
        log.note,
        log.risk,
        log.createdAt
      );
  }

  for (const reminder of seed.reminders) {
    database
      .prepare("INSERT INTO reminders (id, user_id, pet_id, title, due, type, done) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(
        `${reminder.id}${suffix}`,
        userId,
        petIdMap.get(reminder.petId),
        reminder.title,
        reminder.due,
        reminder.type,
        reminder.done ? 1 : 0
      );
  }

  for (const item of seed.training) {
    database
      .prepare("INSERT INTO training_items (id, user_id, pet_id, title, focus, minutes, done) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(`${item.id}${suffix}`, userId, petIdMap.get(item.petId), item.title, item.focus, item.minutes, item.done ? 1 : 0);
  }

  for (const expense of seed.expenses) {
    database
      .prepare("INSERT INTO expenses (id, user_id, pet_id, title, amount, category) VALUES (?, ?, ?, ?, ?, ?)")
      .run(`${expense.id}${suffix}`, userId, petIdMap.get(expense.petId), expense.title, expense.amount, expense.category);
  }
}

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const actual = Buffer.from(hashPassword(password, salt).hash, "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${randomBytes(4).toString("hex")}`;
}

function makeToken() {
  return randomBytes(32).toString("hex");
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

function assertString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(400, `${field} 不能为空`, "invalid_payload");
  }
  return value.trim();
}

function assertEmail(value) {
  const email = assertString(value, "email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, "邮箱格式不正确", "invalid_email");
  }
  return email;
}

function assertPassword(value) {
  const password = assertString(value, "password");
  if (password.length < 8) {
    throw new ApiError(400, "密码至少需要 8 位", "weak_password");
  }
  return password;
}

function assertScore(value, field) {
  const score = Number(value);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new ApiError(400, `${field} 必须是 1-5 的整数`, "invalid_payload");
  }
  return score;
}

function rowPet(row) {
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    breed: row.breed,
    age: row.age,
    weight: row.weight,
    sex: row.sex,
    traits: JSON.parse(row.traits_json),
  };
}

function rowLog(row) {
  return {
    id: row.id,
    petId: row.pet_id,
    date: row.date,
    appetite: row.appetite,
    hydration: row.hydration,
    mood: row.mood,
    stool: row.stool,
    symptom: row.symptom,
    note: row.note,
    risk: row.risk,
    createdAt: row.created_at,
  };
}

function rowReminder(row) {
  return {
    id: row.id,
    petId: row.pet_id,
    title: row.title,
    due: row.due,
    type: row.type,
    done: Boolean(row.done),
  };
}

function rowTraining(row) {
  return {
    id: row.id,
    petId: row.pet_id,
    title: row.title,
    focus: row.focus,
    minutes: row.minutes,
    done: Boolean(row.done),
  };
}

function rowExpense(row) {
  return {
    id: row.id,
    petId: row.pet_id,
    title: row.title,
    amount: row.amount,
    category: row.category,
  };
}

function rowService(row) {
  return {
    id: row.id,
    title: row.title,
    distance: row.distance,
    tag: row.tag,
    rating: row.rating,
    iconKey: row.icon_key,
  };
}

export async function registerUser(payload) {
  const database = getDb();
  const email = assertEmail(payload?.email);
  const password = assertPassword(payload?.password);
  const name = typeof payload?.name === "string" && payload.name.trim() ? payload.name.trim() : email.split("@")[0];
  const exists = database.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (exists) {
    throw new ApiError(409, "该邮箱已注册", "email_exists");
  }

  const userId = makeId("usr");
  const passwordHash = hashPassword(password);
  const seed = JSON.parse(await readFile(seedPath, "utf8"));

  database.exec("BEGIN");
  try {
    database
      .prepare("INSERT INTO users (id, email, name, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(userId, email, name, passwordHash.hash, passwordHash.salt, new Date().toISOString());
    insertSeedData(database, userId, seed, true);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }

  return createSession(userId);
}

export async function loginUser(payload) {
  const database = getDb();
  const email = assertEmail(payload?.email);
  const password = assertPassword(payload?.password);
  const user = database.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
    throw new ApiError(401, "邮箱或密码不正确", "invalid_credentials");
  }
  return createSession(user.id);
}

function createSession(userId) {
  const database = getDb();
  const user = database.prepare("SELECT id, email, name FROM users WHERE id = ?").get(userId);
  const token = makeToken();
  const now = new Date();
  const expires = new Date(now.getTime() + sessionDays * 24 * 60 * 60 * 1000);
  database
    .prepare("INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .run(token, userId, expires.toISOString(), now.toISOString());
  return { token, user: publicUser(user) };
}

export async function getUserByToken(token) {
  if (!token) {
    throw new ApiError(401, "请先登录", "unauthorized");
  }

  const database = getDb();
  const row = database
    .prepare(
      `SELECT users.id, users.email, users.name, sessions.expires_at
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token = ?`
    )
    .get(token);

  if (!row) {
    throw new ApiError(401, "登录状态无效", "unauthorized");
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    database.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    throw new ApiError(401, "登录已过期", "session_expired");
  }

  return publicUser(row);
}

export async function logoutUser(token) {
  if (!token) return { ok: true };
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  return { ok: true };
}

export async function getBootstrapData(userId) {
  const database = getDb();
  return {
    pets: database.prepare("SELECT * FROM pets WHERE user_id = ? ORDER BY name").all(userId).map(rowPet),
    logs: database
      .prepare("SELECT * FROM health_logs WHERE user_id = ? ORDER BY date DESC, created_at DESC")
      .all(userId)
      .map(rowLog),
    reminders: database.prepare("SELECT * FROM reminders WHERE user_id = ? ORDER BY due").all(userId).map(rowReminder),
    training: database.prepare("SELECT * FROM training_items WHERE user_id = ? ORDER BY title").all(userId).map(rowTraining),
    expenses: database.prepare("SELECT * FROM expenses WHERE user_id = ? ORDER BY title").all(userId).map(rowExpense),
    services: database.prepare("SELECT * FROM services ORDER BY title").all().map(rowService),
  };
}

export async function addHealthLog(userId, payload) {
  const database = getDb();
  const petId = assertString(payload?.petId, "petId");
  const pet = database.prepare("SELECT id FROM pets WHERE id = ? AND user_id = ?").get(petId, userId);
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

  database
    .prepare(
      "INSERT INTO health_logs (id, user_id, pet_id, date, appetite, hydration, mood, stool, symptom, note, risk, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      log.id,
      userId,
      log.petId,
      log.date,
      log.appetite,
      log.hydration,
      log.mood,
      log.stool,
      log.symptom,
      log.note,
      log.risk,
      log.createdAt
    );
  return log;
}

export async function updateReminder(userId, id, payload = {}) {
  const database = getDb();
  const reminder = database.prepare("SELECT * FROM reminders WHERE id = ? AND user_id = ?").get(id, userId);
  if (!reminder) {
    throw new ApiError(404, "提醒不存在", "reminder_not_found");
  }
  const done = typeof payload.done === "boolean" ? payload.done : !Boolean(reminder.done);
  database.prepare("UPDATE reminders SET done = ? WHERE id = ? AND user_id = ?").run(done ? 1 : 0, id, userId);
  return rowReminder({ ...reminder, done: done ? 1 : 0 });
}

export async function updateTraining(userId, id, payload = {}) {
  const database = getDb();
  const item = database.prepare("SELECT * FROM training_items WHERE id = ? AND user_id = ?").get(id, userId);
  if (!item) {
    throw new ApiError(404, "训练项不存在", "training_not_found");
  }
  const done = typeof payload.done === "boolean" ? payload.done : !Boolean(item.done);
  database.prepare("UPDATE training_items SET done = ? WHERE id = ? AND user_id = ?").run(done ? 1 : 0, id, userId);
  return rowTraining({ ...item, done: done ? 1 : 0 });
}

export async function generateReport(userId, petId) {
  const database = getDb();
  const petRow = database.prepare("SELECT * FROM pets WHERE id = ? AND user_id = ?").get(petId, userId);
  if (!petRow) {
    throw new ApiError(404, "宠物不存在", "pet_not_found");
  }

  const pet = rowPet(petRow);
  const logs = database
    .prepare("SELECT * FROM health_logs WHERE user_id = ? AND pet_id = ? ORDER BY date DESC, created_at DESC")
    .all(userId, pet.id)
    .map(rowLog);
  const reminders = database.prepare("SELECT * FROM reminders WHERE user_id = ? AND pet_id = ?").all(userId, pet.id).map(rowReminder);
  const expenses = database.prepare("SELECT * FROM expenses WHERE user_id = ? AND pet_id = ?").all(userId, pet.id).map(rowExpense);
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

export function getAiProviderStatus() {
  return getLongCatStatus();
}

export async function enhanceTriage(userId, payload = {}) {
  const text = assertString(payload.text, "text");
  const petId = typeof payload.petId === "string" && payload.petId.trim() ? payload.petId.trim() : "";
  const local = triageText(text);
  const context = petId ? getPetContext(userId, petId) : null;

  try {
    const ai = await callLongCatJson(
      [
        {
          role: "system",
          content:
            "你是宠物健康风险初筛助手，不是兽医。必须用中文输出 JSON，不要输出 Markdown。禁止给出确定诊断、处方药剂量或替代线下兽医。风险等级只能是 low、medium、high。",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "根据宠物信息和主人描述做健康初筛，输出结构化建议。",
            pet: context?.pet ?? null,
            recentLogs: context?.logs?.slice(0, 5) ?? [],
            ownerDescription: text,
            requiredJsonShape: {
              risk: "low | medium | high",
              label: "稳定 | 需关注 | 高风险",
              title: "一句话结论",
              advice: "安全、非诊断性的护理建议",
              vetSummary: "给兽医看的摘要",
              questions: ["还需要追问的问题"],
              observationPlan: ["接下来 24 小时观察项"],
              redFlags: ["必须尽快就医的信号"],
            },
          }),
        },
      ],
      { temperature: 0.1, maxTokens: 900 }
    );

    const risk = ["low", "medium", "high"].includes(ai.risk) ? ai.risk : local.risk;
    return {
      risk,
      label: typeof ai.label === "string" ? ai.label : getRiskLabel(risk),
      title: typeof ai.title === "string" ? ai.title : local.title,
      advice: typeof ai.advice === "string" ? ai.advice : local.advice,
      vetSummary: typeof ai.vetSummary === "string" ? ai.vetSummary : local.vetSummary,
      questions: Array.isArray(ai.questions) ? ai.questions.slice(0, 5).map(String) : [],
      observationPlan: Array.isArray(ai.observationPlan) ? ai.observationPlan.slice(0, 6).map(String) : [],
      redFlags: Array.isArray(ai.redFlags) ? ai.redFlags.slice(0, 6).map(String) : [],
      source: longCatSource(),
    };
  } catch (error) {
    return {
      ...local,
      questions: ["症状持续多久了？", "食欲、饮水、排便和精神状态有没有明显变化？"],
      observationPlan:
        local.risk === "high"
          ? ["尽快联系兽医", "准备近期饮食、排便、用药和视频资料"]
          : ["持续记录症状变化", "观察食欲、饮水、排便、精神状态"],
      redFlags: ["呼吸困难", "持续呕吐或腹泻", "尿不出或便血", "抽搐、昏迷、误食中毒"],
      source: fallbackSource(error instanceof Error ? error.message : undefined),
    };
  }
}

export async function generateCarePlan(userId, petId) {
  const context = getPetContext(userId, petId);
  const fallback = buildLocalCarePlan(context);

  try {
    const ai = await callLongCatJson(
      [
        {
          role: "system",
          content:
            "你是宠物日常健康管理助手，不是兽医。必须用中文输出 JSON，不要输出 Markdown。建议要安全、克制、可执行，不能给处方药剂量或确定诊断。",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "基于宠物档案、近期健康记录、提醒和账单，生成 7 天健康护理计划。",
            pet: context.pet,
            recentLogs: context.logs.slice(0, 8),
            reminders: context.reminders,
            expenses: context.expenses,
            requiredJsonShape: {
              summary: "整体判断",
              priorities: ["最重要的事项"],
              dailyPlan: [{ day: "第 1 天", actions: ["行动"] }],
              nutrition: ["饮食建议"],
              training: ["行为/训练建议"],
              vetPrep: ["就医前准备"],
            },
          }),
        },
      ],
      { temperature: 0.25, maxTokens: 1200 }
    );

    return normalizeCarePlan(ai, longCatSource(), fallback);
  } catch (error) {
    return normalizeCarePlan(fallback, fallbackSource(error instanceof Error ? error.message : undefined), fallback);
  }
}

function getPetContext(userId, petId) {
  const database = getDb();
  const petRow = database.prepare("SELECT * FROM pets WHERE id = ? AND user_id = ?").get(petId, userId);
  if (!petRow) {
    throw new ApiError(404, "宠物不存在", "pet_not_found");
  }

  const pet = rowPet(petRow);
  return {
    pet,
    logs: database
      .prepare("SELECT * FROM health_logs WHERE user_id = ? AND pet_id = ? ORDER BY date DESC, created_at DESC LIMIT 12")
      .all(userId, pet.id)
      .map(rowLog),
    reminders: database.prepare("SELECT * FROM reminders WHERE user_id = ? AND pet_id = ? ORDER BY due").all(userId, pet.id).map(rowReminder),
    expenses: database.prepare("SELECT * FROM expenses WHERE user_id = ? AND pet_id = ? ORDER BY title").all(userId, pet.id).map(rowExpense),
  };
}

function buildLocalCarePlan(context) {
  const latest = context.logs[0];
  const highRisk = latest?.risk === "high";
  const mediumRisk = latest?.risk === "medium";
  const openReminders = context.reminders.filter((item) => !item.done);

  return {
    summary: highRisk
      ? `${context.pet.name} 最近有高风险记录，优先联系兽医并整理近期资料。`
      : mediumRisk
        ? `${context.pet.name} 近期有需要关注的变化，建议连续观察并准备就医信息。`
        : `${context.pet.name} 目前记录整体稳定，可以继续保持规律护理。`,
    priorities: [
      highRisk ? "尽快联系兽医确认是否需要线下检查" : "连续记录食欲、饮水、排便和精神状态",
      openReminders[0] ? `处理待办：${openReminders[0].title}` : "维持疫苗、驱虫和体检提醒",
      "保存照片或视频，方便复诊时说明变化",
    ],
    dailyPlan: [
      { day: "第 1 天", actions: ["完成一次完整健康记录", "检查食欲、饮水、排便和精神状态"] },
      { day: "第 2-3 天", actions: ["观察症状是否加重或反复", "保持饮食稳定，避免突然换粮"] },
      { day: "第 4-7 天", actions: ["复盘本周记录", "补齐待办提醒或预约服务"] },
    ],
    nutrition: ["保持稳定饮食", "记录零食和主粮变化", "若出现呕吐或腹泻，避免自行用药"],
    training: ["训练时间控制在短时多次", "用正向奖励降低护理和就医压力"],
    vetPrep: ["整理近期健康记录", "准备症状照片或视频", "带上近期用药、驱虫和疫苗信息"],
  };
}

function normalizeCarePlan(input, source, fallback) {
  return {
    summary: typeof input.summary === "string" ? input.summary : fallback.summary,
    priorities: normalizeStringArray(input.priorities, fallback.priorities, 5),
    dailyPlan: Array.isArray(input.dailyPlan)
      ? input.dailyPlan.slice(0, 7).map((item, index) => ({
          day: typeof item?.day === "string" ? item.day : `第 ${index + 1} 天`,
          actions: normalizeStringArray(item?.actions, fallback.dailyPlan[index]?.actions ?? [], 5),
        }))
      : fallback.dailyPlan,
    nutrition: normalizeStringArray(input.nutrition, fallback.nutrition, 5),
    training: normalizeStringArray(input.training, fallback.training, 5),
    vetPrep: normalizeStringArray(input.vetPrep, fallback.vetPrep, 5),
    source,
  };
}

function normalizeStringArray(value, fallback, limit) {
  if (!Array.isArray(value)) return fallback;
  const normalized = value.map(String).map((item) => item.trim()).filter(Boolean).slice(0, limit);
  return normalized.length ? normalized : fallback;
}
