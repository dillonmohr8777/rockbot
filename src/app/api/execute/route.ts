import { RunRequestSchema, type RunEvent } from "@/lib/contracts";
import { executeRun } from "@/lib/orchestrator/execute";
import { registerActiveRun, unregisterActiveRun } from "@/lib/orchestrator/active-runs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = RunRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid Rockbot run request.", issues: parsed.error.issues }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const runController = new AbortController();
  let streamClosed = false;
  let activeRunId: string | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: RunEvent) => {
        if (event.type === "run_started") {
          activeRunId = event.runId;
          registerActiveRun(event.runId, runController);
        }
        if (streamClosed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          streamClosed = true;
        }
      };
      void executeRun(parsed.data, emit, runController.signal)
        .catch((error) => {
          const event: RunEvent = {
            id: crypto.randomUUID(),
            runId: "pending",
            type: "run_failed",
            timestamp: new Date().toISOString(),
            content: error instanceof Error ? error.message : "Rockbot run failed.",
          };
          emit(event);
        })
        .finally(() => {
          if (activeRunId) unregisterActiveRun(activeRunId);
          if (streamClosed) return;
          streamClosed = true;
          try {
            controller.close();
          } catch {
            // The browser may have already canceled the response stream.
          }
        });
    },
    cancel() {
      streamClosed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
