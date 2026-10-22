"use client";

import React, { useMemo } from "react";
import { SerializedMasterUnit } from "@/actions/master-unit.action";
import siteplanData from "./siteplan-data.json";

export interface UnregisteredPlot {
  blok: string;
  isRegistered: false;
}

export interface InteractiveSiteplanSvgProps {
  units: SerializedMasterUnit[];
  filteredUnits: SerializedMasterUnit[];
  selectedUnit: SerializedMasterUnit | null;
  onSelectUnit: (unit: SerializedMasterUnit | null) => void;
  onSelectUnregistered?: (plot: UnregisteredPlot | null) => void;
  hoveredUnit: SerializedMasterUnit | null;
  onHoverUnit: (unit: SerializedMasterUnit | null) => void;
  selectedBlock?: string;
  zoomScale?: number;
}

export function InteractiveSiteplanSvg({
  units,
  filteredUnits,
  selectedUnit,
  onSelectUnit,
  onSelectUnregistered,
  hoveredUnit,
  onHoverUnit,
  selectedBlock = "ALL",
  zoomScale = 1,
}: InteractiveSiteplanSvgProps) {
  // Map units by normalized blok (e.g. "F-1", "f-1", "f1")
  const unitMap = useMemo(() => {
    const map = new Map<string, SerializedMasterUnit>();
    units.forEach((u) => {
      const key = u.blok.toUpperCase().trim();
      map.set(key, u);
      // Also map without hyphen just in case (e.g. "F1" -> "F-1")
      map.set(key.replace("-", ""), u);
    });
    return map;
  }, [units]);

  // Set of filtered unit IDs for fast lookup
  const filteredUnitIds = useMemo(() => {
    return new Set(filteredUnits.map((u) => u.id));
  }, [filteredUnits]);

  // Determine fill color by unit status
  const getFillColor = (unit: SerializedMasterUnit | undefined, origCls: string) => {
    if (!unit) {
      // Not registered in DB: preserve authentic SVG look from recreated file
      if (origCls === "cls-3") return "#fecaca"; // soft red (sold placeholder)
      if (origCls === "cls-4") return "#bbf7d0"; // soft green (available placeholder)
      if (origCls === "cls-5") return "#e2e8f0"; // soft gray (hold placeholder)
      return "#ffffff"; // default lot fill
    }

    switch (unit.status_unit) {
      case "AVAILABLE":
        return "#10b981"; // Emerald green
      case "HOLD":
      case "BOOKED":
        return "#f59e0b"; // Amber / orange
      case "SOLD":
        return "#ef4444"; // Red (or #94a3b8)
      default:
        return "#94a3b8";
    }
  };

  return (
    <div
      className="relative w-full overflow-auto rounded-lg border border-mist bg-slate-50/70 p-2 sm:p-4 select-none"
      style={{ maxHeight: "78vh" }}
    >
      <div
        className="transition-transform duration-200 origin-top flex justify-center items-start"
        style={{
          transform: `scale(${zoomScale})`,
          minWidth: `${1080 * Math.max(zoomScale, 0.7)}px`,
        }}
      >
        <svg
          id="npkr_siteplan_master"
          viewBox="0 0 1080 1350"
          className="w-full max-w-[1080px] h-auto drop-shadow-sm bg-white rounded-md"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <style>{`
              .siteplan-base-stroke { stroke: #1e293b; stroke-miterlimit: 10; stroke-width: 1.5px; }
              .siteplan-road { fill: none; stroke: #334155; stroke-miterlimit: 10; stroke-width: 2px; }
              .siteplan-compass-fill { fill: #475569; }
              .siteplan-compass-text { font-size: 17.5px; fill: #0f172a; letter-spacing: 0.16em; font-family: Montserrat, sans-serif; font-weight: 700; }
              .siteplan-unit-num { font-size: 11.5px; font-family: Montserrat, monospace; font-weight: 600; fill: #334155; pointer-events: none; }
              .siteplan-block-letter { font-size: 32px; font-family: Montserrat, sans-serif; font-weight: 800; fill: #0f172a; pointer-events: none; opacity: 0.85; }
              .siteplan-street-text { font-size: 13.5px; font-family: Montserrat, sans-serif; font-weight: 700; fill: #1e293b; }
            `}</style>
          </defs>

          {/* 1. Road polygons and Site Boundaries */}
          {siteplanData.roadPolygons.map((rp, i) => (
            <polygon
              key={`road-${i}`}
              points={rp.points}
              fill="#f1f5f9"
              stroke="#64748b"
              strokeWidth="1.75"
              strokeMiterlimit="10"
            />
          ))}

          {/* 2. Boundary Lines and Sub-divisions */}
          {siteplanData.lines.map((l, i) => (
            <line
              key={`line-${i}`}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke="#64748b"
              strokeWidth="1.25"
              strokeMiterlimit="10"
            />
          ))}

          {/* 3. Site Plan Paths (Site boundary & Fasum/Compass) */}
          {siteplanData.paths.map((p, i) => {
            const isCompass = p.cls === "cls-6";
            const isSiteBoundary = p.cls === "cls-2" || p.cls === "cls-5";

            return (
              <path
                key={`path-${i}`}
                d={p.d}
                fill={isCompass ? "#475569" : isSiteBoundary ? "none" : "#f8fafc"}
                stroke={isSiteBoundary ? "#0f172a" : "#64748b"}
                strokeWidth={isSiteBoundary ? "2.5" : "1.25"}
                strokeMiterlimit="10"
              />
            );
          })}

          {/* 4. Circles (Roundabout / Fasum) */}
          {siteplanData.circles.map((c, i) => (
            <circle
              key={`circle-${i}`}
              cx={c.cx}
              cy={c.cy}
              r={c.r}
              fill="#e2e8f0"
              stroke="#475569"
              strokeWidth="1.5"
            />
          ))}

          {/* 5. Interactive Unit Plots */}
          {siteplanData.plotPolygons.map((plot) => {
            const unit = unitMap.get(plot.blok.toUpperCase());
            const isRegistered = !!unit;
            const isAvailable = unit?.status_unit === "AVAILABLE";
            const isSelected = selectedUnit?.id === unit?.id && isRegistered;

            // Filter status: if filters are active, dim out unselected
            const isFilteredOut =
              filteredUnits.length > 0 && isRegistered && !filteredUnitIds.has(unit.id);

            const isBlockFilteredOut =
              selectedBlock !== "ALL" && plot.blockLetter !== selectedBlock;

            const fillColor = getFillColor(unit, plot.origCls);

            const opacityClass =
              isBlockFilteredOut || isFilteredOut
                ? "opacity-20 transition-opacity duration-200"
                : "opacity-100 transition-opacity duration-200";

            return (
              <g
                key={plot.id}
                id={`plot-${plot.blok}`}
                data-blok={plot.blok}
                className={`${opacityClass} ${
                  isAvailable ? "cursor-pointer group" : isRegistered ? "cursor-pointer" : "cursor-default"
                }`}
                onClick={() => {
                  if (unit) {
                    onSelectUnit(unit);
                    onSelectUnregistered?.(null);
                  } else {
                    onSelectUnregistered?.({ blok: plot.blok, isRegistered: false });
                  }
                }}
                onMouseEnter={() => {
                  if (unit) {
                    onHoverUnit(unit);
                  }
                }}
                onMouseLeave={() => {
                  onHoverUnit(null);
                }}
              >
                {/* Polygon Plot Boundary */}
                <polygon
                  points={plot.points}
                  fill={fillColor}
                  stroke={isSelected ? "#0f172a" : "#334155"}
                  strokeWidth={isSelected ? "3" : "1.25"}
                  strokeMiterlimit="10"
                  className={
                    isAvailable
                      ? "transition-all duration-150 group-hover:stroke-emerald-950 group-hover:stroke-[2.5px] group-hover:brightness-105"
                      : isRegistered
                      ? "transition-all duration-150 hover:stroke-[2px]"
                      : ""
                  }
                />

                {/* Plot Blok Label (visible when zoomed or registered) */}
                {unit && (
                  <text
                    x={plot.cx}
                    y={plot.cy + 3}
                    textAnchor="middle"
                    fontSize={plot.blok.length > 3 ? "8.5" : "9.5"}
                    fontWeight="700"
                    fontFamily="monospace"
                    fill={
                      unit.status_unit === "AVAILABLE"
                        ? "#ffffff"
                        : unit.status_unit === "SOLD"
                        ? "#ffffff"
                        : "#78350f"
                    }
                    pointerEvents="none"
                  >
                    {plot.blok}
                  </text>
                )}
              </g>
            );
          })}

          {/* 6. Static Typography & Labels from Siteplan */}
          {/* Compass labels */}
          <text className="siteplan-compass-text" transform="translate(277.7 259.72)">U</text>
          <text className="siteplan-compass-text" transform="translate(277.7 390.99)">S</text>
          <text className="siteplan-compass-text" transform="translate(346.63 326.21)">T</text>
          <text className="siteplan-compass-text" transform="translate(213.42 326.21)">B</text>

          {/* Major Block Letters (A - R) */}
          <text className="siteplan-block-letter" transform="translate(148.36 961.97)">A</text>
          <text className="siteplan-block-letter" transform="translate(119.02 629.04)">B</text>
          <text className="siteplan-block-letter" transform="translate(269.12 954.07)">C</text>
          <text className="siteplan-block-letter" transform="translate(237.52 614.36)">D</text>
          <text className="siteplan-block-letter" transform="translate(351.51 614.36)">E</text>
          <text className="siteplan-block-letter" transform="translate(427.69 821.46)">F</text>
          <text className="siteplan-block-letter" transform="translate(431.64 939.4)">G</text>
          <text className="siteplan-block-letter" transform="translate(438.97 1064.1)">H</text>
          <text className="siteplan-block-letter" transform="translate(616.16 1021.22)">I</text>
          <text className="siteplan-block-letter" transform="translate(670.35 800.57)">J</text>
          <text className="siteplan-block-letter" transform="translate(836.23 636.37)">K</text>
          <text className="siteplan-block-letter" transform="translate(844.13 793.24)">K</text>
          <text className="siteplan-block-letter" transform="translate(586.82 658.94)">L</text>
          <text className="siteplan-block-letter" transform="translate(586.82 550.6)">M</text>
          <text className="siteplan-block-letter" transform="translate(586.82 438.87)">N</text>
          <text className="siteplan-block-letter" transform="translate(586.82 339.55)">O</text>
          <text className="siteplan-block-letter" transform="translate(685 160.11)">Q</text>
          <text className="siteplan-block-letter" transform="translate(359.41 466.52)">R</text>

          {/* Unit Numbers for guidance */}
          <text className="siteplan-unit-num" transform="translate(560.19 829.37) rotate(-3.84)">22</text>
          <text className="siteplan-unit-num" transform="translate(394.67 791.3) rotate(-3.84)">2</text>
          <text className="siteplan-unit-num" transform="translate(512.79 783.52) rotate(-3.84)">7</text>
          <text className="siteplan-unit-num" transform="translate(515.9 830.15) rotate(-3.84)">8</text>
          <text className="siteplan-unit-num" transform="translate(484.81 1030.65) rotate(-3.84)">5</text>
          <text className="siteplan-unit-num" transform="translate(508.13 1029.09) rotate(-3.84)">6</text>
          <text className="siteplan-unit-num" transform="translate(449.84 571.37) rotate(-3.84)">1</text>
          <text className="siteplan-unit-num" transform="translate(543.1 565.16) rotate(-3.84)">5</text>
          <text className="siteplan-unit-num" transform="translate(656.56 821.6) rotate(-3.84)">18</text>

          {/* Street Name */}
          <text className="siteplan-street-text" transform="translate(74.52 880.66) rotate(86)">
            Jalan Raya Desa
          </text>
        </svg>
      </div>
    </div>
  );
}
