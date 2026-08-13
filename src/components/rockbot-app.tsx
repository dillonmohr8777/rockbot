"use client";

import {
  Activity,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  CircleStop,
  Command,
  FileCheck2,
  FolderOpen,
  Library,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { AgentDefinition } from "@/data/agents";
import type { ScheduleTemplate } from "@/data/schedules";
import type {
  PermissionMode,
  ProviderHealth,
  ProviderId,
  RunEvent,
  RunReceipt,
} from "@/lib/contracts";
import type { RoutineDefinition } from "@/lib/routines";
import { BotGlyph } from "@/components/bot-glyph";

type InspectorTab = "runtime" | "routines" | "schedules";
type AgentRunState = "queued" | "working" | "complete" | "failed";

interface RuntimeSnapshot {
  status: string;
  providers: ProviderHealth[];
  knowledge: {
    routines: number;
    cadence: Record<string, number>;
    sourceHash: string;
    workflow: string;
  };
  policy: {
    maxConcurrentSpecialists: number;
    maxEvaluatorLoops: number;
    externalActionsDefault: string;
    allowedRoots: string[];
  };
}

interface UiRun {
  localId: string;
  runId?: string;
  prompt: string;
  provider: ProviderId;
  model: string;
  agentId: string;
  routineId?: string;
  startedAt: string;
  phase: "starting" | "working" | "synthesizing" | "complete" | "partial" | "blocked" | "failed";
  routeRationale?: string;
  routeAgentIds: string[];
  agentStates: Record<string, AgentRunState>;
  agentOutputs: Record<string, string>;
  activities: string[];
  synthesis: string;
  approval?: string;
  receipt?: RunReceipt;
  blocker?: string;
  error?: string;
}

interface RockbotAppProps {
  initialAgents: AgentDefinition[];
  initialRoutines: RoutineDefinition[];
  initialSchedules: ScheduleTemplate[];
  initialWorkingDirectory: string;
}

const initialPrompts = [
  "Run the system heartbeat and tell me what is stale",
  "Build the next bounded deliverable from current evidence",
  "Audit this workspace and return a decision-ready handoff",
  "Route a client request to the smallest useful team",
];

const providerFallbacks: ProviderHealth[] = [
  { id: "codex", label: "Codex", state: "offline", installed: true, detail: "Checking local session…", models: [{ id: "default", label: "Account default" }], capabilities: ["chat", "reasoning", "workspace"] },
  { id: "claude", label: "Claude", state: "offline", installed: true, detail: "Checking local session…", models: [{ id: "default", label: "Account default" }], capabilities: ["chat", "reasoning", "workspace"] },
  { id: "grok", label: "Grok", state: "offline", installed: true, detail: "Checking local session…", models: [{ id: "default", label: "Account default" }], capabilities: ["chat", "reasoning"] },
  { id: "ollama", label: "Local models", state: "offline", installed: true, detail: "Checking local service…", models: [], capabilities: ["chat", "reasoning", "local"] },
  { id: "demo", label: "Simulation", state: "ready", installed: true, detail: "Synthetic fixture. No real model is called.", models: [{ id: "protocol-54-fixture", label: "Protocol 54 fixture", local: true }], capabilities: ["chat", "reasoning", "local"] },
];

function makeLocalId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function providerStateLabel(provider?: ProviderHealth) {
  if (!provider) return "Checking";
  if (provider.state === "ready") return provider.id === "demo" ? "No real model" : "Connected";
  if (provider.state === "needs_auth") return "Sign-in needed";
  if (provider.state === "unavailable") return "Not installed";
  return "Offline";
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function cadenceLabel(cadence: RoutineDefinition["cadence"]) {
  return cadence === "weekly-twice" ? "Twice weekly" : `${cadence[0].toUpperCase()}${cadence.slice(1)}`;
}

function StatusDot({ state }: { state: ProviderHealth["state"] }) {
  return <span className={`status-dot status-dot--${state}`} aria-hidden="true" />;
}

function focusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return [...container.querySelectorAll<HTMLElement>(
    "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])",
  )].filter((element) => element.getClientRects().length > 0 && !element.hasAttribute("inert"));
}

function trapTabKey(event: KeyboardEvent, container: HTMLElement | null) {
  const focusable = focusableElements(container);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !container?.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !container?.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}

function ModelPicker({
  providers,
  selectedProvider,
  selectedModel,
  open,
  onToggle,
  onSelect,
  menuRef,
  triggerRef,
  closeRef,
}: {
  providers: ProviderHealth[];
  selectedProvider: ProviderId;
  selectedModel: string;
  open: boolean;
  onToggle: () => void;
  onSelect: (provider: ProviderId, model: string) => void;
  menuRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  closeRef: RefObject<HTMLButtonElement | null>;
}) {
  const selected = providers.find((provider) => provider.id === selectedProvider) ?? providers[0];
  const selectedModelLabel = selected?.models.find((model) => model.id === selectedModel)?.label ?? selectedModel;

  return (
    <div className="model-picker">
      {open && (
        <>
        <button className="model-picker-scrim" type="button" onClick={onToggle} aria-label="Close model picker" aria-hidden="true" tabIndex={-1} />
        <div className="model-menu" role="dialog" aria-modal="true" aria-label="Choose a model runtime" ref={menuRef}>
          <div className="model-menu__header">
            <div>
              <strong>Model runtime</strong>
              <span>Local sessions, one operating contract</span>
            </div>
            <button className="icon-button" type="button" onClick={onToggle} aria-label="Close model picker" ref={closeRef}>
              <X size={17} />
            </button>
          </div>
          <div className="model-menu__list">
            {providers.map((provider) => {
              const isSelected = provider.id === selectedProvider;
              const firstModel = provider.models[0]?.id ?? "default";
              return (
                <div className={`provider-option${isSelected ? " is-selected" : ""}`} key={provider.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(provider.id, isSelected ? selectedModel : firstModel)}
                    className="provider-option__button"
                  >
                    <span className="provider-mark" data-provider={provider.id}><Bot size={16} /></span>
                    <span className="provider-option__copy">
                      <strong>{provider.label}</strong>
                      <span>{providerStateLabel(provider)}</span>
                    </span>
                    <StatusDot state={provider.state} />
                  </button>
                  {isSelected && provider.models.length > 0 && (
                    <label className="model-menu__select">
                      <span>Model</span>
                      <select value={selectedModel} onChange={(event) => onSelect(provider.id, event.target.value)}>
                        {provider.models.map((model) => <option value={model.id} key={model.id}>{model.label}</option>)}
                      </select>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
          <p className="model-menu__foot">Simulation is for canaries only. Real tasks use Codex, Claude, Grok, or a local model. Secrets are blocked before transmission.</p>
        </div>
        </>
      )}
      <button
        ref={triggerRef}
        type="button"
        className="model-trigger"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        data-testid="model-trigger"
      >
        <span className="provider-mark" data-provider={selected?.id ?? "demo"}><Bot size={17} /></span>
        <span className="model-trigger__copy">
          <strong>{selected?.label ?? "Model"}</strong>
          <span>{selectedModelLabel}</span>
        </span>
        <ChevronDown size={16} />
      </button>
    </div>
  );
}

export function RockbotApp({ initialAgents, initialRoutines, initialSchedules, initialWorkingDirectory }: RockbotAppProps) {
  const [selectedAgentId, setSelectedAgentId] = useState("marketing-chief");
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | undefined>();
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>("codex");
  const [selectedModel, setSelectedModel] = useState("default");
  const [permissionMode, setPermissionMode] = useState<PermissionMode>("observe");
  const [teamMode, setTeamMode] = useState(true);
  const [workingDirectory, setWorkingDirectory] = useState(initialWorkingDirectory);
  const [runtime, setRuntime] = useState<RuntimeSnapshot | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [runs, setRuns] = useState<UiRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [agentSearch, setAgentSearch] = useState("");
  const [routineSearch, setRoutineSearch] = useState("");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("runtime");
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const inspectorRef = useRef<HTMLElement | null>(null);
  const inspectorCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const inspectorReturnFocusRef = useRef<HTMLElement | null>(null);
  const modelMenuRef = useRef<HTMLDivElement | null>(null);
  const modelTriggerRef = useRef<HTMLButtonElement | null>(null);
  const modelCloseButtonRef = useRef<HTMLButtonElement | null>(null);

  const providers = runtime?.providers ?? providerFallbacks;
  const selectedAgent = initialAgents.find((agent) => agent.id === selectedAgentId) ?? initialAgents[0];
  const selectedProviderHealth = providers.find((provider) => provider.id === selectedProvider);
  const canRun = !activeRunId && selectedProviderHealth?.state === "ready" && prompt.trim().length > 0;

  const closeSidebar = useCallback((restoreFocus = true) => {
    setSidebarOpen(false);
    if (restoreFocus) requestAnimationFrame(() => mobileMenuButtonRef.current?.focus());
  }, []);

  const closeInspector = useCallback((restoreFocus = true) => {
    setInspectorOpen(false);
    const returnTarget = inspectorReturnFocusRef.current;
    if (restoreFocus) requestAnimationFrame(() => returnTarget?.focus());
  }, []);

  const closeModelPicker = useCallback((restoreFocus = true) => {
    setModelPickerOpen(false);
    if (restoreFocus) requestAnimationFrame(() => modelTriggerRef.current?.focus());
  }, []);

  useEffect(() => {
    const storedProvider = window.localStorage.getItem("rockbot.provider") as ProviderId | null;
    const savedProvider = storedProvider === "demo" ? null : storedProvider;
    const savedModel = savedProvider ? window.localStorage.getItem("rockbot.model") : null;
    if (storedProvider === "demo") {
      window.localStorage.removeItem("rockbot.provider");
      window.localStorage.removeItem("rockbot.model");
    }
    if (savedProvider && ["demo", "codex", "claude", "grok", "ollama"].includes(savedProvider)) setSelectedProvider(savedProvider);
    if (savedModel) setSelectedModel(savedModel);

    const controller = new AbortController();
    fetch("/api/runtime", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Runtime check returned HTTP ${response.status}.`);
        return response.json() as Promise<RuntimeSnapshot>;
      })
      .then((snapshot) => {
        setRuntime(snapshot);
        setRuntimeError(null);
        const currentProvider = snapshot.providers.find((provider) => provider.id === (savedProvider ?? "codex"));
        if (currentProvider && !currentProvider.models.some((model) => model.id === (savedModel ?? "default"))) {
          setSelectedModel(currentProvider.models[0]?.id ?? "default");
        }
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setRuntimeError(error instanceof Error ? error.message : "Local runtime check failed.");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: activeRunId ? "smooth" : "auto", block: "end" });
  }, [runs, activeRunId]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => setIsMobileViewport(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (sidebarOpen && isMobileViewport) requestAnimationFrame(() => mobileCloseButtonRef.current?.focus());
  }, [isMobileViewport, sidebarOpen]);

  useEffect(() => {
    if (inspectorOpen) requestAnimationFrame(() => inspectorCloseButtonRef.current?.focus());
  }, [inspectorOpen]);

  useEffect(() => {
    if (modelPickerOpen) requestAnimationFrame(() => modelCloseButtonRef.current?.focus());
  }, [modelPickerOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setModelPickerOpen(false);
        setInspectorOpen(false);
        setSidebarOpen(false);
        promptRef.current?.focus();
        return;
      }
      if (event.key === "Tab") {
        if (modelPickerOpen) trapTabKey(event, modelMenuRef.current);
        else if (inspectorOpen) trapTabKey(event, inspectorRef.current);
        else if (sidebarOpen && isMobileViewport) trapTabKey(event, sidebarRef.current);
      }
      if (event.key === "Escape") {
        if (modelPickerOpen) closeModelPicker();
        else if (inspectorOpen) closeInspector();
        else if (sidebarOpen) closeSidebar();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeInspector, closeModelPicker, closeSidebar, inspectorOpen, isMobileViewport, modelPickerOpen, sidebarOpen]);

  const groupedAgents = useMemo(() => {
    const query = agentSearch.trim().toLowerCase();
    const filtered = initialAgents.filter((agent) => !query || `${agent.name} ${agent.department} ${agent.tags.join(" ")}`.toLowerCase().includes(query));
    return {
      command: filtered.filter((agent) => agent.kind === "orchestrator"),
      cadence: filtered.filter((agent) => agent.kind === "cadence"),
      specialists: filtered.filter((agent) => agent.kind === "specialist"),
    };
  }, [agentSearch, initialAgents]);

  const filteredRoutines = useMemo(() => {
    const query = routineSearch.trim().toLowerCase();
    return initialRoutines.filter((routine) => !query || `${routine.id} ${routine.name} ${routine.owner_bot} ${routine.trigger}`.toLowerCase().includes(query));
  }, [initialRoutines, routineSearch]);

  const updateRunFromEvent = useCallback((localId: string, event: RunEvent) => {
    setRuns((current) => current.map((run) => {
      if (run.localId !== localId) return run;
      if (event.type === "run_started") return { ...run, runId: event.runId, phase: "working" };
      if (event.type === "plan_created") {
        const ids = Array.isArray(event.detail?.agents) ? event.detail.agents.filter((id): id is string => typeof id === "string") : [];
        return {
          ...run,
          routeRationale: event.content,
          routeAgentIds: ids,
          agentStates: Object.fromEntries(ids.map((id) => [id, "queued" as const])),
        };
      }
      if (event.type === "agent_started" && event.agentId) {
        return { ...run, agentStates: { ...run.agentStates, [event.agentId]: "working" } };
      }
      if (event.type === "agent_activity" && event.content) {
        return { ...run, activities: [...run.activities.slice(-7), event.content] };
      }
      if (event.type === "agent_delta" && event.agentId && event.content) {
        return { ...run, agentOutputs: { ...run.agentOutputs, [event.agentId]: `${run.agentOutputs[event.agentId] ?? ""}${event.content}` } };
      }
      if (event.type === "agent_completed" && event.agentId) {
        return { ...run, agentStates: { ...run.agentStates, [event.agentId]: "complete" } };
      }
      if (event.type === "synthesis_started") return { ...run, phase: "synthesizing" };
      if (event.type === "synthesis_delta" && event.content) return { ...run, synthesis: `${run.synthesis}${event.content}` };
      if (event.type === "approval_required") return { ...run, approval: event.content };
      if (event.type === "run_blocked") return { ...run, phase: "blocked", blocker: event.content ?? "The run is blocked." };
      if (event.type === "receipt" && event.detail) {
        const receipt = event.detail as unknown as RunReceipt;
        return { ...run, receipt, phase: receipt.outcome };
      }
      if (event.type === "run_finished") return run;
      if (event.type === "run_failed") return { ...run, phase: "failed", error: event.content ?? "Run failed." };
      return run;
    }));
  }, []);

  const executePrompt = useCallback(async (override?: string) => {
    const task = (override ?? prompt).trim();
    if (!task || activeRunId) return;
    const provider = providers.find((candidate) => candidate.id === selectedProvider);
    if (!provider || provider.state !== "ready") {
      setRuntimeError(`${provider?.label ?? "The selected provider"} is not ready. ${provider?.detail ?? "Choose another runtime."}`);
      return;
    }

    const localId = makeLocalId();
    const run: UiRun = {
      localId,
      prompt: task,
      provider: selectedProvider,
      model: selectedModel,
      agentId: selectedAgentId,
      routineId: selectedRoutineId,
      startedAt: new Date().toISOString(),
      phase: "starting",
      routeAgentIds: [],
      agentStates: {},
      agentOutputs: {},
      activities: [],
      synthesis: "",
    };
    setRuns((current) => [...current, run]);
    setPrompt("");
    setActiveRunId(localId);
    setRuntimeError(null);
    setSidebarOpen(false);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: task,
          provider: selectedProvider,
          model: selectedModel,
          agentId: selectedAgentId,
          routineId: selectedRoutineId,
          workingDirectory,
          permissionMode,
          teamMode,
        }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const body = await response.text();
        throw new Error(body ? `Rockbot rejected the request: ${body.slice(0, 300)}` : `Rockbot returned HTTP ${response.status}.`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          updateRunFromEvent(localId, JSON.parse(line) as RunEvent);
        }
      }
      if (buffer.trim()) updateRunFromEvent(localId, JSON.parse(buffer) as RunEvent);
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === "AbortError";
      setRuns((current) => current.map((item) => item.localId === localId
        ? { ...item, phase: "failed", error: aborted ? "Run stopped locally. No external action was attempted." : error instanceof Error ? error.message : "Rockbot run failed." }
        : item));
    } finally {
      abortRef.current = null;
      setActiveRunId(null);
    }
  }, [activeRunId, permissionMode, prompt, providers, selectedAgentId, selectedModel, selectedProvider, selectedRoutineId, teamMode, updateRunFromEvent, workingDirectory]);

  const chooseProvider = (provider: ProviderId, model: string) => {
    setSelectedProvider(provider);
    setSelectedModel(model);
    if (provider === "demo") {
      window.localStorage.removeItem("rockbot.provider");
      window.localStorage.removeItem("rockbot.model");
    } else {
      window.localStorage.setItem("rockbot.provider", provider);
      window.localStorage.setItem("rockbot.model", model);
    }
  };

  const selectAgent = (id: string) => {
    setSelectedAgentId(id);
    if (isMobileViewport) closeSidebar();
  };

  const openInspector = (tab: InspectorTab) => {
    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inspectorReturnFocusRef.current = isMobileViewport && sidebarOpen ? mobileMenuButtonRef.current : activeElement;
    setInspectorTab(tab);
    setInspectorOpen(true);
    setModelPickerOpen(false);
    if (isMobileViewport) setSidebarOpen(false);
  };

  const toggleModelPicker = () => {
    if (modelPickerOpen) closeModelPicker();
    else setModelPickerOpen(true);
  };

  const renderAgentGroup = (label: string, group: AgentDefinition[]) => {
    if (!group.length) return null;
    return (
      <div className="agent-group" key={label}>
        <div className="agent-group__label"><span>{label}</span><span>{group.length}</span></div>
        {group.map((agent) => (
          <button
            type="button"
            className={`agent-row${selectedAgentId === agent.id ? " is-selected" : ""}`}
            onClick={() => selectAgent(agent.id)}
            key={agent.id}
            title={sidebarCollapsed ? agent.name : undefined}
          >
            <BotGlyph color={agent.color} seed={agent.id} size="small" active={selectedAgentId === agent.id} />
            <span className="agent-row__copy">
              <strong>{agent.shortName}</strong>
              <span>{agent.department}</span>
            </span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className={`rockbot-shell${sidebarCollapsed ? " has-collapsed-sidebar" : ""}`}>
      <button className={`mobile-scrim${sidebarOpen ? " is-visible" : ""}`} type="button" onClick={() => closeSidebar()} aria-label="Close navigation" aria-hidden="true" tabIndex={-1} />
      <aside
        className={`sidebar${sidebarOpen ? " is-open" : ""}`}
        aria-label="Rockbot operating team"
        role={isMobileViewport ? "dialog" : undefined}
        aria-modal={isMobileViewport && sidebarOpen ? true : undefined}
        aria-hidden={inspectorOpen || (isMobileViewport ? !sidebarOpen : false)}
        inert={inspectorOpen || (isMobileViewport && !sidebarOpen)}
        ref={sidebarRef}
      >
        <div className="sidebar__topline">
          <button className="brand" type="button" onClick={() => { setRuns([]); setSelectedAgentId("marketing-chief"); }} aria-label="Rockbot home">
            <span className="brand__mark"><Sparkles size={17} /></span>
            <span className="brand__name">Rockbot</span>
            <span className="brand__pulse" title="Local harness active" />
          </button>
          <button className="icon-button sidebar__collapse" type="button" onClick={() => setSidebarCollapsed((value) => !value)} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
          <button className="icon-button sidebar__mobile-close" type="button" onClick={() => closeSidebar()} aria-label="Close sidebar" ref={mobileCloseButtonRef}><X size={18} /></button>
        </div>

        <button className="new-run-button" type="button" onClick={() => { setRuns([]); setSelectedRoutineId(undefined); promptRef.current?.focus(); }}>
          <Plus size={17} /><span>New run</span><kbd>Ctrl K</kbd>
        </button>

        <label className="sidebar-search">
          <Search size={15} />
          <span className="sr-only">Search agents</span>
          <input value={agentSearch} onChange={(event) => setAgentSearch(event.target.value)} placeholder="Find an agent" />
        </label>

        <nav className="agent-list" aria-label="Agents">
          {renderAgentGroup("Command", groupedAgents.command)}
          {renderAgentGroup("Cadence bots", groupedAgents.cadence)}
          {renderAgentGroup("Specialists", groupedAgents.specialists)}
          {!groupedAgents.command.length && !groupedAgents.cadence.length && !groupedAgents.specialists.length && (
            <p className="sidebar-empty">No agent matches “{agentSearch}”.</p>
          )}
        </nav>

        <div className="sidebar__footer">
          <button type="button" className="evidence-button" onClick={() => openInspector("routines")}>
            <ShieldCheck size={16} />
            <span><strong>Protocol 54 sealed</strong><small>{runtime?.knowledge.routines ?? 54} routines · evidence indexed</small></span>
            <ChevronRight size={15} />
          </button>
          <ModelPicker
            providers={providers}
            selectedProvider={selectedProvider}
            selectedModel={selectedModel}
            open={modelPickerOpen}
            onToggle={toggleModelPicker}
            onSelect={chooseProvider}
            menuRef={modelMenuRef}
            triggerRef={modelTriggerRef}
            closeRef={modelCloseButtonRef}
          />
        </div>
      </aside>

      <main
        className="main-pane"
        aria-hidden={inspectorOpen || modelPickerOpen || (isMobileViewport && sidebarOpen)}
        inert={inspectorOpen || modelPickerOpen || (isMobileViewport && sidebarOpen)}
      >
        <header className="conversation-header">
          <button className="icon-button mobile-menu" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open operating team" ref={mobileMenuButtonRef}><Menu size={19} /></button>
          <BotGlyph color={selectedAgent.color} seed={selectedAgent.id} size="medium" active />
          <div className="conversation-header__identity">
            <strong>{selectedAgent.name}</strong>
            <span>{selectedAgent.purpose}</span>
          </div>
          <div className="conversation-header__actions">
            <button type="button" className={`authority-button authority-button--${permissionMode}`} onClick={() => openInspector("runtime")}>
              <ShieldCheck size={15} /><span>{permissionMode === "observe" ? "Observe" : "Workspace"}</span>
            </button>
            <button type="button" className="header-action" onClick={() => openInspector("routines")}><Library size={16} /><span>{initialRoutines.length} routines</span></button>
            <button type="button" className="icon-button" onClick={() => openInspector("runtime")} aria-label="Open system inspector"><Activity size={18} /></button>
          </div>
        </header>

        <section className="thread" aria-label="Conversation">
          <div className="thread__inner">
            {runs.length === 0 ? (
              <section className="welcome" aria-labelledby="welcome-title">
                <BotGlyph color={selectedAgent.color} seed={selectedAgent.id} size="large" active />
                <h1 id="welcome-title">What should the operating team move?</h1>
                <p>{selectedAgent.name} will resolve the route, cap the team at three specialists, and return evidence before a completion claim.</p>
                <div className="prompt-starters" aria-label="Prompt starters">
                  {initialPrompts.map((starter) => (
                    <button type="button" key={starter} onClick={() => executePrompt(starter)}>
                      <span>{starter}</span><ChevronRight size={16} />
                    </button>
                  ))}
                </div>
                <div className="welcome__contract">
                  <span><Check size={14} /> 54 routines</span>
                  <span><Check size={14} /> 15 specialists</span>
                  <span><Check size={14} /> external actions denied</span>
                </div>
              </section>
            ) : (
              <div className="run-thread">
                {runs.map((run) => (
                  <RunExchange key={run.localId} run={run} agents={initialAgents} />
                ))}
              </div>
            )}
            <div ref={threadEndRef} />
          </div>
        </section>

        <div className="composer-zone">
          {runtimeError && (
            <div className="inline-error" role="alert"><span>{runtimeError}</span><button type="button" onClick={() => setRuntimeError(null)}>Dismiss</button></div>
          )}
          <div className={`composer${activeRunId ? " is-running" : ""}`}>
            {selectedRoutineId && (
              <button className="routine-chip" type="button" onClick={() => setSelectedRoutineId(undefined)} title="Remove routine">
                <Command size={13} /> {selectedRoutineId} <X size={12} />
              </button>
            )}
            <textarea
              ref={promptRef}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (canRun) void executePrompt();
                }
              }}
              placeholder={`Message ${selectedAgent.shortName}`}
              aria-label={`Message ${selectedAgent.name}`}
              rows={1}
              data-testid="composer-input"
            />
            <div className="composer__controls">
              <div className="composer__meta">
                <button type="button" onClick={() => openInspector("routines")}><Library size={15} /> Routine</button>
                <button type="button" onClick={() => openInspector("runtime")}><FolderOpen size={15} /> {workingDirectory.split(/[\\/]/).pop()}</button>
                <span className="team-indicator"><UsersRound size={14} /> {teamMode ? "Team routing" : "Single agent"}</span>
              </div>
              {activeRunId ? (
                <button className="stop-button" type="button" onClick={() => abortRef.current?.abort()} aria-label="Stop run"><CircleStop size={18} /></button>
              ) : (
                <button className="send-button" type="button" onClick={() => void executePrompt()} disabled={!canRun} aria-label="Run task" data-testid="send-button"><Send size={17} /></button>
              )}
            </div>
          </div>
          <p className="composer-note">
            <span><StatusDot state={selectedProviderHealth?.state ?? "offline"} /> {selectedProviderHealth?.label ?? "Runtime"}: {providerStateLabel(selectedProviderHealth)}</span>
            <span>Rockbot can make mistakes. Verify consequential work.</span>
          </p>
        </div>
      </main>

      <button className={`inspector-scrim${inspectorOpen ? " is-visible" : ""}`} type="button" onClick={() => closeInspector()} aria-label="Close inspector" aria-hidden="true" tabIndex={-1} />
      <aside className={`inspector${inspectorOpen ? " is-open" : ""}`} role="dialog" aria-modal="true" aria-label="System inspector" aria-hidden={!inspectorOpen} inert={!inspectorOpen} ref={inspectorRef}>
        <div className="inspector__header">
          <div><strong>Rockbot system</strong><span>Live local truth and recorded operating knowledge</span></div>
          <button className="icon-button" type="button" onClick={() => closeInspector()} aria-label="Close inspector" ref={inspectorCloseButtonRef}><X size={18} /></button>
        </div>
        <div className="inspector-tabs" role="tablist">
          {(["runtime", "routines", "schedules"] as InspectorTab[]).map((tab) => (
            <button type="button" role="tab" aria-selected={inspectorTab === tab} className={inspectorTab === tab ? "is-selected" : ""} onClick={() => setInspectorTab(tab)} key={tab}>
              {tab[0].toUpperCase()}{tab.slice(1)}
            </button>
          ))}
        </div>
        <div className="inspector__body">
          {inspectorTab === "runtime" && (
            <RuntimeInspector
              runtime={runtime}
              providers={providers}
              workingDirectory={workingDirectory}
              permissionMode={permissionMode}
              teamMode={teamMode}
              onWorkingDirectory={setWorkingDirectory}
              onPermissionMode={setPermissionMode}
              onTeamMode={setTeamMode}
            />
          )}
          {inspectorTab === "routines" && (
            <div className="routine-browser">
              <label className="inspector-search"><Search size={15} /><span className="sr-only">Search routines</span><input value={routineSearch} onChange={(event) => setRoutineSearch(event.target.value)} placeholder="Search 54 routines" /></label>
              <p className="inspector-context">Generated from the sealed operating-system manifest. Selecting a routine pins its trigger, evidence, and approval boundary into the next run.</p>
              <div className="routine-list">
                {filteredRoutines.map((routine) => (
                  <button
                    type="button"
                    className={selectedRoutineId === routine.id ? "is-selected" : ""}
                    onClick={() => { setSelectedRoutineId(routine.id); setInspectorOpen(false); promptRef.current?.focus(); }}
                    key={routine.id}
                  >
                    <span className="routine-id">{routine.id}</span>
                    <span className="routine-copy"><strong>{routine.name}</strong><small>{routine.owner_bot}</small></span>
                    <span className="routine-cadence">{cadenceLabel(routine.cadence)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {inspectorTab === "schedules" && (
            <div className="schedule-list">
              <p className="inspector-context"><strong>Recorded templates, not live scheduler state.</strong> Live activation remains a separate verified action.</p>
              {initialSchedules.map((schedule) => (
                <div className="schedule-row" key={schedule.id}>
                  <span className="schedule-row__rail" />
                  <div><strong>{schedule.name}</strong><span>{schedule.cadence}</span><small>{schedule.routineIds.join(" · ")} · recorded template</small></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function RuntimeInspector({
  runtime,
  providers,
  workingDirectory,
  permissionMode,
  teamMode,
  onWorkingDirectory,
  onPermissionMode,
  onTeamMode,
}: {
  runtime: RuntimeSnapshot | null;
  providers: ProviderHealth[];
  workingDirectory: string;
  permissionMode: PermissionMode;
  teamMode: boolean;
  onWorkingDirectory: (value: string) => void;
  onPermissionMode: (value: PermissionMode) => void;
  onTeamMode: (value: boolean) => void;
}) {
  return (
    <div className="runtime-panel">
      <section>
        <h2>Run authority</h2>
        <div className="segmented-control" role="group" aria-label="Run authority">
          <button type="button" className={permissionMode === "observe" ? "is-selected" : ""} onClick={() => onPermissionMode("observe")}><ShieldCheck size={15} /> Observe</button>
          <button type="button" className={permissionMode === "workspace" ? "is-selected" : ""} onClick={() => onPermissionMode("workspace")}><FileCheck2 size={15} /> Workspace</button>
        </div>
        <p>{permissionMode === "observe" ? "Read, reason, and propose. No filesystem edits." : "Provider may edit only inside the exact allowlisted workspace. External actions remain denied."}</p>
        <label className="field-label"><span>Working directory</span><input value={workingDirectory} onChange={(event) => onWorkingDirectory(event.target.value)} spellCheck={false} /></label>
        <label className="toggle-row"><span><strong>Operating team routing</strong><small>Marketing Chief selects up to three specialists.</small></span><input type="checkbox" checked={teamMode} onChange={(event) => onTeamMode(event.target.checked)} /></label>
      </section>
      <section>
        <h2>Provider health</h2>
        <div className="health-list">
          {providers.map((provider) => (
            <div className="health-row" key={provider.id}>
              <span className="provider-mark" data-provider={provider.id}><Bot size={16} /></span>
              <span><strong>{provider.label}</strong><small>{provider.detail}</small></span>
              <StatusDot state={provider.state} />
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2>Operating contract</h2>
        <dl className="contract-list">
          <div><dt>Routines</dt><dd>{runtime?.knowledge.routines ?? 54}</dd></div>
          <div><dt>Specialist cap</dt><dd>{runtime?.policy.maxConcurrentSpecialists ?? 3}</dd></div>
          <div><dt>Evaluator loops</dt><dd>{runtime?.policy.maxEvaluatorLoops ?? 2}</dd></div>
          <div><dt>External actions</dt><dd>{runtime?.policy.externalActionsDefault ?? "denied"}</dd></div>
        </dl>
      </section>
    </div>
  );
}

function RunExchange({ run, agents }: { run: UiRun; agents: AgentDefinition[] }) {
  const agentById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);
  const selected = agentById.get(run.agentId) ?? agents[0];
  const finalText = run.synthesis || (run.routeAgentIds.length === 1 ? run.agentOutputs[run.routeAgentIds[0]] : "");
  return (
    <article className="exchange" data-testid="run-exchange">
      <div className="user-turn">
        <div className="user-turn__meta"><span>You</span><time>{formatTime(run.startedAt)}</time></div>
        <p>{run.prompt}</p>
      </div>
      <div className="assistant-turn">
        <div className="assistant-turn__identity">
          <BotGlyph color={selected.color} seed={selected.id} size="small" active />
          <div><strong>{selected.name}</strong><span>{run.routeRationale ?? "Resolving the bounded route…"}</span></div>
          <span className={`run-state run-state--${run.phase}`}>{run.phase === "synthesizing" ? "reconciling" : run.phase}</span>
        </div>

        {run.routeAgentIds.length > 0 && (
          <div className="execution-lane" aria-label="Execution lane">
            {run.routeAgentIds.map((id, index) => {
              const agent = agentById.get(id) ?? agents[0];
              const state = run.agentStates[id] ?? "queued";
              return (
                <div className={`lane-agent lane-agent--${state}`} key={id}>
                  <BotGlyph color={agent.color} seed={agent.id} size="small" active={state === "working"} />
                  <span><strong>{agent.shortName}</strong><small>{state}</small></span>
                  {index < run.routeAgentIds.length - 1 && <ChevronRight className="lane-arrow" size={14} />}
                </div>
              );
            })}
          </div>
        )}

        {run.routeAgentIds.length > 1 && (
          <details className="specialist-evidence" open={run.phase === "working"}>
            <summary><UsersRound size={15} /> Specialist evidence <span>{Object.values(run.agentStates).filter((state) => state === "complete").length}/{run.routeAgentIds.length}</span></summary>
            <div>
              {run.routeAgentIds.map((id) => {
                const agent = agentById.get(id) ?? agents[0];
                return (
                  <section key={id}>
                    <h3>{agent.name}</h3>
                    {run.agentOutputs[id] ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{run.agentOutputs[id]}</ReactMarkdown> : <p className="stream-placeholder">{run.agentStates[id] === "working" ? "Working through the evidence…" : "Queued for the bounded handoff."}</p>}
                  </section>
                );
              })}
            </div>
          </details>
        )}

        {finalText && (
          <div className="assistant-output markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{finalText}</ReactMarkdown>
          </div>
        )}
        {!finalText && ["starting", "working", "synthesizing"].includes(run.phase) && (
          <div className="thinking-line" role="status"><span /><p>{run.activities.at(-1) ?? (run.phase === "starting" ? "Opening the local route…" : "Working through the evidence…")}</p></div>
        )}
        {run.approval && <div className="approval-boundary"><ShieldCheck size={17} /><span><strong>Approval boundary</strong>{run.approval}</span></div>}
        {run.blocker && <div className="run-blocked" role="alert"><CircleStop size={16} /><span><strong>Run blocked</strong>{run.blocker}</span></div>}
        {run.error && <div className="run-error" role="alert"><X size={16} /><span><strong>Run stopped</strong>{run.error}</span></div>}
        {run.receipt && (
          <div className="receipt-bar" role="status" aria-live="polite" aria-atomic="true">
            <div className="receipt-bar__summary">
              <span className={`receipt-outcome receipt-outcome--${run.receipt.outcome}`}>
                {run.receipt.outcome === "complete" ? <Check size={14} /> : run.receipt.outcome === "partial" ? <ShieldCheck size={14} /> : <CircleStop size={14} />}
                {run.receipt.outcome}
              </span>
              <span>artifact: {run.receipt.artifactState}</span>
              <span>delivery: {run.receipt.deliveryState.replaceAll("_", " ")}</span>
              <span>evidence: {run.receipt.verificationState.replaceAll("_", " ")}</span>
              <span>{run.receipt.agents.length} agent{run.receipt.agents.length === 1 ? "" : "s"}</span>
              <span>{run.receipt.provider} · {run.receipt.model}</span>
              <span>{run.receipt.checks.length} checks</span>
              <span className="receipt-safe">redacted · external action: none</span>
            </div>
            <p><strong>{run.receipt.approvalState === "required" ? "Approval required." : "No approval required."}</strong> {run.receipt.nextSafestAction}</p>
          </div>
        )}
      </div>
    </article>
  );
}
