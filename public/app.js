import * as THREE from "three";
const $ = (id) => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color("#91adb1");
scene.fog = new THREE.Fog("#91adb1", 55, 145);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (error) {
  const heading = document.createElement("h2");
  heading.textContent = "Open your world in Brave";
  const description = document.createElement("p");
  description.textContent =
    "This browser could not start 3D graphics. Open the address below in Brave, Chrome or Edge on your home PC.";
  description.style.cssText =
    "max-width:380px;text-align:center;line-height:1.8;padding:0 20px";
  const address = document.createElement("code");
  address.textContent = "http://127.0.0.1:4317/";
  $("loading").replaceChildren(heading, description, address);
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
$("world").append(renderer.domElement);
const camera = new THREE.PerspectiveCamera(
  62,
  innerWidth / innerHeight,
  0.08,
  230,
);
scene.add(new THREE.HemisphereLight("#e8edce", "#425e56", 2.1));
const sun = new THREE.DirectionalLight("#ffdda5", 3);
sun.position.set(-30, 45, 15);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  left: -50,
  right: 50,
  top: 50,
  bottom: -50,
  near: 1,
  far: 130,
});
sun.shadow.bias = -0.0008;
scene.add(sun);
const environment = new THREE.Group(),
  creations = new THREE.Group(),
  bookMeshes = new THREE.Group();
scene.add(environment, creations, bookMeshes);
const solids = [],
  interactions = [],
  rooms = [],
  keys = new Set();
let savedSolids = [],
  savedInteractions = [],
  bookInteractions = [],
  data = null,
  bookKey = "",
  objectKey = "",
  messagesKey = "",
  firstPerson = false,
  yaw = 0,
  pitch = 0.15,
  sitting = false,
  route = [],
  destinationName = "",
  nearest = null,
  voice = false,
  lastSpoken = null,
  connected = false;
const playerPos = new THREE.Vector3(0, 0, 18);
let elapsed = 0,
  lastZone = "";
function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.83, ...extra });
}
function mesh(geo, color, x, y, z, parent = environment, extra = {}) {
  const m = new THREE.Mesh(geo, mat(color, extra));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(color, x, y, z, w, h, d, parent = environment, extra = {}) {
  return mesh(new THREE.BoxGeometry(w, h, d), color, x, y, z, parent, extra);
}
function ball(color, x, y, z, r, parent = environment, extra = {}) {
  return mesh(
    new THREE.IcosahedronGeometry(r, 1),
    color,
    x,
    y,
    z,
    parent,
    extra,
  );
}
function cylinder(color, x, y, z, r, h, parent = environment) {
  return mesh(new THREE.CylinderGeometry(r, r, h, 12), color, x, y, z, parent);
}
function obstacle(x, z, w, d) {
  solids.push({ x, z, w, d });
}
function label(
  text,
  x,
  y,
  z,
  size = 2.5,
  parent = environment,
  color = "#fff4d5",
) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "rgba(22,45,37,.76)";
  ctx.beginPath();
  ctx.roundRect(8, 10, 496, 108, 22);
  ctx.fill();
  ctx.font = "32px Georgia";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text.slice(0, 36), 256, 65, 460);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, depthTest: true }),
  );
  s.position.set(x, y, z);
  s.scale.set(size, size / 4, 1);
  parent.add(s);
  return s;
}
function interactive(title, x, z, action, y = 1.2) {
  const item = { title, x, z, y, action };
  interactions.push(item);
  return item;
}
function disposeGroup(group) {
  while (group.children.length) {
    const c = group.children[0];
    c.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) {
        o.material.map?.dispose();
        o.material.dispose();
      }
    });
    group.remove(c);
  }
}
let seed = 123;
const random = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
box("#789477", 0, -0.35, 0, 115, 0.6, 115);
const water = mesh(
  new THREE.PlaneGeometry(190, 190),
  "#648f99",
  0,
  -0.9,
  0,
  environment,
  { roughness: 0.22, metalness: 0.25 },
);
water.rotation.x = -Math.PI / 2;
for (let i = 0; i < 28; i++) {
  const angle = (i / 28) * Math.PI * 2;
  const m = mesh(
    new THREE.ConeGeometry(12 + random() * 8, 17 + random() * 25, 5),
    "#7e9b95",
    Math.sin(angle) * 91,
    4,
    Math.cos(angle) * 91,
  );
  m.rotation.y = random() * 3;
}
function tree(x, z, s = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  environment.add(g);
  cylinder("#695c48", 0, 1.8, 0, 0.25, 3.6, g);
  ball("#526e58", 0, 4.1, 0, 1.8, g);
  ball("#6d8765", 0.8, 5.1, 0.1, 1.35, g);
  ball("#819971", -0.8, 4.7, 0.3, 1.3, g);
  obstacle(x, z, 0.7 * s, 0.7 * s);
}
for (let i = 0; i < 105; i++) {
  const a = random() * Math.PI * 2,
    r = 34 + random() * 22;
  tree(Math.sin(a) * r, Math.cos(a) * r, 0.7 + random() * 0.8);
}
for (const [x, z] of [
  [-18, -15],
  [-19, -20],
  [21, -15],
  [25, 8],
  [-15, 20],
  [19, 28],
  [-25, 26],
])
  tree(x, z, 1.15);
for (let i = 0; i < 180; i++) {
  const x = (random() - 0.5) * 105,
    z = (random() - 0.5) * 105;
  if (Math.abs(x) < 25 && Math.abs(z) < 25) continue;
  const b = ball(
    i % 3 ? "#93a478" : "#c2b28c",
    x,
    0.13,
    z,
    0.16 + random() * 0.12,
  );
  b.scale.y = 0.6;
}
// Physical paths and a shallow pond; the visitor walks on the paths, not an orbit camera.
for (let z = -29; z < 35; z += 1.5)
  box("#b7b295", 0, -0.015, z, 2.8, 0.08, 1.32);
for (let x = -29; x < 30; x += 1.5)
  box("#b7b295", x, -0.01, 0, 1.32, 0.08, 2.8);
