import { readFileSync, writeFileSync } from 'fs';
const svg = readFileSync('siteplan.svg', 'utf8');

// 1. Parse defs and classes
const styleMatch = svg.match(/<style>([\s\S]*?)<\/style>/);
console.log('Styles:', styleMatch ? styleMatch[1] : 'none');

// 2. Parse block letters
const textRegex = /<text([^>]*)>([\s\S]*?)<\/text>/g;
let m;
const blockLetters = [];
const allTexts = [];
while ((m = textRegex.exec(svg)) !== null) {
  const attrs = m[1];
  const content = m[2].replace(/<[^>]+>/g, '').trim();
  allTexts.push({
    raw: m[0],
    attrs: m[1],
    content: m[2]
  });
  const transMatch = attrs.match(/translate\(([\d\.]+)\s+([\d\.]+)\)/);
  if (attrs.includes('cls-9') && transMatch) {
    blockLetters.push({
      letter: content === '0' ? 'O' : content,
      x: parseFloat(transMatch[1]),
      y: parseFloat(transMatch[2])
    });
  }
}
console.log('Found block letters:', blockLetters.map(b => b.letter).join(', '));

// 3. Parse all polygons
const polyRegex = /<polygon class="([^"]+)" points="([^"]+)"\/?>/g;
let pMatch;
const allPolygons = [];
let idx = 0;
while ((pMatch = polyRegex.exec(svg)) !== null) {
  const cls = pMatch[1];
  const pts = pMatch[2].trim().split(/\s+/).map(Number);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let sumX = 0, sumY = 0;
  for (let k = 0; k < pts.length; k += 2) {
    minX = Math.min(minX, pts[k]);
    maxX = Math.max(maxX, pts[k]);
    minY = Math.min(minY, pts[k + 1]);
    maxY = Math.max(maxY, pts[k + 1]);
    sumX += pts[k];
    sumY += pts[k + 1];
  }
  const cx = sumX / (pts.length / 2);
  const cy = sumY / (pts.length / 2);
  allPolygons.push({
    index: idx++,
    cls,
    points: pMatch[2].trim(),
    cx,
    cy,
    minX,
    maxX,
    minY,
    maxY
  });
}

console.log('Total polygons in SVG:', allPolygons.length);
// Check which polygons are cls-2 (fill: none;)
const roadPolygons = allPolygons.filter(p => p.cls === 'cls-2');
const plotPolygons = allPolygons.filter(p => p.cls !== 'cls-2');
console.log('Road/boundary polygons (cls-2):', roadPolygons.length);
console.log('Plot polygons:', plotPolygons.length);

// 4. Map each plot polygon to closest block letter
plotPolygons.forEach(p => {
  let best = null;
  let bestDist = Infinity;
  blockLetters.forEach(bl => {
    const d = Math.hypot(p.cx - bl.x, p.cy - bl.y);
    if (d < bestDist) {
      bestDist = d;
      best = bl;
    }
  });
  p.block = best ? best.letter : 'X';
  p.dist = bestDist;
});

// 5. Group by block and sort in natural reading order
const byBlock = {};
plotPolygons.forEach(p => {
  if (!byBlock[p.block]) byBlock[p.block] = [];
  byBlock[p.block].push(p);
});

Object.keys(byBlock).sort().forEach(bName => {
  const list = byBlock[bName];
  // Sort primarily by row (Y), then col (X)
  list.sort((a, b) => {
    if (Math.abs(a.cy - b.cy) > 15) {
      return a.cy - b.cy;
    }
    return a.cx - b.cx;
  });
  list.forEach((p, i) => {
    p.blok = `${bName}-${i + 1}`;
  });
  console.log(`Block ${bName}: ${list.length} plots (${list[0].blok} .. ${list[list.length - 1].blok})`);
});

// 6. Parse all lines
const lineRegex = /<line class="([^"]+)" x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"\/?>/g;
let lMatch;
const lines = [];
while ((lMatch = lineRegex.exec(svg)) !== null) {
  lines.push({
    cls: lMatch[1],
    x1: lMatch[2],
    y1: lMatch[3],
    x2: lMatch[4],
    y2: lMatch[5]
  });
}
console.log('Lines count:', lines.length);

// 7. Parse all paths
const pathRegex = /<path class="([^"]+)" d="([^"]+)"\/?>/g;
let ptMatch;
const paths = [];
while ((ptMatch = pathRegex.exec(svg)) !== null) {
  paths.push({
    cls: ptMatch[1],
    d: ptMatch[2]
  });
}
console.log('Paths count:', paths.length);

// 8. Parse circle
const circleRegex = /<circle class="([^"]+)" cx="([^"]+)" cy="([^"]+)" r="([^"]+)"\/?>/g;
let cMatch;
const circles = [];
while ((cMatch = circleRegex.exec(svg)) !== null) {
  circles.push({
    cls: cMatch[1],
    cx: cMatch[2],
    cy: cMatch[3],
    r: cMatch[4]
  });
}
console.log('Circles count:', circles.length);

// Save generated data to components/shared/siteplan-data.json
writeFileSync('components/shared/siteplan-data.json', JSON.stringify({
  plotPolygons: plotPolygons.map(p => ({
    id: p.blok,
    blok: p.blok,
    blockLetter: p.block,
    points: p.points,
    cx: Math.round(p.cx * 10) / 10,
    cy: Math.round(p.cy * 10) / 10,
    origCls: p.cls
  })),
  roadPolygons: roadPolygons.map(p => ({
    points: p.points,
    cls: p.cls
  })),
  lines,
  paths,
  circles,
  texts: allTexts
}, null, 2));

console.log('Successfully generated siteplan-data.json for new siteplan.svg!');
