/// <reference types="vite/client" />

import { EdgeContext } from "./cdt/edgeContext";
import {
  playground,
  pointRemoval,
  selfIntersecting,
  grid,
  tinySquare,
} from "./cdt/presets";

let showLabels = false;
let showEdges = true;
let selectedMap = 0;

// Map of available presets
const presets = [
  { name: "Playground", fn: playground },
  { name: "Point Removal", fn: pointRemoval },
  { name: "Self Intersecting", fn: selfIntersecting },
  { name: "Grid", fn: grid },
  { name: "Tiny Square", fn: tinySquare },
];

// Create edge context with enough capacity
const edges = new EdgeContext(16000);

// Load initial preset
function loadPreset(index: number): void {
  const preset = presets[index];
  if (!preset) return;

  console.log(`Loading preset: ${preset.name}`);

  try {
    // Measure CDT computation time
    const startTime = performance.now();
    preset.fn(edges);
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`✅ ${preset.name} completed in ${duration.toFixed(2)}ms`);
    console.log(`   Created ${edges.count()} edges`);
    console.log(
      `   Performance: ${((edges.count() / duration) * 1000).toFixed(
        0,
      )} edges/second`,
    );

    draw();
  } catch (error) {
    console.error(`❌ Failed to load preset ${preset.name}:`, error);
  }
}

type HalfEdge = {
  x: number;
  y: number;
  next: number;
  twin: number;
  fixed: boolean;
  index: number;
};

function exportEdges(): HalfEdge[] {
  const result: HalfEdge[] = [];
  const capacity = edges.getCapacity();

  for (let i = 0; i < capacity; i++) {
    if (!edges.isInUse(i)) continue;

    const origin = edges.origin(i);
    const next = edges.getNext(i);
    const twin = edges.getTwin(i);
    const fixed = edges.isFixed(i);

    result.push({
      x: origin.x,
      y: origin.y,
      next: next,
      twin: twin,
      fixed: fixed,
      index: i,
    });
  }

  return result;
}

const dpr = window.devicePixelRatio;
const initialScale = dpr;
const minScale = 1;
const maxScale = 30;

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
canvas.addEventListener("mousedown", startDragging);
canvas.addEventListener("mousemove", drag);
canvas.addEventListener("mouseup", stopDragging);
canvas.addEventListener("mouseleave", stopDragging);
canvas.addEventListener("wheel", handleZoom);

// Redraw on window resize.
window.addEventListener("resize", draw);

const controls = document.createElement("div");
controls.setAttribute(
  "style",
  "position: absolute; top: 10px; right: 10px; display: flex; flex-direction: column; gap: 8px;",
);
document.body.appendChild(controls);

// Add preset selector
const presetContainer = document.createElement("div");
presetContainer.setAttribute(
  "style",
  "display: flex; flex-direction: column; gap: 4px;",
);

const presetLabel = document.createElement("label");
presetLabel.textContent = "Preset:";
presetLabel.setAttribute("style", "font-size: 14px; font-weight: bold;");
presetContainer.appendChild(presetLabel);

const presetSelect = document.createElement("select");
presetSelect.setAttribute("style", "padding: 4px;");
presets.forEach((preset, index) => {
  const option = document.createElement("option");
  option.value = index.toString();
  option.textContent = preset.name;
  presetSelect.appendChild(option);
});

presetSelect.addEventListener("change", (e) => {
  const target = e.target as HTMLSelectElement;
  selectedMap = parseInt(target.value);
  loadPreset(selectedMap);
});

presetContainer.appendChild(presetSelect);
controls.appendChild(presetContainer);

// Add checkboxes
const checkboxes = document.createElement("div");
checkboxes.setAttribute(
  "style",
  "display: flex; flex-direction: column; gap: 4px;",
);
controls.appendChild(checkboxes);

function addCheckbox(label: string, checked: boolean, onChange: () => void) {
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = checked;
  checkbox.id = label;
  checkbox.addEventListener("change", onChange);

  const labelElement = document.createElement("label");
  labelElement.setAttribute("style", "font-size: 14px; user-select: none;");
  labelElement.textContent = label;
  labelElement.setAttribute("for", label);

  const container = document.createElement("div");
  container.appendChild(checkbox);
  container.appendChild(labelElement);
  checkboxes.appendChild(container);
  container.setAttribute("style", "display: flex; align-items: center;");
}

addCheckbox("show edges", showEdges, () => {
  showEdges = !showEdges;
  draw();
});

addCheckbox("show labels", showLabels, () => {
  showLabels = !showLabels;
  draw();
});

// Add benchmark button
const benchmarkButton = document.createElement("button");
benchmarkButton.textContent = "Run Benchmark";
benchmarkButton.setAttribute(
  "style",
  "margin-top: 8px; padding: 6px 12px; font-size: 12px;",
);
benchmarkButton.addEventListener("click", runBenchmark);
controls.appendChild(benchmarkButton);

