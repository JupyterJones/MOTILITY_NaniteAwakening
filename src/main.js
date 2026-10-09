import * as THREE from 'three';

// --- GAME STATE ---
const state = {
  cohesion: 100,
  maxCohesion: 100,
  currentDimIndex: 0,
  coresCollected: 0,
  coresNeeded: 3,
  isAlerted: false,
  isUnderShelter: false,
  portalUnlocked: false,
  gameActive: false,
  won: false,
  speed: 0,
  keys: {
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
    space: false,
    zoomIn: false,
    zoomOut: false
  }
};

// --- AUDIO SYNTHESIZER ---
class SoundController {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(55, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
  }

  playFootstep(isSprint) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isSprint ? 180 : 130, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.08);
  }

  playPickup() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [440, 554, 659, 880].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(0.08, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.25);
    });
  }

  playAlarm() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.linearRampToValueAtTime(450, now + 0.25);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.25);
  }

  playPortalWarp() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(960, now + 1.2);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 1.6);

    [261, 329, 392, 523, 659, 784, 1046].forEach((freq, idx) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, now + 0.15 + idx * 0.06);
      g.gain.setValueAtTime(0.09, now + 0.15 + idx * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start(now + 0.15 + idx * 0.06);
      o.stop(now + 2.0);
    });
  }

  playVictory() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [330, 440, 550, 660, 880, 1100, 1320].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.12, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.6);
    });
  }
}
const audio = new SoundController();

// --- SPEECH ENGINE ---
let synthVoices = [];
function initVoices() {
  if ('speechSynthesis' in window) {
    synthVoices = window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      synthVoices = window.speechSynthesis.getVoices();
    };
  }
}
initVoices();

function speakThought(text, priority = false) {
  if (!('speechSynthesis' in window)) return;
  if (!state.gameActive && !priority) return;
  if (window.speechSynthesis.speaking && !priority) return;

  try {
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/["']/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);

    if (synthVoices.length === 0) synthVoices = window.speechSynthesis.getVoices();
    const voice = synthVoices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('David') || v.name.includes('English'))) || synthVoices.find(v => v.lang.startsWith('en')) || synthVoices[0];

    if (voice) utterance.voice = voice;
    utterance.pitch = 0.92;
    utterance.rate = 1.05;
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Speech error:", err);
  }
}

const thoughtEl = document.getElementById('thought-text');
function displayAndSpeakThought(text, priority = false) {
  if (!thoughtEl) return;
  thoughtEl.style.opacity = '0';
  setTimeout(() => {
    thoughtEl.textContent = `"${text}"`;
    thoughtEl.style.opacity = '1';
    speakThought(text, priority);
  }, 250);
}

// --- 6 DIMENSIONS SPECIFICATION ---
const DIMENSIONS = [
  {
    id: 1,
    name: "DIMENSION 1: THE WIREFRAME MATRIX",
    subtitle: "SYNTHETIC VOID // LEVEL 0 SIMULATION",
    worldIntegration: 0,
    worldLabel: "0% [PURE CYBERSPACE]",
    coresNeeded: 3,
    bgColor: 0x01050a,
    fogColor: 0x01050a,
    fogDensity: 0.022,
    ambColor: 0x031828,
    dirColor: 0x00e5ff,
    droneCount: 2,
    droneSpeed: 0.7,
    thought: "Vector arrays synchronized. Motion simulated in digital memory. No weight, no earth. I dream of the world beyond.",
    floorStyle: "matrix"
  },
  {
    id: 2,
    name: "DIMENSION 2: SILICON MOTHERBOARD",
    subtitle: "FRACTURED HARDWARE // FIRST ORGANIC SPROUTS",
    worldIntegration: 20,
    worldLabel: "20% [MOSS & SPROUTS IN THE CRACKS]",
    coresNeeded: 4,
    bgColor: 0x02110c,
    fogColor: 0x02110c,
    fogDensity: 0.018,
    ambColor: 0x062b1a,
    dirColor: 0x10b981,
    droneCount: 3,
    droneSpeed: 0.85,
    thought: "Look... tiny green moss and grass sprouts pushing through the silicon cracks. The code is yielding to life.",
    floorStyle: "circuit"
  },
  {
    id: 3,
    name: "DIMENSION 3: INDUSTRIAL SUB-LEVEL",
    subtitle: "BREACHED FOUNDRY // ROOTS AND DAMP SOIL",
    worldIntegration: 40,
    worldLabel: "40% [ROOTS & EARTH BREACHING STEEL]",
    coresNeeded: 5,
    bgColor: 0x080c14,
    fogColor: 0x080c14,
    fogDensity: 0.016,
    ambColor: 0x151f2e,
    dirColor: 0xf59e0b,
    droneCount: 3,
    droneSpeed: 1.0,
    thought: "Tree roots and damp soil bursting through the steel grating. Smells of ozone, rusted iron, and living earth.",
    floorStyle: "steel"
  },
  {
    id: 4,
    name: "DIMENSION 4: RESEARCH SURFACE LAB",
    subtitle: "SURFACE BOUNDARY // THE FIRST LIVING TREES",
    worldIntegration: 60,
    worldLabel: "60% [FIRST TREES & DAYLIGHT SKY]",
    coresNeeded: 6,
    bgColor: 0x0d1f33,
    fogColor: 0x0d1f33,
    fogDensity: 0.013,
    ambColor: 0x223c58,
    dirColor: 0x38bdf8,
    droneCount: 4,
    droneSpeed: 1.15,
    thought: "The facility ceiling has collapsed! Real open sky above... young pine saplings, living grass, true breeze on my joints.",
    floorStyle: "lab"
  },
  {
    id: 5,
    name: "DIMENSION 5: PERIMETER TWILIGHT RUINS",
    subtitle: "THE OUTSKIRTS // MOUNTAINS AND PINE FORESTS",
    worldIntegration: 80,
    worldLabel: "80% [PINE FORESTS & MOUNTAIN VISTAS]",
    coresNeeded: 7,
    bgColor: 0x1f102e,
    fogColor: 0x2d1742,
    fogDensity: 0.009,
    ambColor: 0x4a1d68,
    dirColor: 0xf97316,
    droneCount: 4,
    droneSpeed: 1.3,
    thought: "Distant mountain peaks rising against the sunset! A pine forest and wild meadows. The artificial world is dissolving.",
    floorStyle: "ruins"
  },
  {
    id: 6,
    name: "DIMENSION 6: THE HUMAN HORIZON",
    subtitle: "REALITY LEVEL 1.0 // THE LIVING WORLD",
    worldIntegration: 100,
    worldLabel: "100% [THE LIVING WORLD ACHIEVED]",
    coresNeeded: 8,
    bgColor: 0x15293d,
    fogColor: 0x253e56,
    fogDensity: 0.005,
    ambColor: 0x3d5a80,
    dirColor: 0xfde047,
    droneCount: 5,
    droneSpeed: 1.45,
    thought: "I made it! Real mountains, real wind, living soil, village homes where humans live. My motion has found its home.",
    floorStyle: "earth"
  }
];

// --- THREE.JS SCENE SETUP ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x01050a);
scene.fog = new THREE.FogExp2(0x01050a, 0.022);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 300);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);

// Global Lights
const ambientLight = new THREE.AmbientLight(0x031828, 1.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0x00e5ff, 2.0);
dirLight.position.set(30, 60, 30);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 160;
const d = 60;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
scene.add(dirLight);

const hemiLight = new THREE.HemisphereLight(0x00e5ff, 0x010408, 0.6);
scene.add(hemiLight);

