import { cancelActiveRun, isActiveRun } from "@/lib/orchestrator/active-runs";
import { getReceipt } from "@/lib/orchestrator/run-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;
  if (!/^rb-[A-Za-z0-9-]+$/.test(runId)) {
    return Response.json({ ok: false, error: "Invalid run identifier." }, { status: 400 });
  }
  const receipt = await getReceipt(runId);
  if (receipt) return Response.json({ ok: true, state: "finished", receipt });
  if (isActiveRun(runId)) return Response.json({ ok: true, state: "running" }, { status: 202 });
  return Response.json({ ok: false, state: "not_found" }, { status: 404 });
}

export async function DELETE(_request: Request, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;
  if (!/^rb-[A-Za-z0-9-]+$/.test(runId)) {
    return Response.json({ ok: false, error: "Invalid run identifier." }, { status: 400 });
  }
  const canceled = cancelActiveRun(runId);
  return Response.json({ ok: canceled, state: canceled ? "stop_requested" : "not_active" }, { status: canceled ? 202 : 404 });
}
