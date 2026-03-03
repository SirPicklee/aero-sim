"use strict";
/* ============================================================
   AERO-SIM main.js  —  Wing & Foil Analyzer Pickle Brothers
   Features:
   - Joukowski, NACA 4D, Ellipse, Flat Plate, Cylinder, Ball
   - Kutta-Joukowski exact lift theory
   - Stall model (|α| > 10°)
   - Prandtl AR correction
   - ISA Atmosphere: Troposphere / Stratosphere / Upper
   - Mars, Water, Custom fluid environments
   - Imperial / Metric unit switching
   - 6 wing planforms with full 3D mesh
   - Cp pressure distribution plot
   - Joukowski + NACA airfoil canvas preview
   ============================================================ */

// ─── CONSTANTS ───────────────────────────────────────────────
const PI    = Math.PI;
const RAD   = PI / 180;
const DEG   = 180 / PI;
const G0    = 32.2;          // ft/s² gravity
const RGAS  = 1718.0;        // ft²/s²·R  (air)
const RGAS_MARS = 1149.0;    // ft²/s²·R  (Mars CO2)
const GAMA  = 1.4;
const MU    = 3.7372e-7;     // slug/(ft·s) dynamic viscosity air (sea level)

// ─── STATE ───────────────────────────────────────────────────
const S = {
  // Profile
  profile: 'joukowski',  // joukowski | naca | ellipse | plate | cylinder | ball
  // Airfoil params (Joukowski / NACA share these)
  camber:  0.0,   // % chord  (-25 to 25)
  thick:   12.5,  // % chord  (1 to 26)
  // Cylinder / Ball
  spin:    0.0,   // RPM
  radius:  0.5,   // ft (or m)
  ballType: 'smooth',  // smooth | rough | golf
  plotType: 0,
  // Wing planform
  wingType: 'rectangular',
  span:    20.0,  // ft
  chord:   5.0,   // ft  (root chord)
  taper:   1.0,   // tip/root chord ratio
  sweep:   0.0,   // deg (leading edge sweep)
  dihedral:0.0,   // deg
  washout: 0.0,   // deg (tip washout)
  // Flight
  vel:     100.0, // mph (or km/h in metric)
  alt:     0.0,   // ft  (or m in metric)
  aoa:     0.0,   // deg
  // Environment
  env:     'earth',
  customRho: 0.00238,
  customTemp: 518.6,
  customPress: 2116.0,
  customViscos: 3.737e-7,
  // Units
  units:   'imperial',  // imperial | metric
  // Options
  arCorr:  false,
  stallModel: true,
  kutta: true,
  pgCorr: true,   // Prandtl-Glauert compressibility correction
  compareMode: false,
  snapShot: null,
  polarSnaps: [],
  tooltips: false,
  aoaSweep: false,
  winglet: false,
  wingletH: 0.1, // winglet height as fraction of semi-span
  wind: false,
  windSpeed: 0.0,  // mph or km/h
  windAngle: 0.0,  // deg (0=headwind, 90=crosswind, 180=tailwind)
  icing: false,
  icingSeverity: 0.3, // 0-1 (light to severe)
  flap: false,
  flapAngle: 20.0,  // deg
  groundEffect: false,
  vlm: false,
  aeroelastic: false,
  EI: 1e6, // bending stiffness (lb·ft²)
  propeller: false,
  propRPM: 2400,
  propDiam: 6.0, // ft
  propBlades: 2,
  turbulence: false,
  turbIntensity: 0.05, // 0-1 (light to severe)
  fuelModel: false,
  fuelFraction: 1.0,  // 0-1 (empty to full)
  grossWeight: 5000,  // lbs
  multiEngine: false,
  engineCount: 2,
  engineOutIndex: -1, // -1 = all engines, 0..n = failed engine index
  slat: false,
  flightSim: false,
  simState: { x: 0, y: 0, vx: 0, vy: 0, pitch: 0, throttle: 0.5, weight: 5000 },
  theme: 'dark',
  genp: { rc: null, xc: null, yc: null, gam: null, manual: false },
  // Display
  disp: { wire: true, ribs: true, grid: true, rot: false, cp: true, foil: true, flow: false, clplot: false, probe: false, liftmeter: false, particles: false }
};

// Derived / output state
const O = {
  rho: 0.00238, ps0: 2116.0, ts0: 518.6, temf: 59.0, layer: 'Troposphere',
  q0: 0.0, re: 0.0,
  area: 100.0, ar: 4.0, mac: 5.0, tipChord: 5.0, wettedArea: 202.0, volume: 0.0,
  cl: 0.0, cdi: 0.0, ld: 0.0, oswald: 0.85, cm: 0.0, stallAngle: 10.0, mach: 0.0,
  pgFactor: 1.0, machRegime: 'Incompressible',
  range: 0.0, endurance: 0.0, vs: 0.0,
  cp_pos: 0.0, np_pos: 0.0, sm: 0.0,
  trimAoa: 0.0,
  takeoffDist: 0.0, landingDist: 0.0,
  optAoa: 0.0, maxLD: 0.0,
  wingletCDi: 0.0, wingletLD: 0.0,
  groundSpeed: 0.0, crosswind: 0.0, headwind: 0.0,
  machBuffet: 0.0, buffetMargin: 0.0,
  icingCL: 0.0, icingCD: 0.0, icingLD: 0.0,
  recProfile: '',
  flapCL: 0.0, flapCD: 0.0, flapLD: 0.0,
  geCDi: 0.0, geLD: 0.0, geRatio: 1.0,
  vlmCL: 0.0, vlmCDi: 0.0, vlmLD: 0.0, vlmSpanEff: 0.0,
  tipDeflection: 0.0, flutterSpeed: 0.0, aeCL: 0.0,
  thrust: 0.0, propEff: 0.0, propTC: 0.0,
  sonicBoom: 0.0, machAngle: 0.0, boomDist: 0.0,
  turbCL: 0.0, turbCD: 0.0, turbAoa: 0.0, gust: 0.0,
  phugoidT: 0.0, phugoidDamp: 0.0, shortPeriodT: 0.0, dutchRollT: 0.0,
  currentWeight: 0.0, fuelWeight: 0.0, clRequired: 0.0, vsActual: 0.0,
  totalThrust: 0.0, asymThrust: 0.0, vmca: 0.0, engineOutDrag: 0.0,
  areaRuleCD: 0.0, waveCD: 0.0,
  isa_dev: 0.0,
  machEff: 0.0,
  lift: 0.0, drag: 0.0,
  gamma: 0.0, cliftRaw: 0.0, stallFact: 1.0, stallMargin: 10.0,
};

// Unit conversion factors (everything stored in Imperial internally)
const U = {
  lconv: 1.0,   // ft  →  ft(1) or m(0.3048)
  vconv: 0.6818,// ft/s → mph(0.6818) or km/h(1.097)
  vmax:  250.0, // mph or km/h
  altmax:50000.0,
  fconv: 1.0,   // lbs or N (4.448)
  pconv: 14.7,  // psi or kPa
};

// ─── UNIT HELPERS ────────────────────────────────────────────
function setUnitFactors() {
  if (S.units === 'imperial') {
    U.lconv  = 1.0;
    U.vconv  = 0.6818;  U.vmax  = 800.0;
    U.altmax = 50000.0;
    U.fconv  = 1.0;     U.pconv = 14.7;
  } else {
    U.lconv  = 0.3048;
    U.vconv  = 1.097;   U.vmax  = 400.0;
    U.altmax = 15240.0;
    U.fconv  = 4.448;   U.pconv = 101.325;
  }
}

function toInternal_vel(v)  { return v / U.vconv; }  // display → ft/s-ish (via mph/kmh)
function toInternal_len(v)  { return v / U.lconv; }  // display → ft
function toDisplay_vel(v)   { return v * U.vconv; }
function toDisplay_len(v)   { return v * U.lconv; }
function toDisplay_force(v) { return v * U.fconv; }

// ─── ATMOSPHERE ──────────────────────────────────────────────
function getFreeStream() {
  const hite = S.alt / U.lconv;   // always in feet for ISA
  let rho, ps0, ts0;

  if (S.env === 'earth') {
    // ISA standard — 3 layers
    if (hite <= 36152) {                        // Troposphere
      ts0 = 518.6 - 3.56 * hite / 1000.0;
      ps0 = 2116.0 * Math.pow(ts0 / 518.6, 5.256);
    } else if (hite <= 82345) {                  // Stratosphere
      ts0 = 389.98;
      ps0 = 2116.0 * 0.2236 * Math.exp((36000 - hite) / (53.35 * 389.98));
    } else {                                     // Upper stratosphere
      ts0 = 389.98 + 1.645 * (hite - 82345) / 1000.0;
      ps0 = 2116.0 * 0.02456 * Math.pow(ts0 / 389.98, -11.388);
    }
    rho = ps0 / (RGAS * ts0);
    O.temf = ts0 - 459.67;
    O.isa_dev = O.temf - (59.0 - 3.56 * (S.alt / U.lconv) / 1000.0);

    if (hite <= 36152)      O.layer = 'Troposphere';
    else if (hite <= 82345) O.layer = 'Stratosphere';
    else                    O.layer = 'Upper Strat.';

  } else if (S.env === 'mars') {
    // Mars atmosphere curve fit (Seiff & Kirk, 1977)
    if (hite <= 22960) {
      ts0 = 434.02 - 0.548 * hite / 1000.0;
    } else {
      ts0 = 449.36 - 1.217 * hite / 1000.0;
    }
    ps0 = 14.62 * Math.exp(-0.00003 * hite);
    rho = ps0 / (RGAS_MARS * ts0);
    O.temf = ts0 - 459.6;
    O.layer = 'Mars Atm.';

  } else if (S.env === 'water') {
    // Incompressible water, depth is negative altitude
    ts0 = 520.0; rho = 1.94;   // slug/ft³
    const depth = -S.alt / U.lconv;
    ps0 = 2116.0 + rho * G0 * depth;
    O.temf = 60.0;
    O.layer = 'Water';

  } else {  // custom
    rho = S.customRho;
    ts0 = S.customTemp;
    ps0 = S.customPress;
    O.temf = ts0 - 459.67;
    O.layer = 'Custom';
    O.viscos = S.customViscos;
  }

  // Sutherland viscosity formula
  const mu0 = 3.737e-7;  // slug/ft-s (sea level)
  const viscos = mu0 * 717.408 / (ts0 + 198.72) * Math.pow(ts0 / 518.688, 1.5);
  O.rho = rho;
  O.ps0 = ps0;
  O.ts0 = ts0;
  O.viscos = viscos;
  // Speed of sound and Mach number
  const gamma = 1.4;
  const rgas = 1716.0; // ft²/s²/°R
  O.sos = Math.sqrt(gamma * rgas * ts0); // ft/s
  // Convert display-unit velocity to ft/s using unit-correct factor
  const vfsd = S.vel / U.vconv;                 // ft/s (works for both imperial & metric)
  O.vtas = vfsd;
  O.mach = vfsd / O.sos;                        // unit-independent Mach number
  O.q0 = 0.5 * rho * vfsd * vfsd;              // dynamic pressure  (psf)

  // Reynolds number
  const chordFt = S.chord / U.lconv;
  O.re = rho * vfsd * chordFt / (O.viscos || MU);
}

// ─── KUTTA-JOUKOWSKI CIRCULATION ─────────────────────────────
// Returns { rval, xcval, ycval, gamval, chord, cl }
function getCirculation() {
  const camv   = S.camber / 25.0;   // normalised camber
  const thkv   = S.thick  / 25.0;   // normalised thickness
  const alfa   = S.aoa;
  let rval, xcval = 0, ycval, gamval, chord, clift;

  if (S.profile === 'joukowski' || S.profile === 'naca') {
    ycval = camv / 2.0;
    rval  = thkv / 4.0 + Math.sqrt(thkv * thkv / 16.0 + ycval * ycval + 1.0);
    xcval = 1.0 - Math.sqrt(rval * rval - ycval * ycval);
    if (S.genp.manual) {
      if (S.genp.rc  !== null) rval  = S.genp.rc;
      if (S.genp.xc  !== null) xcval = S.genp.xc;
      if (S.genp.yc  !== null) ycval = S.genp.yc;
    }
    const beta = Math.asin(Math.max(-1, Math.min(1, ycval / rval))) * DEG;
    gamval = 2.0 * rval * Math.sin((alfa + beta) * RAD);
    if (S.genp.manual && S.genp.gam !== null) gamval = S.genp.gam;
    if (!S.kutta) gamval = 0.0;

    // Mapping chord
    const leg  = xcval - Math.sqrt(rval * rval - ycval * ycval);
    const teg  = xcval + Math.sqrt(rval * rval - ycval * ycval);
    const lem  = leg + 1.0 / leg;
    const tem  = teg + 1.0 / teg;
    chord = tem - lem;
    clift = gamval * 4.0 * PI / chord;

  } else if (S.profile === 'ellipse') {
    ycval = camv / 2.0;
    rval  = thkv / 4.0 + Math.sqrt(thkv * thkv / 16.0 + ycval * ycval + 1.0);
    xcval = 0;
    const beta = Math.asin(Math.max(-1, Math.min(1, ycval / rval))) * DEG;
    gamval = 2.0 * rval * Math.sin((alfa + beta) * RAD);
    if (!S.kutta) gamval = 0.0;
    chord  = 2.0; // symmetric ellipse mapping
    clift  = gamval * 4.0 * PI / chord;

  } else if (S.profile === 'plate') {
    ycval = camv / 2.0;
    rval  = Math.sqrt(ycval * ycval + 1.0);
    const beta = Math.asin(Math.max(-1, Math.min(1, ycval / rval))) * DEG;
    gamval = 2.0 * rval * Math.sin((alfa + beta) * RAD);
    if (!S.kutta) gamval = 0.0;
    chord  = 2.0;
    clift  = gamval * 4.0 * PI / chord;

  } else if (S.profile === 'cylinder' || S.profile === 'ball') {
    rval = S.radius / U.lconv;
    const vfsd = S.vel / U.vconv;
    const spinRPS = S.spin / 60.0;
    gamval = 4.0 * PI * PI * spinRPS * rval * rval / vfsd;
    xcval  = 0; ycval = 0.0001;
    chord  = 2.0 * rval;
    // Magnus lift
    clift = 0;  // computed separately below via Joukowski
  }

  return { rval, xcval, ycval, gamval, chord, clift };
}