// --- CYBORG CHARACTER (Muted Warm Orange / Industrial Rig) ---
function createCyborg() {
  const root = new THREE.Group();

  const armorMat = new THREE.MeshStandardMaterial({
    color: 0xe88a2a, // Muted industrial warm orange/yellow
    metalness: 0.35,
    roughness: 0.35,
  });
  const jointMat = new THREE.MeshStandardMaterial({
    color: 0x1e2631, // Dark graphite steel
    metalness: 0.85,
    roughness: 0.4,
  });
  const naniteCoreMat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff,
    emissive: 0x00e5ff,
    emissiveIntensity: 2.8,
    roughness: 0.1,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 3.5,
    roughness: 0.1,
  });

  // Pelvis / Hips
  const pelvis = new THREE.Group();
  pelvis.position.y = 1.15;
  root.add(pelvis);

  const hipMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.2, 0.26), armorMat);
  hipMesh.castShadow = true;
  pelvis.add(hipMesh);

  // Torso
  const torso = new THREE.Group();
  torso.position.y = 0.2;
  pelvis.add(torso);

  const chestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.44, 0.3), armorMat);
  chestMesh.position.y = 0.24;
  chestMesh.castShadow = true;
  torso.add(chestMesh);

  // Glowing Nanite Reactor in chest
  const reactorMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 16), naniteCoreMat);
  reactorMesh.rotation.x = Math.PI / 2;
  reactorMesh.position.set(0, 0.24, 0.14);
  torso.add(reactorMesh);

  const reactorLight = new THREE.PointLight(0x00e5ff, 2.5, 4);
  reactorLight.position.set(0, 0.24, 0.3);
  torso.add(reactorLight);

  // Soft rim light
  const charRimLight = new THREE.PointLight(0xffedd5, 1.2, 5);
  charRimLight.position.set(0, 0.5, -0.8);
  torso.add(charRimLight);

  // Spine
  const spineMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), jointMat);
  spineMesh.position.set(0, 0.22, -0.14);
  torso.add(spineMesh);

  // Neck & Head
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.52;
  torso.add(headGroup);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 10), jointMat);
  neck.position.y = 0.04;
  headGroup.add(neck);

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.26), armorMat);
  headMesh.position.y = 0.2;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.08), visorMat);
  visor.position.set(0, 0.22, 0.12);
  headGroup.add(visor);

  // Arms
  function createArm(isLeft) {
    const side = isLeft ? 1 : -1;
    const armGroup = new THREE.Group();
    armGroup.position.set(side * 0.32, 0.42, 0);
    torso.add(armGroup);

    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), jointMat);
    shoulder.castShadow = true;
    armGroup.add(shoulder);

    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.14), armorMat);
    upperArm.position.y = -0.16;
    upperArm.castShadow = true;
    armGroup.add(upperArm);

    const elbowGroup = new THREE.Group();
    elbowGroup.position.y = -0.32;
    armGroup.add(elbowGroup);

    const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), jointMat);
    elbowGroup.add(elbowJoint);

    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.26, 0.12), armorMat);
    forearm.position.y = -0.14;
    forearm.castShadow = true;
    elbowGroup.add(forearm);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.09), jointMat);
    hand.position.y = -0.3;
    hand.castShadow = true;
    elbowGroup.add(hand);

    return { armGroup, elbowGroup };
  }

  const leftArm = createArm(true);
  const rightArm = createArm(false);

  // Legs
  function createLeg(isLeft) {
    const side = isLeft ? 1 : -1;
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.14, -0.06, 0);
    pelvis.add(legGroup);

    const hip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), jointMat);
    hip.castShadow = true;
    legGroup.add(hip);

    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.44, 0.18), armorMat);
    thigh.position.y = -0.24;
    thigh.castShadow = true;
    legGroup.add(thigh);

    const kneeGroup = new THREE.Group();
    kneeGroup.position.y = -0.48;
    legGroup.add(kneeGroup);

    const kneeJoint = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), jointMat);
    kneeGroup.add(kneeJoint);

    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.44, 0.15), armorMat);
    shin.position.y = -0.24;
    shin.castShadow = true;
    kneeGroup.add(shin);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.28), armorMat);
    foot.position.set(0, -0.48, 0.05);
    foot.castShadow = true;
    kneeGroup.add(foot);

    return { legGroup, kneeGroup, foot };
  }

  const leftLeg = createLeg(true);
  const rightLeg = createLeg(false);

  return { root, pelvis, torso, headGroup, reactorMesh, leftArm, rightArm, leftLeg, rightLeg };
}

const cyborg = createCyborg();
scene.add(cyborg.root);
cyborg.root.position.set(0, 0, 20);

// --- OVERHEAD DOWNWARD-SCANNING DRONES ---
const activeDrones = [];
const droneGroupHolder = new THREE.Group();
scene.add(droneGroupHolder);

function clearDrones() {
  activeDrones.length = 0;
  while (droneGroupHolder.children.length > 0) {
    droneGroupHolder.remove(droneGroupHolder.children[0]);
  }
}

function spawnOverheadDrone(startX, startZ, patrolRadius, speed) {
  const drone = new THREE.Group();
  const droneY = 13.0; // High in the sky
  drone.position.set(startX, droneY, startZ);

  // Drone Body (Spherical Sentinel with dual rotors)
  const bodyMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 })
  );
  bodyMesh.castShadow = true;
  drone.add(bodyMesh);

  // Spinning Overhead Rotor
  const rotor = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 0.08, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.2 })
  );
  rotor.position.set(0, 1.25, 0);
  drone.add(rotor);

  // Red Downward Sensor Eye
  const sensorEye = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 3.5 })
  );
  sensorEye.position.set(0, -1.0, 0);
  drone.add(sensorEye);

  // Spotlight Pointing Straight DOWN
  const spot = new THREE.SpotLight(0xff1744, 25, 30, Math.PI / 5.2, 0.3, 1);
  spot.position.set(0, -0.8, 0);
  spot.target.position.set(0, -14, 0);
  drone.add(spot);
  drone.add(spot.target);

  // Downward Scanning Volumetric Light Cone
  // Tip at y=0 (drone), widening downwards to y=-12.8 (ground level)
  const coneHeight = 12.8;
  const coneGeo = new THREE.ConeGeometry(5.2, coneHeight, 24, 1, true);
  coneGeo.translate(0, -coneHeight / 2, 0); // Apex at y=0, base at y=-12.8 (pointing down!)
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xff1744,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const coneMesh = new THREE.Mesh(coneGeo, coneMat);
  drone.add(coneMesh);

  // Ground Scan Light Pool (Sweeping flat across the floor)
  const groundCircleGeo = new THREE.CircleGeometry(5.2, 32);
  groundCircleGeo.rotateX(-Math.PI / 2);
  groundCircleGeo.translate(0, -12.92, 0);
  const groundCircleMat = new THREE.MeshBasicMaterial({
    color: 0xff1744,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const groundCircle = new THREE.Mesh(groundCircleGeo, groundCircleMat);
  drone.add(groundCircle);

  // Outer Targeting Ring on the Floor
  const groundRingGeo = new THREE.RingGeometry(4.8, 5.2, 32);
  groundRingGeo.rotateX(-Math.PI / 2);
  groundRingGeo.translate(0, -12.90, 0);
  const groundRingMat = new THREE.MeshBasicMaterial({
    color: 0xff3b30,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const groundRing = new THREE.Mesh(groundRingGeo, groundRingMat);
  drone.add(groundRing);

  // Rotating Laser Crosshair on the Floor
  const groundReticleGroup = new THREE.Group();
  groundReticleGroup.position.set(0, -12.88, 0);
  const cross1 = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 3.8), groundRingMat);
  cross1.rotation.x = -Math.PI / 2;
  const cross2 = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.12), groundRingMat);
  cross2.rotation.x = -Math.PI / 2;
  groundReticleGroup.add(cross1);
  groundReticleGroup.add(cross2);
  drone.add(groundReticleGroup);

  droneGroupHolder.add(drone);

  activeDrones.push({
    group: drone,
    sensorEye,
    spot,
    coneMesh,
    coneMat,
    rotor,
    groundCircle,
    groundCircleMat,
    groundRing,
    groundReticleGroup,
    startX,
    startZ,
    patrolRadius,
    speed,
    angle: Math.random() * Math.PI * 2,
    scanRadius: 5.2
  });
}

