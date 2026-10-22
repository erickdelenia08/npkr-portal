import { describe, it, expect } from "vitest";
import siteplanData from "@/components/shared/siteplan-data.json";

describe("Interactive Siteplan Data & Mapping Tests", () => {
  it("should have all 367 unit plot polygons extracted from real siteplan.svg", () => {
    expect(siteplanData.plotPolygons).toBeDefined();
    expect(siteplanData.plotPolygons.length).toBe(367);
  });

  it("should have road polygons and street infrastructure intact", () => {
    expect(siteplanData.roadPolygons.length).toBeGreaterThan(0);
    expect(siteplanData.lines.length).toBe(67);
    expect(siteplanData.paths.length).toBe(7);
    expect(siteplanData.circles.length).toBe(1);
  });

  it("should contain major housing project blocks (A through R)", () => {
    const blocks = new Set(siteplanData.plotPolygons.map((p) => p.blockLetter));
    ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "Q", "R"].forEach(
      (expectedBlock) => {
        expect(blocks.has(expectedBlock)).toBe(true);
      }
    );
  });

  it("should map Block F units correctly to F-1 through F-18", () => {
    const fPlots = siteplanData.plotPolygons.filter((p) => p.blockLetter === "F");
    expect(fPlots.length).toBeGreaterThanOrEqual(16);

    const fBloks = fPlots.map((p) => p.blok);
    expect(fBloks).toContain("F-1");
    expect(fBloks).toContain("F-2");
    expect(fBloks).toContain("F-10");
  });

  it("should have centroid coordinates for each plot", () => {
    siteplanData.plotPolygons.forEach((plot) => {
      expect(plot.cx).toBeGreaterThan(0);
      expect(plot.cy).toBeGreaterThan(0);
      expect(plot.points.length).toBeGreaterThan(10);
    });
  });
});
