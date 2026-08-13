export interface ScheduleTemplate {
  id: string;
  name: string;
  cadence: string;
  agentId: string;
  routineIds: string[];
  state: "recorded-template";
}

export const scheduleTemplates: ScheduleTemplate[] = [
  { id: "daily-command", name: "Daily Command and Operations Pass", cadence: "Weekdays · 8:30 AM", agentId: "morning-marketing-chief-operator", routineIds: ["D01", "D02", "D03", "D08", "D09", "D10", "D11"], state: "recorded-template" },
  { id: "daily-comms", name: "Daily Communications Intake and Draft Desk", cadence: "Weekdays · 9:15 AM", agentId: "client-communications-draft-desk", routineIds: ["D04", "D05", "D06", "D20", "D21", "D22"], state: "recorded-template" },
  { id: "radar-next20", name: "W05 Prospect Radar 25-site Batch", cadence: "Mondays · 9:00 AM", agentId: "prospect-radar-website-factory", routineIds: ["W05"], state: "recorded-template" },
  { id: "paid-media-a", name: "W02 Paid-media review pass A", cadence: "Tuesdays · 9:36 AM", agentId: "paid-media-twice-weekly-review", routineIds: ["W02"], state: "recorded-template" },
  { id: "paid-media-b", name: "W03 Paid-media review pass B", cadence: "Fridays · 9:36 AM", agentId: "paid-media-twice-weekly-review", routineIds: ["W03"], state: "recorded-template" },
  { id: "report-build", name: "D19 Report Dashboard Build", cadence: "Weekdays · 10:36 AM", agentId: "weekly-reporting-operator", routineIds: ["D19"], state: "recorded-template" },
  { id: "weekly-reports", name: "W06 Client Weekly Reports", cadence: "Mondays · 9:36 AM", agentId: "weekly-reporting-operator", routineIds: ["W06"], state: "recorded-template" },
  { id: "daily-priority", name: "D09 Deduplicate and prioritize work", cadence: "Weekdays · 9:36 AM", agentId: "morning-marketing-chief-operator", routineIds: ["D09"], state: "recorded-template" },
  { id: "daily-close", name: "D27 Close the operating day", cadence: "Weekdays · 5:36 PM", agentId: "morning-marketing-chief-operator", routineIds: ["D27"], state: "recorded-template" },
  { id: "weekly-slate", name: "W01 Weekly operating slate", cadence: "Mondays · 9:36 AM", agentId: "weekly-executive-review", routineIds: ["W01"], state: "recorded-template" },
  { id: "weekly-exec", name: "W10 Executive weekly review", cadence: "Fridays · 4:36 PM", agentId: "weekly-executive-review", routineIds: ["W10"], state: "recorded-template" },
  { id: "monthly-value", name: "M03 Automation value and cost audit", cadence: "Monthly · day 1 · 10:36 AM", agentId: "weekly-executive-review", routineIds: ["M03"], state: "recorded-template" },
];
