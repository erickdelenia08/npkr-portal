import { readFileSync } from 'fs';
const svg = readFileSync('siteplan.svg', 'utf8');

const polyRegex = /<polygon class="([^"]+)" points="([^"]+)"\/?>/g;
let m;
const polys = [];
let idx = 0;
while ((m = polyRegex.exec(svg)) !== null) {
  const cls = m[1];
  const pts = m[2].trim().split(/\s+/).map(Number);
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
  polys.push({
    index: idx++,
    cls,
    cx,
    cy,
    minX,
    maxX,
    minY,
    maxY
  });
}

// Group sequential polygons into clusters by jumping distance
const clusters = [];
let currentCluster = [polys[0]];

for (let i = 1; i < polys.length; i++) {
  const prev = polys[i - 1];
  const curr = polys[i];
  const dist = Math.hypot(curr.cx - prev.cx, curr.cy - prev.cy);
  // If distance between consecutive polygons in the SVG file is > 100, it's a new cluster
  if (dist > 120 || curr.cls === 'cls-5' || prev.cls === 'cls-5') {
    clusters.push(currentCluster);
    currentCluster = [curr];
  } else {
    currentCluster.push(curr);
  }
}
if (currentCluster.length) clusters.push(currentCluster);

console.log(`Found ${clusters.length} sequential clusters in SVG:`);
clusters.forEach((c, i) => {
  const avgX = c.reduce((sum, p) => sum + p.cx, 0) / c.length;
  const avgY = c.reduce((sum, p) => sum + p.cy, 0) / c.length;
  console.log(`Cluster ${i}: ${c.length} polygons (indices ${c[0].index}..${c[c.length - 1].index}) at avgX=${avgX.toFixed(1)}, avgY=${avgY.toFixed(1)} [${c[0].cls}]`);
});
