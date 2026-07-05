const canvas = document.getElementById("blochCanvas");
const ctx = canvas.getContext("2d");

const explanationTitleEl = document.getElementById("explanationTitle");
const explanationTextEl = document.getElementById("explanationText");
const stateVectorEl = document.getElementById("stateVector");
const blochVectorEl = document.getElementById("blochVector");
const thetaValueEl = document.getElementById("thetaValue");
const phiValueEl = document.getElementById("phiValue");
const probZeroEl = document.getElementById("probZero");
const probOneEl = document.getElementById("probOne");
const probZeroMeter = document.getElementById("probZeroMeter");
const probOneMeter = document.getElementById("probOneMeter");
const historyList = document.getElementById("historyList");
const circuitStrip = document.getElementById("circuitStrip");

const SQRT1_2 = Math.SQRT1_2;
const TAU = Math.PI * 2;
const GRID_STEPS = 96;
const EPSILON = 0.0001;
const ANIMATION_MS = 650;

const EXPLANATIONS = {
  X: {
    title: "Pauli-X gate",
    text: "X is a bit flip. On the Bloch sphere it rotates the state by 180 degrees about the x axis, swapping |0> and |1>.",
  },
  Y: {
    title: "Pauli-Y gate",
    text: "Y rotates the state by 180 degrees about the y axis. It flips the computational basis state and also changes phase.",
  },
  Z: {
    title: "Pauli-Z gate",
    text: "Z is a phase flip. It rotates the state by 180 degrees about the z axis, changing relative phase while leaving measurement probabilities unchanged.",
  },
  H: {
    title: "Hadamard gate",
    text: "H moves basis states onto the equator. For example, |0> becomes |+>, an equal superposition with 50% chance of measuring |0> or |1>.",
  },
  S: {
    title: "S phase gate",
    text: "S rotates the state by 90 degrees about the z axis. The probabilities stay fixed; only the relative phase changes.",
  },
  T: {
    title: "T phase gate",
    text: "T rotates the state by 45 degrees about the z axis. It is a smaller phase rotation than S, so probabilities remain unchanged.",
  },
  RX: {
    title: "Rx rotation",
    text: "Rx applies a 15 degree rotation about the x axis, tilting the state through the y-z plane.",
  },
  RY: {
    title: "Ry rotation",
    text: "Ry applies a 15 degree rotation about the y axis, tilting the state through the x-z plane.",
  },
  RZ: {
    title: "Rz rotation",
    text: "Rz applies a 15 degree phase rotation about the z axis. It changes phase without changing the |0> and |1> probabilities.",
  },
  MEASURE: {
    title: "Measurement",
    text: "Measurement samples the current probabilities and collapses the qubit to either |0> or |1>.",
  },
  RESET: {
    title: "Reset",
    text: "The qubit has been returned to |0>, the north pole of the Bloch sphere.",
  },
  RANDOM: {
    title: "Random state",
    text: "A random pure state was selected on the Bloch sphere. The red vector shows its current amplitudes and relative phase.",
  },
  PRESET: {
    title: "Preset state",
    text: "The qubit was set directly to a common reference state so its location can be compared with gate outputs.",
  },
  UNDO: {
    title: "Undo",
    text: "The previous qubit state and circuit sequence were restored.",
  },
};

const PRESETS = {
  zero: {
    label: "|0>",
    state: { a: complex(1, 0), b: complex(0, 0) },
  },
  one: {
    label: "|1>",
    state: { a: complex(0, 0), b: complex(1, 0) },
  },
  plus: {
    label: "|+>",
    state: { a: complex(SQRT1_2, 0), b: complex(SQRT1_2, 0) },
  },
  minus: {
    label: "|->",
    state: { a: complex(SQRT1_2, 0), b: complex(-SQRT1_2, 0) },
  },
  iplus: {
    label: "|i+>",
    state: { a: complex(SQRT1_2, 0), b: complex(0, SQRT1_2) },
  },
  iminus: {
    label: "|i->",
    state: { a: complex(SQRT1_2, 0), b: complex(0, -SQRT1_2) },
  },
};

