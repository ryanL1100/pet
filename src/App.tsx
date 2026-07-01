import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  HeartPulse,
  Home,
  Hospital,
  LogIn,
  LogOut,
  MapPin,
  MessageCircleQuestion,
  PawPrint,
  Plus,
  Scissors,
  ShieldCheck,
  Stethoscope,
  Syringe,
  UserPlus,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

type TabId = "overview" | "log" | "ai" | "report" | "training" | "services";
type PetSpecies = "猫" | "狗";
type Risk = "low" | "medium" | "high";
type ServiceIconKey = "hospital" | "scissors" | "shield";

type Pet = {
  id: string;
  name: string;
  species: PetSpecies;
  breed: string;
  age: string;
  weight: number;
  sex: string;
  traits: string[];
};

type HealthLog = {
  id: string;
  petId: string;
  date: string;
  appetite: number;
  hydration: number;
  mood: number;
  stool: string;
  symptom: string;
  note: string;
  risk: Risk;
  createdAt?: string;
};

type Reminder = {
  id: string;
  petId: string;
  title: string;
  due: string;
  type: "vaccine" | "medicine" | "checkup" | "care";
  done: boolean;
};

type TrainingItem = {
  id: string;
  petId: string;
  title: string;
  focus: string;
  minutes: number;
  done: boolean;
};

type Expense = {
  id: string;
  petId: string;
  title: string;
  amount: number;
  category: string;
};

type Service = {
  id: string;
  title: string;
  distance: string;
  tag: string;
  rating: string;
  iconKey: ServiceIconKey;
};

type HealthForm = Omit<HealthLog, "id" | "petId" | "risk">;
type AppData = {
  pets: Pet[];
  logs: HealthLog[];
  reminders: Reminder[];
  training: TrainingItem[];
  expenses: Expense[];
  services: Service[];
};
type TriageResult = {
  risk: Risk;
  label: string;
  title: string;
  advice: string;
  vetSummary: string;
  questions?: string[];
  observationPlan?: string[];
  redFlags?: string[];
  source?: AiSource;
};
type AiSource = {
  provider: string;
  model: string;
  configured: boolean;
  reason?: string;
};
type AiStatus = {
  configured: boolean;
  model: string;
  baseUrl: string;
};
type CarePlan = {
  summary: string;
  priorities: string[];
  dailyPlan: { day: string; actions: string[] }[];
  nutrition: string[];
  training: string[];
  vetPrep: string[];
  source: AiSource;
};
type User = {
  id: string;
  email: string;
  name: string;
};
type AuthResponse = {
  token: string;
  user: User;
};

const today = new Date().toISOString().slice(0, 10);

const pets: Pet[] = [
  {
    id: "momo",
    name: "Momo",
    species: "猫",
    breed: "英短",
    age: "3 岁",
    weight: 4.8,
    sex: "已绝育",
    traits: ["皮肤敏感", "室内生活", "轻度挑食"],
  },
  {
    id: "biscuit",
    name: "Biscuit",
    species: "狗",
    breed: "柯基",
    age: "1 岁 8 个月",
    weight: 11.2,
    sex: "公",
    traits: ["精力旺盛", "训练中", "偶尔护食"],
  },
];

const initialLogs: HealthLog[] = [
  {
    id: "log-1",
    petId: "momo",
    date: today,
    appetite: 4,
    hydration: 3,
    mood: 4,
    stool: "正常",
    symptom: "轻微抓挠",
    note: "耳后有一点发红，精神正常。",
    risk: "medium",
  },
  {
    id: "log-2",
    petId: "momo",
    date: "2026-06-16",
    appetite: 4,
    hydration: 4,
    mood: 4,
    stool: "正常",
    symptom: "无明显异常",
    note: "完成驱虫提醒。",
    risk: "low",
  },
  {
    id: "log-3",
    petId: "biscuit",
    date: today,
    appetite: 5,
    hydration: 4,
    mood: 5,
    stool: "偏软",
    symptom: "饭后兴奋跳跃",
    note: "散步后恢复正常。",
    risk: "low",
  },
];

