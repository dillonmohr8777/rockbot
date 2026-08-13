import { getAgent, type AgentDefinition } from "@/data/agents";

interface RouteRule {
  id: string;
  pattern: RegExp;
  agents: string[];
}

export interface ExecutionPlan {
  routeId: string;
  agents: AgentDefinition[];
  rationale: string;
  makerChecker: boolean;
}

const rules: RouteRule[] = [
  { id: "web-build", pattern: /\b(website|landing page|dashboard|frontend|app|ui|ux|code|repository|build|fix)\b/i, agents: ["web-product-builder", "design-art-direction-critic", "independent-qa-release-critic"] },
  { id: "communications", pattern: /\b(email|gmail|slack|reply|message|thread|meeting|draft)\b/i, agents: ["communications-intake-analyst", "brand-voice-content-studio", "delivery-evidence-auditor"] },
  { id: "paid-media", pattern: /\b(google ads|meta ads|paid media|campaign|spend|conversion|attribution|lead quality)\b/i, agents: ["paid-media-auditor", "crm-revenue-ops-analyst", "reporting-analytics-analyst"] },
  { id: "reporting", pattern: /\b(report|analytics|metric|kpi|deck|executive summary|scorecard)\b/i, agents: ["reporting-analytics-analyst", "independent-qa-release-critic"] },
  { id: "search-content", pattern: /\b(seo|aeo|geo|content|blog|copy|social|creative|keyword)\b/i, agents: ["seo-aeo-geo-strategist", "brand-voice-content-studio", "independent-qa-release-critic"] },
  { id: "automation", pattern: /\b(automation|scheduler|runtime|heartbeat|watchdog|checkpoint|connector|collector|failed job|incident)\b/i, agents: ["automation-reliability-scout", "independent-qa-release-critic"] },
  { id: "knowledge", pattern: /\b(obsidian|knowledge|memory|vault|durable|sop|decision log)\b/i, agents: ["knowledge-obsidian-curator", "independent-qa-release-critic"] },
  { id: "research", pattern: /\b(research|competitor|market|current|source|investigate|compare)\b/i, agents: ["research-scout", "independent-qa-release-critic"] },
  { id: "client-route", pattern: /\b(client|account|portal|brand|route|worktree|environment)\b/i, agents: ["client-context-router", "research-scout"] },
];

export function routeTask(prompt: string, selectedAgentId: string, teamMode: boolean): ExecutionPlan {
  if (selectedAgentId !== "marketing-chief") {
    return {
      routeId: "direct-specialist",
      agents: [getAgent(selectedAgentId)],
      rationale: "Dillon selected a specific specialist.",
      makerChecker: false,
    };
  }

  const matched = rules.find((rule) => rule.pattern.test(prompt));
  const ids = matched?.agents ?? ["research-scout", "marketing-chief"];
  const selected = teamMode ? ids.slice(0, 3) : ids.slice(0, 1);

  return {
    routeId: matched?.id ?? "general-command",
    agents: selected.map(getAgent),
    rationale: matched
      ? `Matched the ${matched.id} operating lane.`
      : "No narrow lane dominated, so Marketing Chief receives a bounded general route.",
    makerChecker: selected.some((id) => id.includes("critic")),
  };
}