let qubit = {
  a: complex(1, 0),
  b: complex(0, 0),
};
let history = [];
let circuitHistory = [];
let undoStack = [];
let previousVector = null;
let displayVector = { x: 0, y: 0, z: 1 };
let animation = null;
let view = {
  yaw: -0.62,
  pitch: 0.42,
};
let drag = null;

function complex(re, im) {
  return { re, im };
}

function add(z1, z2) {
  return complex(z1.re + z2.re, z1.im + z2.im);
}

function multiply(z1, z2) {
  return complex(z1.re * z2.re - z1.im * z2.im, z1.re * z2.im + z1.im * z2.re);
}

function scale(z, value) {
  return complex(z.re * value, z.im * value);
}

function conjugate(z) {
  return complex(z.re, -z.im);
}

function magnitudeSquared(z) {
  return z.re * z.re + z.im * z.im;
}

function cloneComplex(z) {
  return complex(z.re, z.im);
}

function cloneState(state) {
  return {
    a: cloneComplex(state.a),
    b: cloneComplex(state.b),
  };
}

function cloneVector(vector) {
  if (!vector) return null;
  return { x: vector.x, y: vector.y, z: vector.z };
}

function pushUndoSnapshot() {
  undoStack.push({
    qubit: cloneState(qubit),
    history: [...history],
    circuitHistory: [...circuitHistory],
    previousVector: cloneVector(previousVector),
    displayVector: cloneVector(displayVector),
    explanationTitle: explanationTitleEl.textContent,
    explanationText: explanationTextEl.textContent,
  });
  undoStack = undoStack.slice(-24);
}

function dot(v1, v2) {
  return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}

function cross(v1, v2) {
  return {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  };
}

function vectorLength(v) {
  return Math.sqrt(dot(v, v));
}

function normalizeVector(v) {
  const length = vectorLength(v);
  if (length < EPSILON) return { x: 0, y: 0, z: 1 };
  return {
    x: v.x / length,
    y: v.y / length,
    z: v.z / length,
  };
}

function rotateAroundAxis(vector, axis, angle) {
  const unitAxis = normalizeVector(axis);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const axisCrossVector = cross(unitAxis, vector);
  const axisDotVector = dot(unitAxis, vector);

  return {
    x: vector.x * cos + axisCrossVector.x * sin + unitAxis.x * axisDotVector * (1 - cos),
    y: vector.y * cos + axisCrossVector.y * sin + unitAxis.y * axisDotVector * (1 - cos),
    z: vector.z * cos + axisCrossVector.z * sin + unitAxis.z * axisDotVector * (1 - cos),
  };
}

function slerpVector(start, end, t) {
  const a = normalizeVector(start);
  const b = normalizeVector(end);
  const clampedDot = Math.max(-1, Math.min(1, dot(a, b)));

  if (clampedDot < -0.9995) {
    const reference = Math.abs(a.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 0, y: 1, z: 0 };
    const axis = cross(a, reference);
    return rotateAroundAxis(a, axis, Math.PI * t);
  }

  if (clampedDot > 0.9995) {
    return normalizeVector({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    });
  }

  const omega = Math.acos(clampedDot);
  const sinOmega = Math.sin(omega);
  const startScale = Math.sin((1 - t) * omega) / sinOmega;
  const endScale = Math.sin(t * omega) / sinOmega;

  return {
    x: a.x * startScale + b.x * endScale,
    y: a.y * startScale + b.y * endScale,
    z: a.z * startScale + b.z * endScale,
  };
}

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function normalize(state) {
  const length = Math.sqrt(magnitudeSquared(state.a) + magnitudeSquared(state.b));
  return {
    a: scale(state.a, 1 / length),
    b: scale(state.b, 1 / length),
  };
}