// ─── PRESSURE DISTRIBUTION (Cp along airfoil surface) ────────
// Returns array of {xNorm, cp} for plotting
function computeCpDistribution() {
  if (S.profile === 'cylinder' || S.profile === 'ball') return [];
  const circ = getCirculation();
  const { rval, xcval, ycval, gamval } = circ;
  const yc = ycval || 0;
  const alfa = S.aoa;
  const alfrad = alfa * RAD;
  const N = 180;  // daha fazla nokta = daha pürüzsüz
  const pts = [];

  // Chord referans noktaları (mapped plane)
  const leg  = xcval - Math.sqrt(rval * rval - yc * yc);
  const teg  = xcval + Math.sqrt(rval * rval - yc * yc);
  const lem  = leg + 1.0 / leg;
  const tem  = teg + 1.0 / teg;
  const chrd = tem - lem;

  for (let i = 0; i <= N; i++) {
    const theta = (i / N) * 2 * PI;  // silindir yüzeyi açısı (radyan)

    // 1. Silindir yüzeyinde hız — pre-translation koordinatları
    //    ur = 0 yüzey üzerinde (normal bileşen sıfır)
    const uth = -2.0 * Math.sin(theta - alfrad) - gamval / rval;
    const usq = uth * uth;  // ur=0 olduğu için sadece uth²

    // 2. Joukowski Jacobian için — translated (airfoil) koordinatları
    const xloc = rval * Math.cos(theta) + xcval;
    const yloc = rval * Math.sin(theta) + yc;
    const r2   = Math.sqrt(xloc * xloc + yloc * yloc);
    if (r2 < 0.001) continue;
    const th2  = Math.atan2(yloc, xloc);

    const j1   = 1.0 - Math.cos(2 * th2) / (r2 * r2);
    const j2   = Math.sin(2 * th2) / (r2 * r2);
    const jsq  = Math.max(0.005, j1 * j1 + j2 * j2);

    const vsq  = usq / jsq;
    const cp   = 1.0 - vsq;

    // 3. Mapped x konumu (chord yüzdesi)
    const xm    = (r2 + 1.0 / r2) * Math.cos(th2);
    const xNorm = Math.max(0, Math.min(1, (xm - lem) / chrd));

    // Üst yüzey: theta 0→PI arası (sin > 0)
    const upper = Math.sin(theta) >= 0;

    // Aşırı uç değerleri filtrele (leading/trailing edge yakını gürültü)
    if (Math.abs(cp) < 15) {
      pts.push({ xNorm, cp, upper });
    }
  }
  return pts;
}
function getDrag(cl) {
  const alfd = S.aoa;
  const camd = S.camber;
  const thkd = S.thick;
  let dragco = 0;
  function poly(a, ...c) { return c.reduce((s, ci) => s * a + ci, 0); }
  if (S.profile === 'joukowski' || S.profile === 'naca') {
    const d05=[poly(alfd,-9e-7,0,7e-4,8e-4,0.015),poly(alfd,4e-8,0,-7e-7,0,-1e-5,9e-4,3.3e-3,0.0301),poly(alfd,-9e-9,-6e-8,5e-6,3e-5,-1e-4,-2.5e-3,0.0615),poly(alfd,8e-10,-5e-8,-1e-6,3e-5,8e-4,-2.7e-3,0.0612),poly(alfd,8e-9,1e-8,-5e-6,6e-6,1e-3,-1e-3,0.1219)];
    const d10=[poly(alfd,-1e-8,6e-8,6e-6,-2e-5,-2e-4,1.7e-3,0.0196),poly(alfd,3e-9,6e-8,-2e-6,-3e-5,8e-4,3.8e-3,0.0159),poly(alfd,-5e-9,-3e-8,2e-6,1e-5,4e-4,-3e-5,0.0624),poly(alfd,-2e-9,-2e-8,-5e-7,8e-6,9e-4,3.4e-3,0.0993),poly(alfd,2e-9,-3e-8,-2e-6,2e-5,9e-4,2.3e-3,0.1581)];
    const d15=[poly(alfd,-5e-9,7e-8,3e-6,-3e-5,-7e-5,1.7e-3,0.0358),poly(alfd,-4e-9,-8e-9,2e-6,-9e-7,2e-4,3.1e-3,0.0351),poly(alfd,3e-9,3e-8,-2e-6,-1e-5,9e-4,4e-3,0.0543),poly(alfd,3e-9,5e-8,-2e-6,-3e-5,8e-4,8.7e-3,0.1167),poly(alfd,3e-10,-3e-8,-6e-7,3e-5,6e-4,8e-4,0.1859)];
    const d20=[poly(alfd,-3e-9,2e-8,2e-6,-8e-6,-4e-5,3e-4,0.0416),poly(alfd,-3e-9,-7e-8,1e-6,3e-5,4e-4,5e-5,0.0483),poly(alfd,1e-8,4e-8,-6e-6,-2e-5,1.4e-3,7e-3,0.0692),poly(alfd,3e-9,-9e-8,-3e-6,4e-5,1e-3,2.1e-3,0.139),poly(alfd,3e-9,-7e-8,-3e-6,4e-5,1.2e-3,1e-3,0.1856)];
    const allD=[d05,d10,d15,d20];
    const camBandsU=[0,5,10,15,20];
    const absCamd=Math.abs(camd);
    let ci=0;
    for(let i=0;i<camBandsU.length-1;i++) if(absCamd>=camBandsU[i]&&absCamd<camBandsU[i+1]) ci=i;
    if(absCamd>=20) ci=3;
    const ft=(absCamd-camBandsU[ci])/5;
    const thkBands=[5,10,15,20];
    let ti=0;
    for(let i=0;i<thkBands.length-1;i++) if(thkd>thkBands[i]&&thkd<=thkBands[i+1]) ti=i;
    const fth=(thkd-thkBands[ti])/5;
    const dLow=d05[ci]+ft*(d05[Math.min(ci+1,4)]-d05[ci]);
    const dHigh=(ti<3)?(allD[ti][ci]+ft*(allD[ti][Math.min(ci+1,4)]-allD[ti][ci])):d20[ci];
    dragco=dLow+fth*(dHigh-dLow);
  } else if (S.profile==='ellipse') {
    const camBands=[0,10,20];
    const d=[[poly(alfd,-6e-7,0,7e-4,7e-4,0.0428),poly(alfd,5e-9,-7e-8,-3e-6,5e-5,9e-4,-5.8e-3,0.0758),poly(alfd,1e-8,-2e-8,-7e-6,1e-5,1.5e-3,7e-4,0.1594)],[poly(alfd,3e-9,4e-8,-3e-6,-9e-6,1.3e-3,7e-4,0.0112),poly(alfd,-4e-9,-9e-8,2e-6,7e-5,8e-4,-9.5e-3,0.0657),poly(alfd,-8e-9,-9e-8,3e-6,6e-5,5e-4,-8.8e-3,0.2088)],[poly(alfd,-7e-9,-1e-7,4e-6,6e-5,1e-4,-8.7e-3,0.0596),poly(alfd,-2e-9,2e-7,1e-6,-6e-5,4e-4,-7e-5,0.1114),poly(alfd,4e-9,-7e-8,-3e-6,3e-5,1e-3,-1.8e-3,0.1925)]];
    const absCamd=Math.abs(camd);
    const ci=absCamd<10?0:absCamd<20?1:2;
    const ft=(absCamd-camBands[ci])/10;
    const ti=thkd<=5?0:thkd<=10?1:2;
    dragco=d[ti][ci]+ft*(d[ti][Math.min(ci+1,2)]-d[ti][ci]);
  } else if (S.profile==='plate') {
    const dv=[poly(alfd,-9e-7,0,7e-4,8e-4,0.015),poly(alfd,1e-8,4e-8,-9e-6,-1e-5,2.1e-3,3.3e-3,0.006),poly(alfd,-9e-9,-6e-8,5e-6,3e-5,-1e-4,-2.5e-3,0.0615),poly(alfd,8e-10,-5e-8,-1e-6,3e-5,8e-4,-2.7e-3,0.0612),poly(alfd,8e-9,1e-8,-5e-6,6e-6,1e-3,-1e-3,0.1219)];
    const absCamd=Math.abs(camd);
    const ci=absCamd<5?0:absCamd<10?1:absCamd<15?2:absCamd<20?3:4;
    const ft=(absCamd-ci*5)/5;
    dragco=dv[ci]+ft*(dv[Math.min(ci+1,4)]-dv[ci]);
  } else if (S.profile==='cylinder') {
    const recyl=[.1,.2,.4,.5,.6,.8,1,2,4,5,6,8,10,20,40,50,60,80,100,200,400,500,600,800,1000,2000,4000,5000,6000,8000,10000,100000,200000,400000,500000,600000,800000,1000000,2000000,4000000,5000000,6000000,8000000,1e12];
    const cdcyl=[70,35,20,17,15,13,10,7,5.5,5,4.5,4,3.5,3,2.7,2.5,2,2,1.9,1.6,1.4,1.2,1.1,1.1,1,1.2,1.4,1.4,1.5,1.5,1.6,1.6,1.4,.4,.28,.32,.4,.45,.6,.8,.8,.85,.9,.9];
    let ifound=0;
    for(let i=0;i<recyl.length-1;i++) if(O.re/1000>=recyl[i]&&O.re/1000<recyl[i+1]) ifound=i;
    dragco=cdcyl[ifound]+(cdcyl[ifound+1]-cdcyl[ifound])/(recyl[ifound+1]-recyl[ifound])*(O.re/1000-recyl[ifound]);
  } else if (S.profile==='ball') {
    const resps=[.1,.2,.4,.5,.6,.8,1,2,4,5,6,8,10,20,40,50,60,80,100,200,400,500,600,800,1000,2000,4000,5000,6000,8000,10000,20000,40000,50000,60000,80000,100000,200000,400000,500000,600000,800000,1000000,2000000,4000000,5000000,6000000,8000000,1e12];
    const cdsps=[270,110,54,51,40,35,28,15,8.5,7.5,6,5.4,4.9,3.1,1.9,1.8,1.5,1.3,1.1,0.81,0.6,0.58,0.56,0.5,0.49,0.40,0.41,0.415,0.42,0.43,0.44,0.44,0.45,0.455,0.46,0.47,0.48,0.47,0.10,0.098,0.1,0.15,0.19,0.30,0.35,0.370,0.4,0.40,0.42];
    const cdspr=[270,110,54,51,40,35,28,15,8.5,7.5,6,5.4,4.9,3.1,1.9,1.8,1.5,1.3,1.1,0.81,0.6,0.58,0.56,0.5,0.49,0.40,0.41,0.415,0.42,0.43,0.44,0.44,0.45,0.455,0.46,0.42,0.15,0.27,0.33,0.35,0.37,0.38,0.39,0.40,0.41,0.41,0.42,0.43,0.44];
    const cdspg=[270,110,54,51,40,35,28,15,8.5,7.5,6,5.4,4.9,3.1,1.9,1.8,1.5,1.3,1.1,0.81,0.6,0.58,0.56,0.5,0.49,0.40,0.41,0.415,0.42,0.43,0.44,0.44,0.28,0.255,0.24,0.24,0.25,0.26,0.27,0.290,0.33,0.37,0.40,0.41,0.42,0.420,0.43,0.44,0.45];
    const cdArr=S.ballType==='rough'?cdspr:S.ballType==='golf'?cdspg:cdsps;
    let ifound=0;
    for(let i=0;i<resps.length-1;i++) if(O.re/1000>=resps[i]&&O.re/1000<resps[i+1]) ifound=i;
    dragco=cdArr[ifound]+(cdArr[ifound+1]-cdArr[ifound])/(resps[ifound+1]-resps[ifound])*(O.re/1000-resps[ifound]);
  }
  return dragco;
}
// ─── AERODYNAMIC OUTPUTS ─────────────────────────────────────
function computeAero() {
  getFreeStream();

  const circ = getCirculation();
  const { rval, xcval, ycval, gamval, chord, clift: cliftKJ } = circ;
  const alfa = S.aoa;

  // Geometry
  const spanFt  = S.span  / U.lconv;
  const chordFt = S.chord / U.lconv;
  const taperR  = S.taper;

  let area, ar, mac, tipChord;
  if (S.wingType === 'elliptical') {
    area     = PI * spanFt * chordFt / 4.0;
    ar       = spanFt * spanFt / area;
    mac      = PI * chordFt / 4.0;
    tipChord = 0;
  } else {
    tipChord = chordFt * taperR;
    area     = 0.5 * (chordFt + tipChord) * spanFt;
    ar       = spanFt * spanFt / area;
    mac      = (2.0 / 3.0) * chordFt * (1 + taperR + taperR * taperR) / (1 + taperR);
  }
  const wettedArea = 2.02 * area * (1 + 2.3 * (S.thick / 100));
  const avgChord = (chordFt + tipChord) / 2;
  const volume = 0.6 * (S.thick / 100) * avgChord * avgChord * spanFt;
  O.volume = volume * U.lconv * U.lconv * U.lconv;

  O.area       = area * U.lconv * U.lconv;
  O.ar         = ar;
  O.mac        = mac * U.lconv;
  O.tipChord   = tipChord * U.lconv;
  O.wettedArea = wettedArea * U.lconv * U.lconv;

  // ─ CL computation ─
  let cl;
  O.gamma = gamval;

  if (S.profile === 'cylinder' || S.profile === 'ball') {
    // Magnus effect: CL from Joukowski directly
    const vfsd = S.vel / U.vconv;
    const lift = O.rho * vfsd * gamval * spanFt;
    const liftFinal = (S.profile === 'ball') ? lift * PI / 2.0 : lift;
    cl = liftFinal / (O.q0 * area);
  } else {
    // Kutta-Joukowski CL
    cl = cliftKJ;
    O.stallMargin = 10.0 - Math.abs(alfa);
    
    

    // Stall model
    O.stallFact = 1.0;
    if (S.stallModel) {
      if (alfa > 10.0) {
        O.stallFact = 0.5 + 0.1 * alfa - 0.005 * alfa * alfa;
        O.stallFact = Math.max(0.0, O.stallFact);
      } else if (alfa < -10.0) {
        O.stallFact = 0.5 - 0.1 * alfa - 0.005 * alfa * alfa;
        O.stallFact = Math.max(0.0, O.stallFact);
      }
      cl *= O.stallFact;
    }

    // Prandtl AR correction
    if (S.arCorr && ar > 0) {
      cl = cl / (1.0 + cl / (PI * ar));
    }
  }

  O.cliftRaw = cliftKJ;

  // Oswald span efficiency
  const sw = S.sweep * RAD;
  const alfd = S.aoa;
  const camd = S.camber;
  const thkd = S.thick;
  let dragco = 0;

  function poly(a, ...c) {
    // c[0]*a^n + c[1]*a^(n-1) + ... + c[n]
    return c.reduce((s, ci) => s * a + ci, 0);
  }

  if (S.profile === 'joukowski' || S.profile === 'naca') {
    const d05 = [
      poly(alfd,-9e-7,0,7e-4,8e-4,0.015),
      poly(alfd,4e-8,0,-7e-7,0,-1e-5,9e-4,3.3e-3,0.0301),
      poly(alfd,-9e-9,-6e-8,5e-6,3e-5,-1e-4,-2.5e-3,0.0615),
      poly(alfd,8e-10,-5e-8,-1e-6,3e-5,8e-4,-2.7e-3,0.0612),
      poly(alfd,8e-9,1e-8,-5e-6,6e-6,1e-3,-1e-3,0.1219)
    ];
    const d10 = [
      poly(alfd,-1e-8,6e-8,6e-6,-2e-5,-2e-4,1.7e-3,0.0196),
      poly(alfd,3e-9,6e-8,-2e-6,-3e-5,8e-4,3.8e-3,0.0159),
      poly(alfd,-5e-9,-3e-8,2e-6,1e-5,4e-4,-3e-5,0.0624),
      poly(alfd,-2e-9,-2e-8,-5e-7,8e-6,9e-4,3.4e-3,0.0993),
      poly(alfd,2e-9,-3e-8,-2e-6,2e-5,9e-4,2.3e-3,0.1581)
    ];
    const d15 = [
      poly(alfd,-5e-9,7e-8,3e-6,-3e-5,-7e-5,1.7e-3,0.0358),
      poly(alfd,-4e-9,-8e-9,2e-6,-9e-7,2e-4,3.1e-3,0.0351),
      poly(alfd,3e-9,3e-8,-2e-6,-1e-5,9e-4,4e-3,0.0543),
      poly(alfd,3e-9,5e-8,-2e-6,-3e-5,8e-4,8.7e-3,0.1167),
      poly(alfd,3e-10,-3e-8,-6e-7,3e-5,6e-4,8e-4,0.1859)
    ];
    const d20 = [
      poly(alfd,-3e-9,2e-8,2e-6,-8e-6,-4e-5,3e-4,0.0416),
      poly(alfd,-3e-9,-7e-8,1e-6,3e-5,4e-4,5e-5,0.0483),
      poly(alfd,1e-8,4e-8,-6e-6,-2e-5,1.4e-3,7e-3,0.0692),
      poly(alfd,3e-9,-9e-8,-3e-6,4e-5,1e-3,2.1e-3,0.139),
      poly(alfd,3e-9,-7e-8,-3e-6,4e-5,1.2e-3,1e-3,0.1856)
    ];
    const camBands = [-20,-15,-10,-5,0,5,10,15,20];
    const allD = [d05,d10,d15,d20]; // indexed by thk band
    // camber interpolasyon
    let ci = 0;
    const camBandsU = [0,5,10,15,20];
    const absCamd = Math.abs(camd);
    for (let i=0; i<camBandsU.length-1; i++) if (absCamd >= camBandsU[i] && absCamd < camBandsU[i+1]) ci = i;
    if (absCamd >= 20) ci = 3;
    const ft = (absCamd - camBandsU[ci]) / 5;
    // thickness interpolasyon
    const thkBands = [5,10,15,20];
    let ti = 0;
    for (let i=0; i<thkBands.length-1; i++) if (thkd > thkBands[i] && thkd <= thkBands[i+1]) ti = i;
    const fth = (thkd - thkBands[ti]) / 5;
    const dLow  = d05[ci] + ft*(d05[Math.min(ci+1,4)] - d05[ci]);
    const dHigh = (ti < 3) ? (allD[ti][ci] + ft*(allD[ti][Math.min(ci+1,4)] - allD[ti][ci])) : d20[ci];
    dragco = dLow + fth*(dHigh - dLow);

  } else if (S.profile === 'ellipse') {
    const camBands = [0,10,20];
    const thkBands = [5,10,20];
    const d = [
      [poly(alfd,-6e-7,0,7e-4,7e-4,0.0428), poly(alfd,5e-9,-7e-8,-3e-6,5e-5,9e-4,-5.8e-3,0.0758), poly(alfd,1e-8,-2e-8,-7e-6,1e-5,1.5e-3,7e-4,0.1594)],
      [poly(alfd,3e-9,4e-8,-3e-6,-9e-6,1.3e-3,7e-4,0.0112), poly(alfd,-4e-9,-9e-8,2e-6,7e-5,8e-4,-9.5e-3,0.0657), poly(alfd,-8e-9,-9e-8,3e-6,6e-5,5e-4,-8.8e-3,0.2088)],
      [poly(alfd,-7e-9,-1e-7,4e-6,6e-5,1e-4,-8.7e-3,0.0596), poly(alfd,-2e-9,2e-7,1e-6,-6e-5,4e-4,-7e-5,0.1114), poly(alfd,4e-9,-7e-8,-3e-6,3e-5,1e-3,-1.8e-3,0.1925)]
    ];
    const absCamd = Math.abs(camd);
    const ci = absCamd < 10 ? 0 : absCamd < 20 ? 1 : 2;
    const ft = (absCamd - camBands[ci]) / 10;
    const ti = thkd <= 5 ? 0 : thkd <= 10 ? 1 : 2;
    const fth = ti === 0 ? 0 : ti === 1 ? (thkd-5)/5 : (thkd-10)/10;
    dragco = d[ti][ci] + ft*(d[ti][Math.min(ci+1,2)] - d[ti][ci]);

  } else if (S.profile === 'plate') {
    const dv = [
      poly(alfd,-9e-7,0,7e-4,8e-4,0.015),
      poly(alfd,1e-8,4e-8,-9e-6,-1e-5,2.1e-3,3.3e-3,0.006),
      poly(alfd,-9e-9,-6e-8,5e-6,3e-5,-1e-4,-2.5e-3,0.0615),
      poly(alfd,8e-10,-5e-8,-1e-6,3e-5,8e-4,-2.7e-3,0.0612),
      poly(alfd,8e-9,1e-8,-5e-6,6e-6,1e-3,-1e-3,0.1219)
    ];
    const absCamd = Math.abs(camd);
    const ci = absCamd < 5 ? 0 : absCamd < 10 ? 1 : absCamd < 15 ? 2 : absCamd < 20 ? 3 : 4;
    const ft = (absCamd - ci*5) / 5;
    dragco = dv[ci] + ft*(dv[Math.min(ci+1,4)] - dv[ci]);

  } else if (S.profile === 'cylinder') {
    const recyl = [.1,.2,.4,.5,.6,.8,1,2,4,5,6,8,10,20,40,50,60,80,100,200,400,500,600,800,1000,2000,4000,5000,6000,8000,10000,100000,200000,400000,500000,600000,800000,1000000,2000000,4000000,5000000,6000000,8000000,1e12];
    const cdcyl = [70,35,20,17,15,13,10,7,5.5,5,4.5,4,3.5,3,2.7,2.5,2,2,1.9,1.6,1.4,1.2,1.1,1.1,1,1.2,1.4,1.4,1.5,1.5,1.6,1.6,1.4,.4,.28,.32,.4,.45,.6,.8,.8,.85,.9,.9];
    let ifound = 0;
    for (let i=0; i<recyl.length-1; i++) if (O.re/1000 >= recyl[i] && O.re/1000 < recyl[i+1]) ifound = i;
    dragco = cdcyl[ifound] + (cdcyl[ifound+1]-cdcyl[ifound])/(recyl[ifound+1]-recyl[ifound])*(O.re/1000-recyl[ifound]);

  } else if (S.profile === 'ball') {
    const resps = [.1,.2,.4,.5,.6,.8,1,2,4,5,6,8,10,20,40,50,60,80,100,200,400,500,600,800,1000,2000,4000,5000,6000,8000,10000,20000,40000,50000,60000,80000,100000,200000,400000,500000,600000,800000,1000000,2000000,4000000,5000000,6000000,8000000,1e12];
    const cdsps = [270,110,54,51,40,35,28,15,8.5,7.5,6,5.4,4.9,3.1,1.9,1.8,1.5,1.3,1.1,0.81,0.6,0.58,0.56,0.5,0.49,0.40,0.41,0.415,0.42,0.43,0.44,0.44,0.45,0.455,0.46,0.47,0.48,0.47,0.10,0.098,0.1,0.15,0.19,0.30,0.35,0.370,0.4,0.40,0.42];
    let ifound = 0;
    for (let i=0; i<resps.length-1; i++) if (O.re/1000 >= resps[i] && O.re/1000 < resps[i+1]) ifound = i;
    const cdspr = [270,110,54,51,40,35,28,15,8.5,7.5,6,5.4,4.9,3.1,1.9,1.8,1.5,1.3,1.1,0.81,0.6,0.58,0.56,0.5,0.49,0.40,0.41,0.415,0.42,0.43,0.44,0.44,0.45,0.455,0.46,0.42,0.15,0.27,0.33,0.35,0.37,0.38,0.39,0.40,0.41,0.41,0.42,0.43,0.44];
    const cdspg = [270,110,54,51,40,35,28,15,8.5,7.5,6,5.4,4.9,3.1,1.9,1.8,1.5,1.3,1.1,0.81,0.6,0.58,0.56,0.5,0.49,0.40,0.41,0.415,0.42,0.43,0.44,0.44,0.28,0.255,0.24,0.24,0.25,0.26,0.27,0.290,0.33,0.37,0.40,0.41,0.42,0.420,0.43,0.44,0.45];
    const cdArr = S.ballType === 'rough' ? cdspr : S.ballType === 'golf' ? cdspg : cdsps;
    dragco = cdArr[ifound] + (cdArr[ifound+1]-cdArr[ifound])/(resps[ifound+1]-resps[ifound])*(O.re/1000-resps[ifound]);
  }

  O.oswald = 1.0 / (1.05 + 0.007 * PI * ar) * (1.0 - 0.0045 * (sw * DEG));
  O.oswald = Math.max(0.5, Math.min(1.0, O.oswald));

  // ── Prandtl-Glauert Compressibility Correction ──────────────
  // Only for airfoil profiles (not cylinder/ball), only subsonic
  const isCylBall = (S.profile === 'cylinder' || S.profile === 'ball');
  let pgFactor = 1.0;
  let machRegime = 'Incompressible';

  if (!isCylBall && S.pgCorr) {
    const M = O.mach;
    if (M < 0.3) {
      // Incompressible — correction negligible (<1.5%), skip
      pgFactor = 1.0;
      machRegime = 'Incompressible';
    } else if (M < 0.85) {
      // Subsonic compressible — Prandtl-Glauert rule
      pgFactor = 1.0 / Math.sqrt(1.0 - M * M);
      machRegime = 'Subsonic';
    } else if (M < 1.0) {
      // Transonic — PG breaks down, use Mach=0.85 capped factor + warning
      pgFactor = 1.0 / Math.sqrt(1.0 - 0.85 * 0.85);  // ~1.90 cap
      machRegime = 'Transonic ⚠';
    } else {
      // Supersonic — PG not valid
      pgFactor = 1.0;
      machRegime = 'Supersonic';
    }
  } else if (isCylBall) {
    machRegime = 'N/A';
  }

  O.pgFactor    = pgFactor;
  O.machRegime  = machRegime;
  // Effective Mach at swept wing (cosine rule)
  O.machEff = O.mach * Math.cos(S.sweep * RAD);

  // Apply PG to CL
  if (pgFactor !== 1.0) cl = cl * pgFactor;
  O.cl = cl;
  O.cd = getDrag ? getDrag(cl) : 0;
  // Reynolds correction
  if (!isCylBall && O.re > 0) {
    O.cd = O.cd * Math.pow(50000 / O.re, 0.11);
  }
  // Apply PG to CD as well
  if (pgFactor !== 1.0) O.cd = O.cd * pgFactor;
  // Induced drag
  if (ar > 0) {
    O.cd = O.cd + (cl * cl) / (PI * ar * 0.85);
  }

  // Induced drag
  if (ar > 0 && O.oswald > 0) {
    O.cdi = cl * cl / (PI * O.oswald * ar);
  } else {
    O.cdi = 0;
  }

  // L/D
  O.ld = (O.cd > 0.0001) ? cl / O.cd : (O.cdi > 0.0001) ? cl / O.cdi : 0;

  // Forces
  const vfsd  = S.vel / U.vconv;
  const q_psf = O.q0;

  if (S.profile === 'cylinder' || S.profile === 'ball') {
    const liftLbs = O.rho * vfsd * gamval * spanFt;
    O.lift = (S.profile === 'ball') ? liftLbs * PI / 2.0 : liftLbs;
    O.lift = O.lift * U.fconv;
  } else {
    O.lift = cl * q_psf * area * U.fconv;
  }
  // Stall açısı hesabı
  const camv2s = S.camber / 25.0;
  const thkv2s = S.thick / 25.0;
  const ycs = camv2s / 2.0;
  const rcs = thkv2s/4.0 + Math.sqrt(thkv2s*thkv2s/16.0 + ycs*ycs + 1.0);
  const betas = Math.asin(Math.max(-1, Math.min(1, ycs/rcs))) * DEG;
  O.stallAngle = 10.0;
  // Pitching moment
  const camv2 = S.camber / 25.0;
  const thkv2 = S.thick / 25.0;
  O.cm = -PI / 4.0 * (camv2 * PI * Math.cos(2 * alfa * RAD) + thkv2 * Math.sin(alfa * RAD));
  O.drag = O.cdi * q_psf * area * U.fconv;
  // Center of Pressure (x/c)
  O.cp_pos = (O.cl !== 0) ? 0.25 - O.cm / O.cl : 0.25;
  // Trim AoA: AoA where lift = weight (assume weight = current lift as reference)
  const clTrim = (O.q0 > 0 && area > 0) ? O.lift / (O.q0 * area * U.fconv) : 0;
  const camv2t = S.camber / 25.0;
  const thkv2t = S.thick  / 25.0;
  const yct = camv2t / 2.0;
  const rct = thkv2t / 4.0 + Math.sqrt(thkv2t * thkv2t / 16.0 + yct * yct + 1.0);
  const betat = Math.asin(Math.max(-1, Math.min(1, yct / rct))) * DEG;
  const legt = 1.0 - Math.sqrt(rct * rct - yct * yct);
  const tegt = 1.0 - legt + 2 * Math.sqrt(rct * rct - yct * yct);
  const chrt = (tegt + 1/tegt) - (legt + 1/legt);
  O.trimAoa = Math.asin(Math.max(-1, Math.min(1, clTrim * chrt / (4 * PI * rct)))) * DEG - betat;
  // Takeoff & Landing distance (simple energy method)
  const weight = 5000; // lbs default
  const muRoll = 0.02; // rolling friction
  
  // Neutral Point (x/c) — thin airfoil theory
  O.np_pos = 0.25 + O.cl / (2 * PI * (1 + 2 / Math.max(O.ar, 1)));
  // Static Margin
  O.sm = O.np_pos - O.cp_pos;
  // Stall speed
  const clMax = 1.5;
  const areaFt = area / (U.lconv * U.lconv);
  O.vs = Math.sqrt(2 * 5000 / (O.rho * clMax * areaFt)) * U.vconv;
  console.log('area:', area, 'rho:', O.rho, 'G0:', G0, 'vs:', Math.sqrt(2 * O.rho * G0 / (1.5 * area)));
  const vto    = 1.2 * O.vs / U.vconv;// ft/s takeoff speed
  const thrust = weight * 0.3;
  const avgAcc = (thrust - muRoll * weight) / (weight / G0);
  O.takeoffDist = (avgAcc > 0) ? (vto * vto) / (2 * avgAcc) * U.lconv : 0;
  const vapp   = 1.3 * O.vs / U.vconv;
  const decel  = G0 * (muRoll + 0.05);
  O.landingDist = (vapp * vapp) / (2 * decel) * U.lconv;
  // Optimal cruise AoA (max L/D search)
  let bestLD = 0, bestAoa = 0;
  for (let a = -10; a <= 20; a += 0.5) {
    const yc   = (S.camber / 25) / 2;
    const rc   = (S.thick / 25) / 4 + Math.sqrt((S.thick / 25) ** 2 / 16 + yc * yc + 1);
    const beta = Math.asin(Math.max(-1, Math.min(1, yc / rc))) * DEG;
    const leg  = 1 - Math.sqrt(rc * rc - yc * yc);
    const teg  = 1 - leg + 2 * Math.sqrt(rc * rc - yc * yc);
    const chrd = (teg + 1 / teg) - (leg + 1 / leg);
    const gam  = 2 * rc * Math.sin((a + beta) * RAD);
    let clA = gam * 4 * PI / chrd;
    if (S.stallModel && a > 10)  clA *= Math.max(0, 0.5 + 0.1 * a - 0.005 * a * a);
    if (S.stallModel && a < -10) clA *= Math.max(0, 0.5 - 0.1 * a - 0.005 * a * a);
    const cdiA = clA * clA / (PI * O.oswald * Math.max(ar, 1));
    const cdA  = (O.cd > 0 ? O.cd - O.cdi + cdiA : cdiA);
    const ldA  = cdA > 0 ? clA / cdA : 0;
    if (ldA > bestLD) { bestLD = ldA; bestAoa = a; }
  }
  O.optAoa = bestAoa;
  O.maxLD  = bestLD;
  // Winglet effect: increases effective AR
  if (S.winglet) {
    const wingletFactor = 1 + 1.9 * S.wingletH;
    const arEff = ar * wingletFactor;
    O.wingletCDi = cl * cl / (PI * O.oswald * arEff);
    const cdWinglet = O.cd - O.cdi + O.wingletCDi;
    O.wingletLD = cdWinglet > 0 ? cl / cdWinglet : 0;
  } else {
    // Transonic Area Rule (Whitcomb)
  const chordFt2 = S.chord / U.lconv;
  const spanFt2  = S.span  / U.lconv;
  const areaFt2  = area;
  // Cross-sectional area distribution (Sears-Haack ideal)
  const vol2     = 0.6 * (S.thick / 100) * chordFt2 * chordFt2 * spanFt2;
  const lBody    = chordFt2; // body length approximation
  // Wave drag (Sears-Haack minimum)
  const cdWave   = (O.mach >= 0.8) ? 128 * vol2 * vol2 / (PI * Math.pow(lBody, 4)) / areaFt2 : 0;
  // Area rule violation penalty (non-smooth cross-section)
  const sweepPenalty = Math.max(0, 1 - S.sweep / 45); // sweep reduces wave drag
  O.waveCD    = cdWave * sweepPenalty;
  O.areaRuleCD = O.cd + O.waveCD;
    // Sonic boom (supersonic only)
  if (O.mach > 1.0) {
    // Mach cone angle
    O.machAngle = Math.asin(1 / O.mach) * DEG;
    // Overpressure (Whitham theory approximation)
    const hft   = S.alt / U.lconv;
    const spanFt = S.span / U.lconv;
    const chordFt = S.chord / U.lconv;
    const vol   = 0.6 * (S.thick / 100) * chordFt * chordFt * spanFt; // ft³
    const r     = Math.max(hft, 100); // distance to ground
    const K     = 0.53; // empirical
    O.sonicBoom = K * O.q0 * vol / (r * r) * 144; // psf → psi approximation
    O.sonicBoom = Math.min(O.sonicBoom, 10);
    O.boomDist  = hft / Math.tan(O.machAngle * RAD) * U.lconv;
  } else {
    O.sonicBoom = 0;
    O.machAngle = 0;
    O.boomDist  = 0;
  }
  // Multi-engine model
  if (S.multiEngine) {
    const thrustPerEng = O.thrust > 0 ? O.thrust / U.fconv : O.currentWeight * 0.3 / S.engineCount;
    const activeEngines = S.engineOutIndex >= 0 ? S.engineCount - 1 : S.engineCount;
    O.totalThrust   = thrustPerEng * activeEngines * U.fconv;

    // Asymmetric thrust moment (engine out)
    if (S.engineOutIndex >= 0) {
      const spanFt3   = S.span / U.lconv;
      const engPos    = spanFt3 * 0.3; // engine at 30% semi-span
      O.asymThrust    = thrustPerEng * engPos; // ft·lbs yawing moment
      O.engineOutDrag = thrustPerEng * 0.05 * U.fconv; // windmilling drag
      // Vmca: minimum control speed with engine out
      O.vmca = Math.sqrt(2 * O.asymThrust / (O.rho * area * 0.2 * spanFt3)) * U.vconv;
    } else {
      O.asymThrust    = 0;
      O.engineOutDrag = 0;
      O.vmca          = 0;
    }
  } else {
    O.totalThrust   = O.thrust;
    O.asymThrust    = 0;
    O.vmca          = 0;
    O.engineOutDrag = 0;
  }
  // Fuel weight model
  if (S.fuelModel) {
    const fuelCapacity = S.grossWeight * 0.25; // 25% of gross weight is fuel
    O.fuelWeight    = fuelCapacity * S.fuelFraction;
    O.currentWeight = S.grossWeight - fuelCapacity + O.fuelWeight;
    // CL required to maintain level flight
    O.clRequired    = (O.currentWeight / U.fconv) / Math.max(O.q0 * area, 0.001);
    // Actual stall speed at current weight
    O.vsActual      = Math.sqrt(2 * O.currentWeight / (O.rho * 1.5 * area)) * U.vconv;
  } else {
    O.currentWeight = S.grossWeight;
    O.fuelWeight    = S.grossWeight * 0.25;
    O.clRequired    = 0;
    O.vsActual      = O.vs;
  }
  // Dynamic stability modes
  const vfsd2   = S.vel / U.vconv;
  const CLa     = 2 * PI; // lift curve slope per rad
  const g       = G0;

  // Phugoid mode (long period oscillation)
  O.phugoidT    = 2 * PI * vfsd2 / (g * Math.sqrt(2));
  O.phugoidDamp = 1 / (Math.sqrt(2) * Math.max(O.ld, 1));

  // Short period mode
  const iyy     = 0.3 * (S.span / U.lconv) * (S.chord / U.lconv) ** 2; // moment of inertia approx
  const Mq      = -0.5 * O.rho * vfsd2 * (S.chord / U.lconv) ** 2 * area * 0.3;
  const Ma      = -0.5 * O.rho * vfsd2 * vfsd2 * area * (S.chord / U.lconv) * 0.1;
  const wn_sp   = Math.sqrt(Math.abs(Ma / iyy));
  O.shortPeriodT = wn_sp > 0 ? 2 * PI / wn_sp : 0;

  // Dutch roll (lateral-directional)
  const Cnb     = 0.1 + S.sweep * 0.002; // yaw stiffness
  const Clb     = -(S.dihedral * 0.01 + S.sweep * 0.001); // roll due to sideslip
  const wn_dr   = Math.sqrt(Math.abs(Cnb * O.q0 * area * (S.span / U.lconv)));
  O.dutchRollT  = wn_dr > 0 ? 2 * PI / wn_dr : 0;
  // Turbulence model (Dryden gust model approximation)
  if (S.turbulence) {
    const sigma_w = S.turbIntensity * (S.vel / U.vconv); // gust velocity ft/s
    const gustAoa = Math.atan2(sigma_w, S.vel / U.vconv) * DEG;
    O.gust    = sigma_w * U.vconv;
    O.turbAoa = S.aoa + gustAoa;
    // Recalculate CL at turbulent AoA
    const yc  = (S.camber / 25) / 2;
    const rc  = (S.thick / 25) / 4 + Math.sqrt((S.thick / 25) ** 2 / 16 + yc * yc + 1);
    const beta = Math.asin(Math.max(-1, Math.min(1, yc / rc))) * DEG;
    const leg  = 1 - Math.sqrt(rc * rc - yc * yc);
    const teg  = 1 - leg + 2 * Math.sqrt(rc * rc - yc * yc);
    const chrd = (teg + 1 / teg) - (leg + 1 / leg);
    const gam  = 2 * rc * Math.sin((O.turbAoa + beta) * RAD);
    O.turbCL  = gam * 4 * PI / chrd;
    O.turbCD  = O.cd * (1 + 0.5 * S.turbIntensity);
  } else {
    O.turbCL  = O.cl;
    O.turbCD  = O.cd;
    O.turbAoa = S.aoa;
    O.gust    = 0;
  }
    // Propeller/Rotor thrust
  if (S.propeller) {
    const vfsd   = S.vel / U.vconv;        // ft/s
    const n      = S.propRPM / 60;         // rev/s
    const D      = S.propDiam / U.lconv;   // ft
    const rhoSL  = O.rho;
    // Thrust coefficient (Ct) — empirical
    const J      = vfsd / (n * D);         // advance ratio
    const Ct     = Math.max(0, 0.12 - 0.08 * J);
    O.thrust     = Ct * rhoSL * n * n * Math.pow(D, 4) * U.fconv;
    // Power coefficient
    const Cp     = Math.max(0.01, 0.07 - 0.04 * J);
    const power  = Cp * rhoSL * Math.pow(n, 3) * Math.pow(D, 5);
    O.propEff    = (O.thrust / U.fconv) * vfsd / Math.max(power, 1);
    O.propEff    = Math.min(0.95, Math.max(0, O.propEff));
    O.propTC     = Ct;
  } else {
    O.thrust  = 0;
    O.propEff = 0;
    O.propTC  = 0;
  }
    // Aeroelastic effect
  if (S.aeroelastic) {
    const spanFt  = S.span / U.lconv;
    const chordFt = S.chord / U.lconv;
    const halfSpan = spanFt / 2;
    const EI = S.EI;

    // Tip deflection (cantilever beam under elliptic load)
    const liftPerSpan = O.lift / U.fconv / spanFt; // lbs/ft
    O.tipDeflection = liftPerSpan * Math.pow(halfSpan, 4) / (8 * EI) * U.lconv;

    // Effective AoA change due to twist (washout from bending)
    const dAoa = -O.tipDeflection * DEG / halfSpan * 2;

    // Corrected CL
    const alfEff = S.aoa + dAoa;
    const yc   = (S.camber / 25) / 2;
    const rc   = (S.thick / 25) / 4 + Math.sqrt((S.thick / 25) ** 2 / 16 + yc * yc + 1);
    const beta = Math.asin(Math.max(-1, Math.min(1, yc / rc))) * DEG;
    const leg  = 1 - Math.sqrt(rc * rc - yc * yc);
    const teg  = 1 - leg + 2 * Math.sqrt(rc * rc - yc * yc);
    const chrd = (teg + 1 / teg) - (leg + 1 / leg);
    const gam  = 2 * rc * Math.sin((alfEff + beta) * RAD);
    O.aeCL = gam * 4 * PI / chrd;

    // Flutter speed (Theodorsen approximation)
    const mu = 20; // mass ratio (typical)
    O.flutterSpeed = 0.5 * Math.sqrt(EI / (O.rho * chordFt ** 3 * spanFt * mu)) * U.vconv;
  } else {
    O.tipDeflection = 0;
    O.flutterSpeed  = 0;
    O.aeCL          = O.cl;
  }
    // Vortex Lattice Method (simplified, N spanwise panels)
  if (S.vlm) {
    const N = 20; // spanwise panels
    const halfSpan = (S.span / U.lconv) / 2;
    const chordFt  = S.chord / U.lconv;
    const alfRad   = S.aoa * RAD;
    const gamma    = new Array(N).fill(0);
    const y        = [], dy = [];

    // Panel centroids (cosine spacing)
    for (let i = 0; i < N; i++) {
      const t1 = PI * i / N;
      const t2 = PI * (i + 1) / N;
      y.push(-halfSpan * Math.cos((t1 + t2) / 2));
      dy.push(halfSpan * (Math.cos(t1) - Math.cos(t2)));
    }

    // Chord at each panel
    const chords = y.map(yi => {
      const eta = Math.abs(yi) / halfSpan;
      return chordFt * chordAt(eta);
    });

    // Build AIC matrix (Lifting Line Theory simplified)
    const AIC = Array.from({length: N}, () => new Array(N).fill(0));
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        if (i === j) {
          AIC[i][j] = 2 / chords[i];
        } else {
          AIC[i][j] = -1 / (PI * (y[i] - y[j]));
        }
      }
    }

    // RHS: downwash = V * sin(alpha)
    const rhs = y.map((yi, i) => Math.sin(alfRad));

    // Solve via Gauss-Seidel
    const gam = new Array(N).fill(0);
    for (let iter = 0; iter < 100; iter++) {
      for (let i = 0; i < N; i++) {
        let sum = rhs[i];
        for (let j = 0; j < N; j++) {
          if (j !== i) sum -= AIC[i][j] * gam[j];
        }
        gam[i] = sum / AIC[i][i];
      }
    }

    // Integrate lift and induced drag
    const vfsd = S.vel / U.vconv;
    let liftVLM = 0, cdiVLM = 0;
    for (let i = 0; i < N; i++) {
      liftVLM += O.rho * vfsd * gam[i] * dy[i];
      // Induced angle
      let wi = 0;
      for (let j = 0; j < N; j++) {
        if (j !== i) wi -= gam[j] / (2 * PI * (y[i] - y[j]));
      }
      cdiVLM += O.rho * vfsd * gam[i] * wi * dy[i];
    }

    const areaFt = O.area / (U.lconv * U.lconv);
    O.vlmCL  = liftVLM / (O.q0 * areaFt);
    O.vlmCDi = Math.abs(cdiVLM) / (O.q0 * areaFt);
    O.vlmLD  = O.vlmCDi > 0.0001 ? O.vlmCL / O.vlmCDi : 0;

    // Span efficiency (Oswald)
    O.vlmSpanEff = O.vlmCL * O.vlmCL / (PI * O.ar * O.vlmCDi || 1);
    O.vlmSpanEff = Math.min(1.0, Math.abs(O.vlmSpanEff));
  } else {
    O.vlmCL = 0; O.vlmCDi = 0; O.vlmLD = 0; O.vlmSpanEff = 0;
  }
    // Ground effect
  if (S.groundEffect) {
    const hft   = S.alt / U.lconv;
    const bFt   = S.span / U.lconv;
    const hb    = Math.max(0.05, hft / bFt);  // height / span ratio
    const geK   = 1 - Math.exp(-4.4 * hb);    // ground effect factor (0=ground, 1=no effect)
    O.geRatio   = geK;
    O.geCDi     = O.cdi * geK;                // induced drag reduced near ground
    const cdGE  = O.cd - O.cdi + O.geCDi;
    O.geLD      = cdGE > 0 ? cl / cdGE : 0;
  } else {
    O.geRatio = 1.0;
    O.geCDi   = O.cdi;
    O.geLD    = O.ld;
  }
    // Flap & Slat effect
  if (S.flap || S.slat) {
    const flapDCL = S.flap ? 0.9 * Math.sin(S.flapAngle * RAD) : 0;
    const slatDCL = S.slat ? 0.3 : 0;
    const flapDCD = S.flap ? 0.02 * (S.flapAngle / 20) ** 2 : 0;
    O.flapCL = cl + flapDCL + slatDCL;
    O.flapCD = O.cd + flapDCD;
    O.flapLD = O.flapCD > 0 ? O.flapCL / O.flapCD : 0;
  } else {
    O.flapCL = cl;
    O.flapCD = O.cd;
    O.flapLD = O.ld;
  }
    // Icing effect
  if (S.icing) {
    const sev = S.icingSeverity;
    O.icingCL = cl * (1 - 0.3 * sev);           // CL drops up to 30%
    O.icingCD = O.cd * (1 + 1.5 * sev);          // CD increases up to 150%
    O.icingLD = O.icingCD > 0 ? O.icingCL / O.icingCD : 0;
  } else {
    O.icingCL = cl;
    O.icingCD = O.cd;
    O.icingLD = O.ld;
  }
  // Reynolds-based profile recommendation
  const re = O.re;
  if      (re < 100000)  O.recProfile = 'Flat Plate — very low Re';
  else if (re < 500000)  O.recProfile = 'NACA 0006 — thin, low Re';
  else if (re < 1000000) O.recProfile = 'NACA 2412 — light aircraft';
  else if (re < 5000000) O.recProfile = 'NACA 4412 — GA / trainer';
  else if (re < 20000000)O.recProfile = 'NACA 23012 — airliner';
  else                   O.recProfile = 'Supercritical — high Re';  
  // Buffet onset Mach (Korn equation approximation)
    const kappa = S.profile === 'naca' ? 0.87 : 0.95; // airfoil technology factor
    O.machBuffet = kappa - (S.thick / 100) - O.cl / 10;
    O.machBuffet = Math.max(0.5, Math.min(1.0, O.machBuffet));
    O.buffetMargin = O.machBuffet - O.mach;
    O.wingletCDi = O.cdi;
    O.wingletLD  = O.ld;
  }
  // Wind effect
  if (S.wind) {
    const windRad = S.windAngle * RAD;
    O.headwind   = S.windSpeed * Math.cos(windRad);
    O.crosswind  = S.windSpeed * Math.sin(windRad);
    O.groundSpeed = Math.sqrt(
      Math.pow(S.vel - O.headwind, 2) + Math.pow(O.crosswind, 2)
    );
  } else {
    O.headwind = 0; O.crosswind = 0;
    O.groundSpeed = S.vel;
  }

  // Breguet Range (jet): R = (V/g) * (L/D) * ln(W0/W1)
  // Endurance (jet): E = (1/g) * (L/D) * ln(W0/W1)
  // Assume fuel fraction W1/W0 = 0.85 (15% fuel burn)
  const fuelFrac = Math.log(1 / 0.85);
  const tsfc = 0.6 / 3600; // typical jet TSFC (1/s)
  O.range = (O.vtas / (tsfc * G0)) * (O.ld > 0 ? O.ld : 0) * fuelFrac * U.lconv / 5280;
  O.endurance = (1 / (tsfc * G0)) * (O.ld > 0 ? O.ld : 0) * fuelFrac / 3600;
}

