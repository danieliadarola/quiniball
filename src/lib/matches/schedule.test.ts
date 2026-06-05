import { describe, it, expect } from "vitest";
import { MATCHES } from "@/data/tournament/matches";
import {
  groupIntoSections,
  isPredictionLocked,
  lockDeadlineMs,
  PREDICTION_LOCK_LEAD_MS,
  sectionOf,
} from "./schedule";

describe("schedule", () => {
  it("clasifica las jornadas de grupos por número de partido", () => {
    expect(sectionOf({ matchNumber: 1, phase: "group", kickoff: "" })).toBe("group-1");
    expect(sectionOf({ matchNumber: 24, phase: "group", kickoff: "" })).toBe("group-1");
    expect(sectionOf({ matchNumber: 25, phase: "group", kickoff: "" })).toBe("group-2");
    expect(sectionOf({ matchNumber: 49, phase: "group", kickoff: "" })).toBe("group-3");
    expect(sectionOf({ matchNumber: 104, phase: "final", kickoff: "" })).toBe("final");
  });

  it("agrupa los 104 partidos en 9 secciones ordenadas", () => {
    const sections = groupIntoSections(
      MATCHES.map((m) => ({ matchNumber: m.matchNumber, phase: m.phase, kickoff: m.kickoff })),
    );
    expect(sections.map((s) => s.key)).toEqual([
      "group-1", "group-2", "group-3",
      "round32", "round16", "quarter", "semi", "third", "final",
    ]);
    expect(sections[0].matches).toHaveLength(24);
    expect(sections.reduce((n, s) => n + s.matches.length, 0)).toBe(104);
  });

  it("el pronóstico cierra 5 minutos antes del kickoff", () => {
    const kickoff = Date.parse("2026-06-11T20:00:00Z");
    const deadline = lockDeadlineMs(kickoff);
    expect(kickoff - deadline).toBe(PREDICTION_LOCK_LEAD_MS);
    expect(deadline).toBe(Date.parse("2026-06-11T19:55:00Z"));

    expect(isPredictionLocked(kickoff, deadline - 1)).toBe(false); // justo antes del cierre
    expect(isPredictionLocked(kickoff, deadline)).toBe(true);      // en el cierre (5 min antes)
    expect(isPredictionLocked(kickoff, kickoff)).toBe(true);       // en el kickoff, cerrado
  });
});
