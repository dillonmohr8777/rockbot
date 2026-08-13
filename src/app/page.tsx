import { RockbotApp } from "@/components/rockbot-app";
import { agents } from "@/data/agents";
import { scheduleTemplates } from "@/data/schedules";
import { routines } from "@/lib/routines";

export default function Home() {
  return (
    <RockbotApp
      initialAgents={agents}
      initialRoutines={routines}
      initialSchedules={scheduleTemplates}
      initialWorkingDirectory={process.cwd()}
    />
  );
}