// ─── NACA 4-DIGIT PROFILE POINTS ─────────────────────────────
function nacaPoints(m_pct, p_pct, t_pct, N) {
  const m = m_pct / 100;
  const p = p_pct / 100;
  const t = t_pct / 100;
  const upper = [], lower = [];

  for (let i = 0; i <= N; i++) {
    const beta = (i / N) * PI;
    const x    = 0.5 * (1 - Math.cos(beta));

    // Thickness
    const yt = (t / 0.2) * (0.2969 * Math.sqrt(x)
              - 0.1260 * x
              - 0.3516 * x * x
              + 0.2843 * x * x * x
              - 0.1015 * x * x * x * x);

    // Camber line
    let yc = 0, dyc = 0;
    if (m > 0 && p > 0) {
      if (x <= p) {
        yc  = (m / (p * p)) * (2 * p * x - x * x);
        dyc = (2 * m / (p * p)) * (p - x);
      } else {
        yc  = (m / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * x - x * x);
        dyc = (2 * m / ((1 - p) * (1 - p))) * (p - x);
      }
    }
    const theta = Math.atan(dyc);
    upper.push({ x: x - yt * Math.sin(theta), y: yc + yt * Math.cos(theta) });
    lower.push({ x: x + yt * Math.sin(theta), y: yc - yt * Math.cos(theta) });
  }
  return { upper, lower };
}

// Joukowski surface points for canvas preview
function joukowskiPoints(camv, thkv, N) {
  const ycval = camv / 2.0;
  const rval  = thkv / 4.0 + Math.sqrt(thkv * thkv / 16.0 + ycval * ycval + 1.0);
  const xcval = 1.0 - Math.sqrt(rval * rval - ycval * ycval);
  const pts   = [];
  for (let i = 0; i <= N; i++) {
    const theta = (i / N) * 2 * PI;
    const xg = rval * Math.cos(theta) + xcval;
    const yg = rval * Math.sin(theta) + ycval;
    const r  = Math.sqrt(xg * xg + yg * yg);
    const th = Math.atan2(yg, xg);
    const xm = (r + 1.0 / r) * Math.cos(th);
    const ym = (r - 1.0 / r) * Math.sin(th);
    pts.push({ x: xm, y: ym });
  }
  return pts;
}

// ─── DRAW FOIL CANVAS ─────────────────────────────────────────
function drawFoilCanvas() {
  const canvas = document.getElementById('foilCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(4,12,20,0.95)';
  ctx.fillRect(0, 0, W, H);

  // grid
  ctx.strokeStyle = 'rgba(22,51,72,0.6)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 8; i++) {
    const x = (W / 8) * i;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let i = 0; i <= 4; i++) {
    const y = (H / 4) * i;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  const padding = 10;
  const drawW = W - padding * 2;
  const drawH = H - padding * 2;

  const camv = S.camber / 25.0;
  const thkv = S.thick  / 25.0;

  let allX = [], allY = [];
  let drawFn;

  if (S.profile === 'naca' || S.profile === 'plate' || S.profile === 'ellipse') {
    const m_pct = Math.max(0, S.camber);
    const p_pct = (m_pct > 0) ? 40 : 0;
    const { upper, lower } = nacaPoints(m_pct, p_pct, S.thick, 60);
    allX = [...upper.map(p => p.x), ...lower.map(p => p.x)];
    allY = [...upper.map(p => p.y), ...lower.map(p => p.y)];
    const xMin = Math.min(...allX), xMax = Math.max(...allX);
    const yMin = Math.min(...allY), yMax = Math.max(...allY);
    const scl = Math.min(drawW / (xMax - xMin || 1), drawH / (yMax - yMin || 0.3));
    const cx  = padding + drawW / 2, cy = H / 2;

    ctx.beginPath();
    upper.forEach((p, i) => {
      const sx = cx + (p.x - (xMin + xMax) / 2) * scl;
      const sy = cy - p.y * scl;
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    });
    lower.slice().reverse().forEach(p => {
      const sx = cx + (p.x - (xMin + xMax) / 2) * scl;
      const sy = cy - p.y * scl;
      ctx.lineTo(sx, sy);
    });
    ctx.closePath();
    ctx.fillStyle   = 'rgba(27,78,124,0.7)';
    ctx.strokeStyle = '#00B8D4';
    ctx.lineWidth   = 1.2;
    ctx.fill(); ctx.stroke();

    // camber line
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#FF6B35'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const x = i / 60;
      const m_n = m_pct / 100, p_n = p_pct / 100;
      let yc = 0;
      if (m_n > 0 && p_n > 0) {
        yc = x <= p_n
          ? (m_n / (p_n * p_n)) * (2 * p_n * x - x * x)
          : (m_n / ((1 - p_n) * (1 - p_n))) * (1 - 2 * p_n + 2 * p_n * x - x * x);
      }
      const sx = cx + (x - 0.5) * scl;
      const sy = cy - yc * scl;
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.setLineDash([]);

  } else if (S.profile === 'joukowski') {
    const pts = joukowskiPoints(camv, thkv, 120);
    allX = pts.map(p => p.x); allY = pts.map(p => p.y);
    const xMin = Math.min(...allX), xMax = Math.max(...allX);
    const yMin = Math.min(...allY), yMax = Math.max(...allY);
    const scl  = Math.min(drawW / (xMax - xMin || 1), drawH / ((yMax - yMin) || 0.3));
    const cx   = padding + drawW / 2, cy = H / 2;

    ctx.beginPath();
    pts.forEach((p, i) => {
      const sx = cx + (p.x - (xMin + xMax) / 2) * scl;
      const sy = cy - p.y * scl;
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    });
    ctx.closePath();
    ctx.fillStyle   = 'rgba(27,78,124,0.7)';
    ctx.strokeStyle = '#00B8D4';
    ctx.lineWidth   = 1.2;
    ctx.fill(); ctx.stroke();

  } else if (S.profile === 'cylinder' || S.profile === 'ball') {
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, Math.min(W, H) * 0.35, 0, 2 * PI);
    ctx.fillStyle   = 'rgba(27,78,124,0.7)';
    ctx.strokeStyle = '#00B8D4';
    ctx.lineWidth   = 1.5;
    ctx.fill(); ctx.stroke();
  }

  // Label
  ctx.fillStyle = 'rgba(255,107,53,0.9)';
  ctx.font = '9px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  let label = '';
  if (S.profile === 'naca') {
    const m = Math.round(Math.max(0, S.camber) / 25.0 * 9);
    const p = (m > 0) ? 4 : 0;
    const t = Math.round(S.thick);
    label = `NACA ${m}${p}${String(t).padStart(2, '0')}`;
  } else if (S.profile === 'joukowski') {
    label = `JOUKOWSKI  C:${S.camber.toFixed(1)}%  T:${S.thick.toFixed(1)}%`;
  } else if (S.profile === 'ellipse') {
    label = `ELLIPSE  T:${S.thick.toFixed(1)}%`;
  } else if (S.profile === 'plate') {
    label = 'FLAT PLATE';
  } else if (S.profile === 'cylinder') {
    label = `CYLINDER  r:${S.radius.toFixed(2)} ft`;
  } else {
    label = `BALL  r:${S.radius.toFixed(2)} ft`;
  }
  ctx.fillText(label, W / 2, H - 3);
  document.getElementById('foil-designation').textContent = label;
}

