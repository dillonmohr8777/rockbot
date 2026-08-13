import { NextResponse } from "next/server";
import { listReceipts } from "@/lib/orchestrator/run-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ receipts: await listReceipts() });
}
