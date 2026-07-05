# Bloch Sphere Qubit Simulator

An interactive browser-based Bloch sphere simulator for visualising how single-qubit gates change a qubit state.

The simulator is built with plain HTML, CSS, and JavaScript. There is no build step, no framework, and no backend. Open `index.html` in a browser and it runs locally.

## Features

- Interactive Bloch sphere drawn on an HTML canvas
- Mouse/touch drag to rotate the sphere view
- Single-qubit gates: `X`, `Y`, `Z`, `H`, `S`, `T`
- Rotation controls: `Rx`, `Ry`, `Rz`
- Animated gate transitions
- Previous-state ghost vector
- Measurement button with probabilistic collapse
- Preset states: `|0>`, `|1>`, `|+>`, `|->`, `|i+>`, `|i->`
- Live state vector, Bloch vector, probability, theta, and phi readouts
- Mini circuit history
- Undo support
- Educational explanation panel for each operation

## How To Use

Open `index.html` in a web browser.

Use the gate buttons to transform the qubit. The red vector shows the current Bloch vector, and the grey dashed vector shows the previous state after an operation.

Drag the sphere with your mouse or trackpad to rotate the view.

## File Structure

```text
.
├── index.html
├── style.css
├── main.js
├── README.md
└── DEPLOYMENT.md
```

## Educational Notes

A pure single-qubit state can be represented as a point on the Bloch sphere.

- `|0>` is at the north pole.
- `|1>` is at the south pole.
- Equal superposition states lie on the equator.
- Phase changes appear as rotations around the z-axis.
- Measurement collapses the state to either `|0>` or `|1>` according to the displayed probabilities.

This project is intended as an educational visualisation, not a full quantum computing simulator.

## Running Locally

No installation is required.

```text
Open index.html in your browser.
```

## Deploying

This project can be hosted for free with GitHub Pages. See [DEPLOYMENT.md](DEPLOYMENT.md).

## Possible Future Improvements

- Repeated measurement statistics
- Challenge mode
- Path trace toggle
- More gate explanations
- Export/share circuit state
- Keyboard shortcuts