function applyMatrix(matrix, label) {
  if (animation) return;

  pushUndoSnapshot();
  const before = blochVector();
  const nextA = add(multiply(matrix[0][0], qubit.a), multiply(matrix[0][1], qubit.b));
  const nextB = add(multiply(matrix[1][0], qubit.a), multiply(matrix[1][1], qubit.b));

  qubit = normalize({ a: nextA, b: nextB });
  previousVector = before;
  history = [label, ...history].slice(0, 12);
  circuitHistory = [...circuitHistory, label].slice(-18);
  setExplanation(label);
  updateReadout();
  animateToVector(before, blochVector());
}

function gateMatrix(gate) {
  const i = complex(0, 1);
  const minusI = complex(0, -1);

  return {
    X: [
      [complex(0, 0), complex(1, 0)],
      [complex(1, 0), complex(0, 0)],
    ],
    Y: [
      [complex(0, 0), minusI],
      [i, complex(0, 0)],
    ],
    Z: [
      [complex(1, 0), complex(0, 0)],
      [complex(0, 0), complex(-1, 0)],
    ],
    H: [
      [complex(SQRT1_2, 0), complex(SQRT1_2, 0)],
      [complex(SQRT1_2, 0), complex(-SQRT1_2, 0)],
    ],
    S: [
      [complex(1, 0), complex(0, 0)],
      [complex(0, 0), i],
    ],
    T: [
      [complex(1, 0), complex(0, 0)],
      [complex(0, 0), complex(SQRT1_2, SQRT1_2)],
    ],
  }[gate];
}

function rotationMatrix(axis) {
  const angle = Math.PI / 12;
  const c = Math.cos(angle / 2);
  const s = Math.sin(angle / 2);

  if (axis === "rx") {
    return [
      [complex(c, 0), complex(0, -s)],
      [complex(0, -s), complex(c, 0)],
    ];
  }

  if (axis === "ry") {
    return [
      [complex(c, 0), complex(-s, 0)],
      [complex(s, 0), complex(c, 0)],
    ];
  }

  return [
    [complex(c, -s), complex(0, 0)],
    [complex(0, 0), complex(c, s)],
  ];
}

function blochVector() {
  const alphaBeta = multiply(conjugate(qubit.a), qubit.b);
  return {
    x: 2 * alphaBeta.re,
    y: 2 * alphaBeta.im,
    z: magnitudeSquared(qubit.a) - magnitudeSquared(qubit.b),
  };
}

function formatComplex(z) {
  const re = Math.abs(z.re) < EPSILON ? 0 : z.re;
  const im = Math.abs(z.im) < EPSILON ? 0 : z.im;

  if (im === 0) return re.toFixed(2);
  if (re === 0) return `${im.toFixed(2)}i`;
  return `${re.toFixed(2)} ${im >= 0 ? "+" : "-"} ${Math.abs(im).toFixed(2)}i`;
}

function blochAngles(vector) {
  const normalized = normalizeVector(vector);
  const theta = Math.acos(Math.max(-1, Math.min(1, normalized.z)));
  const phi = (Math.atan2(normalized.y, normalized.x) + TAU) % TAU;
  return {
    theta: theta * (180 / Math.PI),
    phi: phi * (180 / Math.PI),
  };
}

function updateReadout() {
  const vector = blochVector();
  const angles = blochAngles(vector);
  const p0 = magnitudeSquared(qubit.a);
  const p1 = magnitudeSquared(qubit.b);

  stateVectorEl.textContent = `${formatComplex(qubit.a)}|0> + ${formatComplex(qubit.b)}|1>`;
  blochVectorEl.textContent = `(${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}, ${vector.z.toFixed(2)})`;
  thetaValueEl.textContent = `${angles.theta.toFixed(1)}\u00b0`;
  phiValueEl.textContent = `${angles.phi.toFixed(1)}\u00b0`;
  probZeroEl.textContent = `${Math.round(p0 * 100)}%`;
  probOneEl.textContent = `${Math.round(p1 * 100)}%`;
  probZeroMeter.value = p0;
  probOneMeter.value = p1;

  historyList.innerHTML = "";
  history.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    historyList.appendChild(li);
  });

  renderCircuit();
}