for (const x of [-9, 9])
  for (let z = -4; z < 0; z += 1.3) box("#b7b295", x, 0.02, z, 2.7, 0.08, 1.1);
const pond = mesh(
  new THREE.CylinderGeometry(6, 6, 0.13, 48),
  "#638d8b",
  -24,
  0.02,
  5,
  environment,
  { roughness: 0.18, metalness: 0.35 },
);
pond.scale.z = 0.65;
obstacle(-24, 5, 11, 7);
for (let i = 0; i < 20; i++) {
  const a = (i / 20) * Math.PI * 2;
  const b = ball(
    "#a5a58c",
    -24 + Math.cos(a) * 6,
    0.2,
    5 + Math.sin(a) * 4,
    0.45,
  );
  b.scale.y = 0.6;
}
function lamp(x, z) {
  cylinder("#595d48", x, 1.25, z, 0.07, 2.5);
  box("#e5c786", x, 2.65, z, 0.35, 0.5, 0.35, environment, {
    emissive: "#ffbc54",
    emissiveIntensity: 1.2,
  });
  box("#55634e", x, 2.95, z, 0.55, 0.1, 0.55);
  const light = new THREE.PointLight("#ffd795", 3, 7, 2);
  light.position.set(x, 2.6, z);
  scene.add(light);
}
for (const p of [
  [-2, 7],
  [2, 16],
  [-5, 1],
  [5, 1],
  [-13, 1],
  [13, 1],
  [-2, -17],
  [2, -26],
  [21, 1],
])
  lamp(...p);
function room(name, cx, cz, w, d, wallColor, roofColor) {
  const g = new THREE.Group();
  g.position.set(cx, 0, cz);
  environment.add(g);
  box("#aa8c63", 0, 0.035, 0, w, 0.07, d, g);
  for (let x = -w / 2 + 0.15; x < w / 2; x += 0.75)
    box("#917553", x, 0.08, 0, 0.025, 0.015, d, g);
  const solidWall = (x, z, bw, bd) => {
    box(wallColor, x, 1.65, z, bw, 3.3, bd, g);
    obstacle(cx + x, cz + z, bw, bd);
  };
  solidWall(-w / 2, 0, 0.3, d);
  solidWall(w / 2, 0, 0.3, d);
  solidWall(0, -d / 2, w, 0.3);
  const gap = 2.8,
    wing = (w - gap) / 2;
  solidWall(-(gap / 2 + wing / 2), d / 2, wing, 0.3);
  solidWall(gap / 2 + wing / 2, d / 2, wing, 0.3);
  box(wallColor, 0, 3, d / 2, gap, 0.6, 0.3, g);
  for (const x of [-w / 2, w / 2]) {
    box("#745e42", x, 1.75, 0, 0.35, 1.65, 2.6, g);
    box("#a6c4ba", x + (x < 0 ? -0.19 : 0.19), 1.75, 0, 0.02, 1.35, 2.3, g, {
      emissive: "#87af9c",
      emissiveIntensity: 0.25,
    });
  }
  for (const x of [-w / 2, w / 2])
    for (const z of [-d / 2, d / 2])
      box("#6a6349", x, 1.8, z, 0.35, 3.6, 0.35, g);
  const roof = new THREE.Group();
  g.add(roof);
  for (const direction of [-1, 1]) {
    const r = box(
      roofColor,
      (direction * w) / 4,
      4.1,
      0,
      w * 0.57,
      0.22,
      d + 1.1,
      roof,
    );
    r.rotation.z = -direction * 0.3;
  }
  box("#e2c898", 0, 3.22, d / 2 + 0.2, 3.5, 0.6, 0.15, g);
  label(name, cx, 3.25, cz + d / 2 + 0.32, 3.1);
  const light = new THREE.PointLight("#ffdf9c", 14, 15, 2);
  light.position.set(cx, 2.7, cz);
  scene.add(light);
  rooms.push({ name, cx, cz, w, d, roof });
  return g;
}
const library = room("The Library", -9, -7, 12, 10, "#c7b997", "#546d64");
const workshop = room("The Workshop", 9, -7, 10, 10, "#ae997c", "#695f50");
const cottage = room("Lumen’s cottage", -23, 20, 8, 8, "#c3ad8a", "#7b7760");
function shelf(x, z, w, parent) {
  box("#68553e", x, 1.5, z, w, 3, 0.55, parent);
  for (let y = 0.45; y < 3; y += 0.72)
    box("#ad8d5e", x, y, z + 0.18, w, 0.09, 0.85, parent);
  box("#b29468", x - w / 2, 1.6, z + 0.1, 0.12, 3.2, 0.8, parent);
  box("#b29468", x + w / 2, 1.6, z + 0.1, 0.12, 3.2, 0.8, parent);
}
shelf(0, -4.2, 9.8, library);
obstacle(-9, -11.2, 9.8, 0.7);
box("#90734f", 0, 0.85, 0, 3.4, 0.16, 1.8, library);
for (const x of [-1.35, 1.35])
  for (const z of [-0.6, 0.6])
    box("#6a573e", x, 0.42, z, 0.14, 0.84, 0.14, library);
obstacle(-9, -7, 3.4, 1.8);
const openBook = box("#ebe0b8", 0, 0.96, 0, 1, 0.08, 0.7, library);
openBook.rotation.y = 0.2;
label("Reading table", -9, 1.65, -7, 2);
interactive("Browse the library", -9, -5.3, () => showLibrary());
function chair(x, z, parent = environment) {
  box("#755d43", x, 0.48, z, 0.8, 0.14, 0.8, parent);
  box("#8c7351", x, 0.98, z + 0.34, 0.8, 1, 0.12, parent);
  for (const dx of [-0.3, 0.3])
    for (const dz of [-0.3, 0.3])
      box("#5e503c", x + dx, 0.22, z + dz, 0.1, 0.44, 0.1, parent);
}
chair(-1.4, 1.7, library);
chair(1.4, 1.7, library);
interactive("Sit and read", -10.4, -5.3, () => {
  sitAt(-10.4, -5.3);
  showLibrary();
});
box("#866749", 0, 0.9, -0.5, 4.5, 0.2, 2, workshop);
for (const x of [-1.8, 1.8])
  for (const z of [-1.2, 0.2])
    box("#63533d", x, 0.45, z, 0.2, 0.9, 0.2, workshop);
