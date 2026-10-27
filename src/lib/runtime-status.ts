import type { ProviderHealth } from "@/lib/contracts";

export interface RuntimeStatusInput {
  status: string;
  providers: ProviderHealth[];
  knowledge: { routines: number };
  policy: { maxConcurrentSpecialists: number; maxEvaluatorLoops: number; externalActionsDefault: string };
}

export interface RuntimeCheck {
  snapshot: RuntimeStatusInput | null;
  failed: boolean;
  at: string | null;
}

/** JSON string for the WebMCP get_runtime_status tool. Real providers only: no demo, filesystem roots, versions, details or raw errors. */
export function runtimeStatusJson({ snapshot, failed, at }: RuntimeCheck): string {
  if (!snapshot) {
    return JSON.stringify(failed
      ? { runtime_check: "failed", error: "The local runtime check failed; reload Rockbot and try again." }
      : { runtime_check: "loading", error: "Runtime status is still loading; try again in a few seconds." });
  }
  const real = snapshot.providers.filter((provider) => provider.id !== "demo");
  const byState: Record<string, number> = {};
  real.forEach((provider) => { byState[provider.state] = (byState[provider.state] ?? 0) + 1; });
  return JSON.stringify({
    runtime_check: "ok", observed_at: at, status: snapshot.status, by_state: byState,
    providers: real.map(({ id, label, state, installed }) => ({ id, label, state, installed })),
    routines: snapshot.knowledge.routines,
    policy: {
      max_concurrent_specialists: snapshot.policy.maxConcurrentSpecialists,
      max_evaluator_loops: snapshot.policy.maxEvaluatorLoops,
      external_actions_default: snapshot.policy.externalActionsDefault,
    },
  });
}