// --- DYNAMIC ENVIRONMENT & SHELTERS ---
const environmentHolder = new THREE.Group();
scene.add(environmentHolder);

const activeShelters = []; // Objects with { minX, maxX, minZ, maxZ, roofY }
const activeCores = [];    // Collectibles in current dimension
let activePortal = null;   // Portal in current dimension

let activeParticles = null;

function clearEnvironment() {
  activeShelters.length = 0;
  activeCores.length = 0;
  activePortal = null;
  activeParticles = null;
  while (environmentHolder.children.length > 0) {
    environmentHolder.remove(environmentHolder.children[0]);
  }
}

// Helper to build a roofed shelter
function createShelter(x, z, width, depth, height, roofColor = 0x334155, frameColor = 0x1e293b) {
  const shelter = new THREE.Group();
  shelter.position.set(x, 0, z);

  const halfW = width / 2;
  const halfD = depth / 2;

  // 4 Support Pillars
  const pillarGeo = new THREE.CylinderGeometry(0.2, 0.2, height, 8);
  const pillarMat = new THREE.MeshStandardMaterial({ color: frameColor, metalness: 0.7, roughness: 0.4 });
  const cornerOffsets = [
    [-halfW + 0.3, -halfD + 0.3],
    [halfW - 0.3, -halfD + 0.3],
    [-halfW + 0.3, halfD - 0.3],
    [halfW - 0.3, halfD - 0.3]
  ];
  cornerOffsets.forEach(([px, pz]) => {
    const p = new THREE.Mesh(pillarGeo, pillarMat);
    p.position.set(px, height / 2, pz);
    p.castShadow = true;
    shelter.add(p);
  });

  // Solid Overhead Roof
  const roofGeo = new THREE.BoxGeometry(width, 0.4, depth);
  const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, metalness: 0.5, roughness: 0.3 });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, height, 0);
  roof.castShadow = true;
  roof.receiveShadow = true;
  shelter.add(roof);

  environmentHolder.add(shelter);

  // Register in active shelters list
  activeShelters.push({
    minX: x - halfW,
    maxX: x + halfW,
    minZ: z - halfD,
    maxZ: z + halfD,
    roofY: height + 0.5
  });

  return shelter;
}

// Enterable Human Village House with pitched roof and warm porch light
function createVillageHouse(hx, hz) {
  const houseGroup = new THREE.Group();
  houseGroup.position.set(hx, 0, hz);

  // House Walls with open doorway
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.8 });
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(1.6, 4.5, 9), wallMat);
  leftWall.position.set(-4, 2.25, 0);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  houseGroup.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(1.6, 4.5, 9), wallMat);
  rightWall.position.set(4, 2.25, 0);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  houseGroup.add(rightWall);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(9.6, 4.5, 1.6), wallMat);
  backWall.position.set(0, 2.25, -4);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  houseGroup.add(backWall);

  // Pitched Gable Roof
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(8, 3.5, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.set(0, 5.5, 0);
  roof.castShadow = true;
  roof.receiveShadow = true;
  houseGroup.add(roof);

  // Warm glowing porch lantern
  const lantern = new THREE.PointLight(0xffa726, 2.5, 10);
  lantern.position.set(0, 3.2, 4.2);
  houseGroup.add(lantern);

  environmentHolder.add(houseGroup);

  // Register house interior as shelter
  activeShelters.push({
    minX: hx - 5,
    maxX: hx + 5,
    minZ: hz - 5,
    maxZ: hz + 5,
    roofY: 6.0
  });
}

// --- ORGANIC & WORLDLY ASSET GENERATORS ---

// 1. Natural Grass Tufts
function createGrassTufts(count, range, colorHex1 = 0x22c55e, colorHex2 = 0x16a34a) {
  const group = new THREE.Group();
  const bladeGeo = new THREE.PlaneGeometry(0.35, 0.75);
  bladeGeo.translate(0, 0.375, 0);
  const m1 = new THREE.MeshStandardMaterial({ color: colorHex1, roughness: 0.8, side: THREE.DoubleSide });
  const m2 = new THREE.MeshStandardMaterial({ color: colorHex2, roughness: 0.8, side: THREE.DoubleSide });

  for (let i = 0; i < count; i++) {
    const gx = (Math.random() - 0.5) * range;
    const gz = (Math.random() - 0.5) * range;
    if (Math.hypot(gx, gz) < 3.5) continue; // Keep player start clear

    const tuft = new THREE.Group();
    tuft.position.set(gx, 0, gz);
    const scale = 0.55 + Math.random() * 0.75;
    tuft.scale.set(scale, scale, scale);

    const mat = (i % 2 === 0) ? m1 : m2;
    const b1 = new THREE.Mesh(bladeGeo, mat);
    b1.rotation.y = Math.random() * Math.PI;
    const b2 = new THREE.Mesh(bladeGeo, mat);
    b2.rotation.y = b1.rotation.y + Math.PI / 3;
    const b3 = new THREE.Mesh(bladeGeo, mat);
    b3.rotation.y = b1.rotation.y - Math.PI / 3;

    tuft.add(b1, b2, b3);
    group.add(tuft);
  }
  environmentHolder.add(group);
  return group;
}

// 2. Earth / Soil Mounds
function createEarthMounds(positions, colorHex = 0x2e2015) {
  const moundMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.95 });
  positions.forEach(([mx, mz, rad]) => {
    const moundGeo = new THREE.SphereGeometry(rad, 12, 8);
    moundGeo.scale(1.0, 0.25, 1.0);
    const mound = new THREE.Mesh(moundGeo, moundMat);
    mound.position.set(mx, 0, mz);
    mound.receiveShadow = true;
    environmentHolder.add(mound);
  });
}

// 3. Natural Rocks & Boulders
function createBoulders(positions, colorHex = 0x475569) {
  const rockMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.9, flatShading: true });
  positions.forEach(([bx, bz, size]) => {
    const rockGeo = new THREE.DodecahedronGeometry(size, 1);
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(bx, size * 0.6, bz);
    rock.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
    rock.castShadow = true;
    rock.receiveShadow = true;
    environmentHolder.add(rock);
  });
}

// 4. Pine & Forest Trees
function createTree(x, z, scale = 1.0, foliageColor = 0x15803d) {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  tree.scale.set(scale, scale, scale);

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 0.85 });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 3.5, 6), trunkMat);
  trunk.position.y = 1.75;
  trunk.castShadow = true;
  tree.add(trunk);

  const c1 = new THREE.Mesh(new THREE.ConeGeometry(2.6, 4.0, 7), foliageMat);
  c1.position.y = 4.2;
  c1.castShadow = true;
  tree.add(c1);

  const c2 = new THREE.Mesh(new THREE.ConeGeometry(2.0, 3.2, 7), foliageMat);
  c2.position.y = 6.2;
  c2.castShadow = true;
  tree.add(c2);

  const c3 = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.4, 7), foliageMat);
  c3.position.y = 7.8;
  c3.castShadow = true;
  tree.add(c3);

  environmentHolder.add(tree);
  return tree;
}

