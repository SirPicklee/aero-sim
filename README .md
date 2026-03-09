# ✈️ AERO-SIM — Advanced Wing & Foil Analyzer
### *Pickle Brothers Edition*

> Real-time, browser-based aerodynamics simulator. No server. No build tools. Open `index.html` and fly.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Three.js](https://img.shields.io/badge/Three.js-r128-black.svg)](https://threejs.org)
[![No Dependencies](https://img.shields.io/badge/npm%20packages-0-brightgreen.svg)]()
[![WebGL](https://img.shields.io/badge/WebGL-required-orange.svg)]()

---

> 📸 **Screenshot / GIF**
> *(Add a screenshot or GIF of the simulator here — drag and drop an image into a GitHub Issue to get a link, then paste it below)*
>
> ```markdown
> ![AERO-SIM Demo](assets/screenshot.png)
> ```

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Left Panel — Inputs & Controls](#left-panel--inputs--controls)
4. [Right Panel — All 115+ Output Parameters](#right-panel--all-115-output-parameters)
5. [Center Viewport — 3D Visualization](#center-viewport--3d-visualization)
6. [Bottom Flight Bar](#bottom-flight-bar)
7. [Graphs & Plots (19 Chart Types)](#graphs--plots-19-chart-types)
8. [Advanced Physics Modules](#advanced-physics-modules)
9. [Tools & Utilities](#tools--utilities)
10. [Physics & Theory Reference](#physics--theory-reference)
11. [File Structure](#file-structure)
12. [Dependencies](#dependencies)
13. [Roadmap](#roadmap)
14. [Contributing](#contributing)
15. [License](#license)

---

## Overview
## 🖼️ Screenshots

![AERO-SIM](https://github.com/user-attachments/assets/40fa8001-0ab0-40ce-bda6-234c594c2935)
![AERO-SIM](https://github.com/user-attachments/assets/784fdc23-fc7f-44ca-986a-f7c10b352383)
![AERO-SIM](https://github.com/user-attachments/assets/842a6f2d-5e0b-4ba1-9803-8a0f5dfc2705)
![AERO-SIM](https://github.com/user-attachments/assets/1870660c-5b0b-435e-a8ec-c8c64faf704d)
![AERO-SIM](https://github.com/user-attachments/assets/6ac6e15b-f1b2-4060-81ff-9f61880a57c9)

AERO-SIM is a full-featured aerodynamic analysis tool that runs entirely in the browser. It implements Kutta–Joukowski potential flow theory, ISA atmosphere modeling, and a wide range of real-world aerodynamic corrections — from Prandtl–Glauert compressibility to aeroelastic flutter, cavitation, sonic booms, and dynamic stability modes. All computations run in real time as you move any slider.

---

## Quick Start

```bash
git clone https://github.com/your-username/aero-sim.git
cd aero-sim
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

No npm, no webpack, no server. Just open the file.

---

## Left Panel — Inputs & Controls

### 1. Profile Type
Select the aerodynamic body to analyze:

| Profile | Description |
|---------|-------------|
| **Joukowski** | Exact conformal mapping. Parametric generating circle. |
| **NACA 4-Digit** | Full NACA 4-series with camber, position, thickness |
| **Ellipse** | Symmetric/cambered elliptical cross-section |
| **Flat Plate** | Zero-thickness plate for thin airfoil theory |
| **Cylinder** | Circular cylinder with optional spin (Magnus effect) |
| **Ball** | Sphere — smooth, rough, or golf ball surface finish |

---

### 2. Generating Plane (Joukowski / NACA / Ellipse)
Manual override for the Joukowski mapping parameters:

| Parameter | Symbol | Range | Description |
|-----------|--------|-------|-------------|
| Radius | rc | 0 – 2 | Generating circle radius |
| X offset | xc | −0.5 – 0.5 | Horizontal center shift |
| Y offset | yc | −0.5 – 0.5 | Vertical center shift (controls camber) |
| Circulation | γ | −4 – 4 | Manual override of Kutta–Joukowski circulation |

Reset button restores auto-computed values.

---

### 3. Airfoil Parameters

| Parameter | Range | Effect |
|-----------|-------|--------|
| **Camber** (% chord) | −25 to +25 | Curvature of mean camber line. Positive = more lift at low AoA. |
| **Thickness** (% chord) | 1 to 70 | Max thickness as percent of chord. Affects drag, stall, and structural volume. |

Live NACA designation updates (e.g. "NACA 4412") as you move the sliders.

---

### 4. Cylinder / Ball Parameters

| Parameter | Range | Description |
|-----------|-------|-------------|
| **Spin** (RPM) | −1500 to +1500 | Rotation rate. Drives Magnus lift via Γ = 4π²nR² / V |
| **Radius** (ft or m) | 0.005 – 5 | Physical radius of the body |
| **Ball Type** | Smooth / Rough / Golf | Surface finish affects critical Reynolds number and CD drag curve |

---

### 5. Wing Planform

| Type | Taper | Sweep | Notes |
|------|-------|-------|-------|
| **Rectangular** | 1.0 | 0° | Simple, uniform chord |
| **Tapered** | ~0.4 | ~5° | Common GA and regional aircraft |
| **Swept** | ~0.5 | ~35° | Transonic delay, fighter jets |
| **Delta** | 0.0 | ~55° | Low AR, high-speed maneuver |
| **Elliptical** | — | 0° | Ideal spanload (Spitfire-style) |
| **Custom** | any | any | Full manual override |

---

### 6. Wing Geometry

| Parameter | Unit | Range | Description |
|-----------|------|-------|-------------|
| **Span** | ft / m | 1 – 80 | Wingtip to wingtip distance |
| **Root Chord** | ft / m | 0.5 – 20 | Wing width at root |
| **Taper Ratio** | — | 0 – 1 | Tip chord / Root chord |
| **Sweep** | ° | 0 – 70 | Leading edge sweep angle |
| **Dihedral** | ° | −10 – 15 | Wing upward angle for roll stability |
| **Washout** | ° | −5 – 5 | Tip angle reduction to prevent tip stall |

---

### 7. Display Toggles

| Button | Function |
|--------|----------|
| **Wireframe** | 3D mesh edge overlay |
| **Ribs** | Spanwise airfoil cross-sections |
| **Grid** | Ground reference grid |
| **Auto-Rot** | Continuous camera rotation |
| **Cp Plot** | Pressure distribution canvas overlay |
| **Foil View** | Airfoil shape preview canvas |
| **Flow Field** | Joukowski potential flow streamlines |
| **CL-Alpha** | 19-tab graph panel |
| **Probe** | Click flow field to read local Cp and V/V∞ |
| **Export** | Download .txt aerodynamic report |
| **CSV** | Download Cp distribution as .csv |
| **Share** | Encode full state to URL clipboard |
| **Cmp** | Comparative report vs. snapshot |
| **Opt** | Run parameter optimization sweep |
| **+Polar / −Polar** | Add / clear CL-α curve snapshots for overlay |
| **Lift Meter** | Animated lift bar display |
| **Particles** | Flow particle animation over flow field |
| **EM Map** | Energy / SEP map (speed × altitude contour) |

---

### 8. Environment

| Environment | Description |
|-------------|-------------|
| 🌍 **Earth ISA** | Standard atmosphere, 3-layer ISA model |
| 🔴 **Mars** | Seiff & Kirk (1977) CO₂ atmosphere |
| 💧 **Water** | Incompressible fluid, ρ = 1.94 slug/ft³, cavitation model active |
| ⚙ **Custom** | Manual density, temperature, pressure, viscosity |

---

### 9. Theme
Dark (default) / Light — toggles full UI color scheme.

---

### 10. Units

| System | Lengths | Speed | Force | Pressure |
|--------|---------|-------|-------|----------|
| **Imperial** | ft | mph | lbs | psi / psf |
| **Metric** | m | km/h | N | kPa / Pa |

All outputs, sliders, and graphs update instantly on switch.

---

### 11. Unit Converter
Built-in inline converter supporting: ft ↔ m, mph ↔ km/h ↔ knots ↔ ft/s, lbs ↔ N, psi ↔ kPa

---

### 12. Optimization Engine
Brute-force sweep over camber × thickness × AoA parameter space.

| Target | Optimizes for |
|--------|---------------|
| **Max L/D** | Best lift-to-drag ratio |
| **Max CL** | Maximum lift coefficient |
| **Min Drag** | Minimum total CD |

Applies best values directly to all sliders after search.

---

### 13. Weather / Climate Presets

| Preset | ISA Deviation |
|--------|---------------|
| ISA Standard | ±0°F |
| Hot Day | +35°F |
| Cold Day | −35°F |
| Tropical | +50°F |
| Arctic | −60°F |

Updates density, pressure, temperature, and viscosity via Sutherland's law.

---

### 14. Aircraft Database

| Aircraft | Wing Type | Notes |
|----------|-----------|-------|
| **Cessna 172** | Rectangular, NACA 2412 | General aviation baseline |
| **Boeing 737-800** | Tapered swept, NACA 6-series | Commercial airliner |
| **F-16 Fighting Falcon** | Delta, NACA 0004 | Supersonic fighter |
| **Concorde** | Ogival delta | Mach 2+ transport |
| **B-2 Spirit** | Flying wing delta | Stealth bomber |
| **Airbus A320** | Tapered swept | Narrow-body airliner |
| **Supermarine Spitfire** | Elliptical | WWII iconic fighter |

Loads all geometry, flight condition, and profile parameters simultaneously.

---

### 15. NACA Database

| Code | Description |
|------|-------------|
| 0012 | Symmetric — helicopter, tail surfaces |
| 2412 | General aviation baseline |
| 4412 | High lift — trainers, UAVs |
| 6412 | Aggressive camber |
| 0006 | Thin symmetric — high speed |
| 2415 | Trainer |
| 4415 | STOL |
| 23012 | Airliner (3-digit series approximation) |

Also: custom 4- or 5-digit code input (e.g. `2318`, `23015`).

---

### 16. Profile Import (CSV / TXT / DAT)
Upload coordinate files in Selig or Lednicer format. Parser extracts upper/lower surface points and estimates camber & thickness automatically.

---

### 17. Presets
Save full simulation state to `localStorage` by name. Reload any preset instantly. Delete individual entries.

---

## Right Panel — All 115+ Output Parameters

### 📐 Geometry

| Output | Unit | Description |
|--------|------|-------------|
| **Aspect Ratio** | — | b² / S |
| **Wing Area** | ft² / m² | Reference planform area |
| **MAC** | ft / m | Mean aerodynamic chord |
| **Tip Chord** | ft / m | Chord length at wingtip |
| **Wetted Area** | ft² / m² | Total surface area exposed to flow |
| **Wing Volume** | ft³ / m³ | Internal structural volume estimate |
| **Span** | ft / m | Total wingspan |

---

### 🌊 Aerodynamics

| Output | Unit | Description |
|--------|------|-------------|
| **CL** | — | Lift coefficient (Kutta–Joukowski + corrections) |
| **CDi** | — | Induced drag coefficient |
| **CD (total)** | — | Profile + induced + compressibility drag |
| **Reynolds** | — | Re = ρVc / μ |
| **Mach** | — | V / a (speed of sound at altitude) |
| **Regime** | — | Incompressible / Subsonic / Transonic ⚠ / Supersonic |
| **Mach Eff.** | — | Effective Mach at swept leading edge (cosine rule) |
| **PG Factor** | — | Prandtl–Glauert compressibility multiplier: 1/√(1−M²) |
| **Cm (c/4)** | — | Pitching moment coefficient about quarter-chord |
| **Stall α** | ° | Stall onset angle (10° base from thin-airfoil theory) |
| **Buffet Mach** | — | Buffet onset Mach (Korn equation: κ − t/c − CL/10) |
| **Buffet Margin** | — | M_buffet − M_current (green > 0.1, red < 0.05) |
| **Neutral Point** | ft / m | Aerodynamic center position from leading edge |
| **Static Margin** | % chord | (NP − CG) / chord × 100 — positive = stable |
| **Ctr of Press** | ft / m | Center of pressure x-location |
| **CNα** | /rad | Normal force slope (DATCOM approximation) |
| **CMα** | — | Pitch stiffness derivative (negative = stable) |
| **CMq** | — | Pitch damping derivative |
| **CG Pos** | ft / m | Center of gravity position |
| **CP Pos** | ft / m | Center of pressure position |
| **W&B Margin** | % chord | Weight & balance margin relative to neutral point |
| **Transition x/c** | — | Laminar–turbulent transition location on chord |
| **Turb Fraction** | — | Fraction of chord with turbulent boundary layer |
| **Cf Lam** | — | Laminar skin friction coefficient (Blasius: 1.328/√Re) |
| **Cf Turb** | — | Turbulent skin friction coefficient (Prandtl: 0.074/Re^0.2) |
| **CD Skin Fric** | — | Blended boundary-layer drag coefficient |
| **Cd0 Base** | — | Base profile drag: 0.004 + 0.008×(t/c) |
| **Cd0 Re Corr** | — | Reynolds-corrected Cd0 (Prandtl–Schlichting method) |
| **Tip Vortex Γ** | ft²/s | Tip vortex circulation strength |
| **Rollup Dist** | ft / m | Betz vortex sheet rollup distance |
| **Vortex Core r** | ft / m | Squire model vortex core radius |
| **T/W Ratio** | — | Thrust-to-weight ratio |
| **SEP** | mph / km/h | Specific Excess Power: (T−D)×V / W |
| **Ps Avail** | ft·lbs/s | Available specific power = T × V |
| **Wing Weight** | lbs / N | Raymer simplified structural weight estimate |
| **Wing Loading** | lbs/ft² | W / S — important sizing parameter |
| **Load Factor** | g | Lift / Weight |
| **Limit Load** | lbs / N | 2.5g × gross weight (FAR 23 limit) |
| **Ultimate Load** | lbs / N | 1.5 × limit load |
| **Safety Margin** | % | (Limit load − Lift) / Limit load × 100 |
| **GJ** | lb·ft² | Torsional stiffness (thin-wall closed section formula) |
| **Torsion Angle** | ° | Wing tip twist under aerodynamic pitching moment |
| **Divergence V** | mph / km/h | Aeroelastic divergence onset speed |
| **Cav. Number σ** | — | (p_atm − p_vapor) / q — cavitation index |
| **Cavitation** | — | CLEAR / ⚠ CAVITATING (water environment only) |
| **Hydro CL** | — | CL corrected for cavitation penalty |
| **Hydro CD** | — | CD corrected for cavitation drag increase |
| **Magnus CL** | — | Magnus lift coefficient (cylinder/ball only) |
| **Magnus Force** | lbs / N | Lateral force from body spin |
| **Hydro CNα** | — | Normal force slope (underwater foil, DATCOM-like) |
| **Normal Force** | lbs / N | Force perpendicular to chord (water environment) |
| **Axial Force** | lbs / N | Force along chord (water environment) |
| **Icing CL** | — | CL degraded by ice accumulation |
| **Icing CD** | — | CD increased by ice surface roughness |
| **Icing L/D** | — | L/D ratio under icing conditions |
| **Flap CL** | — | CL with flap and/or slat deflection |
| **Flap L/D** | — | L/D with high-lift devices |
| **GE Factor** | — | Ground effect induced-drag reduction factor |
| **GE L/D** | — | L/D in ground effect |
| **VLM CL** | — | Vortex lattice method lift coefficient (20 panels) |
| **VLM CDi** | — | VLM induced drag coefficient |
| **VLM L/D** | — | VLM lift-to-drag ratio |
| **VLM Span Eff** | — | Oswald span efficiency from VLM solution |
| **Tip Deflect** | ft / m | Aeroelastic tip bending deflection (cantilever beam) |
| **Flutter Speed** | mph / km/h | Theodorsen flutter onset speed |
| **Aeroelastic CL** | — | CL corrected for elastic washout twist |
| **Thrust** | lbs / N | Propeller thrust output |
| **Prop Eff** | % | Propulsive efficiency η = TV / P |
| **Prop Ct** | — | Thrust coefficient: Ct = 0.12 − 0.08J |
| **Mach Angle** | ° | Mach cone half-angle = arcsin(1/M) — supersonic only |
| **Sonic Boom** | psi | Ground overpressure estimate (Whitham theory) |
| **Boom Dist** | ft / m | Lateral distance to Mach cone ground footprint |
| **Wave CD** | — | Wave drag coefficient (Sears–Haack body minimum) |
| **Area Rule CD** | — | Total CD including transonic wave drag |
| **Gust Speed** | mph / km/h | Dryden turbulence model gust velocity (σ_w) |
| **Turb AoA** | ° | Effective angle of attack under turbulent gust |
| **Turb CL** | — | CL recalculated at turbulent effective AoA |
| **Turb CD** | — | CD under turbulence intensity factor |
| **Phugoid T** | s | Long-period oscillation period: T = 2πV / (g√2) |
| **Phugoid Damp** | — | Phugoid damping ratio ≈ 1 / (√2 × L/D) |
| **Short Period T** | s | Short-period pitch oscillation period |
| **Dutch Roll T** | s | Lateral–directional oscillation period |
| **Fuel Weight** | lbs / N | Current fuel mass (25% of gross weight capacity) |
| **Curr Weight** | lbs / N | Gross weight minus burned fuel |
| **CL Required** | — | CL needed for level flight at current weight |
| **Vs Actual** | mph / km/h | Stall speed at current weight |
| **Total Thrust** | lbs / N | Combined thrust from all active engines |
| **Asym Thrust** | ft·lbs | Yawing moment from engine-out condition |
| **Vmca** | mph / km/h | Minimum control speed with one engine inoperative |
| **Eng Out Drag** | lbs / N | Windmilling drag from failed engine |
| **Rec. Profile** | — | Reynolds-based profile recommendation |
| **CP (x/c)** | — | Center of pressure as fraction of chord |
| **NP (x/c)** | — | Neutral point as fraction of chord |
| **Static Margin** | — | NP − CP (positive = longitudinally stable) |
| **Trim AoA** | ° | Angle of attack for level flight trim condition |
| **Takeoff Dist** | ft / m | Ground roll to liftoff (energy method, μ = 0.02) |
| **Landing Dist** | ft / m | Ground roll from touchdown to stop (μ = 0.07) |
| **Opt. AoA** | ° | Angle of attack giving maximum L/D |
| **Max L/D** | — | Peak lift-to-drag ratio |
| **Winglet L/D** | — | L/D with winglet span extension |
| **Winglet CDi** | — | Induced drag with winglet effective AR increase |
| **Ground Speed** | mph / km/h | True speed over ground with wind correction |
| **Headwind** | mph / km/h | Wind component opposing flight direction |
| **Crosswind** | mph / km/h | Wind component perpendicular to flight path |
| **L/D Ratio** | — | Current lift-to-drag ratio |
| **Oswald e** | — | Span efficiency factor (0.5 – 1.0) |
| **Lift Force** | lbs / N | Total lift = CL × q × S |
| **Induced Drag** | lbs / N | Total induced drag force = CDi × q × S |
| **Dyn. Pressure** | psf / Pa | q = ½ρV² |
| **Stall Speed** | mph / km/h | Vs = √(2W / ρ CL_max S) |
| **Range** | nm / km | Breguet range (jet, ln(1/0.85) fuel fraction) |
| **Endurance** | hr | Breguet endurance |

---

### ⚖️ Stability

| Output | Unit | Description |
|--------|------|-------------|
| **Stall Margin** | ° | 10° − |α| — positive = safe, negative = stalled |
| **Stall Factor** | — | Post-stall CL reduction multiplier |
| **Stall α** | ° | Stall onset angle |
| **Cm (c/4)** | — | Pitching moment about quarter chord |
| **AR Correction** | ON/OFF | Prandtl finite-wing correction status |
| **Circulation Γ** | — | Kutta–Joukowski circulation value |

---

### 🌤 Atmosphere

| Output | Unit | Description |
|--------|------|-------------|
| **Density ρ** | slug/ft³ or kg/m³ | Air (or fluid) density at current altitude |
| **Pressure p** | psi or kPa | Static pressure at altitude |
| **Temperature** | °F or °C | Static temperature at altitude |
| **Layer** | — | Troposphere / Stratosphere / Upper Strat. / Mars Atm. / Water / Custom |
| **ISA Deviation** | °F or °C | Departure from standard day temperature |

---

## Center Viewport — 3D Visualization

| Feature | Description |
|---------|-------------|
| **Full 3D wing mesh** | Parametric surface rebuilt in real time from profile + planform |
| **Cp vertex coloring** | Surface pressure distribution mapped to mesh vertex colors |
| **Wireframe overlay** | Edge mesh at 18% opacity |
| **Rib cross-sections** | 7 spanwise airfoil slices per half-wing |
| **Leading edge line** | Orange highlight |
| **Trailing edge line** | Green highlight |
| **Quarter-chord line** | Yellow dashed aerodynamic center locus |
| **Lift arrow** | Green vector, length ∝ CL |
| **Drag arrow** | Orange vector, length ∝ CD |
| **Stall zone** | Red line on stalled span fraction when |α| > 10° |
| **Fuselage stub** | Cylindrical root fairing |
| **Shadow plane** | Soft ground shadow (ShadowMaterial) |
| **Ambient + directional + hemisphere lights** | Three-point PBR-style lighting |
| **Depth fog** | Exponential scene fog |
| **LMB drag** | Orbit camera (spherical coordinates) |
| **RMB drag** | Pan camera target |
| **Scroll wheel** | Zoom in/out (r: 3 – 60) |
| **Touch drag** | Orbit on mobile/tablet |
| **ISO / TOP / FRONT / SIDE** | One-click view snap buttons |

---

## Bottom Flight Bar

| Control | Range | Description |
|---------|-------|-------------|
| **Velocity** | 0 – 800 mph / 400 km/h | True airspeed |
| **Altitude** | 0 – 50,000 ft / 15,240 m | Geopotential altitude (ISA lookup) |
| **Angle of Attack** | −20° – +20° | Wing incidence to freestream velocity |
| **Spin (RPM)** | −1500 – +1500 | Cylinder/ball rotation (shown when relevant) |
| **ρ readout** | — | Live air density at current altitude |
| **q readout** | — | Live dynamic pressure |
| **Re readout** | k | Live Reynolds number in thousands |

---

## Graphs & Plots (19 Chart Types)

Opened via the **CL-Alpha** display toggle. Each tab shows a live operating-point dot.

| Tab | Chart | X-axis | Y-axis |
|-----|-------|--------|--------|
| **Cp** | Pressure coefficient distribution | x/c | Cp (upper = cyan, lower = orange) |
| **Vel** | Surface velocity distribution | x/c | V / V∞ |
| **CL-α** | Lift curve (with stall shading) | α (°) | CL |
| **CD-α** | Drag polar vs angle of attack | α (°) | CD |
| **CL-thk** | Lift vs thickness | Thickness % | CL |
| **CD-thk** | Drag vs thickness | Thickness % | CD |
| **CL-cam** | Lift vs camber | Camber % | CL |
| **CD-cam** | Drag vs camber | Camber % | CD |
| **L-spd** | Lift force vs airspeed | Speed | Lift (lbs/N) |
| **D-spd** | Drag force vs airspeed | Speed | Drag (lbs/N) |
| **L-alt** | Lift force vs altitude | Altitude | Lift (lbs/N) |
| **D-alt** | Drag force vs altitude | Altitude | Drag (lbs/N) |
| **Polar** | Classic drag polar | CD × 100 | CL × 100 |
| **L-Area** | Lift vs wing area | Wing area | Lift (lbs/N) |
| **L-Dens** | Lift vs air density | ρ | Lift (lbs/N) |
| **Span** | Spanwise lift distribution | Span position | CL (elliptic vs actual) |
| **Bend** | Bending moment & shear diagram | Span position | Shear / Moment |
| **Multi** | CL-α overlay, up to 5 curves | α (°) | CL |
| **Range** | Range map contour plot | Speed | Altitude (color = range) |

---

## Advanced Physics Modules

Each is a toggle switch in the right panel Options section.

| Module | Physics Implemented |
|--------|---------------------|
| **AR Correction** | Prandtl lifting line: CL_3D = CL_2D / (1 + CL / πAR) |
| **Stall Model** | Post-stall: factor = max(0, 0.5 + 0.1α − 0.005α²) for |α| > 10° |
| **Prandtl–Glauert** | CL_c = CL × 1/√(1−M²), capped at M = 0.85 |
| **Compare Snapshot** | Stores state; shows Δ and color-coded delta next to all aero outputs |
| **Tooltips** | Hover text on all sliders and output labels |
| **AoA Sweep** | Animated −20° → +20° AoA sweep at 0.3°/frame |
| **Winglet** | Effective AR increase: AR_eff = AR × (1 + 1.9 × h/b) |
| **Wind** | Ground speed = √((V−V_hw)² + V_cw²); decomposed from wind angle |
| **Icing** | CL × (1 − 0.3s), CD × (1 + 1.5s), where s = icing severity 0–1 |
| **Flaps** | ΔCL = 0.9 sin(δ), ΔCD = 0.02(δ/20)²; slat adds ΔCL = 0.3 |
| **Ground Effect** | CDi × k_GE where k_GE = 1 − exp(−4.4 h/b) |
| **VLM** | 20-panel cosine-spaced lifting line; Gauss–Seidel solver (100 iter) |
| **Aeroelastic** | Tip deflection (cantilever), elastic washout, Theodorsen flutter speed |
| **Propeller** | J = V/nD; Ct = max(0, 0.12 − 0.08J); Cp curve; η = TV/P |
| **Turbulence** | Dryden: σ_w = I×V; AoA_eff = AoA + arctan(σ_w/V) |
| **CG Position** | Slider 0–100% chord; static margin and W&B margin update live |
| **Fuel Model** | Fuel fraction burn → current weight → required CL → actual Vs |
| **Multi-Engine** | N = 1/2/4 engines; per-engine thrust; total thrust summation |
| **Engine Out** | One engine failed: yaw moment, windmill drag, Vmca calculation |
| **Flight Sim** | Real-time Newton physics loop; ↑↓ pitch, ←→ throttle |

---

## Tools & Utilities

| Tool | Description |
|------|-------------|
| **Flow Field** | Full Joukowski potential-flow streamlines with Cp-based color |
| **Probe** | Click anywhere on flow field canvas to read V/V∞, Cp, r/R at that point |
| **Particle Animation** | 50 Lagrangian tracer particles; hue mapped to local flow speed |
| **EM / SEP Map** | 30×20 grid: green = excess power available, red = insufficient thrust |
| **Lift Meter** | Auto-ranging animated bar: 10⁻¹ to 10⁴ scale with color bands |
| **Export (.txt)** | Full report: geometry, atmosphere, Cp table with V/V∞ |
| **Export (.csv)** | Upper + lower surface Cp and V/V∞ columns at current AoA |
| **Compare Report** | Download side-by-side: CL, CD, L/D, Lift, Mach with signed deltas |
| **Share Link** | 14 state variables URL-encoded; copied to clipboard with confirmation |
| **Optimization** | Brute-force search over camber × thickness × AoA (>5,000 evaluations) |
| **Polar Snap** | Capture current CL-α curve; overlay up to 5 curves in Multi tab |
| **Presets** | Save / load / delete named simulation states (localStorage) |
| **Unit Converter** | ft, m, mph, km/h, knots, ft/s, lbs, N, psi, kPa |
| **Load from URL** | Automatically restores simulation from shared ?params link |

---

## Physics & Theory Reference

### Atmosphere Model — ISA (US Standard Atmosphere 1976)

| Layer | Altitude (ft) | Lapse Rate |
|-------|---------------|------------|
| Troposphere | 0 – 36,152 | −3.56°F per 1,000 ft |
| Stratosphere | 36,152 – 82,345 | Isothermal at 389.98°R |
| Upper Stratosphere | 82,345+ | +1.645°F per 1,000 ft |

Viscosity: Sutherland's law — μ = μ_ref × (T/T_ref)^1.5 × (T_ref + S)/(T + S)

Mars: Seiff & Kirk (1977) two-segment curve fit, CO₂ gas constant R = 1149 ft²/s²·R

### Key Equations

| Quantity | Formula |
|----------|---------|
| Circulation | Γ = 2R sin(α + β) |
| Kutta–Joukowski lift | L = ρ V Γ b |
| Lift coefficient | CL = 4πΓ / chord |
| Induced drag | CDi = CL² / (π e AR) |
| Prandtl–Glauert | CL_c = CL / √(1 − M²) |
| Magnus lift | CL = 4π (ωR / V) |
| Reynolds number | Re = ρ V c / μ |
| Stall speed | Vs = √(2W / ρ CL_max S) |
| Buffet onset | M_b = κ − t/c − CL/10 |
| Breguet range | R = (V / g) × (L/D) × ln(W₀/W₁) |
| Phugoid period | T = 2πV / (g√2) |
| Cavitation number | σ = (p_atm − p_v) / q |
| Wing weight (Raymer) | W_w = 0.0051 × (W_g n)^0.557 × S^0.649 × AR^0.5 × ... |

---

## File Structure

```
aero-sim/
├── index.html       # Full UI: all panels, canvases, controls, overlays
├── main.js          # All physics engines, 3D renderer, UI logic (~4000 lines)
├── style.css        # Dark/light themes, responsive layout, component styles
└── README.md        # This file
```

---

## Dependencies

| Library | Version | Loaded via | Purpose |
|---------|---------|-----------|---------|
| [Three.js](https://threejs.org) | r128 | cdnjs CDN | 3D wing mesh, lighting, WebGL render loop |
| [Google Fonts](https://fonts.google.com) | — | googleapis CDN | Rajdhani (UI) + JetBrains Mono (data readouts) |

No npm packages. No bundler. No backend. No installation.

---

## Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome 90+ | ✅ Full |
| Firefox 88+ | ✅ Full |
| Edge 90+ | ✅ Full |
| Safari 14+ | ✅ Full |
| Mobile Chrome | ✅ Touch orbit supported |

WebGL is required for the 3D viewport.

---

## 🗺️ Roadmap

- [ ] GitHub Pages live demo
- [ ] 3D WebGL flow field visualization
- [ ] Panel method (higher-order alternative to VLM)
- [ ] NACA 5-digit series full support
- [ ] Multi-element airfoil (slat + flap + main element)
- [ ] Compressible VLM (subsonic panel method)
- [ ] Export results as PNG / PDF report
- [ ] Drag polar database comparison (NACA TR data overlay)

---

## 🤝 Contributing

Contributions are welcome! Whether it's a bug fix, a new physics module, or a UI improvement:

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes with a clear message: `git commit -m 'Add: Theodorsen flutter module improvements'`
4. Push to your branch: `git push origin feature/my-feature`
5. Open a Pull Request describing what you changed and why

Please keep contributions focused on aerodynamic accuracy and browser performance. No build tools or npm dependencies — the zero-install philosophy is intentional.

---

## License

MIT License — free to use, modify, and distribute.

---

*AERO-SIM — Pickle Brothers Edition*
