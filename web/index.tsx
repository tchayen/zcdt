/// <reference types="vite/client" />

let showLabels = false;
let showEdges = true;

let wasm: {
  memory: WebAssembly.Memory;
  init(): void;
  ptr(): number;
  len(): number;
  exportPacked(): void;
  setSelectedMap(i: number): void;
};

let edges: HalfEdge[] = [];

type HalfEdge = {
  x: number;
  y: number;
  next: number;
  twin: number;
  fixed: boolean;
};

async function loadWasm(): Promise<HalfEdge[]> {
  const init = (await import("./bin/lib.wasm?init")).default;
  wasm = (await init()).exports as typeof wasm;

  ["init", "exportPacked", "ptr", "len", "setSelectedMap"].forEach((fn) => {
    if (typeof wasm[fn] !== "function") {
      throw new Error(`${fn} is not a function`);
    }
  });

  wasm.init();
  wasm.exportPacked();

  console.log(wasm);

  const ptr = wasm.ptr();
  const len = wasm.len();
  console.log(`ptr: ${ptr}; len: ${len}`);

  const view = new DataView(wasm.memory.buffer, ptr, len);
  const edges: HalfEdge[] = [];

  let offset = 0;
  while (offset < len) {
    const x = view.getFloat32(offset, true);
    offset += 4;
    const y = view.getFloat32(offset, true);
    offset += 4;
    const next = view.getUint32(offset, true);
    offset += 4;
    const twin = view.getUint32(offset, true);
    offset += 4;
    const fixed = view.getUint32(offset, true);
    offset += 4;

    edges.push({ x, y, next, twin, fixed: Boolean(fixed) });
  }

  console.log(edges);
  return edges;
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

const checkboxes = document.createElement("div");
checkboxes.setAttribute(
  "style",
  "position: absolute; top: 10px; right: 10px; display: flex; flex-direction: column; gap: 4px;",
);
document.body.appendChild(checkboxes);

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

  for (const e1 of edges) {
    if (e1.x === max_uint || e1.y === max_uint || e1.next === max_uint) {
      continue;
    }
    const e2 = edges[e1.next];
    if (!e2 || e2.next === max_uint) {
      continue;
    }

    const hash = edgeToString(e1.x, e1.y, e2.x, e2.y);
    if (drawnEdges.has(hash)) {
      continue;
    }
    drawnEdges.add(hash);

    if (e1.fixed || (e1.twin !== max_uint && edges[e1.twin].fixed)) {
      ctx.strokeStyle = "rgba(0, 0, 0, 1)";
      ctx.lineWidth = (1 * dpr) / scale;
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

const max_uint = 4294967295;

async function run() {
  edges = await loadWasm();
  draw();
}

run();

if (import.meta.hot) {
  import.meta.hot.accept("./bin/lib.wasm?init", () => {
    console.log("🔄 WASM rebuilt, re-loading…");
    run();
  });
}

console.log(new Date());
