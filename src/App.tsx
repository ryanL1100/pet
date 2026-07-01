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
  MapPin,
  MessageCircleQuestion,
  PawPrint,
  Plus,
  Scissors,
  ShieldCheck,
  Stethoscope,
  Syringe,
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

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
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
  const [report, setReport] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;

    apiRequest<AppData>("/bootstrap")
      .then((data) => {
        if (!alive) return;
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
        setApiError(error instanceof Error ? error.message : "无法连接后端，当前显示演示数据");
      })
      .finally(() => {
        if (alive) setIsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

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
    const handle = window.setTimeout(() => {
      apiRequest<TriageResult>("/triage", {
        method: "POST",
        body: JSON.stringify({ text: aiInput }),
      })
        .then((result) => {
          setTriageResult(result);
          setApiError("");
        })
        .catch(() => {
          setTriageResult(null);
        });
    }, 250);

    return () => window.clearTimeout(handle);
  }, [aiInput]);

  useEffect(() => {
    let alive = true;
    apiRequest<{ report: string }>(`/pets/${encodeURIComponent(selectedPet.id)}/report`)
      .then((payload) => {
        if (alive) setReport(payload.report);
      })
      .catch(() => {
        if (alive) setReport("");
      });

    return () => {
      alive = false;
    };
  }, [selectedPet.id, logs, reminders, expenses]);

  const addLog = async () => {
    try {
      const payload = await apiRequest<{ log: HealthLog }>("/logs", {
        method: "POST",
        body: JSON.stringify({ ...form, petId: selectedPet.id }),
      });
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
      const payload = await apiRequest<{ reminder: Reminder }>(`/reminders/${encodeURIComponent(id)}`, { method: "PATCH" });
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
      const payload = await apiRequest<{ training: TrainingItem }>(`/training/${encodeURIComponent(id)}`, { method: "PATCH" });
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
          <div className={getRiskClass(latestLog?.risk ?? "low")}>
            <Activity size={16} />
            {latestLog ? getRiskLabel(latestLog.risk) : "暂无记录"}
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
              <div className="triage-list">
                <strong>给兽医的信息</strong>
                <span>{triageResult?.vetSummary ?? "宠物基础资料、症状出现时间、饮食饮水变化、排便情况、近期用药、照片或视频。"}</span>
              </div>
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
