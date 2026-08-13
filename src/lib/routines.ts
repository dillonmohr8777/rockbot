import routinesDocument from "@/generated/routines.json";

export interface RoutineDefinition {
  id: string;
  cadence: "daily" | "weekly" | "weekly-twice" | "monthly" | "event";
  name: string;
  owner_bot: string;
  trigger: string;
  demo_input: string;
  steps: string[];
  output: string;
  approval_boundary: string;
  success_evidence: string;
}

export const routines = routinesDocument.routines as RoutineDefinition[];
export const routineById = new Map(routines.map((routine) => [routine.id, routine]));

export function getRoutine(id?: string): RoutineDefinition | undefined {
  return id ? routineById.get(id.toUpperCase()) : undefined;
}