function setPlotType(type, btn) {
  S.plotType = type;
  document.querySelectorAll('.ptab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  update(false);
}

function drawClPlot() {
  const canvas = document.getElementById('clplotCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(4,12,20,0.95)';
  ctx.fillRect(0, 0, W, H);

  const convdr = RAD;
  const camv = S.camber / 25.0;
  const thkv = S.thick  / 25.0;

  function getClAt(angl, camb, thk) {
    camb = (camb !== undefined) ? camb : camv;
    thk  = (thk  !== undefined) ? thk  : thkv;
    const yc0 = camv / 2.0;
  const rc0 = thkv/4.0 + Math.sqrt(thkv*thkv/16.0 + yc0*yc0 + 1.0);
  const xc0 = 1.0 - Math.sqrt(rc0*rc0 - yc0*yc0);
  const yc = (S.genp.manual && S.genp.yc !== null) ? S.genp.yc : yc0;
  const rc = (S.genp.manual && S.genp.rc !== null) ? S.genp.rc : rc0;
  const xc = (S.genp.manual && S.genp.xc !== null) ? S.genp.xc : xc0;
    const beta = Math.asin(Math.max(-1, Math.min(1, yc/rc))) / convdr;
    const gamc = 2.0 * rc * Math.sin((angl + beta) * convdr);
    const lec  = xc - Math.sqrt(rc*rc - yc*yc);
    const tec  = xc + Math.sqrt(rc*rc - yc*yc);
    const crdc = (tec + 1/tec) - (lec + 1/lec);
    let stfact = 1.0;
    if (S.stallModel) {
      if (angl > 10.0)  stfact = Math.max(0, 0.5 + 0.1*angl - 0.005*angl*angl);
      if (angl < -10.0) stfact = Math.max(0, 0.5 - 0.1*angl - 0.005*angl*angl);
    }
    let cl = stfact * gamc * 4.0 * PI / crdc;
    if (!S.kutta) return 0;
    if (S.arCorr && O.ar > 0) cl = cl / (1.0 + cl / (PI * O.ar));
    return cl;
  }

  function getCdAt(angl, camb, thk) {
    const camd = (camb !== undefined) ? camb * 25.0 : S.camber;
    const thkd = (thk  !== undefined) ? thk  * 25.0 : S.thick;
    const absCamd = Math.abs(camd);
    const cl = getClAt(angl, camb, thk);
    const savedAoa = S.aoa, savedCam = S.camber, savedThk = S.thick;
    S.aoa = angl; S.camber = camd; S.thick = thkd;
    const cd = getDrag(cl);
    S.aoa = savedAoa; S.camber = savedCam; S.thick = savedThk;
    return cd;
  }

  // Grafik alanı
  const pX = 34, pW = W-44, pTop = 18, pH = H-28;
  const toSX = (x, xMin, xMax) => pX + (x-xMin)/(xMax-xMin)*pW;
  const toSY = (y, yMin, yMax) => pTop + (1-(y-yMin)/(yMax-yMin))*pH;

  function drawGrid(xMin, xMax, yMin, yMax, xTiks, yTiks, xLabel, yLabel, xUnit, yUnit) {
    ctx.strokeStyle = 'rgba(22,51,72,0.7)'; ctx.lineWidth = 0.5;
    for (let i=0; i<=xTiks; i++) {
      const x = xMin + i/(xTiks)*(xMax-xMin);
      const sx = toSX(x, xMin, xMax);
      ctx.beginPath(); ctx.moveTo(sx, pTop); ctx.lineTo(sx, pTop+pH); ctx.stroke();
      ctx.fillStyle = '#3A6080'; ctx.font = '7px JetBrains Mono,monospace';
      ctx.textAlign = 'center';
      ctx.fillText(x % 1 === 0 ? x.toFixed(0) : x.toFixed(1), sx, pTop+pH+9);
    }
    for (let i=0; i<=yTiks; i++) {
      const y = yMin + i/(yTiks)*(yMax-yMin);
      const sy = toSY(y, yMin, yMax);
      ctx.beginPath(); ctx.moveTo(pX, sy); ctx.lineTo(pX+pW, sy); ctx.stroke();
      ctx.fillStyle = '#3A6080'; ctx.font = '7px JetBrains Mono,monospace';
      ctx.textAlign = 'right';
      ctx.fillText(y % 1 === 0 ? y.toFixed(0) : y.toFixed(2), pX-3, sy+3);
    }
    // Eksen çizgileri
    ctx.strokeStyle = 'rgba(90,139,170,0.5)'; ctx.lineWidth = 0.8;
    if (yMin < 0 && yMax > 0) {
      ctx.beginPath(); ctx.moveTo(pX, toSY(0,yMin,yMax)); ctx.lineTo(pX+pW, toSY(0,yMin,yMax)); ctx.stroke();
    }
    if (xMin < 0 && xMax > 0) {
      ctx.beginPath(); ctx.moveTo(toSX(0,xMin,xMax), pTop); ctx.lineTo(toSX(0,xMin,xMax), pTop+pH); ctx.stroke();
    }
    // Etiketler
    ctx.fillStyle = '#5A8BAA'; ctx.font = '7px JetBrains Mono,monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${xLabel} (${xUnit})`, pX+pW/2, pTop+pH+18);
    ctx.save(); ctx.translate(10, pTop+pH/2); ctx.rotate(-PI/2);
    ctx.fillText(`${yLabel} (${yUnit})`, 0, 0); ctx.restore();
  }

  function drawLine(pts, xMin, xMax, yMin, yMax, color, width) {
    ctx.beginPath();
    let first = true;
    for (const p of pts) {
      if (!isFinite(p.x) || !isFinite(p.y)) { first = true; continue; }
      const sx = toSX(p.x, xMin, xMax), sy = toSY(p.y, yMin, yMax);
      first ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      first = false;
    }
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  }

  function drawDot(x, y, xMin, xMax, yMin, yMax, color) {
    ctx.beginPath();
    ctx.arc(toSX(x,xMin,xMax), toSY(y,yMin,yMax), 4, 0, 2*PI);
    ctx.fillStyle = color; ctx.fill();
  }

  function drawTitle(txt) {
    ctx.fillStyle = '#5A8BAA'; ctx.font = '8px JetBrains Mono,monospace';
    ctx.textAlign = 'left';
    ctx.fillText(txt, pX, 11);
  }

  const t = S.plotType;

  // 0: Cp dağılımı (mevcut Cp canvas'tan taşı)
  if (t === 0) {
    const pts = computeCpDistribution();
    const upper = pts.filter(p => p.side === 'upper');
    const lower = pts.filter(p => p.side === 'lower');
    const allCp = pts.map(p => p.cp).filter(isFinite);
    const cpMin = Math.max(-4, Math.min(...allCp));
    const cpMax = Math.min(2, Math.max(...allCp));
    drawGrid(0, 1, cpMin, cpMax, 4, 4, 'x/c', 'Cp', '', '');
    drawLine(upper.map(p=>({x:p.xc,y:p.cp})), 0,1,cpMin,cpMax, '#00E5FF', 1.5);
    drawLine(lower.map(p=>({x:p.xc,y:p.cp})), 0,1,cpMin,cpMax, '#FF9800', 1.2);
    drawTitle(`Cp DIST  α=${S.aoa.toFixed(1)}°`);

  // 1: Yüzey hız dağılımı
  } else if (t === 1) {
    const { rval, xcval, ycval, gamval } = getCirculation();
    const yc = ycval||0; const alfrad = S.aoa*RAD;
    const upper=[], lower=[];
    for (let i=1; i<=90; i++) {
      const theta = i/90*PI;
      const xg = rval*Math.cos(theta)+xcval, yg = rval*Math.sin(theta)+yc;
      const r2 = Math.sqrt(xg*xg+yg*yg), th = Math.atan2(yg,xg);
      const xm = (r2+1/r2)*Math.cos(th), ym = (r2-1/r2)*Math.sin(th);
      const ur  = 0;
      const uth = -Math.sin(theta-alfrad)*2 - gamval/rval;
      const jake1=1-Math.cos(2*th)/(r2*r2), jake2=Math.sin(2*th)/(r2*r2);
      const jsq = Math.max(0.01,jake1*jake1+jake2*jake2);
      const vel = Math.sqrt((ur*ur+uth*uth)/jsq);
      const { rval:rv, xcval:xc2 } = getCirculation();
      const leg = xc2 - Math.sqrt(rv*rv-(yc||0)*(yc||0));
      const teg = xc2 + Math.sqrt(rv*rv-(yc||0)*(yc||0));
      const lem = leg+1/leg, tem = teg+1/teg, chrd = tem-lem;
      const xc_norm = (xm-lem)/chrd;
      upper.push({x: xc_norm, y: vel});
    }
    for (let i=1; i<=90; i++) {
      const theta = -i/90*PI;
      const xg = rval*Math.cos(theta)+xcval, yg = rval*Math.sin(theta)+yc;
      const r2 = Math.sqrt(xg*xg+yg*yg), th = Math.atan2(yg,xg);
      const xm = (r2+1/r2)*Math.cos(th);
      const ur  = 0;
      const uth = -Math.sin(theta-alfrad)*2 - gamval/rval;
      const jake1=1-Math.cos(2*th)/(r2*r2), jake2=Math.sin(2*th)/(r2*r2);
      const jsq = Math.max(0.01,jake1*jake1+jake2*jake2);
      const vel = Math.sqrt((ur*ur+uth*uth)/jsq);
      const { rval:rv, xcval:xc2 } = getCirculation();
      const leg = xc2 - Math.sqrt(rv*rv-(yc||0)*(yc||0));
      const teg = xc2 + Math.sqrt(rv*rv-(yc||0)*(yc||0));
      const lem = leg+1/leg, tem = teg+1/teg, chrd = tem-lem;
      const xc_norm = (xm-lem)/chrd;
      lower.push({x: xc_norm, y: vel});
    }
    const allV = [...upper,...lower].map(p=>p.y).filter(v => isFinite(v) && v > 0);
    const allX = [...upper,...lower].map(p=>p.x).filter(isFinite);
    const xMin2 = Math.min(...allX), xMax2 = Math.max(...allX);
    const vMin=0, vMax=allV.length ? Math.max(...allV)*1.15 : 3;
    drawGrid(xMin2,xMax2,vMin,vMax,4,4,'x/c','Vel','',(S.units==='metric'?'km/h':'mph'));
    drawLine(upper, xMin2,xMax2,vMin,vMax,'#00E5FF',1.5);
    drawLine(lower, xMin2,xMax2,vMin,vMax,'#FF9800',1.2);
    ctx.setLineDash([4,3]);
    drawLine([{x:xMin2,y:O.vtas*U.vconv},{x:xMax2,y:O.vtas*U.vconv}],xMin2,xMax2,vMin,vMax,'rgba(90,139,170,0.5)',0.8);
    ctx.setLineDash([]);
    drawTitle(`VEL DIST  α=${S.aoa.toFixed(1)}°`);

  // 2: CL vs Alpha
  } else if (t === 2) {
    const pts=[];
    for (let a=-20; a<=20; a+=0.5) pts.push({x:a, y:getClAt(a)});
    const yMin=-2.5, yMax=2.5;
    ctx.fillStyle='rgba(255,59,92,0.08)';
    ctx.fillRect(toSX(10,-20,20),pTop,toSX(20,-20,20)-toSX(10,-20,20),pH);
    ctx.fillRect(toSX(-20,-20,20),pTop,toSX(-10,-20,20)-toSX(-20,-20,20),pH);
    drawGrid(-20,20,yMin,yMax,4,4,'Alpha','CL','deg','');
    drawLine(pts,-20,20,yMin,yMax,'#00E5A0',1.5);
    drawDot(S.aoa, getClAt(S.aoa),-20,20,yMin,yMax,'#FF6B35');
    drawTitle(`CL vs α  |  CL=${getClAt(S.aoa).toFixed(3)}`);

  // 3: CD vs Alpha
  } else if (t === 3) {
    const pts=[];
    for (let a=-20; a<=20; a+=0.5) pts.push({x:a, y:getCdAt(a)});
    const allY=pts.map(p=>p.y).filter(isFinite);
    const yMin=0, yMax=allY.length ? Math.min(Math.max(...allY)*1.1, 1.0) : 0.5;
    drawGrid(-20,20,yMin,yMax,4,4,'Alpha','CD','deg','');
    drawLine(pts,-20,20,yMin,yMax,'#FF9800',1.5);
    drawDot(S.aoa, getCdAt(S.aoa),-20,20,yMin,yMax,'#FF6B35');
    drawTitle(`CD vs α  |  CD=${getCdAt(S.aoa).toFixed(4)}`);

  // 4: CL vs Thickness
  } else if (t === 4) {
    const pts=[];
    for (let thk=1; thk<=25; thk+=0.5) pts.push({x:thk, y:getClAt(S.aoa, camv, thk/25)});
    const allY=pts.map(p=>p.y).filter(isFinite);
    const yMin=Math.min(...allY)*0.9, yMax=Math.max(...allY)*1.1;
    drawGrid(1,25,yMin,yMax,4,4,'Thickness','CL','% chord','');
    drawLine(pts,1,25,yMin,yMax,'#00E5A0',1.5);
    drawDot(S.thick, getClAt(S.aoa),1,25,yMin,yMax,'#FF6B35');
    drawTitle(`CL vs Thickness  |  thk=${S.thick.toFixed(1)}%`);

  // 5: CD vs Thickness
  } else if (t === 5) {
    const pts=[];
    for (let thk=1; thk<=25; thk+=0.5) pts.push({x:thk, y:getCdAt(S.aoa, camv, thk/25)});
    const allY=pts.map(p=>p.y).filter(isFinite);
    const yMin=0, yMax=Math.min(Math.max(...allY)*1.1, 1.0);
    drawGrid(1,25,yMin,yMax,4,4,'Thickness','CD','% chord','');
    drawLine(pts,1,25,yMin,yMax,'#FF9800',1.5);
    drawDot(S.thick, getCdAt(S.aoa),1,25,yMin,yMax,'#FF6B35');
    drawTitle(`CD vs Thickness  |  thk=${S.thick.toFixed(1)}%`);

  // 6: CL vs Camber
  } else if (t === 6) {
    const pts=[];
    for (let cam=-25; cam<=25; cam+=1) pts.push({x:cam, y:getClAt(S.aoa, cam/25, thkv)});
    const allY=pts.map(p=>p.y).filter(isFinite);
    const yMin=Math.min(...allY)*0.9, yMax=Math.max(...allY)*1.1;
    drawGrid(-25,25,yMin,yMax,4,4,'Camber','CL','% chord','');
    drawLine(pts,-25,25,yMin,yMax,'#00E5A0',1.5);
    drawDot(S.camber, getClAt(S.aoa),-25,25,yMin,yMax,'#FF6B35');
    drawTitle(`CL vs Camber  |  cam=${S.camber.toFixed(1)}%`);

  // 7: CD vs Camber
  } else if (t === 7) {
    const pts=[];
    for (let cam=-25; cam<=25; cam+=1) pts.push({x:cam, y:getCdAt(S.aoa, cam/25, thkv)});
    const allY=pts.map(p=>p.y).filter(isFinite);
    const yMin=0, yMax=allY.length ? Math.min(Math.max(...allY)*1.1, 1.0) : 0.5;
    drawGrid(-25,25,yMin,yMax,4,4,'Camber','CD','% chord','');
    drawLine(pts,-25,25,yMin,yMax,'#FF9800',1.5);
    drawDot(S.camber, getCdAt(S.aoa),-25,25,yMin,yMax,'#FF6B35');
    drawTitle(`CD vs Camber  |  cam=${S.camber.toFixed(1)}%`);

  // 8: Lift vs Speed
  } else if (t === 8) {
    const vMax = S.units==='metric' ? 400 : 250;
    const pts=[];
    for (let v=0; v<=vMax; v+=vMax/40) {
      const q = 0.5 * O.rho * Math.pow(v / U.vconv / 3600 * 5280, 2);
      pts.push({x:v, y: O.cl * q * O.area * U.fconv});
    }
    const allY=pts.map(p=>p.y).filter(isFinite);
    const yMin=0, yMax=Math.max(...allY)*1.1;
    drawGrid(0,vMax,yMin,yMax,4,4,'Speed','Lift',(S.units==='metric'?'km/h':'mph'),(S.units==='metric'?'N':'lbs'));
    drawLine(pts,0,vMax,yMin,yMax,'#00E5A0',1.5);
    const curV = O.vtas * U.vconv;
    drawDot(curV, O.lift, 0,vMax,yMin,yMax,'#FF6B35');
    drawTitle(`Lift vs Speed`);

  // 9: Drag vs Speed
  } else if (t === 9) {
    const vMax = S.units==='metric' ? 400 : 250;
    const pts=[];
    for (let v=0; v<=vMax; v+=vMax/40) {
      const q = 0.5 * O.rho * Math.pow(v / U.vconv / 3600 * 5280, 2);
      pts.push({x:v, y: O.cd * q * O.area * U.fconv});
    }
    const allY=pts.map(p=>p.y).filter(isFinite);
    const yMin=0, yMax=Math.max(...allY)*1.1;
    drawGrid(0,vMax,yMin,yMax,4,4,'Speed','Drag',(S.units==='metric'?'km/h':'mph'),(S.units==='metric'?'N':'lbs'));
    drawLine(pts,0,vMax,yMin,yMax,'#FF9800',1.5);
    const curV = O.vtas * U.vconv;
    drawDot(curV, O.drag, 0,vMax,yMin,yMax,'#FF6B35');
    drawTitle(`Drag vs Speed`);

  // 10: Lift vs Altitude
  } else if (t === 10) {
    const altMax = S.units==='metric' ? 15000 : 50000;
    const pts=[];
    for (let h=0; h<=altMax; h+=altMax/40) {
      const hft = h / U.lconv;
      let rho;
      if (hft < 36152) { const T=518.6-3.56*hft/1000; rho=(2116*Math.pow(T/518.6,5.256))/(T*53.3*32.17); }
      else { rho=(2116*0.236*Math.exp((36000-hft)/(53.35*389.98)))/(389.98*53.3*32.17); }
      const q = 0.5*rho*O.vtas*O.vtas;
      pts.push({x:h/1000, y: O.cl*q*O.area*U.fconv});
    }
    const allY=pts.map(p=>p.y).filter(isFinite);
    const yMin=0, yMax=Math.max(...allY)*1.1;
    const xUnit = S.units==='metric'?'km':'k-ft';
    drawGrid(0,altMax/1000,yMin,yMax,4,4,'Altitude','Lift',xUnit,(S.units==='metric'?'N':'lbs'));
    drawLine(pts,0,altMax/1000,yMin,yMax,'#00E5A0',1.5);
    drawDot(S.alt/1000, O.lift, 0,altMax/1000,yMin,yMax,'#FF6B35');
    drawTitle(`Lift vs Altitude`);

  // 11: Drag vs Altitude
  } else if (t === 11) {
    const altMax = S.units==='metric' ? 15000 : 50000;
    const pts=[];
    for (let h=0; h<=altMax; h+=altMax/40) {
      const hft = h / U.lconv;
      let rho;
      if (hft < 36152) { const T=518.6-3.56*hft/1000; rho=(2116*Math.pow(T/518.6,5.256))/(T*53.3*32.17); }
      else { rho=(2116*0.236*Math.exp((36000-hft)/(53.35*389.98)))/(389.98*53.3*32.17); }
      const q = 0.5*rho*O.vtas*O.vtas;
      pts.push({x:h/1000, y: O.cd*q*O.area*U.fconv});
    }
    const allY=pts.map(p=>p.y).filter(isFinite);
    const yMin=0, yMax=Math.max(...allY)*1.1;
    const xUnit = S.units==='metric'?'km':'k-ft';
    drawGrid(0,altMax/1000,yMin,yMax,4,4,'Altitude','Drag',xUnit,(S.units==='metric'?'N':'lbs'));
    drawLine(pts,0,altMax/1000,yMin,yMax,'#FF9800',1.5);
    drawDot(S.alt/1000, O.drag, 0,altMax/1000,yMin,yMax,'#FF6B35');
    drawTitle(`Drag vs Altitude`);

  // 12: Drag Polar (CL vs CD)
  } else if (t === 13) {
    // Lift vs Wing Area
    const areaMax = S.units === 'metric' ? 200 : 2000;
    const pts = [];
    for (let a = 10; a <= areaMax; a += areaMax / 40) {
      const aFt = a / (U.lconv * U.lconv);
      pts.push({ x: a, y: O.cl * O.q0 * aFt * U.fconv });
    }
    const allY = pts.map(p => p.y).filter(isFinite);
    const yMin = 0, yMax = Math.max(...allY) * 1.1;
    const xUnit = S.units === 'metric' ? 'm²' : 'ft²';
    const fUnit = S.units === 'metric' ? 'N' : 'lbs';
    drawGrid(10, areaMax, yMin, yMax, 4, 4, 'Wing Area', 'Lift', xUnit, fUnit);
    drawLine(pts, 10, areaMax, yMin, yMax, '#00E5A0', 1.5);
    drawDot(O.area, O.lift, 10, areaMax, yMin, yMax, '#FF6B35');
    drawTitle('Lift vs Wing Area');

  } else if (t === 16) {
    // Bending Moment Diagram
    const halfSpan = S.span / 2;
    const spanFt   = S.span / U.lconv;
    const chordFt  = S.chord / U.lconv;
    const pts_shear = [], pts_moment = [];

    for (let i = 0; i <= 40; i++) {
      const eta  = i / 40;
      const y    = eta * halfSpan;
      // Lift per unit span (elliptic approximation)
      const cRatio = S.wingType === 'elliptical'
        ? Math.sqrt(Math.max(0, 1 - eta * eta))
        : 1 - (1 - S.taper) * eta;
      const lPerSpan = O.cl * O.q0 * chordFt * cRatio * U.fconv;
      // Shear: integrate from tip to y
      let shear = 0;
      for (let j = i; j <= 40; j++) {
        const e2 = j / 40;
        const cr2 = S.wingType === 'elliptical'
          ? Math.sqrt(Math.max(0, 1 - e2 * e2))
          : 1 - (1 - S.taper) * e2;
        shear += O.cl * O.q0 * chordFt * cr2 * U.fconv * (halfSpan / 40);
      }
      // Moment: integrate shear
      let moment = 0;
      for (let j = i; j <= 40; j++) {
        const e2 = j / 40;
        const y2 = e2 * halfSpan;
        const cr2 = S.wingType === 'elliptical'
          ? Math.sqrt(Math.max(0, 1 - e2 * e2))
          : 1 - (1 - S.taper) * e2;
        moment += O.cl * O.q0 * chordFt * cr2 * U.fconv * (y2 - y) * (halfSpan / 40);
      }
      pts_shear.push({ x: y, y: shear });
      pts_moment.push({ x: y, y: moment });
    }

    const allShear  = pts_shear.map(p => p.y).filter(isFinite);
    const allMoment = pts_moment.map(p => p.y).filter(isFinite);
    const yMaxS = Math.max(...allShear)  * 1.1;
    const yMaxM = Math.max(...allMoment) * 1.1;
    const fUnit = S.units === 'metric' ? 'N' : 'lbs';
    const lUnit = S.units === 'metric' ? 'm' : 'ft';

    drawGrid(0, halfSpan, 0, yMaxS, 4, 4, 'Span', 'Shear', lUnit, fUnit);
    drawLine(pts_shear,  0, halfSpan, 0, yMaxS,  '#00E5FF', 1.5);
    drawLine(pts_moment.map(p => ({ x: p.x, y: p.y / (yMaxM || 1) * yMaxS })),
             0, halfSpan, 0, yMaxS, '#FF9800', 1.2);
    drawTitle('Bending Moment & Shear  — Blue:Shear  Orange:Moment');

  } else if (t === 15) {
    // Spanwise Lift Distribution
    const pts_elliptic = [], pts_actual = [];
    const halfSpan = S.span / 2;
    for (let i = 0; i <= 40; i++) {
      const eta = i / 40;
      const y = -halfSpan + eta * S.span;
      // Elliptic distribution
      const cl_e = O.cl * Math.sqrt(1 - (2 * y / S.span) ** 2);
      // Actual (tapered)
      const cRatio = S.wingType === 'elliptical'
        ? Math.sqrt(Math.max(0, 1 - eta * eta))
        : 1 - (1 - S.taper) * Math.abs(2 * y / S.span);
      const cl_a = O.cl * cRatio * 1.2;
      pts_elliptic.push({ x: y, y: cl_e });
      pts_actual.push({ x: y, y: cl_a });
    }
    const yMin = 0, yMax = Math.max(O.cl * 1.5, 0.1);
    const xUnit = S.units === 'metric' ? 'm' : 'ft';
    drawGrid(-halfSpan, halfSpan, yMin, yMax, 4, 4, 'Span', 'CL', xUnit, '');
    drawLine(pts_elliptic, -halfSpan, halfSpan, yMin, yMax, '#00B8D4', 1.2);
    drawLine(pts_actual,   -halfSpan, halfSpan, yMin, yMax, '#00E5A0', 1.5);
    drawDot(0, O.cl, -halfSpan, halfSpan, yMin, yMax, '#FF6B35');
    drawTitle('Spanwise Lift Distribution  — Elliptic vs Actual');

  } else if (t === 14) {
    // Lift vs Density
    const rhoMax = S.units === 'metric' ? 1.5 : 0.003;
    const rhoMin = 0.0001;
    const pts = [];
    for (let r = rhoMin; r <= rhoMax; r += (rhoMax - rhoMin) / 40) {
      const q = 0.5 * r * O.vtas * O.vtas;
      const aFt = O.area / (U.lconv * U.lconv);
      pts.push({ x: r, y: O.cl * q * aFt * U.fconv });
    }
    const allY = pts.map(p => p.y).filter(isFinite);
    const yMin = 0, yMax = Math.max(...allY) * 1.1;
    const xUnit = S.units === 'metric' ? 'kg/m³' : 'slug/ft³';
    const fUnit = S.units === 'metric' ? 'N' : 'lbs';
    drawGrid(rhoMin, rhoMax, yMin, yMax, 4, 4, 'Density', 'Lift', xUnit, fUnit);
    drawLine(pts, rhoMin, rhoMax, yMin, yMax, '#00E5A0', 1.5);
    drawDot(O.rho, O.lift, rhoMin, rhoMax, yMin, yMax, '#FF6B35');
    drawTitle('Lift vs Density');

  } else if (t === 18) {
    // Range Map: Range vs Altitude vs Speed (contour-style)
    const altMax  = S.units === 'imperial' ? 40000 : 12000;
    const velMax  = S.units === 'imperial' ? 600 : 1000;
    const altStep = altMax / 20;
    const velStep = velMax / 20;
    const pts = [];
    let rMax = 0;

    for (let ai = 0; ai <= 20; ai++) {
      const alt = ai * altStep;
      // ISA rho at altitude
      const hft = alt / U.lconv;
      const ts  = hft <= 36152 ? 518.6 - 3.56 * hft / 1000 : 389.98;
      const rho = 0.0765 * Math.pow(ts / 518.6, 4.256);
      for (let vi = 0; vi <= 20; vi++) {
        const vel = 10 + vi * velStep;
        const vft = vel / U.vconv;
        const q   = 0.5 * rho * vft * vft;
        const ld  = O.ld > 0 ? O.ld : 1;
        const fuelFrac = Math.log(1 / 0.85);
        const tsfc = 0.6 / 3600;
        const range = (vft / (tsfc * G0)) * ld * fuelFrac / 6076;
        if (range > rMax) rMax = range;
        pts.push({ x: vel, y: alt, r: range });
      }
    }

    // Draw as colored dots
    pts.forEach(p => {
      const px = pX + ((p.x - 10) / (velMax - 10)) * pW;
      const py = pTop + pH - ((p.y) / altMax) * pH;
      const t  = Math.min(1, p.r / (rMax || 1));
      ctx.fillStyle = `rgb(${Math.round(255*(1-t))},${Math.round(200*t)},${Math.round(255*t)})`;
      ctx.fillRect(px, py, pW/20+1, pH/20+1);
    });

    drawGrid(10, velMax, 0, altMax, 4, 4, 'Speed', 'Altitude',
      S.units === 'imperial' ? 'mph' : 'km/h',
      S.units === 'imperial' ? 'ft'  : 'm');
    drawTitle('Range Map — Green=Long Range  Red=Short Range');
  } else if (t === 17) {
    // Multi CL-Alpha comparison
    const yMin = -2.5, yMax = 2.5;
    drawGrid(-20, 20, yMin, yMax, 4, 4, 'Alpha', 'CL', 'deg', '');
    S.polarSnaps.forEach(snap => {
      drawLine(snap.pts, -20, 20, yMin, yMax, snap.color, 1.5);
      ctx.fillStyle = snap.color;
      ctx.font = '7px JetBrains Mono,monospace';
      ctx.textAlign = 'left';
      ctx.fillText(snap.label, pX + 4, pTop + 10 + S.polarSnaps.indexOf(snap) * 10);
    });
    drawTitle(`CL-Alpha Comparison  (${S.polarSnaps.length} curves)`);

  } else if (t === 12) {
    const pts=[];
    for (let a=-20; a<=20; a+=0.5) {
      const cl=getClAt(a), cd=getCdAt(a);
      pts.push({x:cd*100, y:cl*100});
    }
    const allX=pts.map(p=>p.x).filter(isFinite);
    const allY=pts.map(p=>p.y).filter(isFinite);
    const xMin=0, xMax=allX.length ? Math.max(...allX)*1.1 : 10;
    const yMin=allY.length ? Math.min(...allY)*1.1 : -250;
    const yMax=allY.length ? Math.max(...allY)*1.1 : 250;
    drawGrid(xMin,xMax,yMin,yMax,4,4,'CD','CL','x100','x100');
    drawLine(pts,xMin,xMax,yMin,yMax,'#00B8D4',1.5);
    drawDot(getCdAt(S.aoa)*100, getClAt(S.aoa)*100, xMin,xMax,yMin,yMax,'#FF6B35');
    drawTitle(`DRAG POLAR  |  CL/CD=${(getClAt(S.aoa)/Math.max(0.0001,getCdAt(S.aoa))).toFixed(1)}`);
  }
}
function drawFlowField() {
  const canvas = document.getElementById('flowCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#020A10';
  ctx.fillRect(0, 0, W, H);

  const { rval, xcval, ycval, gamval } = getCirculation();
  const yc  = ycval || 0;
  const alfa = S.aoa;
  const convdr = RAD;  // degrees to radians

  // getPoints — finds streamline point given fxg (x) and psv (stream function)
  function getPoints(fxg, psv) {
    let ynew = 10.0, yold = 10.0;
    if (psv < 0.0) ynew = -10.0;
    if (Math.abs(psv) < 0.001 && alfa < 0.0)  ynew =  rval;
    if (Math.abs(psv) < 0.001 && alfa >= 0.0) ynew = -rval;
    let fnew = 0.1, iter = 1;
    while (Math.abs(fnew) >= 0.00001 && iter < 25) {
      iter++;
      let rfac = fxg*fxg + ynew*ynew;
      if (rfac < rval*rval) rfac = rval*rval + 0.01;
      fnew = psv - ynew*(1.0 - rval*rval/rfac) - gamval*Math.log(Math.sqrt(rfac)/rval);
      const deriv = -(1.0 - rval*rval/rfac) - 2.0*ynew*ynew*rval*rval/(rfac*rfac) - gamval*ynew/rfac;
      yold = ynew;
      ynew = yold - 0.5*fnew/deriv;
    }
    const lyg = yold;
    let lrg  = Math.sqrt(fxg*fxg + lyg*lyg);
    let lthg = Math.atan2(lyg, fxg) / convdr;
    // Rotate for AoA
    let lxgt = lrg * Math.cos(convdr*(lthg + alfa));
    let lygt = lrg * Math.sin(convdr*(lthg + alfa));
    // Translate to airfoil
    lxgt += xcval; lygt += yc;
    const lrgt  = Math.sqrt(lxgt*lxgt + lygt*lygt);
    const lthgt = Math.atan2(lygt, lxgt) / convdr;
    // Joukowski mapping
    const lxm = (lrgt + 1.0/lrgt) * Math.cos(convdr*lthgt);
    const lym = (lrgt - 1.0/lrgt) * Math.sin(convdr*lthgt);
    // Remove AoA rotation for display
    const radm  = Math.sqrt(lxm*lxm + lym*lym);
    const thetm = Math.atan2(lym, lxm) / convdr;
    const lxmt = radm * Math.cos(convdr*(thetm - alfa));
    const lymt = radm * Math.sin(convdr*(thetm - alfa));
    return { xm: lxmt, ym: lymt, rg: lrg, thg: lthg };
  }

  // getVel — pressure coefficient at (rad, theta)
  function getVel(rad, theta) {
    const thrad  = convdr * theta;
    const alfrad = convdr * alfa;
    const ur  = Math.cos(thrad - alfrad) * (1.0 - rval*rval/(rad*rad));
    const uth = -Math.sin(thrad - alfrad) * (1.0 + rval*rval/(rad*rad)) - gamval/rad;
    const usq = ur*ur + uth*uth;
    // Translate to airfoil
    const xloc = rad*Math.cos(thrad) + xcval;
    const yloc = rad*Math.sin(thrad) + yc;
    const rad2   = Math.sqrt(xloc*xloc + yloc*yloc);
    const thrad2 = Math.atan2(yloc, xloc);
    const jake1  = 1.0 - Math.cos(2.0*thrad2)/(rad2*rad2);
    const jake2  = Math.sin(2.0*thrad2)/(rad2*rad2);
    const jakesq = Math.max(0.01, jake1*jake1 + jake2*jake2);
    const vsq = usq / jakesq;
    return 1.0 - vsq;  // Cp
  }

  // Görüntü alanı (mapped plane, AoA kaldırılmış)
  const xMin = -2.5, xMax = 2.5, yMin = -1.6, yMax = 1.6;
  const toSX = x => (x - xMin) / (xMax - xMin) * W;
  const toSY = y => (1 - (y - yMin) / (yMax - yMin)) * H;

  // Streamlines — Joukowski potential flow
  const NLNC = 22, NPTC = 60;
  const xflow = -2.5, deltb = (xMax - xflow) / NPTC;

  // Önce tüm streamline'ları hesapla, Cp ile renklendir
  for (let k = 1; k <= NLNC; k++) {
    const psv = -0.5*(NLNC-1)*0.22 + 0.22*(k-1);
    const pts = [];
    let fxg = xflow;
    for (let idx = 1; idx <= NPTC; idx++) {
      const p = getPoints(fxg, psv);
      pts.push({ xm: p.xm, ym: p.ym, cp: getVel(p.rg, p.thg) });
      fxg += deltb;
    }

    // Çiz — Cp'ye göre renk
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i];
      if (!isFinite(p.xm) || !isFinite(p.ym)) continue;
      const sx1 = toSX(p.xm), sy1 = toSY(p.ym);
      const sx2 = toSX(pts[i+1].xm), sy2 = toSY(pts[i+1].ym);
      // Ekran dışı atla
      if (sx1 < 0 || sx1 > W || sy1 < 0 || sy1 > H) continue;
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      // Cp rengi: negatif=mavi(hızlı), pozitif=kırmızı(yavaş)
      const cp = p.cp;
      const t  = Math.max(0, Math.min(1, (cp + 2) / 4));
      const r  = Math.round(t > 0.5 ? (t-0.5)*2*255 : 0);
      const g  = Math.round(100 + t*80);
      const b  = Math.round(t < 0.5 ? (0.5-t)*2*255 : 0);
      ctx.strokeStyle = `rgb(${r},${g},${b})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  // Profil tipine göre şekil çiz
  if (S.profile === 'plate') {
    ctx.beginPath();
    ctx.moveTo(toSX(-1), toSY(0));
    ctx.lineTo(toSX(1), toSY(0));
    ctx.strokeStyle = '#00B8D4'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#5A8BAA'; ctx.font = '8px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`FLOW FIELD  α=${S.aoa.toFixed(1)}°  Γ=${O.gamma.toFixed(3)}`, 6, 12);
    return;
  }
  if (S.profile === 'cylinder' || S.profile === 'ball') {
    ctx.beginPath();
    const cr = toSX(xcval + rval) - toSX(xcval);
    ctx.arc(toSX(xcval), toSY(yc), cr, 0, 2*PI);
    ctx.fillStyle = 'rgba(4,12,20,0.95)'; ctx.fill();
    ctx.strokeStyle = '#00B8D4'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#5A8BAA'; ctx.font = '8px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`FLOW FIELD  α=${S.aoa.toFixed(1)}°  Γ=${O.gamma.toFixed(3)}`, 6, 12);
    return;
  }
  // Airfoil profili çiz (mapped plane)
  ctx.beginPath();
  for (let i = 0; i <= 120; i++) {
    const theta = i / 120 * 2 * PI;
    const xg = rval*Math.cos(theta) + xcval;
    const yg = rval*Math.sin(theta) + yc;
    const r2 = Math.sqrt(xg*xg + yg*yg);
    const th = Math.atan2(yg, xg);
    const xmap = (r2 + 1/r2)*Math.cos(th);
    const ymap = (r2 - 1/r2)*Math.sin(th);
    // AoA kaldır
    const radm  = Math.sqrt(xmap*xmap + ymap*ymap);
    const thetm = Math.atan2(ymap, xmap) / convdr;
    const xd = radm*Math.cos(convdr*(thetm - alfa));
    const yd = radm*Math.sin(convdr*(thetm - alfa));
    i === 0 ? ctx.moveTo(toSX(xd), toSY(yd)) : ctx.lineTo(toSX(xd), toSY(yd));
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(4,12,20,0.95)';
  ctx.fill();
  ctx.strokeStyle = '#00B8D4';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Etiket
  ctx.fillStyle = '#5A8BAA';
  ctx.font = '8px JetBrains Mono, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`FLOW FIELD  α=${S.aoa.toFixed(1)}°  Γ=${O.gamma.toFixed(3)}`, 6, 12);
}
// ─── DRAW CP CANVAS ───────────────────────────────────────────
function drawCpCanvas() {
  const canvas = document.getElementById('cpCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(4,12,20,0.95)';
  ctx.fillRect(0, 0, W, H);

  const cpData = computeCpDistribution();
  if (cpData.length === 0) {
    ctx.fillStyle = '#5A8BAA';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Cp — N/A for Cylinder/Ball', W / 2, H / 2);
    return;
  }

  // Cp range — sabit eksen: -3 to +1.5 (aerodnamik konvansiyona uygun, üst negatif)
  const cpMin = -3.0, cpMax = 1.5;
  const plotX = 28, plotW = W - 36, plotTop = 14, plotH = H - 24;

  const toSX = (xn) => plotX + xn * plotW;
  const toSY = (cp) => plotTop + (1 - (cp - cpMin) / (cpMax - cpMin)) * plotH;

  // Grid yatay çizgiler
  ctx.strokeStyle = 'rgba(22,51,72,0.6)'; ctx.lineWidth = 0.5;
  [-3, -2, -1, 0, 1].forEach(v => {
    const y = toSY(v);
    ctx.beginPath(); ctx.moveTo(plotX, y); ctx.lineTo(plotX + plotW, y); ctx.stroke();
  });
  // Grid dikey
  [0, 0.25, 0.5, 0.75, 1].forEach(v => {
    const x = toSX(v);
    ctx.beginPath(); ctx.moveTo(x, plotTop); ctx.lineTo(x, plotTop + plotH); ctx.stroke();
  });

  // Cp=0 çizgisi (belirgin)
  const y0 = toSY(0);
  ctx.strokeStyle = 'rgba(90,139,170,0.7)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(plotX, y0); ctx.lineTo(plotX + plotW, y0); ctx.stroke();

  // Cp=1 stagnasyon çizgisi
  ctx.strokeStyle = 'rgba(255,184,48,0.35)'; ctx.lineWidth = 0.8;
  ctx.setLineDash([4, 3]);
  const y1 = toSY(1);
  ctx.beginPath(); ctx.moveTo(plotX, y1); ctx.lineTo(plotX + plotW, y1); ctx.stroke();
  ctx.setLineDash([]);

  // Üst yüzey — sıralı ve pürüzsüz
  const upper = cpData.filter(d => d.upper).sort((a, b) => a.xNorm - b.xNorm);
  const lower = cpData.filter(d => !d.upper).sort((a, b) => a.xNorm - b.xNorm);

  // Alt yüzey doldur (aralarındaki alan)
  ctx.beginPath();
  upper.forEach((d, i) => {
    const sx = toSX(d.xNorm), sy = toSY(d.cp);
    i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
  });
  [...lower].reverse().forEach(d => ctx.lineTo(toSX(d.xNorm), toSY(d.cp)));
  ctx.closePath();
  ctx.fillStyle = 'rgba(0, 180, 212, 0.06)';
  ctx.fill();

  // Üst yüzey çizgisi
  ctx.beginPath();
  upper.forEach((d, i) => {
    const sx = toSX(d.xNorm), sy = toSY(d.cp);
    i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
  });
  ctx.strokeStyle = '#00D4FF'; ctx.lineWidth = 1.5; ctx.stroke();

  // Alt yüzey çizgisi
  ctx.beginPath();
  lower.forEach((d, i) => {
    const sx = toSX(d.xNorm), sy = toSY(d.cp);
    i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
  });
  ctx.strokeStyle = '#FF6B35'; ctx.lineWidth = 1.2; ctx.stroke();

  // Eksen etiketleri
  ctx.fillStyle = '#3A6080'; ctx.font = '7px JetBrains Mono, monospace'; ctx.textAlign = 'right';
  [-3, -2, -1, 0, 1].forEach(v => ctx.fillText(v, plotX - 2, toSY(v) + 3));
  ctx.textAlign = 'center'; ctx.fillStyle = '#3A6080';
  [0, 0.5, 1].forEach(v => ctx.fillText(v.toFixed(1), toSX(v), plotTop + plotH + 9));

  // Legend
  ctx.font = '7px JetBrains Mono, monospace'; ctx.textAlign = 'left';
  ctx.fillStyle = '#00D4FF'; ctx.fillText('— Upper', plotX + 2, plotTop + 8);
  ctx.fillStyle = '#FF6B35'; ctx.fillText('— Lower', plotX + 55, plotTop + 8);
  ctx.fillStyle = '#3A6080'; ctx.textAlign = 'right';
  ctx.fillText('x/c →', plotX + plotW, plotTop + plotH + 9);
}

// ─── THREE.JS SETUP ───────────────────────────────────────────
let scene, camera, renderer, wingGroup;
let camTheta = 0.6, camPhi = 1.1, camRadius = 18;
let camTarget = new THREE.Vector3(0, 0, 0);
let isDragging = false, isRightDragging = false;
let lastMouse = { x: 0, y: 0 };
const SNAP_VIEWS = {
  iso:   { theta: 0.6,  phi: 1.1, r: 18 },
  top:   { theta: 0.0,  phi: 0.01, r: 18 },
  front: { theta: 0.0,  phi: PI / 2, r: 18 },
  side:  { theta: PI / 2, phi: PI / 2, r: 18 },
};

function initThree() {
  const canvas = document.getElementById('c3d');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020A10, 0.015);

  // Camera
  camera = new THREE.PerspectiveCamera(44, canvas.clientWidth / canvas.clientHeight, 0.1, 200);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 1.8));
  const dir1 = new THREE.DirectionalLight(0xffffff, 1.5);
  dir1.position.set(5, 8, 4);
  dir1.castShadow = true;
  scene.add(dir1);
  const dir2 = new THREE.DirectionalLight(0xaaddff, 1.0);
  dir2.position.set(-4, -2, -3);
  scene.add(dir2);
  const hemi = new THREE.HemisphereLight(0x6688aa, 0x223344, 1.2);
  scene.add(hemi);

  // Grid
  const grid = new THREE.GridHelper(40, 40, 0x163348, 0x0D2235);
  grid.position.y = -4;
  // Shadow plane
  const shadowGeo = new THREE.PlaneGeometry(60, 60);
  const shadowMat = new THREE.ShadowMaterial({ opacity: 0.3 });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.rotation.x = -PI / 2;
  shadowPlane.position.y = -4;
  shadowPlane.receiveShadow = true;
  shadowPlane.name = 'shadowPlane';
  scene.add(shadowPlane);
  grid.name = 'grid';
  scene.add(grid);

  // Wing group
  wingGroup = new THREE.Group();
  scene.add(wingGroup);

  // Mouse events
  setupMouseControls(canvas);

  // Resize observer
  const ro = new ResizeObserver(() => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
  ro.observe(canvas);

  animate();
}

function setupMouseControls(canvas) {
  canvas.addEventListener('mousedown', e => {
    if (e.button === 0) isDragging = true;
    if (e.button === 2) isRightDragging = true;
    lastMouse = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('mouseup', () => { isDragging = false; isRightDragging = false; });
  window.addEventListener('mousemove', e => {
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    if (isDragging) {
      camTheta -= dx * 0.008;
      camPhi    = Math.max(0.05, Math.min(PI - 0.05, camPhi + dy * 0.008));
    }
    if (isRightDragging) {
      const right = new THREE.Vector3(
        Math.cos(camTheta), 0, -Math.sin(camTheta));
      const up = new THREE.Vector3(0, 1, 0);
      camTarget.addScaledVector(right, -dx * 0.02);
      camTarget.addScaledVector(up,     dy * 0.02);
    }
    lastMouse = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('wheel', e => {
    camRadius = Math.max(3, Math.min(60, camRadius + e.deltaY * 0.02));
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  // Probe — flow field canvas tıklama
  document.getElementById('flowCanvas').addEventListener('click', function(e) {
    if (!S.disp.flow || !S.disp.probe) return;
    const rect = this.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const W = this.width, H = this.height;
    const xMin = -2.5, xMax = 2.5, yMin = -1.6, yMax = 1.6;
    const xm = xMin + (mx / W) * (xMax - xMin);
    const ym = yMax - (my / H) * (yMax - yMin);
    const { rval, xcval, ycval, gamval } = getCirculation();
    const yc = ycval || 0;
    const convdr = RAD;

    // getPoints ile circle plane koordinatları bul
    const psv = xm * 0; // yaklaşık stream function
    let xg = xm * 0.6, yg = ym * 0.6;
    for (let it = 0; it < 30; it++) {
      const r2 = xg*xg + yg*yg;
      if (r2 < 0.001) break;
      xg -= (xg + xg/r2 - xm) * 0.45;
      yg -= (yg - yg/r2 - ym) * 0.45;
    }
    const xloc = xg - xcval, yloc = yg - yc;
    const rc = Math.sqrt(xloc*xloc + yloc*yloc);
    if (rc < rval) {
      document.getElementById('probe-text').textContent = 'Inside airfoil';
      return;
    }
    const thrad = Math.atan2(yloc, xloc);
    const theta = thrad / convdr;
    const alfrad = S.aoa * convdr;
    const ur  = Math.cos(thrad - alfrad) * (1.0 - rval*rval/(rc*rc));
    const uth = -Math.sin(thrad - alfrad) * (1.0 + rval*rval/(rc*rc)) - gamval/rc;
    const usq = ur*ur + uth*uth;
    const xloc2 = xg, yloc2 = yg;
    const rad2  = Math.sqrt(xloc2*xloc2 + yloc2*yloc2);
    const th2   = Math.atan2(yloc2, xloc2);
    const j1 = 1.0 - Math.cos(2*th2)/(rad2*rad2);
    const j2 = Math.sin(2*th2)/(rad2*rad2);
    const vsq = usq / Math.max(0.01, j1*j1 + j2*j2);
    const cp  = 1.0 - vsq;
    const vel = Math.sqrt(vsq);
    document.getElementById('probe-text').innerHTML =
      `x/c: ${xm.toFixed(3)}  y/c: ${ym.toFixed(3)}<br>` +
      `V/V∞: ${vel.toFixed(3)}<br>` +
      `Cp: ${cp.toFixed(3)}<br>` +
      `r/R: ${(rc/rval).toFixed(3)}`;
  });

  // Touch
  let lastTouch;
  canvas.addEventListener('touchstart', e => {
    lastTouch = e.touches[0];
    isDragging = true;
  });
  canvas.addEventListener('touchmove', e => {
    const dx = e.touches[0].clientX - lastTouch.clientX;
    const dy = e.touches[0].clientY - lastTouch.clientY;
    camTheta -= dx * 0.008;
    camPhi    = Math.max(0.05, Math.min(PI - 0.05, camPhi + dy * 0.008));
    lastTouch = e.touches[0];
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchend', () => { isDragging = false; });
}

// ─── WING MESH GENERATION ────────────────────────────────────
function chordAt(eta) {
  // eta: 0 (root) → 1 (tip)
  const type = S.wingType;
  if (type === 'elliptical') {
    return Math.sqrt(Math.max(0, 1 - eta * eta));
  } else if (type === 'delta') {
    return 1.0 - eta;
  } else {
    return 1.0 - (1.0 - S.taper) * eta;
  }
}

function sweepOffset(eta, halfSpanFt) {
  const type = S.wingType;
  const sweepRad = S.sweep * RAD;
  if (type === 'delta') {
    return eta * halfSpanFt * Math.tan(Math.atan2(1, 1));
  }
  return eta * halfSpanFt * Math.tan(sweepRad);
}

function buildWing() {
  if (!wingGroup) return;
  // Remove old wing
  while (wingGroup.children.length) wingGroup.remove(wingGroup.children[0]);

  if (S.profile === 'cylinder' || S.profile === 'ball') {
    buildCylinderMesh();
    return;
  }

  const spanFt   = S.span   / U.lconv;
  const chordFt  = S.chord  / U.lconv;
  const halfSpan = spanFt   / 2.0;
  const dihedRad = S.dihedral * RAD;
  const washRad  = S.washout  * RAD;
  const NSPAN    = 30;   // spanwise stations
  const NCHORD   = 20;   // chordwise points per side

  const camv = S.camber / 25.0;
  const thkv = S.thick  / 25.0;

  // Build one half-wing (positive z side)
  function buildHalf(sign) {
    const posArr = [];

    for (let si = 0; si <= NSPAN; si++) {
      const eta    = si / NSPAN;
      const z      = sign * eta * halfSpan;
      const cRatio = chordAt(eta);
      const c      = chordFt * cRatio;
      const xOff   = sweepOffset(eta, halfSpan);
      const yOff   = sign * eta * halfSpan * Math.tan(dihedRad);

      // Washout rotation angle at this station
      const washLocal = -sign * eta * washRad;

      // Generate surface points (upper + lower) at this station
      for (let ci = 0; ci <= NCHORD * 2; ci++) {
        const theta = (ci / (NCHORD * 2)) * 2 * PI;

        // Joukowski silindir noktası — getCirculation ile aynı formül
        const ycval = camv / 2.0;
        const rval  = thkv / 4.0 + Math.sqrt(thkv * thkv / 16.0 + ycval * ycval + 1.0);
        const xcval = 1.0 - Math.sqrt(rval * rval - ycval * ycval);

        const xg = rval * Math.cos(theta) + xcval;
        const yg = rval * Math.sin(theta) + ycval;
        const r  = Math.sqrt(xg * xg + yg * yg);
        const th = Math.atan2(yg, xg);

        const xm = (r > 0.001) ? (r + 1.0 / r) * Math.cos(th) : 0;
        const ym = (r > 0.001) ? (r - 1.0 / r) * Math.sin(th) : 0;

        // Chord sınırları (lem → tem)
        const leg  = xcval - Math.sqrt(rval * rval - ycval * ycval);
        const teg  = xcval + Math.sqrt(rval * rval - ycval * ycval);
        const lem  = leg + 1.0 / leg;
        const tem  = teg + 1.0 / teg;
        const chrd = tem - lem;

        // 0-1 normalize
        let xu = (xm - lem) / chrd;
        let yu = ym / chrd;

        // Washout (quarter-chord etrafında döndür)
        const qcx = 0.25;
        const dxu = xu - qcx;
        const xw  = qcx + dxu * Math.cos(washLocal) - yu * Math.sin(washLocal);
        const yw  = dxu * Math.sin(washLocal)        + yu * Math.cos(washLocal);

        posArr.push(xOff + xw * c, yOff + yw * c, z);
      }
    }

    // Build quad geometry
    const N = NCHORD * 2 + 1;  // profile points per station
    const verts = [];
    const indices = [];

    for (let i = 0; i < posArr.length / 3; i++) {
      verts.push(posArr[i * 3], posArr[i * 3 + 1], posArr[i * 3 + 2]);
    }

    for (let si = 0; si < NSPAN; si++) {
      for (let ci = 0; ci < N - 1; ci++) {
        const a = si * N + ci;
        const b = si * N + ci + 1;
        const c = (si + 1) * N + ci + 1;
        const d = (si + 1) * N + ci;
        indices.push(a, d, b, b, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    // Cp vertex colors
    if (S.disp.cp && cpColors.length > 0) {
    const colors = [];
    for (let i = 0; i < verts.length / 3; i++) {
      const xu = (verts[i * 3] / (chordFt || 1));
      const cp = cpColors.find(p => Math.abs(p.xNorm - xu) < 0.05);
      const cpVal = cp ? cp.cp : 0;
      const t = Math.max(0, Math.min(1, (cpVal + 2) / 4));
      colors.push(t, 1 - Math.abs(t - 0.5) * 2, 1 - t);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }
  return geo;
  }

  // Materials
  const cpColors = computeCpDistribution();
  const matSolid = new THREE.MeshPhongMaterial({
    color: S.disp.cp ? 0xffffff : 0x1B4E7C,
    specular: 0x336699, shininess: 40,
    side: THREE.DoubleSide, transparent: true, opacity: 0.92,
    vertexColors: S.disp.cp,
  });
  const matWire = new THREE.MeshBasicMaterial({
    color: 0x0099BB, wireframe: true, transparent: true, opacity: 0.18,
  });

  // Build both halves
  [-1, 1].forEach(sign => {
    const geo = buildHalf(sign);
    const mesh = new THREE.Mesh(geo, matSolid);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    wingGroup.add(mesh);

    if (S.disp.wire) {
      const wm = new THREE.Mesh(geo, matWire);
      wingGroup.add(wm);
    }
  });

  // Root cross-section
  addRootSection();

  // Rib lines
  if (S.disp.ribs) addRibLines();
  // Stall zone
  if (S.stallModel && Math.abs(S.aoa) > 10) addStallZone();

  // Leading / trailing edge highlights
  addEdgeLines();

  // Lift & Drag vectors
  if (O.lift > 0) addForceVectors();
  // Fuselage stub
  const cylGeo  = new THREE.CylinderGeometry(0.35, 0.35, S.span / U.lconv * 0.12, 12);
  const cylMat  = new THREE.MeshPhongMaterial({ color: 0x0D2A40, specular: 0x224455 });
  const fuselage = new THREE.Mesh(cylGeo, cylMat);
  fuselage.rotation.z = PI / 2;
  wingGroup.add(fuselage);

  // Center wing plane at chord mid
  wingGroup.position.set(-S.chord / U.lconv / 2, 0, 0);
}

function addRootSection() {
  const chordFt = S.chord / U.lconv;
  const camv    = S.camber / 25.0;
  const thkv    = S.thick  / 25.0;
  const N = 40;
  const pts = [];

  for (let i = 0; i <= N; i++) {
    const theta = (i / N) * 2 * PI;
    const r  = thkv / 4.0 + Math.sqrt(thkv * thkv / 16 + camv * camv / 4 + 1);
    const xg = r * Math.cos(theta) + (1 - Math.sqrt(r * r - camv * camv / 4));
    const yg = r * Math.sin(theta) + camv / 2;
    const rr = Math.sqrt(xg * xg + yg * yg);
    const th = Math.atan2(yg, xg);
    const xm = (rr + 1 / rr) * Math.cos(th);
    const ym = (rr - 1 / rr) * Math.sin(th);
    pts.push(new THREE.Vector3((xm + 2) / 4 * chordFt, ym / 4 * chordFt, 0));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x00D4FF, opacity: 0.6, transparent: true }));
  wingGroup.add(line);
}

function addRibLines() {
  const N_RIBS = 7;
  const spanFt  = S.span  / U.lconv;
  const chordFt = S.chord / U.lconv;
  const halfSpan = spanFt / 2;
  const camv = S.camber / 25.0;
  const thkv = S.thick  / 25.0;
  const dihedRad = S.dihedral * RAD;

  for (let ri = 1; ri <= N_RIBS; ri++) {
    const eta   = ri / (N_RIBS + 1);
    [1, -1].forEach(sign => {
      const z     = sign * eta * halfSpan;
      const c     = chordFt * chordAt(eta);
      const xOff  = sweepOffset(eta, halfSpan);
      const yOff  = sign * eta * halfSpan * Math.tan(dihedRad);
      const pts   = [];
      const NPTS  = 36;

      for (let i = 0; i <= NPTS; i++) {
        const theta = (i / NPTS) * 2 * PI;
        const r  = thkv / 4.0 + Math.sqrt(thkv * thkv / 16 + camv * camv / 4 + 1);
        const xg = r * Math.cos(theta) + (1 - Math.sqrt(r * r - camv * camv / 4));
        const yg = r * Math.sin(theta) + camv / 2;
        const rr = Math.sqrt(xg * xg + yg * yg);
        const th = Math.atan2(yg, xg);
        const xm = (rr + 1 / rr) * Math.cos(th);
        const ym = (rr - 1 / rr) * Math.sin(th);
        pts.push(new THREE.Vector3(xOff + (xm + 2) / 4 * c, yOff + ym / 4 * c, z));
      }
      const geo  = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x00D4FF, opacity: 0.45, transparent: true }));
      wingGroup.add(line);
    });
  }
}

function addForceVectors() {
  const spanFt  = S.span  / U.lconv;
  const chordFt = S.chord / U.lconv;
  const scale   = spanFt * 0.012;

  // Lift vector (upward)
  const liftLen = Math.min(O.cl * scale * 3, spanFt * 0.4);
  const liftDir = new THREE.ArrowHelper(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(chordFt * 0.25, 0, 0),
    liftLen, 0x00E5A0, liftLen * 0.2, liftLen * 0.1
  );
  wingGroup.add(liftDir);

  // Drag vector (backward)
  const dragLen = Math.min(O.cd * scale * 30, spanFt * 0.2);
  const dragDir = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(chordFt * 0.25, 0, 0),
    dragLen, 0xFF6B35, dragLen * 0.3, dragLen * 0.15
  );
  wingGroup.add(dragDir);
}
function addStallZone() {
  const spanFt   = S.span  / U.lconv;
  const chordFt  = S.chord / U.lconv;
  const halfSpan = spanFt  / 2;
  const dihedRad = S.dihedral * RAD;
  const stallPct = Math.min(1, (Math.abs(S.aoa) - 10) / 10);
  const stallSpan = halfSpan * stallPct;

  [1, -1].forEach(sign => {
    const pts = [];
    const steps = 20;
    for (let si = 0; si <= steps; si++) {
      const eta   = (si / steps) * (stallSpan / halfSpan);
      const z     = sign * eta * halfSpan;
      const c     = chordFt * chordAt(eta);
      const xOff  = sweepOffset(eta, halfSpan);
      const yOff  = sign * eta * halfSpan * Math.tan(dihedRad);
      pts.push(new THREE.Vector3(xOff + c * 0.1, yOff + 0.05, z));
    }
    const geo  = new THREE.BufferGeometry().setFromPoints(pts);
    const mat  = new THREE.LineBasicMaterial({ color: 0xFF1744, linewidth: 3 });
    wingGroup.add(new THREE.Line(geo, mat));
  });
}
function addEdgeLines() {
  const spanFt   = S.span  / U.lconv;
  const chordFt  = S.chord / U.lconv;
  const halfSpan = spanFt  / 2;
  const dihedRad = S.dihedral * RAD;
  const NSTEPS   = 40;

  [1, -1].forEach(sign => {
    const lePts = [], tePts = [], qcPts = [];
    for (let si = (sign === 1 ? 0 : 1); si <= NSTEPS; si++) {
      const eta  = si / NSTEPS;
      const c    = chordFt * chordAt(eta);
      const xOff = sweepOffset(eta, halfSpan);
      const z    = sign * eta * halfSpan;
      const yOff = sign * eta * halfSpan * Math.tan(dihedRad);
      lePts.push(new THREE.Vector3(xOff,          yOff, z));
      tePts.push(new THREE.Vector3(xOff + c,      yOff, z));
      qcPts.push(new THREE.Vector3(xOff + 0.25*c, yOff, z));
    }
    wingGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(lePts), new THREE.LineBasicMaterial({ color: 0xFF6B35 })));
    wingGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(tePts), new THREE.LineBasicMaterial({ color: 0x00E5A0 })));
    wingGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(qcPts), new THREE.LineBasicMaterial({ color: 0xFFB830, transparent: true, opacity: 0.55 })));
  });
}

function buildCylinderMesh() {
  const r  = S.radius / U.lconv;
  const len = S.span  / U.lconv;
  const geo = new THREE.CylinderGeometry(r, r, len, 32, 1, false);
  geo.rotateZ(PI / 2);
  const mat = new THREE.MeshPhongMaterial({ color: 0x1B4E7C, specular: 0x336699, shininess: 60 });
  wingGroup.add(new THREE.Mesh(geo, mat));
  if (S.disp.wire) {
    const wmat = new THREE.MeshBasicMaterial({ color: 0x0099BB, wireframe: true, opacity: 0.2, transparent: true });
    wingGroup.add(new THREE.Mesh(geo, wmat));
  }
}

// ─── ANIMATION LOOP ───────────────────────────────────────────
let animFrame;
function animate() {
  animFrame = requestAnimationFrame(animate);

  if (S.disp.rot) camTheta += 0.004;

  // Grid toggle
  const gridObj = scene.getObjectByName('grid');
  if (gridObj) gridObj.visible = S.disp.grid;

  // Camera
  camera.position.set(
    camTarget.x + camRadius * Math.sin(camPhi) * Math.cos(camTheta),
    camTarget.y + camRadius * Math.cos(camPhi),
    camTarget.z + camRadius * Math.sin(camPhi) * Math.sin(camTheta),
  );
  camera.lookAt(camTarget);
  renderer.render(scene, camera);
}

// ─── UI UPDATE FUNCTIONS ──────────────────────────────────────
function updFoil(key, val) {
  S[key] = val;
  document.getElementById(`vb-${key}`).value = val.toFixed(1);
  update();
}
function updFoilTxt(key, val) {
  const sl = document.getElementById(`sl-${key}`);
  const mn = +sl.min, mx = +sl.max;
  val = Math.max(mn, Math.min(mx, val));
  S[key] = val;
  document.getElementById(`vb-${key}`).value = val.toFixed(1);
  sl.value = String(((val - mn) / (mx - mn)) * 1000);
  update();
}
function updCyl(key, val) {
  S[key] = val;
  document.getElementById(`vb-${key}`).value = key === 'spin' ? val.toFixed(0) : val.toFixed(2);
  update();
}
function updCylTxt(key, val) {
  S[key] = val;
  document.getElementById(`vb-${key}`).value = val;
  update();
}
function updWing(key, norm) {
  // norm 0-1 from slider
  const RANGES = {
    span:     [1,  80],
    chord:    [0.5, 20],
    taper:    [0, 1],
    sweep:    [0, 70],
    dihedral: [-10, 15],
    washout:  [-5, 5],
  };
  const [mn, mx] = RANGES[key];
  S[key] = mn + norm * (mx - mn);
  document.getElementById(`vb-${key}`).value = S[key].toFixed(key === 'taper' ? 2 : 1);
  if (S.wingType !== 'custom') setWingType('custom', document.querySelector('.wbtn.active') || document.createElement('button'));
  update();
}
function updWingTxt(key, val) {
  S[key] = val;
  document.getElementById(`vb-${key}`).value = val;
  update();
}
function updFlight(key, norm) {
  const RANGES = {
    vel:   [0, U.vmax],
    alt:   [0, U.altmax],
    aoa:   [-20, 20],
    spin2: [-1500, 1500],
  };
  if (!RANGES[key]) return;
  const [mn, mx] = RANGES[key];
  let val = mn + norm * (mx - mn);

  if (key === 'vel')   { S.vel   = val; document.getElementById('fv-vel').textContent  = val.toFixed(0); }
  if (key === 'alt')   { S.alt   = val; document.getElementById('fv-alt').textContent  = val.toFixed(0); }
  if (key === 'aoa')   { S.aoa   = val; document.getElementById('fv-aoa').textContent  = val.toFixed(1); }
  if (key === 'spin2') { S.spin  = val; document.getElementById('fv-spin2').textContent = val.toFixed(0); }
  update(false);  // don't rebuild 3D on flight changes
}

function setBallType(type, btn) {
  S.ballType = type;
  document.querySelectorAll('#sec-ball-type .tog').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  update(false);
}
function setProfile(type, btn) {
  S.profile = type;
  document.querySelectorAll('.pbtn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const isCylBall = (type === 'cylinder' || type === 'ball');
  document.getElementById('sec-airfoil').style.display   = isCylBall ? 'none' : '';
  document.getElementById('sec-cylinder').style.display  = isCylBall ? '' : 'none';
  document.getElementById('sec-ball-type').style.display = type === 'ball' ? '' : 'none';
  document.getElementById('sec-genp').style.display = (type === 'joukowski' || type === 'naca' || type === 'ellipse') ? '' : 'none';
  document.getElementById('sec-planform').style.display  = isCylBall ? 'none' : '';
  document.getElementById('sec-winggeom').style.display  = '';
  document.getElementById('fbar-spin-item').style.display = isCylBall ? '' : 'none';
  update();
}

function setWingType(type, btn) {
  S.wingType = type;
  document.querySelectorAll('.wbtn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const PRESETS = {
    rectangular: { taper: 1.0, sweep: 0.0,  dihedral: 3.0,  washout: 0.0 },
    tapered:     { taper: 0.4, sweep: 5.0,  dihedral: 5.0,  washout: 2.0 },
    swept:       { taper: 0.5, sweep: 35.0, dihedral: 5.0,  washout: 3.0 },
    delta:       { taper: 0.0, sweep: 55.0, dihedral: 0.0,  washout: 0.0 },
    elliptical:  { taper: 0.0, sweep: 0.0,  dihedral: 4.0,  washout: 3.0 },
  };
  if (PRESETS[type]) {
    Object.assign(S, PRESETS[type]);
    syncSliders();
  }
  update();
}

function togDisp(key, el) {
  S.disp[key] = !S.disp[key];
  el.classList.toggle('active', S.disp[key]);
  document.getElementById('cp-overlay').style.display   = S.disp.cp   ? '' : 'none';
  document.getElementById('foil-overlay').style.display = S.disp.foil ? '' : 'none';
  document.getElementById('flow-overlay').style.display = S.disp.flow ? '' : 'none';
  document.getElementById('clplot-overlay').style.display = S.disp.clplot ? '' : 'none';
  document.getElementById('probe-overlay').style.display = S.disp.probe ? '' : 'none';
  document.getElementById('liftmeter-overlay').style.display = S.disp.liftmeter ? '' : 'none';
  if (S.disp.particles && !particleAnim) startParticles();
  if (!S.disp.particles && particleAnim) stopParticles();
  update();
}

function togARcor(el) {
  S.arCorr = !S.arCorr;
  el.textContent = S.arCorr ? 'ON' : 'OFF';
  el.classList.toggle('active', S.arCorr);
  update(false);
}

function togStallModel(el) {
  S.stallModel = !S.stallModel;
  el.textContent = S.stallModel ? 'ON' : 'OFF';
  el.classList.toggle('active', S.stallModel);
  update(false);
}

function togPG(el) {
  S.pgCorr = !S.pgCorr;
  el.textContent = S.pgCorr ? 'ON' : 'OFF';
  el.classList.toggle('active', S.pgCorr);
  update(false);
}

// ─── NACA DATABASE ────────────────────────────────────────────
const NACA_DB = {
  '0012':  { camber: 0,  thick: 12, label: 'NACA 0012 — Symmetric' },
  '2412':  { camber: 4,  thick: 12, label: 'NACA 2412 — General Aviation' },
  '4412':  { camber: 8,  thick: 12, label: 'NACA 4412 — High Lift' },
  '6412':  { camber: 12, thick: 12, label: 'NACA 6412 — Aggressive Camber' },
  '0006':  { camber: 0,  thick: 6,  label: 'NACA 0006 — Thin Symmetric' },
  '2415':  { camber: 4,  thick: 15, label: 'NACA 2415 — Trainer' },
  '4415':  { camber: 8,  thick: 15, label: 'NACA 4415 — STOL' },
  '23012': { camber: 6,  thick: 12, label: 'NACA 23012 — Airliner' },
};

function importProfile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const lines = e.target.result.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    const upper = [], lower = [];
    let valid = 0;

    lines.forEach(line => {
      const parts = line.split(/[\s,]+/);
      if (parts.length >= 2) {
        const x = parseFloat(parts[0]);
        const y = parseFloat(parts[1]);
        if (!isNaN(x) && !isNaN(y) && x >= 0 && x <= 1) {
          if (y >= 0) upper.push({ x, y });
          else lower.push({ x, y: Math.abs(y) });
          valid++;
        }
      }
    });

    if (valid < 3) {
      document.getElementById('import-status').textContent = '❌ Invalid format';
      return;
    }

    // Estimate camber & thickness from coordinates
    const maxCamber = Math.max(...upper.map(p => (p.y + (lower.find(l => Math.abs(l.x - p.x) < 0.05)?.y || 0)) / 2));
    const maxThick  = Math.max(...upper.map(p => p.y + (lower.find(l => Math.abs(l.x - p.x) < 0.05)?.y || 0)));

    S.profile = 'naca';
    S.camber  = Math.round(maxCamber * 100);
    S.thick   = Math.round(maxThick  * 100);
    syncSliders();
    update();
    document.getElementById('import-status').textContent = `✅ ${valid} points — C:${S.camber}% T:${S.thick}%`;
  };
  reader.readAsText(file);
}
function loadCustomNACA() {
  const input = document.getElementById('naca-custom');
  if (!input) return;
  const code = input.value.trim();
  if (code.length < 4) return;

  let camber, pos, thick;
  if (code.length === 4) {
    camber = parseInt(code[0]) / 100 * 100;  // % chord
    pos    = parseInt(code[1]) / 10;          // tenths of chord
    thick  = parseInt(code.slice(2)) ;        // % chord
  } else if (code.length === 5) {
    camber = parseInt(code[0]) * 0.9;
    pos    = parseInt(code[1]) / 2;
    thick  = parseInt(code.slice(3));
  } else return;

  S.profile = 'naca';
  S.camber  = camber;
  S.thick   = thick;
  syncSliders();
  update();
}

function loadNACA(code) {
  if (!code || !NACA_DB[code]) return;
  const p = NACA_DB[code];
  S.profile = 'naca';
  S.camber  = p.camber;
  S.thick   = p.thick;
  syncSliders();
  update();
}

function addPolarSnap() {
  if (S.polarSnaps.length >= 5) S.polarSnaps.shift();
  S.polarSnaps.push({
    label: `${S.profile} C:${S.camber.toFixed(0)} T:${S.thick.toFixed(0)}`,
    color: ['#00E5FF','#FF9800','#00E5A0','#FF6B35','#B388FF'][S.polarSnaps.length % 5],
    pts: Array.from({length: 81}, (_, i) => {
      const a = -20 + i * 0.5;
      const yc = (S.camber/25)/2;
      const rc = (S.thick/25)/4 + Math.sqrt((S.thick/25)**2/16 + yc**2 + 1);
      const xc = 1 - Math.sqrt(rc**2 - yc**2);
      const beta = Math.asin(Math.max(-1,Math.min(1,yc/rc))) * DEG;
      const gam  = 2*rc*Math.sin((a+beta)*RAD);
      const leg  = xc - Math.sqrt(rc**2-yc**2);
      const teg  = xc + Math.sqrt(rc**2-yc**2);
      const chrd = (teg+1/teg)-(leg+1/leg);
      let cl = gam*4*PI/chrd;
      if (S.stallModel && a > 10)  cl *= Math.max(0, 0.5+0.1*a-0.005*a*a);
      if (S.stallModel && a < -10) cl *= Math.max(0, 0.5-0.1*a-0.005*a*a);
      return { x: a, y: cl };
    })
  });
  update(false);
}

function clearPolarSnaps() {
  S.polarSnaps = [];
  update(false);
}

// ─── COMPARE MODE ─────────────────────────────────────────────
function togCompare(el) {
  S.compareMode = !S.compareMode;
  el.classList.toggle('active', S.compareMode);
  el.textContent = S.compareMode ? 'ON' : 'OFF';
  if (S.compareMode) {
    S.snapShot = { cl: O.cl, cd: O.cd, lift: O.lift, ld: O.ld, mach: O.mach };
  } else {
    S.snapShot = null;
  }
  update(false);
}

// ─── TOOLTIPS ─────────────────────────────────────────────────
const TOOLTIPS = {
  'sl-camber':   'Camber: curvature of the mean chord line. Higher camber = more lift at low speed.',
  'sl-thick':    'Thickness: max thickness as % of chord. Affects drag and structural strength.',
  'sl-span':     'Span: wingtip to wingtip distance. Larger span = more lift, more induced drag.',
  'sl-chord':    'Chord: wing width root to trailing edge.',
  'sl-taper':    'Taper ratio: tip chord / root chord. 1.0 = rectangular, 0 = pointed tip.',
  'sl-sweep':    'Sweep: leading edge angle. Higher sweep delays shock at transonic speeds.',
  'sl-dihedral': 'Dihedral: upward wing angle. Increases roll stability.',
  'sl-washout':  'Washout: tip AoA less than root. Prevents tip stall.',
  'sl-vel':      'Velocity: airspeed in selected units.',
  'sl-alt':      'Altitude: affects air density and temperature via ISA model.',
  'sl-aoa':      'Angle of Attack: angle between chord line and freestream. Stall beyond ±10°.',
  'out-cl':      'Lift coefficient. Dimensionless measure of lift generation.',
  'out-cd':      'Total drag coefficient including profile and induced drag.',
  'out-mach':    'Mach number: ratio of airspeed to local speed of sound.',
  'out-pgfactor':'Prandtl-Glauert factor: compressibility correction multiplier.',
  'out-ar':      'Aspect Ratio: span² / area. High AR = efficient cruise wing.',
  'out-ld':      'Lift-to-Drag ratio. Key efficiency metric.',
};

function togTooltip(el) {
  S.tooltips = !S.tooltips;
  el.textContent = S.tooltips ? 'ON' : 'OFF';
  el.classList.toggle('active', S.tooltips);
  const tb = document.getElementById('tooltip-box');
  if (!S.tooltips && tb) tb.style.display = 'none';
  document.querySelectorAll('[id^="sl-"],[id^="out-"]').forEach(elem => {
    if (S.tooltips && TOOLTIPS[elem.id]) {
      elem.addEventListener('mouseenter', showTip);
      elem.addEventListener('mouseleave', hideTip);
    } else {
      elem.removeEventListener('mouseenter', showTip);
      elem.removeEventListener('mouseleave', hideTip);
    }
  });
}

function showTip(e) {
  const tb = document.getElementById('tooltip-box');
  if (!tb) return;
  tb.textContent = TOOLTIPS[e.target.id] || '';
  tb.style.display = 'block';
  tb.style.left = (e.clientX + 12) + 'px';
  tb.style.top  = (e.clientY + 12) + 'px';
  e.target.addEventListener('mousemove', moveTip);
}

function moveTip(e) {
  const tb = document.getElementById('tooltip-box');
  if (tb) { tb.style.left = (e.clientX + 12) + 'px'; tb.style.top = (e.clientY + 12) + 'px'; }
}

function hideTip(e) {
  const tb = document.getElementById('tooltip-box');
  if (tb) tb.style.display = 'none';
  e.target.removeEventListener('mousemove', moveTip);
}

function togKutta(el) {
  S.kutta = !S.kutta;
  el.classList.toggle('active', S.kutta);
  update(false);
}

function updGenp(key, val) {
  S.genp.manual = true;
  S.genp[key === 'rc' ? 'rc' : key === 'xc' ? 'xc' : key === 'yc' ? 'yc' : 'gam'] = val;
  document.getElementById('gv-' + (key === 'gam' ? 'gam' : key)).textContent = val.toFixed(2);
  update(false);
}

function resetGenp() {
  S.genp.manual = false;
  update(false);
}

function setEnv(env, btn) {
  S.env = env;
  document.querySelectorAll('.ebtn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('sec-custom-env').style.display = (env === 'custom') ? '' : 'none';
  document.getElementById('envBadge').textContent = env.toUpperCase() + (env === 'earth' ? ' · ISA' : '');
  update(false);
}

function updCustomEnv(key, val) {
  if (key === 'density') S.customRho    = val;
  if (key === 'temp')    S.customTemp   = val;
  if (key === 'press')   S.customPress  = val;
  if (key === 'viscos')  S.customViscos = val;
  update(false);
}

function setUnits(units, btn) {
  S.units = units;
  document.querySelectorAll('.ubtn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('unitBadge').textContent = units.toUpperCase();

  setUnitFactors();
  updateUnitLabels();
  update(false);
}

function updateUnitLabels() {
  const imp = S.units === 'imperial';
  document.getElementById('span-unit').textContent   = imp ? 'ft' : 'm';
  document.getElementById('chord-unit').textContent  = imp ? 'ft' : 'm';
  document.getElementById('rad-unit').textContent    = imp ? 'ft' : 'm';
  document.getElementById('vel-unit').textContent    = imp ? 'mph' : 'km/h';
  document.getElementById('alt-unit').textContent    = imp ? 'ft' : 'm';
}

function snapView(v, btn) {
  document.querySelectorAll('.snap').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const sv = SNAP_VIEWS[v];
  camTheta = sv.theta; camPhi = sv.phi; camRadius = sv.r;
  camTarget.set(0, 0, 0);
}

let particleAnim = null;
let aoaSweepAnim = null;
let aoaSweepDir  = 1;
const particles = [];
const NPART = 50;

function initParticles() {
  particles.length = 0;
  for (let i = 0; i < NPART; i++) {
    particles.push({
      x: (Math.random() - 0.5) * 6,
      y: (Math.random() - 0.5) * 4,
      age: Math.random() * 100
    });
  }
}

function stepParticle(p) {
  const { vx, vy } = getFlowVelocity(p.x, p.y);
  const dt = 0.02;
  p.x += vx * dt;
  p.y += vy * dt;
  p.age++;
  if (p.age > 120 || Math.abs(p.x) > 4 || Math.abs(p.y) > 3) {
    p.x = -3.5 + Math.random() * 0.5;
    p.y = (Math.random() - 0.5) * 3;
    p.age = 0;
  }
}

function getFlowVelocity(px, py) {
  const circ = getCirculation();
  const { rval, xcval, ycval, gamval } = circ;
  const alfrad = S.aoa * RAD;
  const xg = px - xcval, yg = py - (ycval || 0);
  const r2 = Math.sqrt(xg * xg + yg * yg);
  if (r2 < rval * 0.95) return { vx: 0, vy: 0 };
  const th = Math.atan2(yg, xg);
  const rr = r2 / rval;
  const ur  = Math.cos(th - alfrad) * (1 - 1/(rr*rr));
  const uth = -Math.sin(th - alfrad) * (1 + 1/(rr*rr)) - gamval / (r2);
  const vx =  ur * Math.cos(th) - uth * Math.sin(th);
  const vy =  ur * Math.sin(th) + uth * Math.cos(th);
  return { vx, vy };
}

function drawParticles() {
  const canvas = document.getElementById('flowCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W/2, cy = H/2, sc = W/8;

  // Sadece parçacıkları çiz — flow field üstüne
  particles.forEach(p => {
    const sx = cx + p.x * sc;
    const sy = cy - p.y * sc;
    const alpha = Math.min(1, (120 - p.age) / 60);
    const { vx, vy } = getFlowVelocity(p.x, p.y);
    const speed = Math.sqrt(vx*vx + vy*vy);
    const hue = 180 + speed * 30;
    ctx.beginPath();
    ctx.arc(sx, sy, 2, 0, 2*PI);
    ctx.fillStyle = `hsla(${hue},100%,60%,${alpha})`;
    ctx.fill();
  });
}

let simAnim = null;

function togFlightSim(el) {
  S.flightSim = !S.flightSim;
  el.textContent = S.flightSim ? 'ON' : 'OFF';
  el.classList.toggle('active', S.flightSim);
  const sd = document.getElementById('sim-display');
  if (sd) sd.style.display = S.flightSim ? '' : 'none';
  if (S.flightSim) startFlightSim();
  else stopFlightSim();
}

function startFlightSim() {
  const ss = S.simState;
  ss.x = 0; ss.y = 0;
  ss.vx = S.vel / U.vconv;
  ss.vy = 0; ss.pitch = S.aoa;

  document.addEventListener('keydown', simKeyDown);

  function loop() {
    if (!S.flightSim) { simAnim = null; return; }
    const dt = 0.05;
    const lift  = O.lift / U.fconv;
    const drag  = O.drag / U.fconv;
    const thrust = ss.throttle * lift * 0.3;
    const weight = ss.weight;

    const ax = (thrust - drag) / (weight / G0);
    const ay = (lift - weight) / (weight / G0);

    ss.vx += ax * dt;
    ss.vy += ay * dt;
    ss.x  += ss.vx * dt;
    ss.y  += ss.vy * dt;

    if (ss.y < 0) { ss.y = 0; ss.vy = 0; }

    S.aoa   = ss.pitch;
    S.vel   = Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy) * U.vconv;

    const sl = document.getElementById('sl-aoa');
    if (sl) sl.value = String(Math.round(((S.aoa + 20) / 40) * 1000));
    document.getElementById('fv-aoa').textContent  = S.aoa.toFixed(1);
    document.getElementById('fv-vel').textContent  = S.vel.toFixed(0);

    updateSimDisplay();
    update(false);
    simAnim = requestAnimationFrame(loop);
  }
  simAnim = requestAnimationFrame(loop);
}

function stopFlightSim() {
  if (simAnim) cancelAnimationFrame(simAnim);
  simAnim = null;
  document.removeEventListener('keydown', simKeyDown);
}

function simKeyDown(e) {
  const ss = S.simState;
  if (e.key === 'ArrowUp')   ss.pitch = Math.min(20,  ss.pitch + 1);
  if (e.key === 'ArrowDown') ss.pitch = Math.max(-20, ss.pitch - 1);
  if (e.key === 'ArrowRight') ss.throttle = Math.min(1, ss.throttle + 0.05);
  if (e.key === 'ArrowLeft')  ss.throttle = Math.max(0, ss.throttle - 0.05);
}

function updateSimDisplay() {
  const ss = S.simState;
  const el = document.getElementById('sim-display');
  if (!el) return;
  el.innerHTML =
    `X: ${(ss.x / 5280).toFixed(2)} nm &nbsp; ` +
    `Alt: ${ss.y.toFixed(0)} ft &nbsp; ` +
    `Throttle: ${(ss.throttle * 100).toFixed(0)}% &nbsp; ` +
    `↑↓ Pitch &nbsp; ←→ Throttle`;
}

function startAoaSweep() {
  function loop() {
    if (!S.aoaSweep) { aoaSweepAnim = null; return; }
    S.aoa += aoaSweepDir * 0.3;
    if (S.aoa >= 20)  { S.aoa = 20;  aoaSweepDir = -1; }
    if (S.aoa <= -20) { S.aoa = -20; aoaSweepDir =  1; }
    const sl = document.getElementById('sl-aoa');
    if (sl) sl.value = String(Math.round(((S.aoa + 20) / 40) * 1000));
    document.getElementById('fv-aoa').textContent = S.aoa.toFixed(1);
    update(false);
    aoaSweepAnim = requestAnimationFrame(loop);
  }
  aoaSweepAnim = requestAnimationFrame(loop);
}

function stopAoaSweep() {
  if (aoaSweepAnim) cancelAnimationFrame(aoaSweepAnim);
  aoaSweepAnim = null;
}

const AIRCRAFT_DB = {
  cessna172: { profile:'naca', camber:4,  thick:12, span:36,  chord:4.9, taper:1.0, sweep:0,  dihedral:1,  washout:2,  vel:122, alt:8000,  aoa:3,  wingType:'rectangular', label:'Cessna 172' },
  boeing737: { profile:'naca', camber:6,  thick:12, span:113, chord:14,  taper:0.3, sweep:25, dihedral:5,  washout:3,  vel:485, alt:35000, aoa:2,  wingType:'tapered',     label:'Boeing 737-800' },
  f16:       { profile:'naca', camber:0,  thick:4,  span:31,  chord:16,  taper:0.2, sweep:40, dihedral:-2, washout:0,  vel:800, alt:20000, aoa:5,  wingType:'delta',        label:'F-16 Fighting Falcon' },
  concorde:  { profile:'naca', camber:0,  thick:3,  span:84,  chord:90,  taper:0.0, sweep:72, dihedral:0,  washout:0,  vel:1350,alt:55000, aoa:8,  wingType:'delta',        label:'Concorde' },
  b2:        { profile:'naca', camber:2,  thick:10, span:172, chord:35,  taper:0.1, sweep:33, dihedral:0,  washout:3,  vel:560, alt:40000, aoa:2,  wingType:'delta',        label:'B-2 Spirit' },
  a320:      { profile:'naca', camber:5,  thick:11, span:111, chord:13,  taper:0.3, sweep:25, dihedral:5,  washout:3,  vel:450, alt:35000, aoa:2,  wingType:'tapered',      label:'Airbus A320' },
  spitfire:  { profile:'naca', camber:4,  thick:13, span:37,  chord:7,   taper:0.4, sweep:5,  dihedral:6,  washout:2,  vel:360, alt:20000, aoa:4,  wingType:'elliptical',   label:'Supermarine Spitfire' },
};

const WEATHER_PRESETS = {
  isa:      { label: 'ISA Standard',   devF:  0  },
  hot:      { label: 'Hot Day (+35°F)',  devF:  35 },
  cold:     { label: 'Cold Day (-35°F)', devF: -35 },
  tropical: { label: 'Tropical (+50°F)', devF:  50 },
  arctic:   { label: 'Arctic (-60°F)',   devF: -60 },
};

function loadWeather(code) {
  if (!code || !WEATHER_PRESETS[code]) return;
  const w = WEATHER_PRESETS[code];
  // ISA deviation: modify customTemp
  S.env = 'custom';
  const hft = S.alt / U.lconv;
  let ts0_isa;
  if (hft <= 36152) ts0_isa = 518.6 - 3.56 * hft / 1000.0;
  else ts0_isa = 389.98;
  S.customTemp  = ts0_isa + w.devF;
  S.customPress = 2116.0 * Math.pow(S.customTemp / 518.6, 5.256);
  S.customRho   = S.customPress / (RGAS * S.customTemp);
  // Sutherland's law: μ = μ_ref * (T/T_ref)^(3/2) * (T_ref+S)/(T+S)
  const T_ref = 518.67, mu_ref = 3.737e-7, Suth = 198.6;
  S.customViscos = mu_ref * Math.pow(S.customTemp / T_ref, 1.5) * (T_ref + Suth) / (S.customTemp + Suth);
  const tInp = document.getElementById('vb-temp');
  const pInp = document.getElementById('vb-press');
  const rInp = document.getElementById('vb-density');
  const vInp = document.getElementById('vb-viscos');
  if (tInp) tInp.value = S.customTemp.toFixed(1);
  if (pInp) pInp.value = S.customPress.toFixed(1);
  if (rInp) rInp.value = S.customRho.toFixed(6);
  if (vInp) vInp.value = S.customViscos.toExponential(3);
  // Update env buttons
  document.querySelectorAll('.ebtn').forEach(b => b.classList.remove('active'));
  const customBtn = document.querySelector('.ebtn[onclick*="custom"]');
  if (customBtn) customBtn.classList.add('active');
  document.getElementById('sec-custom-env').style.display = '';
  update(false);
}

function loadAircraft(code) {
  if (!code || !AIRCRAFT_DB[code]) return;
  const a = AIRCRAFT_DB[code];
  Object.assign(S, a);
  setUnitFactors();
  syncSliders();
  update();
}

function setTheme(theme) {
  S.theme = theme;
  document.body.classList.toggle('theme-light', theme === 'light');
  document.querySelectorAll('.tbtn').forEach(b => b.classList.remove('active'));
  document.getElementById('tbtn-' + theme).classList.add('active');
}

function convertUnits() {
  const val  = parseFloat(document.getElementById('uc-val').value) || 0;
  const from = document.getElementById('uc-from').value;
  const to   = document.getElementById('uc-to').value;
  const toSI = { ft:0.3048, m:1, mph:0.44704, kmh:0.27778, kts:0.51444, fts:0.3048, lbs:4.44822, N:1, psi:6894.76, kpa:1000 };
  const fromSI = {};
  Object.entries(toSI).forEach(([k,v]) => fromSI[k] = 1/v);
  const result = val * toSI[from] * fromSI[to];
  document.getElementById('uc-result').textContent = result.toFixed(4);
}

function togME(el) {
  S.multiEngine = !S.multiEngine;
  el.textContent = S.multiEngine ? 'ON' : 'OFF';
  el.classList.toggle('active', S.multiEngine);
  document.getElementById('sec-me').style.display = S.multiEngine ? '' : 'none';
  update(false);
}

function togEngOut(el) {
  S.engineOutIndex = S.engineOutIndex >= 0 ? -1 : 0;
  el.textContent = S.engineOutIndex >= 0 ? 'ON' : 'OFF';
  el.classList.toggle('active', S.engineOutIndex >= 0);
  update(false);
}

function togFuel(el) {
  S.fuelModel = !S.fuelModel;
  el.textContent = S.fuelModel ? 'ON' : 'OFF';
  el.classList.toggle('active', S.fuelModel);
  document.getElementById('sec-fuel').style.display = S.fuelModel ? '' : 'none';
  update(false);
}

function togTurb(el) {
  S.turbulence = !S.turbulence;
  el.textContent = S.turbulence ? 'ON' : 'OFF';
  el.classList.toggle('active', S.turbulence);
  document.getElementById('sec-turb').style.display = S.turbulence ? '' : 'none';
  update(false);
}

function togProp(el) {
  S.propeller = !S.propeller;
  el.textContent = S.propeller ? 'ON' : 'OFF';
  el.classList.toggle('active', S.propeller);
  document.getElementById('sec-prop').style.display = S.propeller ? '' : 'none';
  update(false);
}

function togAE(el) {
  S.aeroelastic = !S.aeroelastic;
  el.textContent = S.aeroelastic ? 'ON' : 'OFF';
  el.classList.toggle('active', S.aeroelastic);
  document.getElementById('sec-ae').style.display = S.aeroelastic ? '' : 'none';
  update(false);
}

function togVLM(el) {
  S.vlm = !S.vlm;
  el.textContent = S.vlm ? 'ON' : 'OFF';
  el.classList.toggle('active', S.vlm);
  update(false);
}

function togGE(el) {
  S.groundEffect = !S.groundEffect;
  el.textContent = S.groundEffect ? 'ON' : 'OFF';
  el.classList.toggle('active', S.groundEffect);
  update(false);
}

function togFlap(el) {
  S.flap = !S.flap;
  el.textContent = S.flap ? 'ON' : 'OFF';
  el.classList.toggle('active', S.flap);
  document.getElementById('sec-flap').style.display = S.flap ? '' : 'none';
  update(false);
}

function togSlat(el) {
  S.slat = !S.slat;
  el.textContent = S.slat ? 'ON' : 'OFF';
  el.classList.toggle('active', S.slat);
  update(false);
}

function togIcing(el) {
  S.icing = !S.icing;
  el.textContent = S.icing ? 'ON' : 'OFF';
  el.classList.toggle('active', S.icing);
  document.getElementById('sec-icing').style.display = S.icing ? '' : 'none';
  update(false);
}

function togWind(el) {
  S.wind = !S.wind;
  el.textContent = S.wind ? 'ON' : 'OFF';
  el.classList.toggle('active', S.wind);
  document.getElementById('sec-wind').style.display = S.wind ? '' : 'none';
  update(false);
}

function togWinglet(el) {
  S.winglet = !S.winglet;
  el.textContent = S.winglet ? 'ON' : 'OFF';
  el.classList.toggle('active', S.winglet);
  update(false);
}

function togAoaSweep(el) {
  S.aoaSweep = !S.aoaSweep;
  el.textContent = S.aoaSweep ? 'ON' : 'OFF';
  el.classList.toggle('active', S.aoaSweep);
  if (S.aoaSweep) startAoaSweep();
  else stopAoaSweep();
}

function startParticles() {
  initParticles();
  function loop() {
    if (!S.disp.particles) { particleAnim = null; return; }
    if (S.disp.flow) drawFlowField();
    particles.forEach(stepParticle);
    drawParticles();
    particleAnim = requestAnimationFrame(loop);
  }
  particleAnim = requestAnimationFrame(loop);
}

function stopParticles() {
  if (particleAnim) cancelAnimationFrame(particleAnim);
  particleAnim = null;
}
function drawLiftMeter() {
  const canvas = document.getElementById('liftmeterCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(4,12,20,0.95)';
  ctx.fillRect(0, 0, W, H);

  const lift = O.lift;
  const absLift = Math.abs(lift);

  // Renk ve ölçek belirle
  let color, scale, exp;
  if (absLift <= 1.0)         { color='#00E5FF'; scale=absLift*10;  exp=-1; }
  else if (absLift <= 10.0)   { color='#00E5A0'; scale=absLift;     exp=0;  }
  else if (absLift <= 100.0)  { color='#FFEB3B'; scale=absLift/10;  exp=1;  }
  else if (absLift <= 1000.0) { color='#FF9800'; scale=absLift/100; exp=2;  }
  else if (absLift <= 10000.0){ color='#FF5722'; scale=absLift/1000;exp=3;  }
  else                        { color='#FF1744'; scale=Math.min(absLift/10000,10); exp=4; }

  // Başlık
  ctx.fillStyle = '#5A8BAA';
  ctx.font = '8px JetBrains Mono,monospace';
  ctx.textAlign = 'left';
  const lUnit = S.units === 'metric' ? 'N' : 'lbs';
  ctx.fillText(`LIFT = ${lift.toFixed(1)} ${lUnit}   [×10^${exp}]`, 6, 12);

  // Ölçek çizgileri
  ctx.fillStyle = '#3A6080';
  ctx.font = '7px JetBrains Mono,monospace';
  ctx.textAlign = 'center';
  for (let i = 0; i <= 10; i++) {
    const x = 6 + i * 18;
    ctx.fillStyle = '#3A6080';
    ctx.fillRect(x, 20, 1, 8);
    ctx.fillText(i, x, 38);
  }

  // Bar
  const barW = Math.min(scale / 10, 1) * 180;
  ctx.fillStyle = color;
  ctx.fillRect(6, 20, barW, 8);

  // CL değeri
  ctx.fillStyle = '#5A8BAA';
  ctx.font = '8px JetBrains Mono,monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`CL = ${O.cl.toFixed(3)}`, 6, 52);
  ctx.textAlign = 'right';
  ctx.fillText(`L/D = ${O.ld.toFixed(1)}`, 194, 52);
}
function refreshHistory() {
  const el = document.getElementById('history-list');
  if (!el) return;
  el.innerHTML = S.history.map((h, i) =>
    `<div style="border-bottom:1px solid #163348;padding:3px 0;font-size:9px;color:#5A8BAA;">
      <span style="color:#FF6B35;">${h.time}</span> 
      ${h.profile.toUpperCase()} α=${h.aoa.toFixed(1)}° 
      CL=${h.cl.toFixed(3)} L/D=${h.ld.toFixed(1)}
      <span style="float:right;cursor:pointer;color:#00E5A0;" onclick="loadHistory(${i})">↺</span>
    </div>`
  ).join('');
}

function shareLink() {
  const params = new URLSearchParams({
    profile:  S.profile,
    camber:   S.camber,
    thick:    S.thick,
    span:     S.span,
    chord:    S.chord,
    taper:    S.taper,
    sweep:    S.sweep,
    dihedral: S.dihedral,
    washout:  S.washout,
    vel:      S.vel,
    alt:      S.alt,
    aoa:      S.aoa,
    env:      S.env,
    units:    S.units,
  });
  const url = `${location.origin}${location.pathname}?${params.toString()}`;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById('btn-share');
    if (btn) { btn.textContent = '✅ Copied!'; setTimeout(() => btn.textContent = 'Share', 2000); }
  });
}

function loadFromURL() {
  const params = new URLSearchParams(location.search);
  if (!params.has('profile')) return;
  const keys = ['profile','camber','thick','span','chord','taper','sweep','dihedral','washout','vel','alt','aoa','env','units'];
  keys.forEach(k => {
    if (params.has(k)) {
      const v = params.get(k);
      S[k] = isNaN(v) ? v : parseFloat(v);
    }
  });
  setUnitFactors();
  syncSliders();
  update();
}

function runOptimize() {
  const target = document.getElementById('opt-target').value;
  let bestVal = -Infinity, bestCamber = S.camber, bestThick = S.thick, bestAoa = S.aoa;

  for (let cam = -10; cam <= 20; cam += 1) {
    for (let thk = 4; thk <= 20; thk += 1) {
      for (let a = -10; a <= 20; a += 0.5) {
        const yc  = (cam/25)/2;
        const rc  = (thk/25)/4 + Math.sqrt((thk/25)**2/16 + yc**2 + 1);
        const beta = Math.asin(Math.max(-1,Math.min(1,yc/rc))) * DEG;
        const leg  = 1 - Math.sqrt(rc**2 - yc**2);
        const teg  = 1 - leg + 2*Math.sqrt(rc**2 - yc**2);
        const chrd = (teg+1/teg)-(leg+1/leg);
        const gam  = 2*rc*Math.sin((a+beta)*RAD);
        let cl = gam*4*PI/chrd;
        if (S.stallModel && a > 10)  cl *= Math.max(0, 0.5+0.1*a-0.005*a*a);
        if (S.stallModel && a < -10) cl *= Math.max(0, 0.5-0.1*a-0.005*a*a);
        const cdi = cl*cl/(PI*O.oswald*Math.max(O.ar,1));
        const savedAoa=S.aoa, savedCam=S.camber, savedThk=S.thick;
        S.aoa=a; S.camber=cam; S.thick=thk;
        const cd = getDrag(cl) + cdi;
        S.aoa=savedAoa; S.camber=savedCam; S.thick=savedThk;
        const ld = cd>0 ? cl/cd : 0;

        let val;
        if (target === 'ld')   val = ld;
        else if (target === 'cl')   val = cl;
        else if (target === 'drag') val = -cd;

        if (val > bestVal) {
          bestVal = val; bestCamber = cam; bestThick = thk; bestAoa = a;
        }
      }
    }
  }

  const el = document.getElementById('opt-result');
  if (el) el.innerHTML =
    `Best: Camber=${bestCamber.toFixed(0)}% Thick=${bestThick.toFixed(0)}% AoA=${bestAoa.toFixed(1)}°<br>` +
    `Value: ${bestVal.toFixed(3)}`;

  S.camber = bestCamber; S.thick = bestThick; S.aoa = bestAoa;
  syncSliders();
  update();
}

function exportCompareReport() {
  if (!S.snapShot) {
    alert('Önce Compare Mode ON yapıp bir snapshot al!');
    return;
  }
  const imp = S.units === 'imperial';
  const vUnit = imp ? 'mph' : 'km/h';
  const fUnit = imp ? 'lbs' : 'N';

  let txt = '';
  txt += '================================================\n';
  txt += '  COMPARATIVE AERODYNAMIC REPORT\n';
  txt += '================================================\n\n';
  txt += `${'Parameter'.padEnd(20)} ${'Baseline'.padEnd(14)} ${'Current'.padEnd(14)} ${'Delta'.padEnd(12)}\n`;
  txt += '-'.repeat(62) + '\n';

  const rows = [
    ['CL',       S.snapShot.cl,   O.cl,   4],
    ['CD',       S.snapShot.cd,   O.cd,   4],
    ['L/D',      S.snapShot.ld,   O.ld,   2],
    ['Lift ('+fUnit+')', S.snapShot.lift, O.lift, 1],
    ['Mach',     S.snapShot.mach, O.mach, 4],
  ];

  rows.forEach(([name, base, cur, dec]) => {
    const delta = cur - base;
    const sign  = delta >= 0 ? '+' : '';
    txt += `${name.padEnd(20)} ${base.toFixed(dec).padEnd(14)} ${cur.toFixed(dec).padEnd(14)} ${sign}${delta.toFixed(dec)}\n`;
  });

  txt += '\n================================================\n';
  txt += `  Baseline AoA : ${S.aoa.toFixed(1)}°\n`;
  txt += `  Generated by Wing Simulator\n`;
  txt += '================================================\n';

  const blob = new Blob([txt], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `compare_report.txt`;
  a.click();
}

function exportCSV() {
  const cp = computeCpDistribution();
  const upper = cp.filter(p => p.upper).sort((a, b) => a.xNorm - b.xNorm);
  const lower = cp.filter(p => !p.upper).sort((a, b) => a.xNorm - b.xNorm);

  let csv = 'Surface,x/c,Cp,V/Vinf\n';
  upper.forEach(p => {
    csv += `Upper,${p.xNorm.toFixed(4)},${p.cp.toFixed(4)},${Math.sqrt(Math.max(0,1-p.cp)).toFixed(4)}\n`;
  });
  lower.forEach(p => {
    csv += `Lower,${p.xNorm.toFixed(4)},${p.cp.toFixed(4)},${Math.sqrt(Math.max(0,1-p.cp)).toFixed(4)}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `aero_cp_alpha${S.aoa.toFixed(1)}.csv`;
  a.click();
}
function exportReport() {
  const u = S.units === 'metric';
  const vUnit = u ? 'km/h' : 'mph';
  const lUnit = u ? 'm' : 'ft';
  const fUnit = u ? 'N' : 'lbs';
  const pUnit = u ? 'kPa' : 'psi';

  const cp = computeCpDistribution();
  const upper = cp.filter(p => p.side === 'upper');
  const lower = cp.filter(p => p.side === 'lower');

  let txt = '';
  txt += '================================================\n';
  txt += '  WING SIMULATOR - AERODYNAMIC ANALYSIS REPORT\n';
  txt += '================================================\n\n';

  // Profil
  txt += `PROFILE: ${S.profile.toUpperCase()}\n`;
  if (S.profile !== 'cylinder' && S.profile !== 'ball') {
    txt += `  Camber      : ${S.camber.toFixed(2)} % chord\n`;
    txt += `  Thickness   : ${S.thick.toFixed(2)} % chord\n`;
  } else {
    txt += `  Radius      : ${(S.radius * U.lconv).toFixed(3)} ${lUnit}\n`;
    txt += `  Spin        : ${S.spin.toFixed(1)} rpm\n`;
  }

  // Kanat
  txt += `\nWING GEOMETRY: ${S.wingType.toUpperCase()}\n`;
  txt += `  Span        : ${(S.span * U.lconv).toFixed(2)} ${lUnit}\n`;
  txt += `  Chord       : ${(S.chord * U.lconv).toFixed(2)} ${lUnit}\n`;
  txt += `  Area        : ${(O.area * U.lconv * U.lconv).toFixed(2)} ${lUnit}²\n`;
  txt += `  AR          : ${O.ar.toFixed(2)}\n`;
  txt += `  Sweep       : ${S.sweep.toFixed(1)} deg\n`;
  txt += `  Taper       : ${S.taper.toFixed(2)}\n`;

  // Uçuş
  txt += `\nFLIGHT CONDITIONS:\n`;
  txt += `  Velocity    : ${(O.vtas * U.vconv).toFixed(1)} ${vUnit}\n`;
  txt += `  Altitude    : ${(S.alt * U.lconv).toFixed(0)} ${lUnit}\n`;
  txt += `  AoA         : ${S.aoa.toFixed(2)} deg\n`;
  txt += `  Environment : ${S.env.toUpperCase()}\n`;

  // Atmosfer
  txt += `\nATMOSPHERE:\n`;
  txt += `  Density     : ${O.rho.toExponential(4)} slug/ft³\n`;
  txt += `  Pressure    : ${(O.ps0 / (u ? 144/101.325 : 144)).toFixed(3)} ${pUnit}\n`;
  txt += `  Temperature : ${(u ? (O.ts0*5/9 - 273.1) : (O.ts0 - 459.67)).toFixed(1)} ${u ? '°C' : '°F'}\n`;
  txt += `  Reynolds    : ${O.re.toFixed(0)}\n`;

  // Aerodinamik sonuçlar
  txt += `\nAERODYNAMIC RESULTS:\n`;
  txt += `  CL          : ${O.cl.toFixed(4)}\n`;
  txt += `  CDi         : ${O.cdi.toFixed(4)}\n`;
  txt += `  CD (total)  : ${O.cd.toFixed(4)}\n`;
  txt += `  L/D         : ${O.ld.toFixed(2)}\n`;
  txt += `  Lift        : ${O.lift.toFixed(2)} ${fUnit}\n`;
  txt += `  Drag        : ${O.drag.toFixed(2)} ${fUnit}\n`;
  txt += `  Circulation : ${O.gamma.toFixed(4)}\n`;

  // Yüzey dağılımı tablosu
  txt += `\n================================================\n`;
  txt += `SURFACE PRESSURE & VELOCITY DISTRIBUTION\n`;
  txt += `================================================\n`;
  txt += `  x/c\t\tCp\t\tV/Vinf\n`;
  txt += `  --- UPPER SURFACE ---\n`;
  upper.forEach(p => {
    const vRatio = Math.sqrt(Math.max(0, 1 - p.cp));
    txt += `  ${p.xNorm.toFixed(4)}\t\t${p.cp.toFixed(4)}\t\t${vRatio.toFixed(4)}\n`;
  });
  txt += `  --- LOWER SURFACE ---\n`;
  lower.forEach(p => {
    const vRatio = Math.sqrt(Math.max(0, 1 - p.cp));
    txt += `  ${p.xNorm.toFixed(4)}\t\t${p.cp.toFixed(4)}\t\t${vRatio.toFixed(4)}\n`;
  });

  txt += `\n================================================\n`;
  txt += `  Generated by Wing Simulator\n`;
  txt += `================================================\n`;

  // İndir
  const blob = new Blob([txt], {type: 'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `wing_report_alpha${S.aoa.toFixed(1)}.txt`;
  a.click();
}
// ─── PRESET SAVE / LOAD ──────────────────────────────────────
const PRESET_KEY = 'aerosim_presets';

function getPresets() {
  try { return JSON.parse(localStorage.getItem(PRESET_KEY) || '{}'); } catch { return {}; }
}

function savePresets(p) {
  localStorage.setItem(PRESET_KEY, JSON.stringify(p));
}

function refreshPresetList() {
  const sel = document.getElementById('preset-list');
  if (!sel) return;
  const p = getPresets();
  sel.innerHTML = Object.keys(p).length
    ? Object.keys(p).map(k => `<option value="${k}">${k}</option>`).join('')
    : '<option value="">— no presets —</option>';
}

function savePreset() {
  const name = prompt('Preset name:');
  if (!name || !name.trim()) return;
  const snapshot = {
    profile: S.profile, camber: S.camber, thick: S.thick,
    spin: S.spin, radius: S.radius, ballType: S.ballType,
    wingType: S.wingType, span: S.span, chord: S.chord,
    taper: S.taper, sweep: S.sweep, dihedral: S.dihedral, washout: S.washout,
    vel: S.vel, alt: S.alt, aoa: S.aoa,
    env: S.env, units: S.units,
    arCorr: S.arCorr, stallModel: S.stallModel, kutta: S.kutta, pgCorr: S.pgCorr,
  };
  const p = getPresets();
  p[name.trim()] = snapshot;
  savePresets(p);
  refreshPresetList();
}

function loadPreset() {
  const sel = document.getElementById('preset-list');
  const name = sel && sel.value;
  if (!name) return;
  const p = getPresets();
  const snap = p[name];
  if (!snap) return;
  Object.assign(S, snap);
  setUnitFactors();
  updateUnitLabels();
  syncSliders();
  // Sync toggle buttons
  const togMap = { 'tog-arcor': S.arCorr, 'tog-stall': S.stallModel, 'tog-pg': S.pgCorr };
  Object.entries(togMap).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) { el.textContent = val ? 'ON' : 'OFF'; el.classList.toggle('active', val); }
  });
  const kuttaEl = document.getElementById('tog-kutta');
  if (kuttaEl) kuttaEl.classList.toggle('active', S.kutta);
  update();
}

function clearPresets() {
  const sel = document.getElementById('preset-list');
  const name = sel && sel.value;
  if (!name || !confirm(`Delete preset "${name}"?`)) return;
  const p = getPresets();
  delete p[name];
  savePresets(p);
  refreshPresetList();
}

function resetAll() {
  S.profile  = 'joukowski';
  S.camber   = 0; S.thick = 12.5;
  S.spin     = 0; S.radius = 0.5;
  S.wingType = 'rectangular';
  S.span     = 20; S.chord = 5; S.taper = 1;
  S.sweep    = 0; S.dihedral = 3; S.washout = 0;
  S.vel      = 100; S.alt = 0; S.aoa = 0;
  S.env      = 'earth';
  S.arCorr   = false; S.stallModel = true; S.pgCorr = true;
  S.units    = 'imperial';
  S.disp     = { wire: true, ribs: true, grid: true, rot: false, cp: true, foil: true };

  setUnitFactors();
  syncSliders();
  const pgBtn = document.getElementById('tog-pg');
  if (pgBtn) { pgBtn.textContent = 'ON'; pgBtn.classList.add('active'); }
  document.querySelectorAll('.pbtn')[0].click();
  document.querySelectorAll('.wbtn')[0].click();
  document.querySelectorAll('.ebtn')[0].click();
  document.getElementById('ubtn-imperial').click();
  update();
}

function syncSliders() {
  // Sync all sliders to current S values
  function setSlider(id, val, mn, mx) {
    const sl = document.getElementById(id);
    if (sl) sl.value = String(Math.round(((val - mn) / (mx - mn)) * 1000));
  }
  function setVB(id, val, dec) {
    const el = document.getElementById(id);
    if (el) el.value = val.toFixed(dec);
  }

  setSlider('sl-camber', S.camber, -25, 25);   setVB('vb-camber', S.camber, 1);
  setSlider('sl-thick',  S.thick,  1,  26);    setVB('vb-thick',  S.thick,  1);
  setSlider('sl-span',   S.span,   1,  80);    setVB('vb-span',   S.span,   1);
  setSlider('sl-chord',  S.chord,  0.5, 20);   setVB('vb-chord',  S.chord,  1);
  setSlider('sl-taper',  S.taper,  0,  1);     setVB('vb-taper',  S.taper,  2);
  setSlider('sl-sweep',  S.sweep,  0,  70);    setVB('vb-sweep',  S.sweep,  1);
  setSlider('sl-dihedral', S.dihedral, -10, 15); setVB('vb-dihedral', S.dihedral, 1);
  setSlider('sl-washout', S.washout, -5, 5);   setVB('vb-washout', S.washout, 1);
  setSlider('sl-vel', S.vel, 0, U.vmax);       document.getElementById('fv-vel').textContent = S.vel.toFixed(0);
  setSlider('sl-alt', S.alt, 0, U.altmax);     document.getElementById('fv-alt').textContent = S.alt.toFixed(0);
  setSlider('sl-aoa', S.aoa, -20, 20);         document.getElementById('fv-aoa').textContent = S.aoa.toFixed(1);
}

// ─── OUTPUT DISPLAY ───────────────────────────────────────────
function displayOutputs() {
  const fmt = (v, d = 2) => isFinite(v) ? v.toFixed(d) : '—';
  const imp = S.units === 'imperial';

  // Geometry
  setText('out-ar',       fmt(O.ar,   2));
  setText('out-area',     fmt(O.area, 1) + ` <span class="dc-unit">${imp ? 'ft²' : 'm²'}</span>`);
  setText('out-mac',      fmt(O.mac,  2) + ` <span class="dc-unit">${imp ? 'ft' : 'm'}</span>`);
  setText('out-tipchord', fmt(O.tipChord, 2) + ` <span class="dc-unit">${imp ? 'ft' : 'm'}</span>`);
  setText('out-wetted',   fmt(O.wettedArea, 1) + ` <span class="dc-unit">${imp ? 'ft²' : 'm²'}</span>`);
  setText('out-volume', fmt(O.volume, 2) + ` <span class="dc-unit">${imp ? 'ft³' : 'm³'}</span>`);
  setText('out-span',     fmt(S.span, 1) + ` <span class="dc-unit">${imp ? 'ft' : 'm'}</span>`);

  // Aero
  const cmpVal = (cur, key, dec) => {
    if (!S.compareMode || !S.snapShot) return fmt(cur, dec);
    const diff = cur - S.snapShot[key];
    const sign = diff >= 0 ? '+' : '';
    const col  = diff >= 0 ? '#00E5A0' : '#FF6B35';
    return `${fmt(cur, dec)} <span style="color:${col};font-size:9px">(${sign}${diff.toFixed(dec)})</span>`;
  };

  setText('out-cl',  cmpVal(O.cl,  'cl',  3));
  setText('out-cdi', fmt(O.cdi, 4));
  setText('out-cd',  cmpVal(O.cd,  'cd',  4));
  setText('out-re', fmt(O.re, 0));
  setText('out-mach', cmpVal(O.mach, 'mach', 4));
  setText('out-regime', O.machRegime);
  setText('out-macheff', fmt(O.machEff, 4));
  setText('out-pgfactor', fmt(O.pgFactor, 3));
  setText('out-cm', fmt(O.cm, 4));
  setText('out-stallangle', fmt(O.stallAngle, 1) + '°');
  const ldFmt = (O.cdi > 0.0001) ? fmt(O.ld, 1) : '∞';
  setText('out-ld',   ldFmt);
  setText('out-e',    fmt(O.oswald, 3));
  const liftUnit = imp ? 'lbs' : 'N';
  setText('out-lift', fmt(Math.abs(O.lift), 1) + ` <span class="dc-unit">${liftUnit}</span>`);
  setText('out-drag', fmt(Math.abs(O.drag), 2) + ` <span class="dc-unit">${liftUnit}</span>`);
  const qVal = imp ? O.q0.toFixed(1) + ' <span class="dc-unit">psf</span>' : (O.q0 * 47.88).toFixed(1) + ' <span class="dc-unit">Pa</span>';
  setText('out-q', qVal);
  setText('out-vs', fmt(O.vs, 1) + ` <span class="dc-unit">${imp ? 'mph' : 'km/h'}</span>`);
  setText('out-range', fmt(O.range, 0) + ` <span class="dc-unit">${imp ? 'nm' : 'km'}</span>`);
  setText('out-endurance', fmt(O.endurance, 2) + ` <span class="dc-unit">hr</span>`);

  // L/D bar  (max L/D ~40 maps to 100%)
  const ldPct = Math.min(100, Math.max(0, Math.abs(O.ld) / 40 * 100));
  const bar = document.getElementById('ld-bar');
  if (bar) bar.style.width = ldPct + '%';

  // Stability
  setText('out-stall', fmt(O.stallMargin, 1) + ' <span class="dc-unit">°</span>');
  setText('out-buffet', fmt(O.machBuffet, 3));
  const bmColor = O.buffetMargin < 0.05 ? '#FF1744' : O.buffetMargin < 0.1 ? '#FF9800' : '#00E5A0';
  setText('out-buffetmargin', `<span style="color:${bmColor}">${fmt(O.buffetMargin, 3)}</span>`);
  setText('out-icingcl', fmt(O.icingCL, 3));
  setText('out-icingcd', fmt(O.icingCD, 4));
  setText('out-icingld', fmt(O.icingLD, 1));
  setText('out-flapcl', fmt(O.flapCL, 3));
  setText('out-flapld', fmt(O.flapLD, 1));
  setText('out-geratio', fmt(O.geRatio, 3));
  setText('out-vlmcl',      fmt(O.vlmCL,      3));
  setText('out-vlmcdi',     fmt(O.vlmCDi,     4));
  setText('out-vlmld',      fmt(O.vlmLD,      1));
  setText('out-vlmspaneff', fmt(O.vlmSpanEff, 3));
  setText('out-tipdef',  fmt(O.tipDeflection, 3) + ` <span class="dc-unit">${imp ? 'ft' : 'm'}</span>`);
  setText('out-flutter', fmt(O.flutterSpeed,  1) + ` <span class="dc-unit">${imp ? 'mph' : 'km/h'}</span>`);
  setText('out-thrust',  fmt(O.thrust,  1) + ` <span class="dc-unit">${imp ? 'lbs' : 'N'}</span>`);
  setText('out-propeff', fmt(O.propEff * 100, 1) + ' <span class="dc-unit">%</span>');
  setText('out-proptc',  fmt(O.propTC,  4));
  setText('out-machangle', O.mach > 1 ? fmt(O.machAngle, 1) + ' <span class="dc-unit">°</span>' : '— (subsonic)');
  setText('out-sonicboom', O.mach > 1 ? fmt(O.sonicBoom, 4) + ' <span class="dc-unit">psi</span>' : '— (subsonic)');
  setText('out-boomdist',  O.mach > 1 ? fmt(O.boomDist,  0) + ` <span class="dc-unit">${imp ? 'ft' : 'm'}</span>` : '— (subsonic)');
  setText('out-wavecd',     fmt(O.waveCD,     5));
  setText('out-arearulecd', fmt(O.areaRuleCD, 4));
  setText('out-gust',   fmt(O.gust,    1) + ` <span class="dc-unit">${imp ? 'mph' : 'km/h'}</span>`);
  setText('out-turbaoa',fmt(O.turbAoa, 2) + ' <span class="dc-unit">°</span>');
  setText('out-turbcl', fmt(O.turbCL,  3));
  setText('out-turbcd', fmt(O.turbCD,  4));
  setText('out-phugoid',    fmt(O.phugoidT,     1) + ' <span class="dc-unit">s</span>');
  setText('out-phudamp',    fmt(O.phugoidDamp,  3));
  setText('out-shortperiod',fmt(O.shortPeriodT, 2) + ' <span class="dc-unit">s</span>');
  setText('out-fuelwt', fmt(O.fuelWeight,    0) + ` <span class="dc-unit">${imp ? 'lbs' : 'N'}</span>`);
  setText('out-curwt',  fmt(O.currentWeight, 0) + ` <span class="dc-unit">${imp ? 'lbs' : 'N'}</span>`);
  setText('out-clreq',  fmt(O.clRequired,    3));
  setText('out-vsact',  fmt(O.vsActual,      1) + ` <span class="dc-unit">${imp ? 'mph' : 'km/h'}</span>`);
  setText('out-totalthrust', fmt(O.totalThrust,   1) + ` <span class="dc-unit">${imp ? 'lbs' : 'N'}</span>`);
  setText('out-asymthrust',  fmt(O.asymThrust,    0) + ` <span class="dc-unit">ft·lbs</span>`);
  setText('out-vmca',        fmt(O.vmca,          1) + ` <span class="dc-unit">${imp ? 'mph' : 'km/h'}</span>`);
  setText('out-engoutdrag',  fmt(O.engineOutDrag, 1) + ` <span class="dc-unit">${imp ? 'lbs' : 'N'}</span>`);
  setText('out-dutchroll',  fmt(O.dutchRollT,   2) + ' <span class="dc-unit">s</span>');
  setText('out-aecl',    fmt(O.aeCL,          3));
  setText('out-geld',    fmt(O.geLD,    1));
  setText('out-recprofile', O.recProfile);
  setText('out-cp-pos', fmt(O.cp_pos, 3));
  setText('out-np-pos', fmt(O.np_pos, 3));
  setText('out-sm', fmt(O.sm, 3));
  setText('out-trimaoa', fmt(O.trimAoa, 2) + ' <span class="dc-unit">°</span>');
  setText('out-tods', fmt(O.takeoffDist, 0) + ` <span class="dc-unit">${imp ? 'ft' : 'm'}</span>`);
  setText('out-lds',  fmt(O.landingDist, 0) + ` <span class="dc-unit">${imp ? 'ft' : 'm'}</span>`);
  setText('out-optaoa', fmt(O.optAoa, 1) + ' <span class="dc-unit">°</span>');
  setText('out-maxld',  fmt(O.maxLD,  1));
  setText('out-wingletld',  fmt(O.wingletLD,  1));
  setText('out-wingletcdi', fmt(O.wingletCDi, 4));
  const vUnit2 = imp ? 'mph' : 'km/h';
  setText('out-gs', fmt(O.groundSpeed, 1) + ` <span class="dc-unit">${vUnit2}</span>`);
  setText('out-hw', fmt(O.headwind,    1) + ` <span class="dc-unit">${vUnit2}</span>`);
  setText('out-cw', fmt(O.crosswind,   1) + ` <span class="dc-unit">${vUnit2}</span>`);
  setText('out-stallfact', fmt(O.stallFact, 3));
  setText('out-arcor', S.arCorr ? 'ON' : 'OFF');
  setText('out-gamma', fmt(O.gamma, 3));

  const warnStall = document.getElementById('warn-stall');
  const warnAR    = document.getElementById('warn-ar');
  if (warnStall) warnStall.style.display = (Math.abs(S.aoa) > 10) ? '' : 'none';
  if (warnAR)    warnAR.style.display    = (O.ar < 4)              ? '' : 'none';

  // Atmosphere
  const rhoUnit = imp ? 'slug/ft³' : 'kg/m³';
  const rhoDisp = imp ? O.rho : O.rho * 515.379;
  setText('out-rho',  fmt(rhoDisp, 5) + ` <span class="dc-unit">${rhoUnit}</span>`);
  const psDisp = imp ? (O.ps0 / 2116 * 14.696) : (O.ps0 * 47.88 / 1000);
  const psUnit = imp ? 'psi' : 'kPa';
  setText('out-ps',   fmt(psDisp, 2) + ` <span class="dc-unit">${psUnit}</span>`);
  const tempDisp = imp ? O.temf : (O.temf - 32) * 5 / 9;
  const tempUnit = imp ? '°F' : '°C';
  setText('out-temp', fmt(tempDisp, 1) + ` <span class="dc-unit">${tempUnit}</span>`);
  setText('out-layer', O.layer);
  setText('out-isadev', fmt(O.isa_dev, 1) + ` <span class="dc-unit">${imp ? '°F' : '°C'}</span>`);

  // Flight bar readouts
  setText('fv-rho', rhoDisp.toFixed(5));
  setText('fv-q',   imp ? O.q0.toFixed(1) : (O.q0 * 47.88).toFixed(0));
  const reK = (O.re / 1000).toFixed(0);
  setText('fv-re',  reK + 'k');

  // Status line
  const cl_str = O.cl.toFixed(3);
  const ld_str = O.ld > 0 ? O.ld.toFixed(1) : '0';
  document.getElementById('statusLine').textContent =
    `CL ${cl_str}  ·  CDi ${O.cdi.toFixed(4)}  ·  L/D ${ld_str}  ·  ${O.layer}  ·  ρ ${rhoDisp.toExponential(2)}`;
}

function setText(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// ─── MAIN UPDATE FUNCTION ─────────────────────────────────────
function update(rebuild3D = true) {
  computeAero();
  displayOutputs();
  if (rebuild3D) buildWing();
  drawFoilCanvas();
  if (S.disp.cp) drawCpCanvas();
  if (S.disp.flow) drawFlowField();
  if (S.disp.clplot) drawClPlot();
  if (S.disp.liftmeter) drawLiftMeter();
  if (S.disp.particles) {
    stopParticles();
    startParticles();
  }
}

// ─── INIT ────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  setUnitFactors();
  updateUnitLabels();
  initThree();
  syncSliders();
  refreshPresetList();
  update();
  convertUnits();
  loadFromURL();
  document.getElementById('statusLine').textContent = 'AERO-SIM — Pickle Brothers — READY';
});