function renderCircuit() {
  circuitStrip.innerHTML = "";
  const start = document.createElement("span");
  start.className = "wire-state";
  start.textContent = "|0>";
  circuitStrip.appendChild(start);

  if (circuitHistory.length === 0) {
    const wire = document.createElement("span");
    wire.className = "wire";
    circuitStrip.appendChild(wire);
    return;
  }

  circuitHistory.forEach((gate) => {
    const wireBefore = document.createElement("span");
    wireBefore.className = "wire";
    circuitStrip.appendChild(wireBefore);

    const gateEl = document.createElement("span");
    gateEl.className = "circuit-gate";
    gateEl.textContent = gate;
    circuitStrip.appendChild(gateEl);
  });

  const wireAfter = document.createElement("span");
  wireAfter.className = "wire";
  circuitStrip.appendChild(wireAfter);
}

function setExplanation(key, extra = "") {
  const explanation = EXPLANATIONS[key];
  if (!explanation) return;
  explanationTitleEl.textContent = explanation.title;
  explanationTextEl.textContent = extra ? `${explanation.text} ${extra}` : explanation.text;
}

function animateToVector(from, to) {
  animation = {
    from: normalizeVector(from),
    to: normalizeVector(to),
    start: performance.now(),
  };
  requestAnimationFrame(stepAnimation);
}

function stepAnimation(now) {
  if (!animation) return;
  const progress = Math.min(1, (now - animation.start) / ANIMATION_MS);
  displayVector = slerpVector(animation.from, animation.to, easeInOut(progress));
  drawSphere();

  if (progress < 1) {
    requestAnimationFrame(stepAnimation);
    return;
  }

  displayVector = animation.to;
  animation = null;
  drawSphere();
}

function rotatePoint(point) {
  const cosY = Math.cos(view.yaw);
  const sinY = Math.sin(view.yaw);
  const cosX = Math.cos(view.pitch);
  const sinX = Math.sin(view.pitch);

  const x1 = point.x * cosY - point.y * sinY;
  const y1 = point.x * sinY + point.y * cosY;
  const z1 = point.z;

  return {
    x: x1,
    y: y1 * cosX - z1 * sinX,
    z: y1 * sinX + z1 * cosX,
  };
}

function project(point, center, radius) {
  const rotated = rotatePoint(point);
  return {
    x: center.x + rotated.x * radius,
    y: center.y - rotated.z * radius,
    depth: rotated.y,
  };
}

function pathForPoints(points, center, radius) {
  const projected = points.map((point) => project(point, center, radius));
  ctx.beginPath();
  projected.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  return projected.reduce((sum, point) => sum + point.depth, 0) / projected.length;
}

function circlePoints(plane, offset = 0) {
  const points = [];
  const r = Math.sqrt(Math.max(0, 1 - offset * offset));

  for (let step = 0; step <= GRID_STEPS; step += 1) {
    const angle = (step / GRID_STEPS) * TAU;
    const c = Math.cos(angle) * r;
    const s = Math.sin(angle) * r;

    if (plane === "xy") points.push({ x: c, y: s, z: offset });
    if (plane === "xz") points.push({ x: c, y: offset, z: s });
    if (plane === "yz") points.push({ x: offset, y: c, z: s });
  }

  return points;
}

function drawCanvasBackground(size) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "#eeeeee";
  ctx.lineWidth = 1;
  for (let pos = 0; pos <= size; pos += 36) {
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(size, pos);
    ctx.stroke();
  }
}

