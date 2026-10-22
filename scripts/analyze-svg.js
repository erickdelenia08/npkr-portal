import { readFileSync } from 'fs';
const svg = readFileSync('siteplan.svg', 'utf8');

// Parse block letters
const textRegex = /<text([^>]*)>([\s\S]*?)<\/text>/g;
let m;
const blockLetters = [];
while ((m = textRegex.exec(svg)) !== null) {
  const attrs = m[1];
  const content = m[2].replace(/<[^>]+>/g, '').trim();
  if (attrs.includes('cls-9')) {
    const transMatch = attrs.match(/translate\(([\d\.]+)\s+([\d\.]+)\)/);
    if (transMatch) {
      blockLetters.push({
        letter: content === '0' ? 'O' : content,
        x: parseFloat(transMatch[1]),
        y: parseFloat(transMatch[2])
      });
    }
  }
}

// Parse polygons
const polyRegex = /<polygon([^>]*)\/?>/g;
let pMatch;
const plots = [];
let index = 0;
while ((pMatch = polyRegex.exec(svg)) !== null) {
  const attrs = pMatch[1];
  const clsMatch = attrs.match(/class="([^"]+)"/);
  const cls = clsMatch ? clsMatch[1] : '';
  if (cls === 'cls-5') continue; // skip non-plot

  const ptsMatch = attrs.match(/points="([^"]+)"/);
  if (!ptsMatch) continue;
  const rawPts = ptsMatch[1].trim().split(/\s+/).map(Number);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let sumX = 0, sumY = 0;
  const numPts = rawPts.length / 2;
  for (let i = 0; i < rawPts.length; i += 2) {
    const px = rawPts[i];
    const py = rawPts[i + 1];
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
    sumX += px;
    sumY += py;
  }
  const cx = sumX / numPts;
  const cy = sumY / numPts;
  plots.push({
    index,
    cls,
    cx,
    cy,
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    points: ptsMatch[1].trim()
  });
  index++;
}

console.log('Total unit plots:', plots.length);

// Also look at the irregular path plot
const pathMatch = svg.match(/<path class="cls-1" d="([^"]+)"\/>/);
if (pathMatch) {
  console.log('Found irregular path plot:', pathMatch[1]);
}

// Map each plot to closest block letter
plots.forEach(plot => {
  let closest = null;
  let minDist = Infinity;
  blockLetters.forEach(bl => {
    const dist = Math.hypot(plot.cx - bl.x, plot.cy - bl.y);
    if (dist < minDist) {
      minDist = dist;
      closest = bl;
    }
  });
  plot.nearestBlock = closest ? closest.letter : '?';
  plot.distToBlock = minDist;
});

const byBlock = {};
plots.forEach(p => {
  byBlock[p.nearestBlock] = (byBlock[p.nearestBlock] || 0) + 1;
});

console.log('Plots assigned to nearest block letter:');
console.table(byBlock);
