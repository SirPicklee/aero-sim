# ✈️ AERO-SIM — Pickle Brothers

A professional-grade, browser-based aerodynamic simulation tool built on NASA FoilSim III principles. No installation required — open `index.html` and fly.

---

## 🚀 Features

### Core Aerodynamics
- **Joukowski Airfoil Theory** — Real circulation-based CL calculation
- **Prandtl-Glauert Compressibility Correction** — Accurate subsonic/transonic CL
- **Oswald Span Efficiency** — Induced drag with real AR and taper effects
- **Stall Model** — CL degradation past critical AoA
- **Vortex Lattice Method (VLM)** — 20-panel spanwise lift distribution with cosine spacing and Gauss-Seidel solver

### Wing Geometry
- Span, chord, taper ratio, sweep, dihedral
- NACA 4-digit profile (camber, thickness)
- Wing type selector: Rectangular, Tapered, Elliptical, Delta, Swept
- Profile import (custom `.dat` files)
- NACA database browser

### Atmosphere & Environment
- ISA standard atmosphere model (density, temperature, pressure vs. altitude)
- **Weather presets** — ISA, Tropical, Arctic, High Altitude
- **Wind effect** — Headwind, crosswind, tailwind with ground speed calculation
- **Turbulence model** (Dryden approximation) — Gust velocity, turbulent AoA/CL/CD
- **Icing model** — CL reduction up to 30%, CD increase up to 150%
- **Ground effect** — Induced drag reduction near ground (Stipa factor)

### Performance
- Lift, Drag, L/D, CL, CD, CDi
- Stall speed (Vs), stall margin
- **Optimal cruise AoA** — Max L/D sweep from −10° to +20°
- **Takeoff & landing distance** — FAR 23 approximation
- **Range map** — Breguet range equation with fuel fraction
- **Buffet onset Mach** — Korn equation approximation with margin indicator

### Advanced Physics
- **Aeroelastic effects** — Tip deflection (cantilever beam), flutter speed (Theodorsen), aeroelastic CL
- **Propeller/rotor model** — Thrust, advance ratio J, efficiency η, Ct
- **Multi-engine configuration** — Engine count, engine-out asymmetric thrust, Vmca
- **Sonic boom** — Mach cone angle, overpressure (Whitham/Sears-Haack), boom footprint distance
- **Transonic area rule** — Wave drag (Sears-Haack minimum), sweep penalty correction
- **Dynamic stability modes** — Phugoid period & damping, short period, Dutch roll
- **Fuel weight model** — Current weight, CL required for level flight, actual stall speed
- **Winglet effect** — Effective AR increase, CDi and L/D improvement

### Visualization
- **3D wing render** (Three.js) — Real-time geometry with rotation, zoom, pan
- **Pressure coefficient (Cp) plot** — Upper/lower surface with color legend
- **Spanwise load distribution** — Elliptical vs. actual comparison
- **Multi-polar overlay** — Multiple AoA sweeps on same chart
- **Bending moment diagram** — Spanwise structural load

### Tools & Workflow
- **Aircraft database** — Presets: Cessna 172, Boeing 737, Concorde, F-16, and more
- **Compare mode** — Snapshot baseline, compare side-by-side
- **Comparative report export** — `.txt` with delta columns
- **Optimization mode** — Sweep camber/thickness/AoA for Max L/D, Max CL, or Min Drag
- **AoA sweep animation** — Animated polar visualization
- **CSV export** — All computed parameters
- **Share link** — URL-encoded state for sharing configurations
- **Flight simulator mode** — Real-time keyboard-controlled flight

### Units
- Imperial (ft, mph, lbs, ft²) and Metric (m, km/h, N, m²) toggle

---

## 📁 File Structure

```
aero-sim/
├── index.html      # UI layout, panels, controls
├── main.js         # All physics, rendering, logic (~3300 lines)
├── style.css       # Dark theme styling
└── README.md       # This file
```

---

## 🛠️ How to Run

1. Clone or download the repository
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge)
3. No build step, no dependencies to install — everything is self-contained

```bash
git clone https://github.com/yourusername/aero-sim.git
cd aero-sim
open index.html
```

---

## 🧮 Physics Reference

| Parameter | Method |
|-----------|--------|
| CL | Joukowski circulation theory |
| CDi | Prandtl induced drag (CL²/πeAR) |
| CD profile | Empirical viscous + compressibility |
| Stall | AoA-dependent CL degradation |
| Compressibility | Prandtl-Glauert (1/√(1−M²)) |
| VLM | 20-panel cosine-spaced lifting line, Gauss-Seidel |
| Atmosphere | ISA standard (288.15K, −6.5K/km lapse) |
| Wave drag | Sears-Haack minimum volume formula |
| Flutter | Theodorsen mass-ratio approximation |
| Tip deflection | Cantilever beam, elliptic load |
| Phugoid | Lanchester approximation |
| Buffet | Korn equation |
| Sonic boom | Whitham far-field overpressure |

---

## 🎓 Based On

- **NACA Technical Reports** — Airfoil database
- **Anderson, J.D.** — *Introduction to Flight*, *Fundamentals of Aerodynamics*
- **Etkin & Reid** — *Dynamics of Flight: Stability and Control*

---

## 👨‍💻 Credits

**Pickle Brothers**  
Built with: HTML5 · CSS3 · Vanilla JavaScript · Three.js · Chart.js

---

## 📄 License

MIT License — free to use, modify, and distribute.