const initialReminders: Reminder[] = [
  { id: "r-1", petId: "momo", title: "年度体检", due: "2026-06-22", type: "checkup", done: false },
  { id: "r-2", petId: "momo", title: "外驱提醒", due: "2026-06-25", type: "medicine", done: false },
  { id: "r-3", petId: "biscuit", title: "狂犬疫苗", due: "2026-07-02", type: "vaccine", done: false },
  { id: "r-4", petId: "biscuit", title: "洗护预约", due: "2026-06-20", type: "care", done: true },
];

const initialTraining: TrainingItem[] = [
  { id: "t-1", petId: "biscuit", title: "等待指令", focus: "冲动控制", minutes: 8, done: false },
  { id: "t-2", petId: "biscuit", title: "护食脱敏", focus: "安全喂食", minutes: 12, done: false },
  { id: "t-3", petId: "momo", title: "猫包适应", focus: "就医减压", minutes: 6, done: true },
  { id: "t-4", petId: "momo", title: "剪甲接触", focus: "护理配合", minutes: 5, done: false },
];

const initialExpenses: Expense[] = [
  { id: "e-1", petId: "momo", title: "处方粮", amount: 268, category: "食品" },
  { id: "e-2", petId: "momo", title: "驱虫", amount: 96, category: "护理" },
  { id: "e-3", petId: "biscuit", title: "洗护", amount: 158, category: "服务" },
  { id: "e-4", petId: "biscuit", title: "训练零食", amount: 72, category: "训练" },
];

const services: Service[] = [
  { id: "s-1", title: "安心宠物医院", distance: "1.4 km", tag: "夜间急诊", rating: "4.8", iconKey: "hospital" },
  { id: "s-2", title: "轻洗宠物护理", distance: "0.8 km", tag: "上门洗护", rating: "4.7", iconKey: "scissors" },
  { id: "s-3", title: "城市宠物保险顾问", distance: "线上", tag: "理赔咨询", rating: "4.6", iconKey: "shield" },
];

const tabs: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "概览", icon: Home },
  { id: "log", label: "记录", icon: ClipboardList },
  { id: "ai", label: "初筛", icon: MessageCircleQuestion },
  { id: "report", label: "报告", icon: FileText },
  { id: "training", label: "训练", icon: BookOpenCheck },
  { id: "services", label: "服务", icon: MapPin },
];

const reminderIcons: Record<Reminder["type"], LucideIcon> = {
  vaccine: Syringe,
  medicine: Stethoscope,
  checkup: HeartPulse,
  care: Bell,
};

const serviceIcons: Record<ServiceIconKey, LucideIcon> = {
  hospital: Hospital,
  scissors: Scissors,
  shield: ShieldCheck,
};

const defaultForm: HealthForm = {
  date: today,
  appetite: 4,
  hydration: 4,
  mood: 4,
  stool: "正常",
  symptom: "",
  note: "",
};

const API_BASE = "/api";
const AUTH_TOKEN_KEY = "pet-health-auth-token";

function getStoredToken() {
  return window.localStorage.getItem(AUTH_TOKEN_KEY) ?? "";
}

function setStoredToken(token: string) {
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

async function apiRequest<T>(path: string, init?: RequestInit, token = getStoredToken()): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message ?? "后端请求失败");
  }

  return response.json() as Promise<T>;
}

function getRiskLabel(risk: Risk) {
  return risk === "high" ? "高风险" : risk === "medium" ? "需关注" : "稳定";
}

function getRiskClass(risk: Risk) {
  return `risk ${risk}`;
}

function calculateRisk(form: HealthForm): Risk {
  const text = `${form.stool} ${form.symptom} ${form.note}`.toLowerCase();
  const highSignals = ["抽搐", "呼吸困难", "便血", "尿不出", "持续呕吐", "昏迷", "误食", "中毒", "不吃不喝"];
  const mediumSignals = ["呕吐", "腹泻", "咳", "跛", "抓挠", "皮肤", "耳", "软便", "嗜睡", "食欲下降"];
  const score =
    (form.appetite <= 2 ? 2 : 0) +
    (form.hydration <= 2 ? 1 : 0) +
    (form.mood <= 2 ? 2 : 0) +
    (highSignals.some((signal) => text.includes(signal)) ? 4 : 0) +
    (mediumSignals.some((signal) => text.includes(signal)) ? 2 : 0);

  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  return "low";
}

