import { describe, it, expect } from "vitest";
import { MATCHES } from "./matches";
import { getVenue } from "./venues";
import { getTeam } from "./teams";

describe("calendario 104 partidos", () => {
  it("tiene 104 partidos, 72 de grupos y 32 de eliminatorias", () => {
    expect(MATCHES).toHaveLength(104);
    expect(MATCHES.filter((m) => m.phase === "group")).toHaveLength(72);
    expect(MATCHES.filter((m) => m.phase !== "group")).toHaveLength(32);
  });

  it("todas las sedes existen y los kickoffs son fechas válidas", () => {
    for (const m of MATCHES) {
      expect(getVenue(m.venueId), `sede ${m.venueId}`).toBeTruthy();
      expect(Number.isNaN(Date.parse(m.kickoff)), m.kickoff).toBe(false);
    }
  });

  it("los partidos de grupos tienen equipos reales; las eliminatorias usan placeholders", () => {
    for (const m of MATCHES) {
      if (m.phase === "group") {
        expect(getTeam(m.homeTeamId!), m.homeTeamId!).toBeTruthy();
        expect(getTeam(m.awayTeamId!), m.awayTeamId!).toBeTruthy();
      } else {
        expect(m.homeTeamId).toBeNull();
        expect(m.homePlaceholder).toBeTruthy();
        expect(m.awayPlaceholder).toBeTruthy();
      }
    }
  });

  it("el partido inaugural y la final usan la hora local de su sede", () => {
    const m1 = MATCHES.find((m) => m.matchNumber === 1)!;
    const m104 = MATCHES.find((m) => m.matchNumber === 104)!;
    expect(m1.kickoff).toContain("-06:00"); // CDMX
    expect(m104.kickoff).toContain("-04:00"); // Nueva York/NJ
  });
});
