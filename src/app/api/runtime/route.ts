import { NextResponse } from "next/server";
import knowledgeIndex from "@/generated/knowledge-index.json";
import routinesDocument from "@/generated/routines.json";
import { allowedRoots } from "@/lib/orchestrator/safety";
import { providerHealth } from "@/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const providers = await providerHealth();
  return NextResponse.json({
    status: "ready",
    providers,
    knowledge: {
      routines: routinesDocument.routines.length,
      cadence: routinesDocument.cadence,
      sourceHash: routinesDocument.source.sha256,
      workflow: knowledgeIndex.workflow.name,
    },
    policy: {
      maxConcurrentSpecialists: 3,
      maxEvaluatorLoops: 2,
      externalActionsDefault: "denied",
      allowedRoots: allowedRoots(),
    },
  });
}