function metricText(value: number) {
  if (value >= 5) return "很好";
  if (value >= 4) return "正常";
  if (value >= 3) return "一般";
  return "偏低";
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [authToken, setAuthToken] = useState(getStoredToken);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({
    name: "演示用户",
    email: "demo@pet.app",
    password: "demo123456",
  });
  const [authError, setAuthError] = useState("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [petList, setPetList] = useState<Pet[]>(pets);
  const [selectedPetId, setSelectedPetId] = useState(pets[0].id);
  const [logs, setLogs] = useState<HealthLog[]>(initialLogs);
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [training, setTraining] = useState<TrainingItem[]>(initialTraining);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [serviceList, setServiceList] = useState<Service[]>(services);
  const [form, setForm] = useState<HealthForm>(defaultForm);
  const [aiInput, setAiInput] = useState("Momo 今天抓挠耳后，食欲正常，精神也还可以。");
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [carePlan, setCarePlan] = useState<CarePlan | null>(null);
  const [isCarePlanLoading, setIsCarePlanLoading] = useState(false);
  const [report, setReport] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;

    if (!authToken) {
      setIsLoading(false);
      setCurrentUser(null);
      return () => {
        alive = false;
      };
    }

    setIsLoading(true);
    Promise.all([
      apiRequest<{ user: User }>("/me", undefined, authToken),
      apiRequest<AppData>("/bootstrap", undefined, authToken),
      apiRequest<AiStatus>("/ai/status", undefined, authToken),
    ])
      .then(([profile, data, status]) => {
        if (!alive) return;
        setCurrentUser(profile.user);
        setAiStatus(status);
        setPetList(data.pets);
        setLogs(data.logs);
        setReminders(data.reminders);
        setTraining(data.training);
        setExpenses(data.expenses);
        setServiceList(data.services);
        setSelectedPetId((current) => (data.pets.some((pet) => pet.id === current) ? current : data.pets[0]?.id ?? ""));
        setApiError("");
      })
      .catch((error) => {
        if (!alive) return;
        setStoredToken("");
        setAuthToken("");
        setCurrentUser(null);
        setApiError("");
        setAuthError(error instanceof Error ? error.message : "登录状态无效，请重新登录");
      })
      .finally(() => {
        if (alive) setIsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [authToken]);

  const handleAuthSubmit = async () => {
    setIsAuthSubmitting(true);
    setAuthError("");
    try {
      const path = authMode === "login" ? "/auth/login" : "/auth/register";
      const payload =
        authMode === "login"
          ? { email: authForm.email, password: authForm.password }
          : { name: authForm.name, email: authForm.email, password: authForm.password };
      const result = await apiRequest<AuthResponse>(
        path,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        ""
      );
      setStoredToken(result.token);
      setAuthToken(result.token);
      setCurrentUser(result.user);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "登录失败");
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest<{ ok: boolean }>("/auth/logout", { method: "POST" }, authToken);
    } catch {
      // Local logout should still work if the session already expired.
    }
    setStoredToken("");
    setAuthToken("");
    setCurrentUser(null);
    setReport("");
    setCarePlan(null);
    setAiStatus(null);
    setActiveTab("overview");
  };

  const selectedPet = petList.find((pet) => pet.id === selectedPetId) ?? petList[0] ?? pets[0];
  const petLogs = logs
    .filter((log) => log.petId === selectedPet.id)
    .sort((a, b) => `${b.date}-${b.createdAt ?? ""}`.localeCompare(`${a.date}-${a.createdAt ?? ""}`));
  const latestLog = petLogs[0];
  const petReminders = reminders
    .filter((reminder) => reminder.petId === selectedPet.id)
    .sort((a, b) => a.due.localeCompare(b.due));
  const petTraining = training.filter((item) => item.petId === selectedPet.id);
  const petExpenses = expenses.filter((expense) => expense.petId === selectedPet.id);
  const monthlyCost = petExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const currentRisk = calculateRisk(form);

  const localAiRisk = useMemo(() => {
    return calculateRisk({
      ...defaultForm,
      symptom: aiInput,
      note: aiInput,
      appetite: aiInput.includes("不吃") || aiInput.includes("食欲下降") ? 2 : 4,
      mood: aiInput.includes("嗜睡") || aiInput.includes("没精神") ? 2 : 4,
    });
  }, [aiInput]);

  const aiRisk = triageResult?.risk ?? localAiRisk;

  const localReport = useMemo(() => {
    const recent = petLogs.slice(0, 5);
    const lines = recent.map(
      (log) =>
        `- ${log.date}：${getRiskLabel(log.risk)}，食欲${metricText(log.appetite)}，饮水${metricText(
          log.hydration
        )}，精神${metricText(log.mood)}，排便${log.stool}。${log.symptom || "无明显异常"}`
    );
    return [
      `宠物：${selectedPet.name}（${selectedPet.species}，${selectedPet.breed}，${selectedPet.age}，${selectedPet.weight}kg）`,
      `基础情况：${selectedPet.sex}；${selectedPet.traits.join("、")}`,
      `最近状态：${latestLog ? getRiskLabel(latestLog.risk) : "暂无记录"}`,
      "",
      "近期健康记录：",
      lines.length ? lines.join("\n") : "- 暂无记录",
      "",
      `待办提醒：${petReminders.filter((reminder) => !reminder.done).map((reminder) => reminder.title).join("、") || "暂无"}`,
      `本月已记录费用：¥${monthlyCost}`,
    ].join("\n");
  }, [latestLog, monthlyCost, petLogs, petReminders, selectedPet]);

  const reportText = report || localReport;

  useEffect(() => {
    if (!authToken) return undefined;
    const handle = window.setTimeout(() => {
      apiRequest<TriageResult>(
        "/triage",
        {
          method: "POST",
          body: JSON.stringify({ text: aiInput, petId: selectedPet.id }),
        },
        authToken
      )
        .then((result) => {
          setTriageResult(result);
          setApiError("");
        })
        .catch(() => {
          setTriageResult(null);
        });
    }, 250);

    return () => window.clearTimeout(handle);
  }, [aiInput, authToken, selectedPet.id]);

  useEffect(() => {
    if (!authToken) return undefined;
    let alive = true;
    apiRequest<{ report: string }>(`/pets/${encodeURIComponent(selectedPet.id)}/report`, undefined, authToken)
      .then((data) => {
        if (alive) setReport(data.report);
      })
      .catch(() => {
        if (alive) setReport("");
      });

    return () => {
      alive = false;
    };
  }, [authToken, selectedPet.id, logs, reminders, expenses]);

  const loadCarePlan = async () => {
    setIsCarePlanLoading(true);
    try {
      const result = await apiRequest<CarePlan>(`/pets/${encodeURIComponent(selectedPet.id)}/care-plan`, undefined, authToken);
      setCarePlan(result);
      setApiError("");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "生成护理计划失败");
    } finally {
      setIsCarePlanLoading(false);
    }
  };

  useEffect(() => {
    setCarePlan(null);
  }, [selectedPet.id]);

  const addLog = async () => {
    try {
      const payload = await apiRequest<{ log: HealthLog }>("/logs", {
        method: "POST",
        body: JSON.stringify({ ...form, petId: selectedPet.id }),
      }, authToken);
      setLogs((current) => [payload.log, ...current.filter((log) => log.id !== payload.log.id)]);
      setForm(defaultForm);
      setActiveTab("overview");
      setApiError("");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "保存健康记录失败");
    }
  };

  const toggleReminder = async (id: string) => {
    const previous = reminders;
    setReminders((current) => current.map((reminder) => (reminder.id === id ? { ...reminder, done: !reminder.done } : reminder)));
    try {
      const payload = await apiRequest<{ reminder: Reminder }>(`/reminders/${encodeURIComponent(id)}`, { method: "PATCH" }, authToken);
      setReminders((current) => current.map((reminder) => (reminder.id === id ? payload.reminder : reminder)));
      setApiError("");
    } catch (error) {
      setReminders(previous);
      setApiError(error instanceof Error ? error.message : "更新提醒失败");
    }
  };

  const toggleTraining = async (id: string) => {
    const previous = training;
    setTraining((current) => current.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
    try {
      const payload = await apiRequest<{ training: TrainingItem }>(`/training/${encodeURIComponent(id)}`, { method: "PATCH" }, authToken);
      setTraining((current) => current.map((item) => (item.id === id ? payload.training : item)));
      setApiError("");
    } catch (error) {
      setTraining(previous);
      setApiError(error instanceof Error ? error.message : "更新训练失败");
    }
  };

  const copyReport = async () => {
    await navigator.clipboard.writeText(reportText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const downloadReport = () => {
    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedPet.name}-health-report.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!authToken) {
    return (
      <AuthScreen
        authError={authError}
        authForm={authForm}
        authMode={authMode}
        isSubmitting={isAuthSubmitting}
        onChange={setAuthForm}
        onModeChange={setAuthMode}
        onSubmit={handleAuthSubmit}
      />
    );
  }

  if (isLoading && !currentUser) {
    return (
      <div className="auth-shell">
        <div className="auth-card loading-card">
          <span className="brand-mark">
            <PawPrint size={22} />
          </span>
          <strong>正在加载账户...</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <PawPrint size={22} />
          </span>
          <div>
            <strong>宠伴健康</strong>
            <small>Pet Health Companion</small>
          </div>
        </div>

        <label className="pet-switcher">
          <span>当前宠物</span>
          <select value={selectedPetId} onChange={(event) => setSelectedPetId(event.target.value)}>
            {petList.map((pet) => (
              <option key={pet.id} value={pet.id}>
                {pet.name} · {pet.species}
              </option>
            ))}
          </select>
        </label>

        <nav className="nav-list" aria-label="主导航">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={activeTab === tab.id ? "nav-item active" : "nav-item"}
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">今日健康时间线</p>
            <h1>{selectedPet.name}</h1>
          </div>
          <div className="topbar-actions">
            <div className="user-pill">
              <strong>{currentUser?.name ?? "用户"}</strong>
              <span>{currentUser?.email}</span>
            </div>
            <div className={getRiskClass(latestLog?.risk ?? "low")}>
              <Activity size={16} />
              {latestLog ? getRiskLabel(latestLog.risk) : "暂无记录"}
            </div>
            <button className="icon-button" onClick={handleLogout} title="退出登录">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        {(isLoading || apiError) && (
          <div className={apiError ? "api-banner error" : "api-banner"}>
            {apiError || "正在同步后端数据..."}
          </div>
        )}

        {activeTab === "overview" && (
          <section className="content-grid overview-grid">
            <Panel className="profile-panel">
              <div className="pet-card-head">
                <div className="pet-avatar">
                  <PawPrint size={36} />
                </div>
                <div>
                  <p className="eyebrow">{selectedPet.species} · {selectedPet.breed}</p>
                  <h2>{selectedPet.name}</h2>
                  <p className="muted">
                    {selectedPet.age} · {selectedPet.weight}kg · {selectedPet.sex}
                  </p>
                </div>
              </div>
              <div className="tag-row">
                {selectedPet.traits.map((trait) => (
                  <span key={trait} className="tag">
                    {trait}
                  </span>
                ))}
              </div>
              <div className="action-row">
                <button className="primary-button" onClick={() => setActiveTab("log")}>
                  <Plus size={16} />
                  新增记录
                </button>
                <button className="ghost-button" onClick={() => setActiveTab("report")}>
                  <FileText size={16} />
                  生成报告
                </button>
              </div>
            </Panel>

            <MetricPanel title="食欲" value={latestLog?.appetite ?? 0} icon={HeartPulse} />
            <MetricPanel title="饮水" value={latestLog?.hydration ?? 0} icon={Activity} />
            <MetricPanel title="精神" value={latestLog?.mood ?? 0} icon={CheckCircle2} />

            <Panel title="近期记录" icon={ClipboardList}>
              <div className="timeline">
                {petLogs.slice(0, 4).map((log) => (
                  <div className="timeline-row" key={log.id}>
                    <time>{log.date}</time>
                    <span className={getRiskClass(log.risk)}>{getRiskLabel(log.risk)}</span>
                    <p>{log.symptom || log.note || "无明显异常"}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="待办提醒" icon={Bell}>
              <ReminderList reminders={petReminders} onToggle={toggleReminder} />
            </Panel>

            <Panel title="本月账单" icon={WalletCards}>
              <div className="cost-total">¥{monthlyCost}</div>
              <div className="expense-list">
                {petExpenses.map((expense) => (
                  <div className="expense-row" key={expense.id}>
                    <span>{expense.title}</span>
                    <strong>¥{expense.amount}</strong>
                  </div>
                ))}
              </div>
            </Panel>
          </section>
        )}

        {activeTab === "log" && (
          <section className="single-column">
            <Panel title="新增健康记录" icon={ClipboardList}>
              <div className="form-grid">
                <label>
                  日期
                  <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
                </label>
                <Segmented label="食欲" value={form.appetite} onChange={(value) => setForm({ ...form, appetite: value })} />
                <Segmented label="饮水" value={form.hydration} onChange={(value) => setForm({ ...form, hydration: value })} />
                <Segmented label="精神" value={form.mood} onChange={(value) => setForm({ ...form, mood: value })} />
                <label>
                  排便
                  <select value={form.stool} onChange={(event) => setForm({ ...form, stool: event.target.value })}>
                    <option>正常</option>
                    <option>偏软</option>
                    <option>腹泻</option>
                    <option>便秘</option>
                    <option>便血</option>
                  </select>
                </label>
                <label className="wide">
                  症状
                  <input
                    value={form.symptom}
                    placeholder="如：抓挠、咳嗽、呕吐、食欲下降"
                    onChange={(event) => setForm({ ...form, symptom: event.target.value })}
                  />
                </label>
                <label className="wide">
                  备注
                  <textarea
                    value={form.note}
                    rows={4}
                    placeholder="记录持续时间、触发场景、照片观察结果等"
                    onChange={(event) => setForm({ ...form, note: event.target.value })}
                  />
                </label>
              </div>
              <div className="form-footer">
                <span className={getRiskClass(currentRisk)}>
                  <AlertTriangle size={16} />
                  {getRiskLabel(currentRisk)}
                </span>
                <button className="primary-button" onClick={addLog}>
                  <Plus size={16} />
                  保存记录
                </button>
              </div>
            </Panel>
          </section>
        )}

        {activeTab === "ai" && (
          <section className="content-grid ai-grid">
            <Panel title="AI 风险初筛" icon={MessageCircleQuestion}>
              <div className={aiStatus?.configured ? "ai-status ready" : "ai-status fallback"}>
                <span>{aiStatus?.configured ? "LongCat 已配置" : "LongCat 未配置，当前使用本地规则兜底"}</span>
                <small>{aiStatus?.model ?? "longcat-flash-chat"}</small>
              </div>
              <label className="wide">
                当前情况
                <textarea value={aiInput} rows={8} onChange={(event) => setAiInput(event.target.value)} />
              </label>
              <div className="quick-chips">
                {["食欲下降", "轻微抓挠", "持续呕吐", "腹泻", "尿不出", "精神正常"].map((chip) => (
                  <button key={chip} onClick={() => setAiInput((current) => `${current} ${chip}`)}>
                    {chip}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="分级结果" icon={Stethoscope}>
              <div className={`triage-box ${aiRisk}`}>
                <span className={getRiskClass(aiRisk)}>{getRiskLabel(aiRisk)}</span>
                <h2>{triageResult?.title ?? (aiRisk === "high" ? "建议尽快联系兽医" : aiRisk === "medium" ? "建议持续观察并准备就医信息" : "当前可继续日常观察")}</h2>
                <p>
                  {triageResult?.advice ??
                    (aiRisk === "high"
                      ? "出现急性或持续异常时，应优先线下就医。"
                      : aiRisk === "medium"
                        ? "记录持续时间、频率、饮食饮水和精神状态，必要时预约检查。"
                        : "保持记录，若症状加重或超过 24 小时仍未改善，再升级处理。")}
                </p>
              </div>
              {triageResult?.source && (
                <div className="source-line">
                  <span>来源：{triageResult.source.provider === "longcat" ? "LongCat" : "本地规则"}</span>
                  <small>{triageResult.source.reason}</small>
                </div>
              )}
              <div className="triage-list">
                <strong>给兽医的信息</strong>
                <span>{triageResult?.vetSummary ?? "宠物基础资料、症状出现时间、饮食饮水变化、排便情况、近期用药、照片或视频。"}</span>
              </div>
              <InsightList title="还需要追问" items={triageResult?.questions ?? []} />
              <InsightList title="观察计划" items={triageResult?.observationPlan ?? []} />
              <InsightList title="危险信号" items={triageResult?.redFlags ?? []} />
            </Panel>

            <Panel title="7 天护理计划" icon={HeartPulse} className="care-plan-panel">
              <div className="care-plan-head">
                <p className="muted">{carePlan?.summary ?? `为 ${selectedPet.name} 生成个性化护理计划。`}</p>
                <button className="primary-button" onClick={loadCarePlan} disabled={isCarePlanLoading}>
                  <HeartPulse size={16} />
                  {isCarePlanLoading ? "生成中..." : "生成计划"}
                </button>
              </div>
              {carePlan && (
                <div className="care-plan-content">
                  <InsightList title="优先事项" items={carePlan.priorities} />
                  <div className="daily-plan">
                    {carePlan.dailyPlan.map((item) => (
                      <div className="daily-plan-row" key={item.day}>
                        <strong>{item.day}</strong>
                        <ul>
                          {item.actions.map((action) => (
                            <li key={action}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <InsightList title="饮食" items={carePlan.nutrition} />
                  <InsightList title="训练" items={carePlan.training} />
                  <InsightList title="就医准备" items={carePlan.vetPrep} />
                  <div className="source-line">
                    <span>来源：{carePlan.source.provider === "longcat" ? "LongCat" : "本地规则"}</span>
                    <small>{carePlan.source.reason}</small>
                  </div>
                </div>
              )}
            </Panel>
          </section>
        )}

        {activeTab === "report" && (
          <section className="single-column">
            <Panel title="就医报告" icon={FileText}>
              <pre className="report-box">{reportText}</pre>
              <div className="action-row">
                <button className="primary-button" onClick={copyReport}>
                  <ClipboardList size={16} />
                  {copied ? "已复制" : "复制报告"}
                </button>
                <button className="ghost-button" onClick={downloadReport}>
                  <Download size={16} />
                  下载文本
                </button>
              </div>
            </Panel>
          </section>
        )}

        {activeTab === "training" && (
          <section className="content-grid training-grid">
            <Panel title="今日训练" icon={BookOpenCheck}>
              <div className="training-list">
                {petTraining.map((item) => (
                  <button
                    className={item.done ? "training-row done" : "training-row"}
                    key={item.id}
                    onClick={() => toggleTraining(item.id)}
                  >
                    <CheckCircle2 size={18} />
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.focus} · {item.minutes} 分钟</small>
                    </span>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="训练进度" icon={Activity}>
              <div className="progress-ring" style={{ "--progress": `${Math.round((petTraining.filter((item) => item.done).length / Math.max(petTraining.length, 1)) * 100)}%` } as CSSProperties}>
                <strong>{Math.round((petTraining.filter((item) => item.done).length / Math.max(petTraining.length, 1)) * 100)}%</strong>
              </div>
              <p className="muted center-text">今日完成度</p>
            </Panel>
          </section>
        )}

        {activeTab === "services" && (
          <section className="content-grid services-grid">
            {serviceList.map((service) => {
              const Icon = serviceIcons[service.iconKey] ?? MapPin;
              return (
                <Panel key={service.id}>
                  <div className="service-head">
                    <span className="service-icon">
                      <Icon size={22} />
                    </span>
                    <div>
                      <h3>{service.title}</h3>
                      <p className="muted">{service.distance} · {service.tag}</p>
                    </div>
                  </div>
                  <div className="service-footer">
                    <span>评分 {service.rating}</span>
                    <button className="ghost-button">
                      <CalendarDays size={16} />
                      预约
                    </button>
                  </div>
                </Panel>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}

function AuthScreen({
  authError,
  authForm,
  authMode,
  isSubmitting,
  onChange,
  onModeChange,
  onSubmit,
}: {
  authError: string;
  authForm: { name: string; email: string; password: string };
  authMode: "login" | "register";
  isSubmitting: boolean;
  onChange: (value: { name: string; email: string; password: string }) => void;
  onModeChange: (mode: "login" | "register") => void;
  onSubmit: () => void;
}) {
  const isLogin = authMode === "login";

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand auth-brand">
          <span className="brand-mark">
            <PawPrint size={22} />
          </span>
          <div>
            <strong>宠伴健康</strong>
            <small>Pet Health Companion</small>
          </div>
        </div>

        <div className="auth-tabs">
          <button className={isLogin ? "active" : ""} onClick={() => onModeChange("login")}>
            <LogIn size={16} />
            登录
          </button>
          <button className={!isLogin ? "active" : ""} onClick={() => onModeChange("register")}>
            <UserPlus size={16} />
            注册
          </button>
        </div>

        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {!isLogin && (
            <label>
              昵称
              <input value={authForm.name} onChange={(event) => onChange({ ...authForm, name: event.target.value })} />
            </label>
          )}
          <label>
            邮箱
            <input
              autoComplete="email"
              type="email"
              value={authForm.email}
              onChange={(event) => onChange({ ...authForm, email: event.target.value })}
            />
          </label>
          <label>
            密码
            <input
              autoComplete={isLogin ? "current-password" : "new-password"}
              type="password"
              value={authForm.password}
              onChange={(event) => onChange({ ...authForm, password: event.target.value })}
            />
          </label>
          {authError && <div className="api-banner error">{authError}</div>}
          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isLogin ? <LogIn size={16} /> : <UserPlus size={16} />}
            {isSubmitting ? "处理中..." : isLogin ? "登录" : "创建账户"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Panel({
  title,
  icon: Icon,
  className = "",
  children,
}: {
  title?: string;
  icon?: LucideIcon;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || Icon) && (
        <div className="panel-title">
          {Icon && <Icon size={18} />}
          {title && <h2>{title}</h2>}
        </div>
      )}
      {children}
    </section>
  );
}

function MetricPanel({ title, value, icon: Icon }: { title: string; value: number; icon: LucideIcon }) {
  return (
    <Panel className="metric-panel">
      <div className="metric-head">
        <Icon size={18} />
        <span>{title}</span>
      </div>
      <strong>{value ? metricText(value) : "暂无"}</strong>
      <meter min="0" max="5" value={value} />
    </Panel>
  );
}

function InsightList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;

  return (
    <div className="insight-list">
      <strong>{title}</strong>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Segmented({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <fieldset className="segmented-field">
      <legend>{label}</legend>
      <div className="segmented-control">
        {[1, 2, 3, 4, 5].map((score) => (
          <button key={score} type="button" className={value === score ? "active" : ""} onClick={() => onChange(score)}>
            {score}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ReminderList({ reminders, onToggle }: { reminders: Reminder[]; onToggle: (id: string) => void }) {
  return (
    <div className="reminder-list">
      {reminders.map((reminder) => {
        const Icon = reminderIcons[reminder.type];
        return (
          <button className={reminder.done ? "reminder-row done" : "reminder-row"} key={reminder.id} onClick={() => onToggle(reminder.id)}>
            <Icon size={18} />
            <span>
              <strong>{reminder.title}</strong>
              <small>{reminder.due}</small>
            </span>
            <CheckCircle2 size={18} />
          </button>
        );
      })}
    </div>
  );
}

export default App;
