type ActiveRunStore = Map<string, AbortController>;

const globalState = globalThis as typeof globalThis & {
  rockbotActiveRuns?: ActiveRunStore;
};

function store(): ActiveRunStore {
  globalState.rockbotActiveRuns ??= new Map();
  return globalState.rockbotActiveRuns;
}

export function registerActiveRun(runId: string, controller: AbortController): void {
  store().set(runId, controller);
}

export function unregisterActiveRun(runId: string): void {
  store().delete(runId);
}

export function isActiveRun(runId: string): boolean {
  return store().has(runId);
}

export function cancelActiveRun(runId: string): boolean {
  const controller = store().get(runId);
  if (!controller) return false;
  controller.abort(new Error("The run was stopped by Dillon."));
  return true;
}