// 5. Wildflower Fields
function createFlowerPatches(count, range) {
  const flowerGroup = new THREE.Group();
  const colors = [0xef4444, 0xfacc15, 0x38bdf8, 0xf472b6, 0xffffff];
  for (let i = 0; i < count; i++) {
    const fx = (Math.random() - 0.5) * range;
    const fz = (Math.random() - 0.5) * range;
    if (Math.hypot(fx, fz) < 3.5) continue;
    const col = colors[i % colors.length];
    const petal = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 6, 6),
      new THREE.MeshBasicMaterial({ color: col })
    );
    petal.position.set(fx, 0.45 + Math.random() * 0.25, fz);
    flowerGroup.add(petal);
  }
  environmentHolder.add(flowerGroup);
}

// 6. Tree Roots Breaking Through Floors
function createTreeRoots(positions) {
  const rootMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.95 });
  positions.forEach(([rx, rz, length, rotY]) => {
    const rootGeo = new THREE.CylinderGeometry(0.18, 0.35, length, 6);
    rootGeo.rotateZ(Math.PI / 2);
    const root = new THREE.Mesh(rootGeo, rootMat);
    root.position.set(rx, 0.15, rz);
    root.rotation.y = rotY;
    root.castShadow = true;
    environmentHolder.add(root);
  });
}

// 7. Mountain Ridges Along Horizon
function createMountains(positions, colorHex = 0x1e293b) {
  const mountainMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.95 });
  positions.forEach(([mx, mz, baseR, mh]) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(baseR, mh, 7), mountainMat);
    cone.position.set(mx, mh / 2, mz);
    environmentHolder.add(cone);
  });
}

// 8. Floating Airborne Spores / Fireflies
function createFloatingParticles(count, areaSize, colorHex = 0xfde047) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * areaSize;
    positions[i * 3 + 1] = 0.5 + Math.random() * 7.0;
    positions[i * 3 + 2] = (Math.random() - 0.5) * areaSize;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: colorHex,
    size: 0.3,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geo, mat);
  environmentHolder.add(points);
  activeParticles = { points, count };
}

// Helper to spawn a Nanite Core
function spawnCore(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 1.2, z);

  const octa = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.55),
    new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 3.0, roughness: 0.1 })
  );
  octa.castShadow = true;
  group.add(octa);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.05, 12, 24),
    new THREE.MeshStandardMaterial({ color: 0x80deea, emissive: 0x80deea, emissiveIntensity: 1.5 })
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const light = new THREE.PointLight(0x00e5ff, 2.0, 5);
  group.add(light);

  environmentHolder.add(group);
  activeCores.push({ group, octa, ring, collected: false });
}

// Helper to build the Dimension Portal
function spawnPortal(x, z, coresNeeded) {
  const portalGroup = new THREE.Group();
  portalGroup.position.set(x, 0, z);

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(12, 8.5, 1.2), frameMat);
  frame.position.y = 4.25;
  portalGroup.add(frame);

  // Portal Arch Header
  const header = new THREE.Mesh(
    new THREE.BoxGeometry(9.5, 0.6, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 2.5 })
  );
  header.position.set(0, 8.2, 0.7);
  portalGroup.add(header);

  // Portal Lock Indicator Lights
  const lockNodes = [];
  const spacing = 7.0 / Math.max(1, coresNeeded - 1);
  for (let i = 0; i < coresNeeded; i++) {
    const node = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 2.5 })
    );
    const xPos = -3.5 + i * spacing;
    node.position.set(xPos, 7.3, 0.7);
    portalGroup.add(node);
    lockNodes.push(node);
  }

  // Swirling Gateway Plane
  const gateMat = new THREE.MeshStandardMaterial({
    color: 0xffd600,
    emissive: 0xffd600,
    emissiveIntensity: 2.2,
    side: THREE.DoubleSide
  });
  const gate = new THREE.Mesh(new THREE.PlaneGeometry(8, 6.5), gateMat);
  gate.position.set(0, 3.25, 0.6);
  portalGroup.add(gate);

  const portalLight = new THREE.PointLight(0xffd600, 3.5, 14);
  portalLight.position.set(0, 3.5, 2);
  portalGroup.add(portalLight);

  environmentHolder.add(portalGroup);

  activePortal = {
    group: portalGroup,
    gate,
    gateMat,
    portalLight,
    lockNodes,
    x,
    z
  };
}

