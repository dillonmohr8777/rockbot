import { RunRequestSchema, type RunEvent } from "@/lib/contracts";
import { executeRun } from "@/lib/orchestrator/execute";

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
  const abortRun = () => runController.abort();
  request.signal.addEventListener("abort", abortRun, { once: true });
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: RunEvent) => {
        if (streamClosed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          streamClosed = true;
          runController.abort();
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
          request.signal.removeEventListener("abort", abortRun);
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
      request.signal.removeEventListener("abort", abortRun);
      runController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