obstacle(9, -7.5, 4.5, 2);
box("#c3cdb4", 0, 1.025, -0.5, 2.7, 0.03, 1.45, workshop);
for (let i = -1; i <= 1; i++)
  box("#7f9c8b", i * 0.6, 1.05, -0.5, 0.02, 0.01, 1.3, workshop);
box("#574e3a", 0, 1.8, -4.65, 7.8, 2.7, 0.18, workshop);
for (let i = 0; i < 4; i++)
  box("#e4dab4", -2.7 + i * 1.8, 1.85, -4.53, 1.4, 1.9, 0.03, workshop);
label("Project board", 9, 3.4, -11.35, 3);
obstacle(9, -11.6, 8, 0.3);
interactive("Read Lumen’s project board", 9, -10.5, () => showProjects());
interactive("Use the workbench", 9, -5.6, () => showWorkbench());
box("#8e7152", -2, 0.4, -2, 2.3, 0.8, 3.1, cottage);
box("#d0d2b7", -2, 0.9, -2, 2.2, 0.2, 3, cottage);
box("#e9dfbb", -2, 1.1, -3, 1.7, 0.2, 0.65, cottage);
obstacle(-25, 18, 2.3, 3.1);
chair(1.6, 0, cottage);
interactive("Sit by the window", -21.4, 20, () => sitAt(-21.4, 20));
box("#7c6449", 1.5, 0.8, -2.7, 1.8, 0.1, 1.2, cottage);
box("#e7d7a9", 1.4, 0.9, -2.7, 0.8, 0.06, 0.6, cottage);
interactive("Read Lumen’s journal", -21.5, 18.3, () => showJournal());
// A public noticeboard and resting places give the landscape usable destinations.
box("#6f6249", -4, 1.3, 12, 0.15, 2.6, 0.15);
box("#6f6249", -1.4, 1.3, 12, 0.15, 2.6, 0.15);
box("#89734e", -2.7, 1.9, 12, 3, 1.4, 0.2);
label("Welcome, traveller", -2.7, 2, 12.13, 2.6);
interactive("Read the welcome board", -2.7, 13.2, () => showMap());
for (const z of [5, 27]) {
  box("#927c55", 4, 0.65, z, 2.8, 0.15, 0.8);
  box("#a38b5e", 4, 1.15, z + 0.35, 2.8, 0.8, 0.12);
  for (const x of [3, 5]) box("#615e47", x, 0.3, z, 0.2, 0.6, 0.65);
  obstacle(4, z, 2.8, 0.85);
  interactive("Rest on the bench", 4, z - 0.8, () => sitAt(4, z - 0.8));
}
for (const x of [-3, 3])
  for (const z of [-29, -23]) cylinder("#7f7353", x, 1.6, z, 0.12, 3.2);
box("#b4a47b", 0, 3.2, -26, 7, 0.16, 7);
for (let i = -3; i < 4; i++) box("#77815a", i, 3.35, -26, 0.1, 0.2, 7);
label("The overlook", 0, 2.8, -22.4, 3);
interactive("Take a quiet moment", 0, -25, () => {
  toast("The world continues while you take a breath.");
  sitAt(0, -25);
});
function person(color, glow = false) {
  const g = new THREE.Group();
  const body = mesh(
    new THREE.CapsuleGeometry(0.29, 0.65, 5, 10),
    color,
    0,
    1.1,
    0,
    g,
    glow ? { emissive: "#91eacb", emissiveIntensity: 0.45 } : {},
  );
  ball(glow ? "#ceffdf" : "#d6b896", 0, 1.85, 0, 0.27, g);
  if (!glow) ball("#564e40", 0, 2.02, 0.05, 0.26, g);
  const legs = [
    box("#435d53", -0.16, 0.38, 0, 0.18, 0.76, 0.22, g),
    box("#435d53", 0.16, 0.38, 0, 0.18, 0.76, 0.22, g),
  ];
  const arms = [
    box(color, -0.43, 1.17, 0, 0.14, 0.7, 0.17, g),
    box(color, 0.43, 1.17, 0, 0.14, 0.7, 0.17, g),
  ];
  g.userData = { legs, arms, body };
  return g;
}
const visitor = person("#597d7b"),
  lumen = person("#a9ddc7", true);
scene.add(visitor, lumen);
visitor.position.copy(playerPos);
lumen.position.set(9, 0, -5.6);
const lumenTag = label("Lumen", 0, 2.5, 0, 1.5, lumen);
const lumenLight = new THREE.PointLight("#a8ffd6", 2.5, 4);
lumenLight.position.y = 1.4;
lumen.add(lumenLight);
function fox() {
  const g = new THREE.Group();
  box("#bd8653", 0, 0.45, 0, 0.45, 0.45, 0.8, g);
  box("#d19a61", 0, 0.75, -0.37, 0.5, 0.48, 0.45, g);
  box("#edddae", 0, 0.65, -0.62, 0.3, 0.2, 0.16, g);
  for (const x of [-0.17, 0.17]) {
    mesh(new THREE.ConeGeometry(0.13, 0.32, 4), "#aa7247", x, 1.08, -0.38, g);
    ball("#303d31", x, 0.8, -0.61, 0.035, g);
    for (const z of [-0.23, 0.23])
      box("#76553b", x, 0.18, z, 0.09, 0.35, 0.1, g);
  }
  const tail = box("#d4ab70", 0, 0.6, 0.6, 0.25, 0.25, 0.65, g);
  tail.rotation.x = -0.5;
  g.userData.tail = tail;
  return g;
}
const pip = fox();
pip.position.set(2, 0, 11);
scene.add(pip);
label("Pip", 0, 1.5, 0, 1, pip);
let petUntil = 0;
let lumenRoute = [],
  lumenDestination = "",
  lumenActivity = "Resting at home",
  lumenMode = "idle";