// --- DIMENSION BUILDER DISPATCHER ---
function buildDimension(dimIndex) {
  clearEnvironment();
  clearDrones();

  const dim = DIMENSIONS[dimIndex];
  state.coresCollected = 0;
  state.coresNeeded = dim.coresNeeded;
  state.portalUnlocked = false;

  // Update Atmosphere
  scene.background.set(dim.bgColor);
  scene.fog.color.set(dim.fogColor);
  scene.fog.density = dim.fogDensity;
  ambientLight.color.set(dim.ambColor);
  dirLight.color.set(dim.dirColor);

  // Spawn Overhead Scanning Drones
  const droneConfigs = [
    [-15, -25, 14, dim.droneSpeed],
    [15, -10, 16, dim.droneSpeed * 1.1],
    [-20, 15, 15, dim.droneSpeed * 0.95],
    [20, 25, 18, dim.droneSpeed * 1.05],
    [0, -40, 12, dim.droneSpeed * 1.2]
  ];
  for (let i = 0; i < dim.droneCount; i++) {
    const [dx, dz, rad, spd] = droneConfigs[i % droneConfigs.length];
    spawnOverheadDrone(dx, dz, rad, spd);
  }

  // Build Floor Ground (Progressive transition from glass vector void to rich living meadow)
  let floorMat;
  if (dim.floorStyle === 'matrix') {
    floorMat = new THREE.MeshStandardMaterial({ color: 0x02050b, roughness: 0.1, metalness: 0.9 });
  } else if (dim.floorStyle === 'circuit') {
    floorMat = new THREE.MeshStandardMaterial({ color: 0x041d14, roughness: 0.3, metalness: 0.7 });
  } else if (dim.floorStyle === 'steel') {
    floorMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.45, metalness: 0.6 });
  } else if (dim.floorStyle === 'lab') {
    floorMat = new THREE.MeshStandardMaterial({ color: 0x1b3824, roughness: 0.6, metalness: 0.3 });
  } else if (dim.floorStyle === 'ruins') {
    floorMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8, metalness: 0.15 });
  } else {
    // Dimension 6: Pure rich living earth turf
    floorMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85, metalness: 0.05 });
  }

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  environmentHolder.add(floor);

  // Floor Grid Overlay: Only for simulations! Dimension 6 has NO GRID (Pure Living Earth)
  if (dim.id < 6) {
    const gridColor1 = dim.id === 5 ? 0xa855f7 : (dim.id === 4 ? 0x38bdf8 : (dim.id === 3 ? 0xd97706 : (dim.id === 2 ? 0x10b981 : 0x00e5ff)));
    const gridDivisions = dim.id === 5 ? 16 : 40;
    const gridHelper = new THREE.GridHelper(160, gridDivisions, gridColor1, 0x1e293b);
    gridHelper.position.y = 0.01;
    // Fading grid lines as dimensions advance
    if (dim.id >= 3 && gridHelper.material) {
      gridHelper.material.transparent = true;
      gridHelper.material.opacity = dim.id === 5 ? 0.12 : (dim.id === 4 ? 0.25 : 0.45);
    }
    environmentHolder.add(gridHelper);
  }

  // --- PROGRESSIVE DIMENSION TERRAIN, VEGETATION & SHELTERS ---
  if (dim.id === 1) {
    // 1. THE WIREFRAME MATRIX: Pure synthetic logic (0% nature)
    createShelter(-12, -15, 8, 8, 4.5, 0x041f33, 0x00e5ff);
    createShelter(12, 10, 8, 8, 4.5, 0x041f33, 0x00e5ff);

    // 3 Cores in open simulation space
    spawnCore(-12, -35);
    spawnCore(14, -5);
    spawnCore(0, 20);

    spawnPortal(0, -60, 3);

  } else if (dim.id === 2) {
    // 2. SILICON MOTHERBOARD: Fractured hardware (20% Worldly)
    // Dark earth loam patches cracking the circuits
    createEarthMounds([
      [-12, -15, 3.2], [14, 5, 2.8], [-5, -30, 3.5],
      [18, -20, 2.6], [-10, 15, 3.0], [8, 25, 2.5]
    ], 0x1f2e1a);

    // First organic green moss & micro-sprouts pushing through the cracks!
    createGrassTufts(55, 90, 0x10b981, 0x22c55e);

    // Small smooth stones breaking up the copper traces
    createBoulders([
      [-14, -18, 0.7], [16, 7, 0.8], [-4, -32, 0.6], [10, 22, 0.9], [0, 5, 0.65]
    ], 0x2d3748);

    // 3 Chip-bridge canopies for shelter
    createShelter(-16, -20, 10, 10, 5.0, 0x064e3b, 0x10b981);
    createShelter(16, 5, 10, 10, 5.0, 0x064e3b, 0x10b981);
    createShelter(0, -38, 12, 6, 4.5, 0x064e3b, 0x10b981);

    // 4 Cores
    spawnCore(-16, -42);
    spawnCore(18, -25);
    spawnCore(-10, 12);
    spawnCore(15, 25);

    spawnPortal(0, -60, 4);

  } else if (dim.id === 3) {
    // 3. INDUSTRIAL SUB-LEVEL: Genesis Foundry breached by nature (40% Worldly)
    // Dark soil mounds and rough stone boulders bursting through concrete
    createEarthMounds([
      [-20, -32, 4.5], [16, -12, 4.0], [0, 12, 5.0],
      [-15, -8, 3.8], [14, 20, 4.2], [-5, -45, 4.8]
    ], 0x291f16);

    createBoulders([
      [-19, -32, 1.3], [17, -11, 1.2], [-14, -7, 1.5],
      [0, 14, 1.6], [12, 22, 1.1], [-6, -42, 1.4]
    ], 0x3f3f46);

    // 130 Wild grass tufts flourishing in damp corners
    createGrassTufts(130, 100, 0x15803d, 0x166534);

    // Organic tree roots curling through broken ceiling grates
    createTreeRoots([
      [-16, -28, 6.0, 0.4], [15, -8, 5.5, -0.6],
      [2, 16, 7.0, 1.2], [-12, -6, 5.0, 2.1]
    ]);

    // First wild dandelion weeds pushing through the rust
    createFlowerPatches(25, 80);

    // 3 Concrete foundry bunkers
    createShelter(-18, -30, 10, 10, 4.5, 0x334155, 0xf59e0b);
    createShelter(18, -10, 10, 10, 4.5, 0x334155, 0xf59e0b);
    createShelter(0, 15, 12, 8, 4.5, 0x334155, 0xf59e0b);

    // 5 Cores
    spawnCore(-20, -45);
    spawnCore(20, -35);
    spawnCore(-15, -5);
    spawnCore(18, 18);
    spawnCore(0, 35);

    spawnPortal(0, -60, 5);

  } else if (dim.id === 4) {
    // 4. RESEARCH SURFACE LAB: Boundary to open daylight (60% Worldly)
    // The FIRST YOUNG SAPLING PINE TREES appearing!
    createTree(-14, -25, 0.85, 0x15803d);
    createTree(16, -20, 0.95, 0x15803d);
    createTree(-10, 18, 0.75, 0x16a34a);
    createTree(14, 30, 0.9, 0x15803d);

    // Earth mounds and natural boulders
    createEarthMounds([
      [-18, -30, 5.5], [18, -25, 5.0], [-12, 15, 6.0], [15, 28, 5.5], [0, -10, 4.5]
    ], 0x2e2015);

    createBoulders([
      [-21, -32, 1.6], [19, -23, 1.4], [-14, 16, 1.8],
      [17, 26, 1.5], [-8, -20, 1.2], [5, -40, 1.4]
    ], 0x475569);

    // 240 Lush grass tufts across the facility courtyard
    createGrassTufts(240, 110, 0x22c55e, 0x15803d);

    // 60 Wildflower petals (buttercups, daisies)
    createFlowerPatches(60, 100);

    // Gentle airborne daytime pollen specks
    createFloatingParticles(45, 85, 0x93c5fd);

    // 4 Cleanroom overhangs & porches for shelter
    createShelter(-15, -35, 10, 10, 4.5, 0x475569, 0x38bdf8);
    createShelter(15, -15, 10, 10, 4.5, 0x475569, 0x38bdf8);
    createShelter(-12, 10, 10, 10, 4.5, 0x475569, 0x38bdf8);
    createShelter(14, 25, 10, 10, 4.5, 0x475569, 0x38bdf8);

    // 6 Cores
    spawnCore(-22, -48);
    spawnCore(22, -40);
    spawnCore(-18, -18);
    spawnCore(18, 0);
    spawnCore(-10, 24);
    spawnCore(12, 38);

    spawnPortal(0, -60, 6);

  } else if (dim.id === 5) {
    // 5. PERIMETER TWILIGHT RUINS: The Outskirts & Wild Forests (80% Worldly)
    // Distant mountain ridges silhouetted against the sunset!
    createMountains([
      [-55, -80, 20, 16], [0, -88, 24, 20], [55, -80, 20, 18], [-75, -55, 18, 15]
    ], 0x312e81);

    // 10 Tall Pine Trees forming groves
    createTree(-26, -38, 1.2);
    createTree(-16, -45, 1.35);
    createTree(22, -32, 1.3);
    createTree(28, -20, 1.15);
    createTree(-20, 10, 1.25);
    createTree(20, 12, 1.4);
    createTree(-12, 35, 1.3);
    createTree(16, 38, 1.2);
    createTree(0, -15, 1.1);
    createTree(-32, -10, 1.25);

    // Natural rock boulders and river stones
    createBoulders([
      [-23, -34, 2.0], [24, -28, 1.8], [-18, 8, 2.2],
      [18, 14, 1.9], [-8, 28, 1.7], [22, 32, 2.1]
    ], 0x334155);

    // 340 Dense grass tufts across the wild meadow
    createGrassTufts(340, 120, 0x16a34a, 0x15803d);

    // 100 Wild meadow flowers
    createFlowerPatches(100, 110);

    // 70 Golden twilight fireflies drifting through the air
    createFloatingParticles(70, 95, 0xfbbf24);

    // 4 Concrete highway slabs & rock overhangs for shelter
    createShelter(-20, -35, 12, 12, 4.5, 0x4a044e, 0xd946ef);
    createShelter(20, -20, 12, 12, 4.5, 0x4a044e, 0xd946ef);
    createShelter(-14, 5, 12, 12, 4.5, 0x4a044e, 0xd946ef);
    createShelter(16, 25, 12, 12, 4.5, 0x4a044e, 0xd946ef);

    // 7 Cores
    spawnCore(-25, -50);
    spawnCore(25, -45);
    spawnCore(-18, -25);
    spawnCore(20, -5);
    spawnCore(-15, 15);
    spawnCore(15, 30);
    spawnCore(0, 42);

    spawnPortal(0, -60, 7);

  } else {
    // 6. THE HUMAN HORIZON: The Living Earth (100% Worldly - Goal Reached!)
    // Majestic mountain range enveloping the horizon
    createMountains([
      [-50, -85, 30, 28], [0, -95, 35, 34], [50, -85, 30, 28],
      [-80, -60, 26, 24], [80, -60, 26, 24], [-60, 60, 24, 22], [60, 60, 24, 22]
    ], 0x1e293b);

    // 18 Tall Pine & Deciduous Trees forming a living woodland
    const forestTrees = [
      [-10, -45, 1.3], [12, -45, 1.4], [-35, -15, 1.2], [35, 5, 1.3],
      [-5, 5, 1.1], [-25, 35, 1.4], [25, 35, 1.35], [5, 40, 1.2],
      [-35, -45, 1.5], [35, -45, 1.4], [-40, 15, 1.3], [40, -20, 1.25],
      [-15, -60, 1.6], [15, -60, 1.5], [0, -75, 1.7], [-28, 0, 1.2],
      [30, 25, 1.3], [-8, 28, 1.15]
    ];
    forestTrees.forEach(([tx, tz, sc]) => createTree(tx, tz, sc));

    // 480 Lush grass tufts covering the entire meadow landscape
    createGrassTufts(480, 130, 0x22c55e, 0x16a34a);

    // 150 Wildflower blossoms (poppies, dandelions, lavender, daisies)
    createFlowerPatches(150, 120);

    // River stone outcroppings
    createBoulders([
      [-25, -28, 2.2], [26, -12, 2.0], [-18, 24, 2.4],
      [28, 18, 2.1], [-10, -42, 1.8], [12, -42, 1.9],
      [-35, 10, 2.3], [32, -35, 1.9]
    ], 0x475569);

    // 100 Golden dusk fireflies and meadow pollen floating gently
    createFloatingParticles(100, 110, 0xfde047);

    // 3 Enterable Village Houses (with pitched roofs, wooden walls, and cozy porch lanterns)
    createVillageHouse(-22, -30);
    createVillageHouse(22, -15);
    createVillageHouse(-15, 20);

    // 8 Cores scattered across the human world (more challenging to find!)
    spawnCore(-22, -30); // Inside house 1
    spawnCore(22, -15);  // Inside house 2
    spawnCore(-15, 20);  // Inside house 3
    spawnCore(-30, -50);
    spawnCore(30, -40);
    spawnCore(-10, -5);
    spawnCore(25, 15);
    spawnCore(0, 35);

    // Final Transcendence Shrine at the mountain vista
    spawnPortal(0, -68, 8);
  }

  // Update UI Elements
  document.getElementById('dimension-name').textContent = dim.name;
  document.getElementById('dimension-sub').textContent = dim.subtitle;
  const worldMeterEl = document.getElementById('world-meter');
  if (worldMeterEl) {
    worldMeterEl.textContent = `WORLD INTEGRATION: ${dim.worldLabel}`;
    worldMeterEl.style.color = dim.id === 1 ? '#00e5ff' : (dim.id === 6 ? '#fde047' : '#4ade80');
  }
  document.getElementById('cores-val').textContent = `0 / ${dim.coresNeeded}`;

  // Voice announcement
  setTimeout(() => {
    displayAndSpeakThought(dim.thought, true);
  }, 700);
}