function drawSphere() {
  const size = canvas.width;
  const center = { x: size / 2, y: size / 2 };
  const radius = size * 0.34;

  ctx.clearRect(0, 0, size, size);
  drawCanvasBackground(size);

  const grid = [];
  [-0.75, -0.5, -0.25, 0.25, 0.5, 0.75].forEach((offset) => {
    grid.push({ points: circlePoints("xy", offset), color: "#d7d7d7", width: 1 });
    grid.push({ points: circlePoints("xz", offset), color: "#e1e1e1", width: 1 });
  });
  grid.push({ points: circlePoints("xy"), color: "#9a9a9a", width: 1.4 });
  grid.push({ points: circlePoints("xz"), color: "#9a9a9a", width: 1.4 });
  grid.push({ points: circlePoints("yz"), color: "#b8b8b8", width: 1.2 });

  grid
    .map((line) => ({ ...line, depth: averageDepth(line.points) }))
    .sort((a, b) => a.depth - b.depth)
    .forEach((line) => {
      pathForPoints(line.points, center, radius);
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.width;
      ctx.stroke();
    });

  drawAxes(center, radius);
  if (previousVector) drawVector(center, radius, previousVector, "#8d8d8d", 1.7, 7, true);
  drawVector(center, radius, displayVector, "#d71920", 3, 13, false);
  drawKetLabels(center, radius);

  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, TAU);
  ctx.strokeStyle = "#555555";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function averageDepth(points) {
  return points.reduce((sum, point) => sum + rotatePoint(point).y, 0) / points.length;
}

function drawAxes(center, radius) {
  drawAxis({ x: -1.12, y: 0, z: 0 }, { x: 1.12, y: 0, z: 0 }, center, radius, "x");
  drawAxis({ x: 0, y: -1.12, z: 0 }, { x: 0, y: 1.12, z: 0 }, center, radius, "y");
  drawAxis({ x: 0, y: 0, z: -1.12 }, { x: 0, y: 0, z: 1.12 }, center, radius, "z");
}

function drawAxis(start, end, center, radius, label) {
  const a = project(start, center, radius);
  const b = project(end, center, radius);

  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 1.3;
  ctx.stroke();

  drawArrowHead(a, b, "#333333", 8);
  ctx.fillStyle = "#111111";
  ctx.font = "600 16px IBM Plex Mono, Cascadia Mono, Consolas, monospace";
  ctx.fillText(label, b.x + 8, b.y - 8);
}