function runBenchmark() {
  console.log("Running CDT Performance Benchmark...");
  console.log("================================================");

  const results: Array<{ name: string; duration: number; edges: number }> = [];

  for (let i = 0; i < presets.length; i++) {
    const preset = presets[i];
    console.log(`\nBenchmarking ${preset.name}...`);

    const runs = preset.name === "Grid" ? 50 : 1000;
    const durations: number[] = [];

    for (let run = 0; run < runs; run++) {
      const start = performance.now();
      preset.fn(edges);
      const end = performance.now();
      durations.push(end - start);
    }

    const avgDuration = durations.reduce((a, b) => a + b) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const edgeCount = edges.count();

    results.push({
      name: preset.name,
      duration: avgDuration,
      edges: edgeCount,
    });

    console.log(
      `   ${runs} runs: ${minDuration.toFixed(2)}ms - ${maxDuration.toFixed(
        2,
      )}ms`,
    );
    console.log(`   Average: ${avgDuration.toFixed(2)}ms`);
    console.log(`   Edges: ${edgeCount}`);
    console.log(
      `   Performance: ${((edgeCount / avgDuration) * 1000).toFixed(
        0,
      )} edges/second`,
    );
  }

  console.log("\nBENCHMARK SUMMARY");
  console.log("================================================");
  results.forEach((result) => {
    console.log(
      `${result.name.padEnd(16)} | ${result.duration
        .toFixed(2)
        .padStart(8)}ms | ${result.edges.toString().padStart(6)} edges | ${(
        (result.edges / result.duration) *
        1000
      )
        .toFixed(0)
        .padStart(8)} edges/sec`,
    );
  });

  // Restore original preset
  loadPreset(selectedMap);
}

let isDragging = false;
let lastX = 0;
let lastY = 0;
let offsetX = 50;
let offsetY = 50;
let scale = initialScale;

function startDragging(e: MouseEvent) {
  isDragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
}

function stopDragging() {
  isDragging = false;
}

function drag(e: MouseEvent) {
  if (!isDragging) return;

  const deltaX = (e.clientX - lastX) * dpr;
  const deltaY = (e.clientY - lastY) * dpr;

  offsetX += deltaX;
  offsetY += deltaY;

  lastX = e.clientX;
  lastY = e.clientY;

  draw();
}

function handleZoom(e: WheelEvent) {
  e.preventDefault();

  const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * dpr;
  const mouseY = (e.clientY - rect.top) * dpr;

  const worldX = (mouseX - offsetX) / scale;
  const worldY = (mouseY - offsetY) / scale;

  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.min(Math.max(scale * zoomFactor, minScale), maxScale);

  offsetX = mouseX - worldX * newScale;
  offsetY = mouseY - worldY * newScale;

  scale = newScale;

  draw();
}

function draw() {
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.setAttribute(
    "style",
    `width: ${window.innerWidth}px; height: ${window.innerHeight}px;`,
  );

  ctx.reset();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const points = new Set<string>();
  const drawnEdges = new Set<string>();

  const edgeList = exportEdges();

  function edgeToString(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): string {
    if (x2 > x1) {
      return `${x1},${y1}-${x2},${y2}`;
    } else if (x2 === x1) {
      if (y2 > y1) {
        return `${x1},${y1}-${x2},${y2}`;
      } else {
        return `${x2},${y2}-${x1},${y1}`;
      }
    } else {
      return `${x2},${y2}-${x1},${y1}`;
    }
  }

  // Create a map for fast edge lookup
  const edgeMap = new Map<number, HalfEdge>();
  for (const edge of edgeList) {
    edgeMap.set(edge.index, edge);
  }

  for (const e1 of edgeList) {
    if (e1.next === -1) continue;

    const e2 = edgeMap.get(e1.next);
    if (!e2) continue;

    const hash = edgeToString(e1.x, e1.y, e2.x, e2.y);
    if (drawnEdges.has(hash)) {
      continue;
    }
    drawnEdges.add(hash);

    const twinEdge = e1.twin !== -1 ? edgeMap.get(e1.twin) : null;
    if (e1.fixed || twinEdge?.fixed) {
      ctx.strokeStyle = "rgba(0, 0, 0, 1)";
      ctx.lineWidth = (2 * dpr) / scale;
    } else {
      if (showEdges) {
        ctx.strokeStyle = "rgba(210, 210, 210, 1)";
      } else {
        ctx.strokeStyle = "transparent";
      }
      ctx.lineWidth = (1 * dpr) / scale;
    }

    ctx.beginPath();
    ctx.moveTo(e1.x, e1.y);
    ctx.lineTo(e2.x, e2.y);
    ctx.stroke();

    points.add(`${e1.x},${e1.y}`.toString());
    points.add(`${e2.x},${e2.y}`.toString());
  }

  if (showLabels) {
    for (const p of points) {
      const [x, y] = p.split(",").map((s) => Number(s));
      ctx.font = `${(12 * dpr) / scale}px sans-serif`;
      ctx.fillStyle = "blue";
      ctx.fillText(`(${x.toFixed(1)}, ${y.toFixed(1)})`, x, y);
    }
  }
}

// Load initial preset
loadPreset(selectedMap);

console.log("TypeScript CDT Example loaded at", new Date());