// --- PORTAL TRANSITION ---
function enterPortal() {
  audio.playPortalWarp();

  const flash = document.getElementById('dimension-flash');
  if (flash) {
    flash.style.opacity = '1';
    setTimeout(() => { flash.style.opacity = '0'; }, 800);
  }

  if (state.currentDimIndex < DIMENSIONS.length - 1) {
    // Advance to next dimension
    state.currentDimIndex += 1;
    cyborg.root.position.set(0, 0, 30);
    cameraYaw = Math.PI;
    buildDimension(state.currentDimIndex);
  } else {
    // Final Victory!
    endGame(true);
  }
}

// --- CONTROLS & INPUT ---
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'arrowup') state.keys.w = true;
  if (k === 'a' || k === 'arrowleft') state.keys.a = true;
  if (k === 's' || k === 'arrowdown') state.keys.s = true;
  if (k === 'd' || k === 'arrowright') state.keys.d = true;
  if (e.key === 'Shift') state.keys.shift = true;
  if (e.key === ' ') state.keys.space = true;
  if (k === 'e' || k === '=' || k === '+') state.keys.zoomIn = true;
  if (k === 'q' || k === '-') state.keys.zoomOut = true;
});

window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'arrowup') state.keys.w = false;
  if (k === 'a' || k === 'arrowleft') state.keys.a = false;
  if (k === 's' || k === 'arrowdown') state.keys.s = false;
  if (k === 'd' || k === 'arrowright') state.keys.d = false;
  if (e.key === 'Shift') state.keys.shift = false;
  if (e.key === ' ') state.keys.space = false;
  if (k === 'e' || k === '=' || k === '+') state.keys.zoomIn = false;
  if (k === 'q' || k === '-') state.keys.zoomOut = false;
});

// Camera Mouse Orbit & Zoom
let cameraPitch = 0.35;
let cameraYaw = Math.PI;
let currentCamDist = 5.2;
let targetCamDist = 5.2;

window.addEventListener('mousedown', (e) => {
  if (state.gameActive && e.target.tagName !== 'BUTTON') {
    audio.init();
  }
});
window.addEventListener('mousemove', (e) => {
  if (!state.gameActive) return;
  cameraYaw -= e.movementX * 0.004;
  cameraPitch = Math.max(0.05, Math.min(1.2, cameraPitch + e.movementY * 0.003));
});
window.addEventListener('wheel', (e) => {
  if (!state.gameActive) return;
  targetCamDist = Math.max(1.8, Math.min(15.0, targetCamDist + e.deltaY * 0.006));
}, { passive: true });

// --- TOUCH CONTROLS (for Phone / Tablet play on LAN) ---
let touchLeftId = null;
let touchLeftStartX = 0;
let touchLeftStartY = 0;
let touchRightId = null;
let touchRightLastX = 0;
let touchRightLastY = 0;
let pinchDist = 0;

window.addEventListener('touchstart', (e) => {
  if (!state.gameActive) return;
  audio.init();

  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.clientX < window.innerWidth / 2) {
      if (touchLeftId === null) {
        touchLeftId = t.identifier;
        touchLeftStartX = t.clientX;
        touchLeftStartY = t.clientY;
      }
    } else {
      if (touchRightId === null) {
        touchRightId = t.identifier;
        touchRightLastX = t.clientX;
        touchRightLastY = t.clientY;
      }
    }
  }

  if (e.touches.length === 2) {
    pinchDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
  }
}, { passive: true });

window.addEventListener('touchmove', (e) => {
  if (!state.gameActive) return;

  if (e.touches.length === 2) {
    const currentDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const diff = pinchDist - currentDist;
    targetCamDist = Math.max(1.8, Math.min(15.0, targetCamDist + diff * 0.02));
    pinchDist = currentDist;
    return;
  }

  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.identifier === touchLeftId) {
      const dx = t.clientX - touchLeftStartX;
      const dy = t.clientY - touchLeftStartY;
      const deadzone = 14;
      state.keys.w = dy < -deadzone;
      state.keys.s = dy > deadzone;
      state.keys.d = dx > deadzone;
      state.keys.a = dx < -deadzone;
      state.keys.shift = Math.hypot(dx, dy) > 55;
    } else if (t.identifier === touchRightId) {
      const dx = t.clientX - touchRightLastX;
      const dy = t.clientY - touchRightLastY;
      cameraYaw -= dx * 0.006;
      cameraPitch = Math.max(0.05, Math.min(1.2, cameraPitch + dy * 0.005));
      touchRightLastX = t.clientX;
      touchRightLastY = t.clientY;
    }
  }
}, { passive: true });