function drawArrowHead(from, to, color, size) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - size * Math.cos(angle - Math.PI / 6), to.y - size * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(to.x - size * Math.cos(angle + Math.PI / 6), to.y - size * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawVector(center, radius, vector, color, width, arrowSize, ghost) {
  const origin = project({ x: 0, y: 0, z: 0 }, center, radius);
  const tip = project(vector, center, radius);

  ctx.save();
  if (ghost) ctx.setLineDash([7, 5]);
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.setLineDash([]);
  drawArrowHead(origin, tip, color, arrowSize);

  ctx.beginPath();
  ctx.arc(tip.x, tip.y, ghost ? 3.5 : 4.5, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawKetLabels(center, radius) {
  const zero = project({ x: 0, y: 0, z: 1.15 }, center, radius);
  const one = project({ x: 0, y: 0, z: -1.15 }, center, radius);

  ctx.fillStyle = "#111111";
  ctx.font = "600 15px IBM Plex Mono, Cascadia Mono, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.fillText("|0>", zero.x, zero.y - 6);
  ctx.fillText("|1>", one.x, one.y + 16);
  ctx.textAlign = "start";
}

function update() {
  displayVector = blochVector();
  updateReadout();
  drawSphere();
}

function randomizeState() {
  if (animation) return;
  pushUndoSnapshot();
  const before = blochVector();
  const theta = Math.acos(1 - 2 * Math.random());
  const phi = Math.random() * TAU;
  qubit = {
    a: complex(Math.cos(theta / 2), 0),
    b: complex(Math.cos(phi) * Math.sin(theta / 2), Math.sin(phi) * Math.sin(theta / 2)),
  };
  previousVector = before;
  history = ["Random", ...history].slice(0, 12);
  circuitHistory = [...circuitHistory, "Rand"].slice(-18);
  setExplanation("RANDOM");
  updateReadout();
  animateToVector(before, blochVector());
}

function measureState() {
  if (animation) return;
  pushUndoSnapshot();
  const before = blochVector();
  const p0 = magnitudeSquared(qubit.a);
  const outcome = Math.random() < p0 ? "|0>" : "|1>";

  qubit = outcome === "|0>" ? { a: complex(1, 0), b: complex(0, 0) } : { a: complex(0, 0), b: complex(1, 0) };
  previousVector = before;
  history = [`M -> ${outcome}`, ...history].slice(0, 12);
  circuitHistory = [...circuitHistory, "M"].slice(-18);
  setExplanation("MEASURE", `Outcome: ${outcome}.`);
  updateReadout();
  animateToVector(before, blochVector());
}

function setPreset(presetKey) {
  if (animation) return;
  const preset = PRESETS[presetKey];
  if (!preset) return;

  pushUndoSnapshot();
  const before = blochVector();
  qubit = cloneState(preset.state);
  previousVector = before;
  history = [`Set ${preset.label}`, ...history].slice(0, 12);
  circuitHistory = [...circuitHistory, preset.label].slice(-18);
  setExplanation("PRESET", `Selected ${preset.label}.`);
  updateReadout();
  animateToVector(before, blochVector());
}

function undoLastAction() {
  if (animation || undoStack.length === 0) return;
  const snapshot = undoStack.pop();
  const before = blochVector();

  qubit = cloneState(snapshot.qubit);
  history = [...snapshot.history];
  circuitHistory = [...snapshot.circuitHistory];
  previousVector = before;
  displayVector = cloneVector(before);
  explanationTitleEl.textContent = EXPLANATIONS.UNDO.title;
  explanationTextEl.textContent = EXPLANATIONS.UNDO.text;
  updateReadout();
  animateToVector(before, blochVector());
}

function beginDrag(event) {
  canvas.setPointerCapture(event.pointerId);
  drag = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    yaw: view.yaw,
    pitch: view.pitch,
  };
}

function moveDrag(event) {
  if (!drag || drag.pointerId !== event.pointerId) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  view.yaw = drag.yaw + dx * 0.01;
  view.pitch = Math.max(-1.45, Math.min(1.45, drag.pitch + dy * 0.01));
  drawSphere();
}

function endDrag(event) {
  if (!drag || drag.pointerId !== event.pointerId) return;
  drag = null;
}

document.querySelectorAll("[data-gate]").forEach((button) => {
  button.addEventListener("click", () => applyMatrix(gateMatrix(button.dataset.gate), button.dataset.gate));
});

document.querySelectorAll("[data-rotate]").forEach((button) => {
  button.addEventListener("click", () => {
    const axis = button.dataset.rotate;
    applyMatrix(rotationMatrix(axis), axis.toUpperCase());
  });
});

document.querySelectorAll("[data-preset]").forEach((button) => {
  button.addEventListener("click", () => setPreset(button.dataset.preset));
});

document.getElementById("resetButton").addEventListener("click", () => {
  if (animation) return;
  pushUndoSnapshot();
  const before = blochVector();
  qubit = {
    a: complex(1, 0),
    b: complex(0, 0),
  };
  previousVector = before;
  history = [];
  circuitHistory = [];
  setExplanation("RESET");
  updateReadout();
  animateToVector(before, blochVector());
});

document.getElementById("randomButton").addEventListener("click", randomizeState);
document.getElementById("measureButton").addEventListener("click", measureState);
document.getElementById("undoButton").addEventListener("click", undoLastAction);
canvas.addEventListener("pointerdown", beginDrag);
canvas.addEventListener("pointermove", moveDrag);
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

update();