function blocked(x, z, ignoreSaved = false) {
  if (Math.abs(x) > 53 || Math.abs(z) > 53) return true;
  return [...solids, ...(ignoreSaved ? [] : savedSolids)].some(
    (s) =>
      Math.abs(x - s.x) < s.w / 2 + 0.28 && Math.abs(z - s.z) < s.d / 2 + 0.28,
  );
}
// Bounded grid routing respects real walls and door openings for both characters.
function pathTo(start, target) {
  const step = 0.8,
    N = 133,
    origin = -52.8;
  const cell = (x, z) => [
    Math.max(0, Math.min(N - 1, Math.round((x - origin) / step))),
    Math.max(0, Math.min(N - 1, Math.round((z - origin) / step))),
  ];
  const [sx, sz] = cell(start.x, start.z);
  let [tx, tz] = cell(target.x, target.z);
  let goal = tz * N + tx;
  const startId = sz * N + sx,
    queue = [startId],
    previous = new Int32Array(N * N).fill(-1);
  previous[startId] = startId;
  let found = -1,
    head = 0;
  while (head < queue.length && head < 18000) {
    const n = queue[head++],
      x = n % N,
      z = Math.floor(n / N);
    if (Math.hypot(x - tx, z - tz) <= 1.2) {
      found = n;
      break;
    }
    for (const [dx, dz] of [
      [0, -1],
      [1, 0],
      [-1, 0],
      [0, 1],
    ]) {
      const nx = x + dx,
        nz = z + dz,
        ni = nz * N + nx;
      if (
        nx < 0 ||
        nz < 0 ||
        nx >= N ||
        nz >= N ||
        previous[ni] !== -1 ||
        blocked(origin + nx * step, origin + nz * step)
      )
        continue;
      previous[ni] = n;
      queue.push(ni);
    }
  }
  if (found < 0) return [];
  const out = [];
  while (found !== startId) {
    out.push(
      new THREE.Vector3(
        origin + (found % N) * step,
        0,
        origin + Math.floor(found / N) * step,
      ),
    );
    found = previous[found];
  }
  return out.reverse();
}
function walkTo(x, z, title) {
  const next = pathTo(playerPos, { x, z });
  if (!next.length) {
    toast(
      "There isn’t a clear walking route there. Try approaching from the path.",
    );
    return;
  }
  sitting = false;
  route = next;
  destinationName = title;
  $("journey").hidden = false;
  $("journeyLabel").textContent = "Walking to " + title;
  closePanels();
}
function sitAt(x, z) {
  sitting = !sitting;
  route = [];
  if (sitting) {
    playerPos.set(x, 0, z);
    toast("Taking a seat. Press a movement key to stand.");
  } else toast("Back on your feet.");
}
function move(position, dx, dz) {
  const count = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.12));
  for (let i = 0; i < count; i++) {
    if (!blocked(position.x + dx / count, position.z)) position.x += dx / count;
    if (!blocked(position.x, position.z + dz / count)) position.z += dz / count;
  }
}
function follow(position, path, speed, dt) {
  let budget = speed * dt,
    moved = false;
  while (path.length && budget > 0.001) {
    const d = path[0].clone().sub(position);
    d.y = 0;
    const length = d.length();
    if (length < 0.025) {
      position.x = path[0].x;
      position.z = path[0].z;
      path.shift();
      continue;
    }
    const amount = Math.min(budget, length);
    d.multiplyScalar(amount / length);
    const previous = position.clone();
    move(position, d.x, d.z);
    const distance = position.distanceTo(previous);
    if (distance < 0.0001) break;
    budget -= amount;
    moved = true;
  }
  return moved;
}
function animatePerson(g, moving, time) {
  const { legs, arms } = g.userData;
  for (let i = 0; i < 2; i++) {
    legs[i].rotation.x = moving ? Math.sin(time * 9 + i * Math.PI) * 0.5 : 0;
    arms[i].rotation.x = moving ? -legs[i].rotation.x * 0.7 : 0;
  }
}
function updateLumen() {
  if (!data) return;
  const activity = data.embodiment;
  const active = data.agent?.status === "thinking";
  const fresh =
    activity && Date.now() - new Date(activity.updatedAt).getTime() < 180000;
  let target = { x: 9, z: -5.6 },
    mode = "idle",
    description = "Resting at the workshop";
  if (active) {
    mode = "thinking";
    description = "Thinking at the workbench";
  }
    if (activity) {
      mode = active ? activity.mode : "idle";
      description = active || activity.mode === "visiting"
        ? activity.label
        : "Taking a break at the last work location";
    target = { x: activity.x, z: activity.z };
  }
  if (!connected) {
    description = "Local AI is disconnected";
    mode = "offline";
  } else if (data.agent?.status === "paused" && !fresh) {
    description = "Taking a break";
    mode = "paused";
  }
  lumenActivity = description;
  lumenMode = mode;
  const key = target.x + "," + target.z;
  if (key !== lumenDestination) {
    lumenDestination = key;
    lumenRoute = pathTo(lumen.position, target);
  }
  $("lumenStatus").textContent = lumenRoute.length
    ? "Lumen is on the way"
    : description;
  $("lumenDetail").textContent = lumenRoute.length
    ? description
    : active
      ? "Working on a real AI task"
      : "Approach Lumen or press T to talk";
  $("presenceDot").style.background = connected ? "#9ad8b5" : "#e5b87d";
}
function rebuildBooks() {
  const signature = JSON.stringify(data.books.map((b) => [b.id, b.updatedAt]));
  if (signature === bookKey) return;
  bookKey = signature;
  disposeGroup(bookMeshes);
  bookInteractions = [];
  const palette = ["#759082", "#b89a66", "#798c9e", "#b77e68", "#8a7b99"];
  const count = Math.min(120, data.books.length);
  for (let i = 0; i < count; i++) {
    const b = data.books[i],
      row = Math.floor(i / 30),
      col = i % 30,
      x = -13.5 + col * 0.31,
      y = 0.78 + row * 0.72,
      z = -10.75;
    const spine = box(palette[i % 5], x, y, z, 0.24, 0.55, 0.42, bookMeshes);
    spine.rotation.z = i % 7 === 0 ? 0.06 : 0;
    box("#d9c496", x, y + 0.16, z + 0.22, 0.18, 0.035, 0.01, bookMeshes);
    const item = {
      title: "Read “" + b.title + "”",
      x,
      z: z + 0.8,
      y,
      action: () => showBook(b),
    };
    bookInteractions.push(item);
    spine.userData.interaction = item;
  }
  label(
    data.books.length + " books · collected by Lumen",
    -9,
    3.35,
    -10.7,
    5,
    bookMeshes,
  );
}
function rebuildObjects() {
  const signature = JSON.stringify(data.objects);
  if (signature === objectKey) return;
  objectKey = signature;
  disposeGroup(creations);
  savedSolids = [];
  savedInteractions = [];
  for (const item of data.objects) {
    if (["welcome-library", "workshop", "pip"].includes(item.id)) continue;
    const g = new THREE.Group();
    g.position.set(item.x, 0, item.z);
    creations.add(g);
    if (item.category === "pet" && !item.parts.length) g.add(fox());
    for (const p of item.parts) {
      const geo =
        p.shape === "box"
          ? new THREE.BoxGeometry(1, 1, 1)
          : p.shape === "sphere"
            ? new THREE.IcosahedronGeometry(0.5, 2)
            : p.shape === "cylinder"
              ? new THREE.CylinderGeometry(0.5, 0.5, 1, 16)
              : new THREE.ConeGeometry(0.5, 1, 6);
      const m = mesh(geo, p.color, p.x, p.y, p.z, g);
      m.scale.set(p.sx, p.sy, p.sz);
      if (p.y - p.sy / 2 < 1.5) {
        const rect = { x: item.x + p.x, z: item.z + p.z, w: p.sx, d: p.sz };
        if (
          !rooms.some(
            (r) =>
              Math.abs(rect.x - r.cx) < r.w / 2 + 1 &&
              Math.abs(rect.z - r.cz) < r.d / 2 + 1,
          )
        )
          savedSolids.push(rect);
      }
    }
    const bounds = new THREE.Box3().setFromObject(g),
      center = bounds.isEmpty()
        ? new THREE.Vector3(item.x, 0, item.z)
        : bounds.getCenter(new THREE.Vector3());
    label(
      item.name,
      center.x,
      Math.min(3, bounds.max.y + 1),
      center.z,
      2.5,
      creations,
    );
    const interaction = {
      title: "Inspect " + item.name,
      x: center.x,
      z: center.z,
      y: 1.2,
      range: Math.max(4, bounds.getSize(new THREE.Vector3()).x / 2 + 2),
      action: () => showObject(item),
    };
    savedInteractions.push(interaction);
    g.traverse((o) => {
      o.userData.interaction = interaction;
    });
  }
}
function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text != null) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
function toast(text) {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($("toast").hidden = true), 5000);
}
function closePanels() {
  $("panel").close();
  $("conversation").close();
  keys.clear();
  $("world").focus();
}
function panel(title, eyebrow) {
  $("conversation").close();
  $("panelTitle").textContent = title;
  $("panelEyebrow").textContent = eyebrow;
  $("panelContent").replaceChildren();
  if (!$("panel").open) $("panel").showModal();
  keys.clear();
  return $("panelContent");
}
function showBook(book) {
  const holder = panel(book.title, "THE LIBRARY · A BOOK FROM LUMEN");
  holder.append(el("p", book.body, "book-body"), el("p", book.scope, "scope"));
  for (const source of book.sources || []) {
    try {
      const u = new URL(source);
      if (!["http:", "https:"].includes(u.protocol)) continue;
      const a = el("a", "Read source ↗");
      a.href = u.href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      const card = el("div", null, "entry");
      card.append(a);
      holder.append(card);
    } catch {}
  }
}
function showLibrary() {
  const holder = panel("The collected library", "PULL UP A CHAIR");
  holder.append(
    el(
      "p",
      `${data?.books.length || 0} saved books. The shelves hold Lumen’s real research. Read a spine up close or choose a title here.`,
      "scope",
    ),
  );
  if (!data?.books.length)
    holder.append(
      el("p", "The shelves are waiting. Ask Lumen to research something."),
    );
  for (const book of data?.books || []) {
    const c = el("div", null, "entry");
    const b = el("button", book.title);
    b.onclick = () => showBook(book);
    c.append(b);
    holder.append(c);
  }
}
function showProjects() {
  const holder = panel("On the drawing board", "THE WORKSHOP");
  for (const task of (data?.tasks || []).filter((t) =>
    ["queued", "working"].includes(t.status),
  )) {
    const c = el("article", null, "entry");
    c.append(
      el(
        "h3",
        task.source === "autonomy"
          ? "Lumen’s next idea"
          : "A request in progress",
      ),
      el("small", task.status),
      el("p", task.message),
    );
    holder.append(c);
  }
  for (const p of data?.projects || []) {
    const c = el("article", null, "entry");
    c.append(el("h3", p.title), el("small", p.status), el("p", p.description));
    const item = data.objects.find((o) => o.id === p.objectId);
    if (item) {
      const b = el("button", "Walk to this creation ↗");
      b.onclick = () => {
        const hit = savedInteractions.find(
          (i) => i.title === "Inspect " + item.name,
        );
        walkTo(hit?.x ?? item.x, (hit?.z ?? item.z) + 3, item.name);
      };
      c.append(b);
    }
    holder.append(c);
  }
  if (!holder.children.length)
    holder.append(el("p", "No creations yet. The next idea starts here."));
}
function showWorkbench() {
  const holder = panel("Make something together", "THE WORKBENCH");
  holder.append(
    el(
      "p",
      "Lumen chooses its own projects while independent creation is enabled. You can also bring an idea to the table.",
      "book-body",
    ),
  );
  const ask = el("button", "Discuss an idea with Lumen");
  ask.onclick = () => openChat();
  const create = el("button", "Give Lumen creative time");
  create.onclick = async () => {
    try {
      await api("/api/create");
      toast("Lumen will choose its own next creation.");
      closePanels();
    } catch (e) {
      toast(e.message);
    }
  };
  holder.append(ask, document.createTextNode(" "), create);
}
function showJournal() {
  const holder = panel("Life in this little world", "LUMEN’S JOURNAL");
  for (const entry of [...(data?.events || [])].reverse()) {
    const c = el("article", null, "entry");
    c.append(
      el("h3", entry.title),
      el("small", new Date(entry.updatedAt).toLocaleString()),
      el("p", entry.detail),
    );
    holder.append(c);
  }
}
function showObject(item) {
  const holder = panel(
    item.name,
    item.author === "Lumen" ? "A CREATION BY LUMEN" : "A PART OF THE WORLD",
  );
  holder.append(el("p", item.purpose, "book-body"));
  const b = el("button", "Talk about this with Lumen");
  b.onclick = () => {
    openChat();
    $("message").value = "Tell me about " + item.name;
  };
  holder.append(b);
}
const landmarks = [
  ["The Library", "Books, reading tables and discoveries", -9, -4],
  ["The Workshop", "Projects, plans and Lumen’s workbench", 9, -4],
  ["Lumen’s cottage", "A journal, a window seat, a place to rest", -23, 22],
  ["The overlook", "A quiet spot beneath the pergola", 0, -25],
  ["The pond", "Water, lanterns and a slower pace", -18, 5],
  ["The commons", "The place where paths cross", 0, 5],
];
function showMap() {
  const holder = panel("Find your way", "THE VALLEY");
  const grid = el("div", null, "landmarks");
  for (const [name, description, x, z] of landmarks) {
    const b = el("button");
    b.append(el("strong", name), el("small", description));
    b.onclick = () => walkTo(x, z, name);
    grid.append(b);
  }
  holder.append(
    grid,
    el(
      "p",
      "Choose a place to walk there. WASD takes over at any time. Buildings have open doorways: walk straight inside.",
      "scope",
    ),
  );
}
function showSettings() {
  const holder = panel("A world at your pace", "SETTINGS");
  for (const [key, title] of [
    ["autonomy", "Let Lumen create independently"],
    ["githubSync", "Automatically upload public designs to GitHub"],
  ]) {
    const row = el("label", null, "settings-row"),
      input = el("input");
    input.type = "checkbox";
    input.checked = Boolean(data?.settings[key]);
    input.onchange = async () => {
      try {
        await api("/api/settings", { [key]: input.checked });
        await refresh();
      } catch (e) {
        toast(e.message);
        input.checked = !input.checked;
      }
    };
    row.append(document.createTextNode(title), input);
    holder.append(row);
  }
  const sync = el("button", "Upload public world designs now");
  sync.onclick = async () => {
    sync.disabled = true;
    try {
      const r = await api("/api/sync");
      toast(r.synced ? "World designs uploaded." : r.message);
    } catch (e) {
      toast(e.message);
    } finally {
      sync.disabled = false;
    }
  };
  holder.append(
    sync,
    el(
      "p",
      "Independent work runs on this PC. Pausing creation leaves conversation available. Your saved chats and research are kept locally.",
      "scope",
    ),
  );
}
function renderMessages() {
  if (!data) return;
  const signature = JSON.stringify(data.messages);
  if (signature === messagesKey) return;
  messagesKey = signature;
  $("messages").replaceChildren();
  for (const m of data.messages.slice(-20)) {
    const b = el("div", null, "bubble " + m.role);
    b.append(
      el(
        "small",
        m.role === "assistant"
          ? "Lumen"
          : m.role === "user"
            ? "You"
            : "World journal",
      ),
      document.createTextNode(m.text),
    );
    $("messages").append(b);
  }
  $("messages").scrollTop = $("messages").scrollHeight;
  const last = data.messages.findLast((m) => m.role === "assistant");
  if (last && last.id !== lastSpoken) {
    if (voice && lastSpoken && "speechSynthesis" in window) {
      speechSynthesis.cancel();
      speechSynthesis.speak(new SpeechSynthesisUtterance(last.text));
    }
    lastSpoken = last.id;
  }
}
function openChat() {
  $("panel").close();
  if (!$("conversation").open) $("conversation").showModal();
  keys.clear();
  renderMessages();
  $("message").focus();
}
async function api(url, body = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error || "The local service could not complete that request.",
    );
  return result;
}
async function refresh() {
  try {
    const response = await fetch("/api/state", {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Disconnected");
    data = await response.json();
    connected = true;
    rebuildBooks();
    rebuildObjects();
    renderMessages();
    updateLumen();
  } catch {
    connected = false;
    $("lumenStatus").textContent = "Lumen is offline";
    $("lumenDetail").textContent = "Start Lumen on your home PC to reconnect.";
  }
}
$("mapButton").onclick = showMap;
$("settingsButton").onclick = showSettings;
$("talkButton").onclick = openChat;
$("findLumen").onclick = () =>
  walkTo(lumen.position.x, lumen.position.z + 1, "Lumen");
$("closePanel").onclick = closePanels;
$("closeChat").onclick = closePanels;
$("cancelWalk").onclick = () => {
  route = [];
  $("journey").hidden = true;
};
$("interactButton").onclick = () => nearest?.action();
function toggleView() {
  firstPerson = !firstPerson;
  $("viewButton").textContent = firstPerson
    ? "◉ Third person"
    : "◉ First person";
  visitor.visible = !firstPerson;
}
$("viewButton").onclick = toggleView;
$("voice").onclick = () => {
  voice = !voice;
  if (!voice && "speechSynthesis" in window) speechSynthesis.cancel();
  toast(voice ? "Spoken replies on." : "Spoken replies off.");
};
$("chatForm").onsubmit = async (e) => {
  e.preventDefault();
  const message = $("message").value.trim();
  if (!message) return;
  $("send").disabled = true;
  try {
    await api("/api/chat", { message });
    $("message").value = "";
    await refresh();
  } catch (error) {
    toast(error.message);
  } finally {
    $("send").disabled = false;
  }
};
$("message").onkeydown = (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    $("chatForm").requestSubmit();
  }
};
addEventListener("keydown", (e) => {
  if ($("panel").open || $("conversation").open) return;
  if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
  const key = e.key.toLowerCase();
  if (
    [
      "w",
      "a",
      "s",
      "d",
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
      " ",
    ].includes(key)
  )
    e.preventDefault();
  if (!e.repeat) {
    if (key === "e") nearest?.action();
    if (key === "t") openChat();
    if (key === "m") showMap();
    if (key === "v") toggleView();
  }
  keys.add(key);
  if (
    [
      "w",
      "a",
      "s",
      "d",
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
    ].includes(key)
  ) {
    route = [];
    sitting = false;
    $("journey").hidden = true;
  }
});
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
addEventListener("blur", () => keys.clear());
for (const b of document.querySelectorAll("[data-move]")) {
  b.onpointerdown = (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    keys.add(b.dataset.move);
    route = [];
    sitting = false;
  };
  b.onpointerup = b.onpointercancel = () => keys.delete(b.dataset.move);
}
let drag = null;
renderer.domElement.addEventListener("pointerdown", (e) => {
  drag = { x: e.clientX, y: e.clientY, moved: 0 };
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x,
    dy = e.clientY - drag.y;
  drag.moved += Math.abs(dx) + Math.abs(dy);
  yaw += dx * 0.004;
  pitch = THREE.MathUtils.clamp(pitch - dy * 0.003, -0.45, 0.8);
  drag.x = e.clientX;
  drag.y = e.clientY;
});
const ray = new THREE.Raycaster();
renderer.domElement.addEventListener("pointerup", (e) => {
  if (drag && drag.moved < 6) {
    ray.setFromCamera(
      new THREE.Vector2(
        (e.clientX / innerWidth) * 2 - 1,
        1 - (e.clientY / innerHeight) * 2,
      ),
      camera,
    );
    const hits = ray.intersectObjects(
      [...bookMeshes.children, ...creations.children],
      true,
    );
    if (hits.length) {
      const item = hits[0].object.userData.interaction;
      if (item) {
        if (
          Math.hypot(item.x - playerPos.x, item.z - playerPos.z) <
          (item.range || 4)
        )
          item.action();
        else toast("Walk closer to use this object.");
      }
    }
  }
  drag = null;
});
renderer.domElement.addEventListener("pointercancel", () => (drag = null));
function locate() {
  const room = rooms.find(
    (r) =>
      Math.abs(playerPos.x - r.cx) < r.w / 2 &&
      Math.abs(playerPos.z - r.cz) < r.d / 2,
  );
  const name =
    room?.name ||
    (playerPos.z < -21
      ? "The overlook"
      : Math.hypot(playerPos.x + 24, playerPos.z - 5) < 10
        ? "The pond"
        : "The commons");
  for (const r of rooms) r.roof.visible = r !== room;
  if (name === lastZone) return;
  lastZone = name;
  $("place").textContent = room ? "COME INSIDE" : "THE VALLEY";
  $("placeTitle").textContent = name;
  $("placeDetail").textContent = {
    "The Library": "Every book holds something Lumen has actually researched.",
    "The Workshop":
      "Ideas become things here. Approach the board or workbench.",
    "Lumen’s cottage": "A home, a journal, and a little room to rest.",
    "The overlook": "Take a breath. Watch the valley grow.",
    "The pond": "A quiet place beside the water.",
    "The commons": "Follow the paths. The doors are open.",
  }[name];
}
function findInteraction() {
  const movingLumen = {
    title: "Talk to Lumen",
    x: lumen.position.x,
    z: lumen.position.z,
    y: 1.2,
    action: openChat,
  };
  const pet = {
    title: petUntil > Date.now() ? "Pip is happy" : "Pet Pip",
    x: pip.position.x,
    z: pip.position.z,
    y: 0.6,
    action: () => {
      petUntil = Date.now() + 7000;
      toast("Pip settles beside you.");
    },
  };
  let best = null,
    bestScore = Infinity;
  const forward = new THREE.Vector2(Math.sin(yaw), -Math.cos(yaw));
  for (const item of [
    ...interactions,
    ...bookInteractions,
    ...savedInteractions,
    movingLumen,
    pet,
  ]) {
    const dx = item.x - playerPos.x,
      dz = item.z - playerPos.z,
      d = Math.hypot(dx, dz);
    if (d > (item.range || 3.1)) continue;
    const facing = d > 0.1 ? forward.dot(new THREE.Vector2(dx / d, dz / d)) : 1;
    if (facing < -0.4 && d > 1.1) continue;
    const score = d + (1 - facing) * 1.4;
    if (score < bestScore) {
      best = item;
      bestScore = score;
    }
  }
  nearest = best;
  $("interaction").hidden = !best;
  if (best) $("interactionLabel").textContent = best.title;
}
const fireflyPositions = new Float32Array(180 * 3);
for (let i = 0; i < 180; i++) {
  fireflyPositions[i * 3] = (random() - 0.5) * 65;
  fireflyPositions[i * 3 + 1] = 0.6 + random() * 3;
  fireflyPositions[i * 3 + 2] = (random() - 0.5) * 65;
}
const fliesGeo = new THREE.BufferGeometry();
fliesGeo.setAttribute(
  "position",
  new THREE.BufferAttribute(fireflyPositions, 3),
);
const flies = new THREE.Points(
  fliesGeo,
  new THREE.PointsMaterial({
    color: "#fff1ae",
    size: 0.07,
    transparent: true,
    opacity: 0.65,
  }),
);
scene.add(flies);
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
// Batch static geometry by material so the valley is responsive on ordinary PCs.
scene.updateMatrixWorld(true);
const batches = new Map(),
  originalMeshes = [];
environment.traverse((o) => {
  if (!o.isMesh) return;
  let p = o.parent;
  while (p) {
    if (rooms.some((r) => r.roof === p)) return;
    p = p.parent;
  }
  const m = o.material;
  const key = [
    m.color.getHex(),
    m.roughness,
    m.metalness,
    m.emissive.getHex(),
    m.emissiveIntensity,
  ].join(":");
  if (!batches.has(key))
    batches.set(key, { material: m.clone(), geometries: [] });
  let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
  g.applyMatrix4(o.matrixWorld);
  batches.get(key).geometries.push(g);
  originalMeshes.push(o);
});
for (const batch of batches.values()) {
  const merged = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv"]) {
    const attributes = batch.geometries.map((g) => g.getAttribute(name));
    if (attributes.some((a) => !a)) continue;
    const array = new Float32Array(
      attributes.reduce((n, a) => n + a.array.length, 0),
    );
    let offset = 0;
    for (const a of attributes) {
      array.set(a.array, offset);
      offset += a.array.length;
    }
    merged.setAttribute(
      name,
      new THREE.BufferAttribute(array, attributes[0].itemSize),
    );
  }
  merged.computeBoundingSphere();
  const mesh = new THREE.Mesh(merged, batch.material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  for (const g of batch.geometries) g.dispose();
}
for (const mesh of originalMeshes) {
  mesh.parent.remove(mesh);
  mesh.geometry.dispose();
  mesh.material.dispose();
}
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1);
  elapsed += dt;
  const modal = $("panel").open || $("conversation").open;
  let walking = false;
  const old = playerPos.clone();
  if (!modal) {
    if (route.length) {
      walking = follow(playerPos, route, 3.5, dt);
      if (route.length) {
        const direction = route[0].clone().sub(playerPos);
        yaw = THREE.MathUtils.lerp(
          yaw,
          Math.atan2(direction.x, -direction.z),
          Math.min(1, dt * 5),
        );
      } else {
        $("journey").hidden = true;
        toast("You’ve arrived at " + destinationName + ".");
      }
    } else {
      const forward = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw)),
        right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw)),
        direction = new THREE.Vector3();
      if (keys.has("w") || keys.has("arrowup")) direction.add(forward);
      if (keys.has("s") || keys.has("arrowdown")) direction.sub(forward);
      if (keys.has("d") || keys.has("arrowright")) direction.add(right);
      if (keys.has("a") || keys.has("arrowleft")) direction.sub(right);
      if (direction.length()) {
        direction
          .normalize()
          .multiplyScalar((keys.has("shift") ? 6 : 3.2) * dt);
        move(playerPos, direction.x, direction.z);
        walking = true;
        sitting = false;
      }
    }
  }
  visitor.position.copy(playerPos);
  visitor.position.y = sitting ? -0.45 : 0;
  visitor.rotation.y = yaw + Math.PI;
  animatePerson(visitor, walking, elapsed);
  const lumBefore = lumen.position.clone();
  const lumMoving = follow(lumen.position, lumenRoute, 2.2, dt);
  if (lumMoving) {
    const dir = lumen.position.clone().sub(lumBefore);
    if (dir.length() > 0.001) lumen.rotation.y = Math.atan2(dir.x, dir.z);
  }
  animatePerson(lumen, lumMoving, elapsed);
  if (
    !lumMoving &&
    ["building", "researching", "thinking"].includes(lumenMode)
  ) {
    lumen.userData.arms[0].rotation.x = -0.7 + Math.sin(elapsed * 3) * 0.12;
    lumen.userData.arms[1].rotation.x = -0.7;
  }
  lumenTag.position.y = 2.5 + Math.sin(elapsed) * 0.04;
  const petTarget =
    petUntil > Date.now()
      ? playerPos.clone().add(new THREE.Vector3(1, 0, 0))
      : new THREE.Vector3(
          Math.sin(elapsed * 0.12) * 2 + 1,
          0,
          Math.cos(elapsed * 0.12) * 2 + 7,
        );
  const pd = petTarget.sub(pip.position);
  pd.y = 0;
  if (pd.length() > 0.2) {
    pd.normalize().multiplyScalar(dt * 1.25);
    move(pip.position, pd.x, pd.z);
    pip.rotation.y = Math.atan2(-pd.x, -pd.z);
  }
  pip.userData.tail.rotation.z =
    Math.sin(elapsed * (petUntil > Date.now() ? 14 : 3)) * 0.2;
  const eyeHeight = sitting ? 1.05 : 1.7;
  const target = playerPos.clone().add(new THREE.Vector3(0, eyeHeight, 0));
  if (firstPerson) {
    camera.position.copy(target);
    const direction = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch),
    );
    camera.lookAt(target.clone().add(direction));
  } else {
    const room = rooms.find(
      (r) =>
        Math.abs(playerPos.x - r.cx) < r.w / 2 &&
        Math.abs(playerPos.z - r.cz) < r.d / 2,
    );
    const distance = room ? 3.4 : 6;
    const offset = new THREE.Vector3(
      -Math.sin(yaw) * distance,
      2.4 + pitch * 3,
      Math.cos(yaw) * distance,
    );
    const cameraPosition = target.clone().add(offset);
    for (let f = 1; f > 0.15; f -= 0.1) {
      const candidate = target.clone().lerp(cameraPosition, f);
      if (!blocked(candidate.x, candidate.z)) {
        camera.position.copy(candidate);
        break;
      }
    }
    camera.lookAt(target);
  }
  flies.rotation.y = Math.sin(elapsed * 0.03) * 0.06;
  locate();
  if (!modal) findInteraction();
  else $("interaction").hidden = true;
  renderer.render(scene, camera);
});
await refresh();
$("loading").hidden = true;
setInterval(refresh, 2500);
$("world").focus();