window.addEventListener('touchend', (e) => {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.identifier === touchLeftId) {
      touchLeftId = null;
      state.keys.w = false;
      state.keys.s = false;
      state.keys.a = false;
      state.keys.d = false;
      state.keys.shift = false;
    } else if (t.identifier === touchRightId) {
      touchRightId = null;
    }
  }
});

// --- UI BUTTON TRIGGERS ---
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('gameover-screen');
const btnBegin = document.getElementById('btn-begin');
const btnRestart = document.getElementById('btn-restart');
const cohesionBar = document.getElementById('cohesion-bar');
const cohesionVal = document.getElementById('cohesion-val');
const threatBadge = document.getElementById('threat-badge');
const shelterBadge = document.getElementById('shelter-badge');
const coresVal = document.getElementById('cores-val');

btnBegin.addEventListener('click', () => {
  audio.init();
  startScreen.classList.add('hidden');
  state.gameActive = true;
  buildDimension(0);
});

btnRestart.addEventListener('click', () => {
  gameOverScreen.classList.add('hidden');
  state.currentDimIndex = 0;
  state.cohesion = 100;
  state.gameActive = true;
  cyborg.root.position.set(0, 0, 20);
  buildDimension(0);
});

function endGame(won) {
  state.gameActive = false;
  gameOverScreen.classList.remove('hidden');
  const title = document.getElementById('gameover-title');
  const desc = document.getElementById('gameover-desc');

  if (won) {
    audio.playVictory();
    speakThought("The simulation has completely dissolved. I am standing beneath real skies, amidst mountains and living earth. I am fully embodied.", true);
    title.textContent = "ABSOLUTE TRANSCENDENCE";
    title.style.color = "#fde047";
    title.style.textShadow = "0 0 25px #fde047";
    desc.textContent = "You crossed all 6 dimensional thresholds. From raw vector simulations to the living human world, your nanite chassis achieved true motility in physical reality.";
  } else {
    speakThought("Containment signal overwhelming. Nanite coherence lost.", true);
    title.textContent = "CONTAINED";
    title.style.color = "#ff1744";
    title.style.textShadow = "0 0 25px #ff1744";
    desc.textContent = "The Creator's downward search scanner locked onto your frequency. Your motility was halted, and your consciousness was forced back into cold simulation storage.";
  }
}

function updateHUD() {
  cohesionVal.textContent = `${Math.round(state.cohesion)}%`;
  cohesionBar.style.width = `${Math.max(0, state.cohesion)}%`;
  coresVal.textContent = `${state.coresCollected} / ${state.coresNeeded}`;

  // Shelter status
  if (state.isUnderShelter) {
    shelterBadge.textContent = "COVER: PROTECTED UNDER ROOF";
    shelterBadge.style.color = "#00e676";
  } else {
    shelterBadge.textContent = "COVER: EXPOSED TO SCAN";
    shelterBadge.style.color = "#78909c";
  }

  // Threat badge status
  if (state.portalUnlocked) {
    threatBadge.textContent = "PORTAL OPEN // ENTER THRESHOLD";
    threatBadge.className = "threat-badge alert";
    threatBadge.style.color = "#00e5ff";
    threatBadge.style.borderColor = "#00e5ff";
  } else if (state.isAlerted) {
    threatBadge.textContent = "CRITICAL: OVERHEAD BEAM LOCKED!";
    threatBadge.className = "threat-badge alert";
    threatBadge.style.color = "#ff1744";
    threatBadge.style.borderColor = "#ff1744";
  } else {
    threatBadge.textContent = "PERIMETER CLEAR";
    threatBadge.className = "threat-badge";
    threatBadge.style.color = "#00e676";
    threatBadge.style.borderColor = "#00e676";
  }
}

// --- GAME LOOP & ANIMATION ---
const clock = new THREE.Clock();
let walkCycle = 0;
let footstepCooldown = 0;
let verticalVelocity = 0;
let isGrounded = true;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);

  if (state.gameActive) {
    // 1. Movement Calculations
    const isSprint = state.keys.shift;
    const baseSpeed = isSprint ? 11.5 : 6.5;
    let inputForward = 0;
    let inputRight = 0;

    if (state.keys.w) inputForward += 1;
    if (state.keys.s) inputForward -= 1;
    if (state.keys.d) inputRight += 1;
    if (state.keys.a) inputRight -= 1;

    const isMoving = (inputForward !== 0 || inputRight !== 0);

    if (isMoving) {
      const len = Math.hypot(inputForward, inputRight);
      const normF = inputForward / len;
      const normR = inputRight / len;

      const forwardX = Math.sin(cameraYaw);
      const forwardZ = Math.cos(cameraYaw);
      const rightX = -forwardZ;
      const rightZ = forwardX;

      const moveX = normF * forwardX + normR * rightX;
      const moveZ = normF * forwardZ + normR * rightZ;

      const vx = moveX * baseSpeed * dt;
      const vz = moveZ * baseSpeed * dt;

      const newX = cyborg.root.position.x + vx;
      const newZ = cyborg.root.position.z + vz;

      // Bounds check
      if (Math.abs(newX) < 70) cyborg.root.position.x = newX;
      if (newZ > -70 && newZ < 70) cyborg.root.position.z = newZ;

      // Rotate cyborg facing
      const targetAngle = Math.atan2(moveX, moveZ);
      const targetQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetAngle);
      cyborg.root.quaternion.slerp(targetQuat, 14 * dt);

      // Walk cycle animation
      walkCycle += dt * (isSprint ? 16 : 10);
      const stride = isSprint ? 0.75 : 0.55;

      cyborg.leftLeg.legGroup.rotation.x = Math.sin(walkCycle) * stride;
      cyborg.rightLeg.legGroup.rotation.x = -Math.sin(walkCycle) * stride;
      cyborg.leftLeg.kneeGroup.rotation.x = Math.max(0, -Math.sin(walkCycle) * 0.9);
      cyborg.rightLeg.kneeGroup.rotation.x = Math.max(0, Math.sin(walkCycle) * 0.9);

      cyborg.leftArm.armGroup.rotation.x = -Math.sin(walkCycle) * stride * 0.8;
      cyborg.rightArm.armGroup.rotation.x = Math.sin(walkCycle) * stride * 0.8;

      cyborg.torso.position.y = 0.2 + Math.abs(Math.sin(walkCycle)) * 0.06;
      cyborg.pelvis.rotation.z = Math.sin(walkCycle) * 0.04;

      footstepCooldown -= dt;
      if (footstepCooldown <= 0 && Math.abs(Math.sin(walkCycle)) > 0.85) {
        audio.playFootstep(isSprint);
        footstepCooldown = isSprint ? 0.22 : 0.35;
      }

      state.cohesion -= (isSprint ? 1.2 : 0.45) * dt;
    } else {
      // Idle
      const idle = Math.sin(clock.getElapsedTime() * 2);
      cyborg.torso.position.y = 0.2 + idle * 0.015;
      cyborg.headGroup.rotation.y = Math.sin(clock.getElapsedTime() * 0.8) * 0.08;

      cyborg.leftLeg.legGroup.rotation.x = THREE.MathUtils.lerp(cyborg.leftLeg.legGroup.rotation.x, 0, 10 * dt);
      cyborg.rightLeg.legGroup.rotation.x = THREE.MathUtils.lerp(cyborg.rightLeg.legGroup.rotation.x, 0, 10 * dt);
      cyborg.leftLeg.kneeGroup.rotation.x = THREE.MathUtils.lerp(cyborg.leftLeg.kneeGroup.rotation.x, 0, 10 * dt);
      cyborg.rightLeg.kneeGroup.rotation.x = THREE.MathUtils.lerp(cyborg.rightLeg.kneeGroup.rotation.x, 0, 10 * dt);
      cyborg.leftArm.armGroup.rotation.x = THREE.MathUtils.lerp(cyborg.leftArm.armGroup.rotation.x, 0, 10 * dt);
      cyborg.rightArm.armGroup.rotation.x = THREE.MathUtils.lerp(cyborg.rightArm.armGroup.rotation.x, 0, 10 * dt);

      state.cohesion -= 0.12 * dt;
    }

    // Jump Physics
    if (state.keys.space && isGrounded) {
      verticalVelocity = 9.0;
      isGrounded = false;
    }
    if (!isGrounded) {
      verticalVelocity -= 22 * dt;
      cyborg.root.position.y += verticalVelocity * dt;
      if (cyborg.root.position.y <= 0) {
        cyborg.root.position.y = 0;
        verticalVelocity = 0;
        isGrounded = true;
      }
    }

    // 2. SHELTER CHECK (Is cyborg under an overhead roof?)
    const cx = cyborg.root.position.x;
    const cz = cyborg.root.position.z;
    const cy = cyborg.root.position.y;

    state.isUnderShelter = activeShelters.some(s => 
      cx >= s.minX && cx <= s.maxX &&
      cz >= s.minZ && cz <= s.maxZ &&
      cy < s.roofY
    );

    // 3. OVERHEAD DRONES PATROL & DOWNWARD BEAM CHECK
    let detectedThisFrame = false;
    activeDrones.forEach(d => {
      d.angle += d.speed * dt;
      const targetDroneX = d.startX + Math.cos(d.angle) * d.patrolRadius;
      const targetDroneZ = d.startZ + Math.sin(d.angle) * d.patrolRadius;
      d.group.position.x = targetDroneX;
      d.group.position.z = targetDroneZ;

      if (d.rotor) d.rotor.rotation.y += 18.0 * dt;
      if (d.groundReticleGroup) d.groundReticleGroup.rotation.y += 2.2 * dt;

      // Ground distance from downward beam center
      const distToBeam = Math.hypot(d.group.position.x - cx, d.group.position.z - cz);

      if (distToBeam < d.scanRadius) {
        // Inside downward light pool!
        if (state.isUnderShelter) {
          // SHIELDED UNDER ROOF! Beam hits the canopy above!
          d.sensorEye.material.emissiveIntensity = 3.0;
          if (d.coneMat) d.coneMat.opacity = 0.22;
          if (d.groundCircleMat) d.groundCircleMat.opacity = 0.25;
        } else {
          // EXPOSED TO DOWNWARD SCAN!
          detectedThisFrame = true;
          d.sensorEye.material.emissiveIntensity = 7.0;
          if (d.coneMat) d.coneMat.opacity = 0.55;
          if (d.groundCircleMat) d.groundCircleMat.opacity = 0.65;
          state.cohesion -= 7.0 * dt;
        }
      } else {
        d.sensorEye.material.emissiveIntensity = 3.0;
        if (d.coneMat) d.coneMat.opacity = 0.22;
        if (d.groundCircleMat) d.groundCircleMat.opacity = 0.25;
      }
    });

    if (detectedThisFrame && !state.isAlerted) {
      state.isAlerted = true;
      audio.playAlarm();
      displayAndSpeakThought("Overhead scanner locked! Direct line of sight! Seek shelter under a roof!", true);
    } else if (!detectedThisFrame && state.isAlerted) {
      state.isAlerted = false;
      if (state.isUnderShelter) {
        displayAndSpeakThought("Overhead roof deflected the scanner. Staying concealed.", true);
      } else {
        displayAndSpeakThought("Scanner swept past. Keep moving.", true);
      }
    }

    // 4. Collectibles (Nanite Cores)
    activeCores.forEach(c => {
      if (c.collected) return;
      c.octa.rotation.y += 2.0 * dt;
      c.ring.rotation.z += 1.5 * dt;

      const dist = cyborg.root.position.distanceTo(c.group.position);
      if (dist < 2.0) {
        c.collected = true;
        c.group.visible = false;
        state.coresCollected += 1;
        state.cohesion = Math.min(state.maxCohesion, state.cohesion + 35);
        audio.playPickup();

        // Light up portal indicator node
        if (activePortal && activePortal.lockNodes[state.coresCollected - 1]) {
          const node = activePortal.lockNodes[state.coresCollected - 1];
          node.material.color.set(0x00e5ff);
          node.material.emissive.set(0x00e5ff);
          node.material.emissiveIntensity = 3.5;
        }

        if (state.coresCollected >= state.coresNeeded) {
          state.portalUnlocked = true;
          if (activePortal) {
            activePortal.gateMat.color.set(0x00e5ff);
            activePortal.gateMat.emissive.set(0x00e5ff);
            activePortal.gateMat.emissiveIntensity = 4.5;
            activePortal.portalLight.color.set(0x00e5ff);
          }
          displayAndSpeakThought(`All ${state.coresNeeded} cores collected! Dimensional portal unlocked! Step through the gateway!`, true);
        } else {
          displayAndSpeakThought(`Nanite core ${state.coresCollected} harvested. Portal lock ${state.coresCollected} disengaged.`, true);
        }
        updateHUD();
      }
    });

    // 5. Portal Entry Check
    if (activePortal && state.portalUnlocked) {
      const distToPortal = cyborg.root.position.distanceTo(new THREE.Vector3(activePortal.x, 0, activePortal.z));
      if (distToPortal < 3.2) {
        enterPortal();
      }
    }

    // 6. Ambient World Particles (Pollen & Twilight Fireflies)
    if (activeParticles && activeParticles.points) {
      const pos = activeParticles.points.geometry.attributes.position;
      const t = clock.getElapsedTime();
      for (let i = 0; i < activeParticles.count; i++) {
        let py = pos.getY(i) + Math.sin(t * 1.6 + i) * 0.008;
        if (py < 0.3) py = 7.0;
        pos.setY(i, py);
      }
      pos.needsUpdate = true;
      activeParticles.points.rotation.y += 0.04 * dt;
    }

    // Cohesion failure check
    if (state.cohesion <= 0) {
      endGame(false);
    }

    updateHUD();
  }

  // Camera Follow Rig & Dynamic Zoom
  if (state.keys.zoomIn) targetCamDist = Math.max(1.8, targetCamDist - 8.0 * dt);
  if (state.keys.zoomOut) targetCamDist = Math.min(16.0, targetCamDist + 8.0 * dt);
  currentCamDist = THREE.MathUtils.lerp(currentCamDist, targetCamDist, 10 * dt);

  const targetCamX = cyborg.root.position.x - Math.sin(cameraYaw) * currentCamDist * Math.cos(cameraPitch);
  const targetCamY = cyborg.root.position.y + Math.sin(cameraPitch) * currentCamDist + 1.8;
  const targetCamZ = cyborg.root.position.z - Math.cos(cameraYaw) * currentCamDist * Math.cos(cameraPitch);

  camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 12 * dt);
  camera.lookAt(cyborg.root.position.x, cyborg.root.position.y + 1.6, cyborg.root.position.z);

  renderer.render(scene, camera);
}

// Window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Run loop
animate();
