import * as THREE from 'three';
import { NOTES } from './content.js';

/** Procedural canvas textures */
function makeNoiseTex(w, h, base, variance, tint = [1, 1, 1]) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const n = base + (Math.random() - 0.5) * variance;
    img.data[i * 4] = Math.max(0, Math.min(255, n * tint[0]));
    img.data[i * 4 + 1] = Math.max(0, Math.min(255, n * tint[1]));
    img.data[i * 4 + 2] = Math.max(0, Math.min(255, n * tint[2]));
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // faint grain lines
  ctx.strokeStyle = 'rgba(0,0,0,0.04)';
  for (let y = 0; y < h; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y + Math.random());
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeWoodTex() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#3a3028';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(${40 + Math.random() * 30},${30 + Math.random() * 20},${20},0.35)`;
    ctx.lineWidth = 1 + Math.random() * 2;
    const y = Math.random() * 256;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < 256; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 3);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.interactables = [];
    this.doors = {};
    this.lights = {};
    this.props = {};
    this.movingProps = []; // objects that shift when not looked at
    this.meshes = [];
    this.fuseState = [false, false, false, false, false, false]; // 6 switches; puzzle: 0,2,3,5 then MAIN(1) last conceptually — simplified
    this.powerOn = false;
    this.radioFreq = 89.3;
    this.radioOn = false;

    this.wallMat = null;
    this.floorMat = null;
    this.ceilMat = null;
  }

  build() {
    const wallTex = makeNoiseTex(128, 128, 72, 18, [1, 0.95, 0.9]);
    wallTex.repeat.set(2, 2);
    const floorTex = makeWoodTex();
    const ceilTex = makeNoiseTex(64, 64, 40, 10, [0.9, 0.9, 0.95]);

    this.wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      color: 0x8a8078,
      roughness: 0.92,
      metalness: 0.02,
    });
    this.floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      color: 0x6a5a48,
      roughness: 0.85,
    });
    this.ceilMat = new THREE.MeshStandardMaterial({
      map: ceilTex,
      color: 0x3a3840,
      roughness: 1,
    });
    this.darkMat = new THREE.MeshStandardMaterial({ color: 0x1a181c, roughness: 0.95 });
    this.doorMat = new THREE.MeshStandardMaterial({ color: 0x4a3a30, roughness: 0.7 });
    this.metalMat = new THREE.MeshStandardMaterial({ color: 0x555560, metalness: 0.6, roughness: 0.4 });

    // Fog / exterior
    this.scene.fog = new THREE.FogExp2(0x0a0a0e, 0.045);
    this.scene.background = new THREE.Color(0x0a0a0e);

    // Ambient + moon
    const amb = new THREE.AmbientLight(0x3a4050, 0.25);
    this.scene.add(amb);
    const moon = new THREE.DirectionalLight(0x6a7a9a, 0.15);
    moon.position.set(-10, 20, 8);
    this.scene.add(moon);

    this._buildExterior();
    this._buildGroundFloor();
    this._buildUpstairs();
    this._buildBasement();
    this._buildStairs();
    this._placeInteractables();
    this._placeFurniture();
    this._setupLights();

    return {
      colliders: this.colliders,
      heightZones: this._heightZones(),
      interactables: this.interactables,
    };
  }

  _heightZones() {
    return [
      // porch / outside
      { minX: -3, maxX: 3, minZ: 3.5, maxZ: 8, y: 0 },
      // ground floor interior
      { minX: -8, maxX: 8, minZ: -8.5, maxZ: 4, y: 0 },
      // upstairs
      { minX: -8, maxX: 8, minZ: -8.5, maxZ: 2, y: 3.15 },
      // stair volume (approximate ramp via stepped zones)
      { minX: -1.2, maxX: 1.2, minZ: -2.2, maxZ: -0.2, y: 0.55 },
      { minX: -1.2, maxX: 1.2, minZ: -3.4, maxZ: -2.2, y: 1.2 },
      { minX: -1.2, maxX: 1.2, minZ: -4.6, maxZ: -3.4, y: 1.85 },
      { minX: -1.2, maxX: 1.2, minZ: -5.8, maxZ: -4.6, y: 2.5 },
      { minX: -1.2, maxX: 1.2, minZ: -7.0, maxZ: -5.8, y: 3.15 },
      // basement stairs
      { minX: 2.5, maxX: 4.5, minZ: -7.5, maxZ: -5.5, y: -0.8 },
      { minX: 2.5, maxX: 4.5, minZ: -8.5, maxZ: -7.5, y: -1.6 },
      { minX: 2.5, maxX: 4.5, minZ: -9.5, maxZ: -8.5, y: -2.4 },
      // basement
      { minX: -5, maxX: 5.5, minZ: -14.5, maxZ: -8.5, y: -3.2 },
      // crawlspace (under stairs / linen)
      { minX: -7.2, maxX: -4.8, minZ: -7.8, maxZ: -5.5, y: 0.15 },
    ];
  }

  _box(x, y, z, w, h, d, mat, opts = {}) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat || this.wallMat);
    mesh.position.set(x, y, z);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    if (opts.name) mesh.name = opts.name;
    this.scene.add(mesh);
    this.meshes.push(mesh);
    if (opts.collide !== false) {
      const half = new THREE.Vector3(w / 2, h / 2, d / 2);
      const min = new THREE.Vector3(x - half.x, y - half.y, z - half.z);
      const max = new THREE.Vector3(x + half.x, y + half.y, z + half.z);
      this.colliders.push({ min, max, mesh, id: opts.id });
    }
    return mesh;
  }

  _floor(x, z, w, d, y, mat) {
    const m = this._box(x, y - 0.05, z, w, 0.1, d, mat || this.floorMat, { collide: false });
    m.receiveShadow = true;
    return m;
  }

  _ceil(x, z, w, d, y) {
    return this._box(x, y, z, w, 0.1, d, this.ceilMat, { collide: false });
  }

  _wall(x, y, z, w, h, d, opts) {
    return this._box(x, y, z, w, h, d, this.wallMat, opts);
  }

  _buildExterior() {
    // ground outside
    this._floor(0, 8, 40, 30, 0, this.darkMat);
    // night trees as dark slabs
    for (let i = 0; i < 18; i++) {
      const tx = (Math.random() - 0.5) * 36;
      const tz = 10 + Math.random() * 14;
      if (Math.abs(tx) < 4 && tz < 12) continue;
      this._box(tx, 2.5, tz, 0.6 + Math.random(), 5 + Math.random() * 3, 0.6 + Math.random(), this.darkMat, {
        collide: false,
      });
    }
    // porch
    this._floor(0, 5.2, 4.5, 3.2, 0);
    this._box(0, 1.4, 6.6, 0.15, 2.8, 0.15, this.metalMat, { collide: false }); // porch light post
  }

  _buildGroundFloor() {
    const H = 2.9;
    const hy = H / 2;

    // Outer shell roughly: x -7..7, z -8..3.5
    // Front wall with door gap
    this._wall(-3.5, hy, 3.5, 5, H, 0.2);
    this._wall(3.5, hy, 3.5, 5, H, 0.2);
    this._wall(0, 2.55, 3.5, 2.2, 0.7, 0.2); // lintel
    // Back wall
    this._wall(0, hy, -8, 14.2, H, 0.25);
    // Left / right outer
    this._wall(-7, hy, -2.25, 0.25, H, 11.5);
    this._wall(7, hy, -2.25, 0.25, H, 11.5);

    // Floors / ceilings
    this._floor(0, -2.25, 14, 11.5, 0);
    this._ceil(0, -2.25, 14, 11.5, H);

    // Interior partitions
    // Living room (right) | hallway | kitchen (left)
    // Wall between kitchen and hall (with doorway)
    this._wall(-3.2, hy, 0.5, 0.2, H, 6);
    this._wall(-3.2, hy, -6.5, 0.2, H, 3);
    // Wall between living and hall
    this._wall(3.2, hy, 0.5, 0.2, H, 6);
    this._wall(3.2, hy, -6.5, 0.2, H, 3);

    // Bathroom enclosure (front-left)
    this._wall(-5.1, hy, 1.2, 3.6, H, 0.2);
    this._wall(-3.4, hy, 2.35, 0.2, H, 2.1);

    // Closet / linen (back-left near stairs) — crawlspace access behind
    this._wall(-5.5, hy, -5.2, 2.8, H, 0.2);

    // Front door mesh (interactable door)
    const frontDoor = this._box(0, 1.2, 3.52, 1.1, 2.35, 0.08, this.doorMat, { collide: true, id: 'door_front' });
    this.doors.front = { mesh: frontDoor, open: false, locked: false, angle: 0, pivotZ: 3.52, pivotX: 0 };

    // Kitchen door to hall already open (gap). Bathroom door:
    const bathDoor = this._box(-3.4, 1.15, 2.9, 0.08, 2.2, 0.9, this.doorMat, { collide: true, id: 'door_bath' });
    this.doors.bath = { mesh: bathDoor, open: false, locked: false };

    // Basement door (starts locked)
    const baseDoor = this._box(3.5, 1.15, -7.2, 1.0, 2.2, 0.08, this.doorMat, { collide: true, id: 'door_basement' });
    this.doors.basement = { mesh: baseDoor, open: false, locked: true, needs: 'basement_key' };

    // Upstairs access is stairs — bedroom door upstairs
  }

  _buildUpstairs() {
    const y0 = 3.15;
    const H = 2.7;
    const hy = y0 + H / 2;

    this._floor(0, -3, 14, 10, y0);
    this._ceil(0, -3, 14, 10, y0 + H);

    // Outer walls upstairs
    this._wall(0, hy, 2, 14.2, H, 0.25);
    this._wall(0, hy, -8, 14.2, H, 0.25);
    this._wall(-7, hy, -3, 0.25, H, 10);
    this._wall(7, hy, -3, 0.25, H, 10);

    // Bedroom (left) / office (right) / hall center
    this._wall(-2.5, hy, -3, 0.2, H, 10);
    this._wall(2.5, hy, -3, 0.2, H, 10);

    // Doorways: gaps at z=-1
    // Bedroom door
    const bedDoor = this._box(-2.5, y0 + 1.1, -1.2, 0.08, 2.2, 1.0, this.doorMat, {
      collide: true,
      id: 'door_bedroom',
    });
    this.doors.bedroom = { mesh: bedDoor, open: false, locked: false };

    const officeDoor = this._box(2.5, y0 + 1.1, -1.2, 0.08, 2.2, 1.0, this.doorMat, {
      collide: true,
      id: 'door_office',
    });
    this.doors.office = { mesh: officeDoor, open: false, locked: false };

    // Stair hole railing (visual)
    this._box(0, y0 + 0.5, -4.5, 2.6, 1.0, 0.1, this.metalMat, { collide: true });
  }

  _buildBasement() {
    const y0 = -3.2;
    const H = 2.6;
    const hy = y0 + H / 2;

    this._floor(0, -11.5, 10, 6, y0, this.darkMat);
    this._ceil(0, -11.5, 10, 6, y0 + H);

    this._wall(0, hy, -8.6, 10, H, 0.25);
    this._wall(0, hy, -14.5, 10, H, 0.25);
    this._wall(-5, hy, -11.5, 0.25, H, 6);
    this._wall(5, hy, -11.5, 0.25, H, 6);

    // Opening from stairs at +x
    this._wall(3.5, hy, -8.6, 3, H, 0.25); // partial — leave gap near x=3.5 path... actually stairs enter at z~-9 x~3.5
  }

  _buildStairs() {
    // Upstairs staircase in hall going back
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      const z = -0.5 - i * 0.55;
      const y = i * 0.32;
      this._box(0, y + 0.08, z, 1.8, 0.16, 0.55, this.floorMat, { collide: true });
    }
    // Basement stairs from near back-right
    for (let i = 0; i < 8; i++) {
      const z = -7.4 - i * 0.45;
      const y = -i * 0.4;
      this._box(3.5, y + 0.08, z, 1.4, 0.16, 0.5, this.floorMat, { collide: true });
    }
  }

  _setupLights() {
    // Porch
    const porch = new THREE.PointLight(0xffcc88, 0.6, 8);
    porch.position.set(0, 2.6, 6.2);
    this.scene.add(porch);
    this.lights.porch = porch;

    // Interior points — dim until power restored
    const mk = (name, x, y, z, color, dist) => {
      const l = new THREE.PointLight(color, 0, dist);
      l.position.set(x, y, z);
      this.scene.add(l);
      this.lights[name] = l;
      return l;
    };
    mk('hall', 0, 2.4, 0.5, 0xffe8c8, 9);
    mk('kitchen', -5, 2.4, -1, 0xffe0b0, 7);
    mk('living', 5, 2.4, -1, 0xffd8a8, 8);
    mk('bath', -5, 2.2, 2.4, 0xc8d0e0, 4);
    mk('up_hall', 0, 5.2, -2, 0xffe8c8, 8);
    mk('bedroom', -5, 5.2, -4, 0xffd0a0, 6);
    mk('office', 5, 5.2, -4, 0xe0e8ff, 6);
    mk('basement', 0, -1.5, -11.5, 0x88a0ff, 7);

    // Flicker state
    this._flicker = {};
  }

  setPower(on) {
    this.powerOn = on;
    const intensity = on ? 0.55 : 0;
    ['hall', 'kitchen', 'living', 'bath', 'up_hall', 'bedroom', 'office'].forEach((k) => {
      if (this.lights[k]) this.lights[k].intensity = intensity;
    });
    if (this.lights.basement) this.lights.basement.intensity = on ? 0.35 : 0.08;
  }

  flickerLights(dt, fear) {
    if (!this.powerOn) return;
    for (const k of ['hall', 'living', 'kitchen', 'up_hall']) {
      const l = this.lights[k];
      if (!l) continue;
      if (Math.random() < 0.01 + fear * 0.03) {
        l.intensity = Math.random() < 0.5 ? 0.1 : 0.7;
        setTimeout(() => {
          if (this.powerOn) l.intensity = 0.55;
        }, 80 + Math.random() * 200);
      }
    }
  }

  _placeFurniture() {
    const wood = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.8 });
    const fabric = new THREE.MeshStandardMaterial({ color: 0x3a3a48, roughness: 0.9 });
    const couch = this._box(5.2, 0.45, -0.5, 2.4, 0.9, 1.0, fabric);
    this.props.couch = couch;
    this.movingProps.push({ mesh: couch, home: couch.position.clone(), shift: new THREE.Vector3(0.35, 0, 0) });

    this._box(5.2, 0.35, -3.5, 1.4, 0.7, 0.7, wood); // table
    this._box(-5.2, 0.9, -2.5, 2.2, 0.1, 1.2, wood); // kitchen counter
    this._box(-5.2, 0.45, -2.5, 2.2, 0.9, 1.0, wood);
    this._box(-4.5, 0.4, 2.4, 0.7, 0.8, 0.45, this.metalMat); // toilet-ish
    this._box(-5.8, 0.9, 2.5, 0.8, 0.15, 0.5, this.metalMat); // sink

    // Bed upstairs
    this._box(-5, 3.5, -5, 2.0, 0.5, 1.6, fabric);
    this._box(5, 3.9, -4.5, 1.4, 0.8, 0.7, wood); // desk

    // Basement shelves / radio table
    this._box(-2, -2.7, -12, 1.5, 1.0, 0.5, wood);
    this._box(2, -2.7, -12.5, 1.2, 0.9, 0.6, this.metalMat);

    // Chair that moves
    const chair = this._box(4.2, 0.4, -2.2, 0.5, 0.8, 0.5, wood);
    this.movingProps.push({ mesh: chair, home: chair.position.clone(), shift: new THREE.Vector3(-0.5, 0, 0.4) });
  }

  _interact(id, pos, radius, type, data, prompt) {
    const obj = { id, position: new THREE.Vector3(...pos), radius, type, data, prompt, taken: false };
    this.interactables.push(obj);
    // subtle marker
    if (type === 'note' || type === 'item' || type === 'phone') {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.02, 0.2),
        new THREE.MeshStandardMaterial({ color: 0xc8b898, emissive: 0x221800, emissiveIntensity: 0.3 })
      );
      m.position.copy(obj.position);
      this.scene.add(m);
      obj.marker = m;
    }
    return obj;
  }

  _placeInteractables() {
    // Phone on living table
    this._interact('phone', [5.2, 0.85, -3.5], 1.2, 'phone', { noteId: 'text_thread' }, 'Read phone');

    this._interact('sticky_fridge', [-5.8, 1.5, -2.0], 1.1, 'note', { noteId: 'sticky_fridge' }, 'Read note');
    this._interact('lease', [1.5, 1.0, 2.8], 1.1, 'note', { noteId: 'lease' }, 'Read paper');
    this._interact('journal1', [4.8, 0.85, -3.3], 1.0, 'note', { noteId: 'journal1' }, 'Read journal');
    this._interact('pharmacy', [-5.0, 1.0, -1.8], 1.0, 'note', { noteId: 'pharmacy' }, 'Read receipt');
    this._interact('bathroom_mirror', [-5.5, 1.5, 2.8], 1.1, 'note', { noteId: 'bathroom_mirror' }, 'Inspect mirror');
    this._interact('bedroom_letter', [-5.2, 3.7, -4.2], 1.1, 'note', { noteId: 'bedroom_letter' }, 'Read letter');
    this._interact('office_email', [5.2, 4.4, -4.5], 1.1, 'note', { noteId: 'office_email' }, 'Read printout');
    this._interact('basement_note', [-2.0, -2.1, -12.0], 1.2, 'note', { noteId: 'basement_note' }, 'Read card');
    this._interact('fuse_hint', [1.5, -2.0, -13.5], 1.3, 'note', { noteId: 'fuse_hint' }, 'Read label');

    // Keys / items
    this._interact('basement_key', [-5.5, 3.7, -5.5], 1.0, 'item', { item: 'basement_key', label: 'Basement Key' }, 'Take key');
    this._interact(
      'front_key',
      [6.2, 0.9, -0.8],
      1.0,
      'item',
      { item: 'front_key', label: 'Spare House Key' },
      'Take key'
    );

    // Fuse box
    this._interact('fusebox', [1.2, -2.0, -13.8], 1.4, 'fusebox', {}, 'Use fuse box');

    // Radio (easter egg frequency)
    this._interact('radio', [2.0, -2.1, -12.5], 1.2, 'radio', {}, 'Tune radio');

    // Doors as interactables
    this._interact('door_front', [0, 1.2, 3.4], 1.5, 'door', { door: 'front' }, 'Open door');
    this._interact('door_bath', [-3.3, 1.2, 2.9], 1.3, 'door', { door: 'bath' }, 'Open door');
    this._interact('door_basement', [3.5, 1.2, -7.0], 1.4, 'door', { door: 'basement' }, 'Open basement');
    this._interact('door_bedroom', [-2.4, 4.3, -1.2], 1.3, 'door', { door: 'bedroom' }, 'Open door');
    this._interact('door_office', [2.4, 4.3, -1.2], 1.3, 'door', { door: 'office' }, 'Open door');

    // Crawlspace entrance (easter egg) — linen closet back
    this._interact(
      'crawlspace',
      [-6.2, 1.0, -5.5],
      1.2,
      'crawl',
      {},
      'Squeeze into crawlspace'
    );
    this._interact('crawl_scrawl', [-6.0, 0.9, -7.0], 1.2, 'note', { noteId: 'crawl_scrawl' }, 'Read carving');
    this._interact(
      'polaroid',
      [-5.5, 0.5, -7.2],
      1.1,
      'note',
      { noteId: 'cryptic_polaroid', egg: 'polaroid' },
      'Take polaroid'
    );

    // Climax door answer zone (front door from inside when event active)
    this._interact('answer_door', [0, 1.2, 3.2], 1.8, 'climax', {}, 'The door…');
  }

  openDoor(name, inventory = []) {
    const d = this.doors[name];
    if (!d) return { ok: false, reason: 'missing' };
    if (d.open) {
      // close
      d.open = false;
      d.mesh.rotation.y = 0;
      // restore collider roughly
      return { ok: true, opened: false };
    }
    if (d.locked) {
      if (d.needs && inventory.includes(d.needs)) {
        d.locked = false;
      } else {
        return { ok: false, reason: 'locked' };
      }
    }
    d.open = true;
    d.mesh.rotation.y = name === 'bath' ? -1.4 : 1.5;
    // Disable collider by shoving box away
    const col = this.colliders.find((c) => c.id === 'door_' + (name === 'bath' ? 'bath' : name === 'basement' ? 'basement' : name === 'bedroom' ? 'bedroom' : name === 'office' ? 'office' : 'front'));
    if (col) {
      col.min.y = 100;
      col.max.y = 101;
    }
    // Also match by mesh
    for (const c of this.colliders) {
      if (c.mesh === d.mesh) {
        c.min.y = 100;
        c.max.y = 101;
      }
    }
    return { ok: true, opened: true };
  }

  /** Fuse puzzle: switches 0,2,4 ON, then pull "MAIN" (index 1) — actually user-facing: flip Kitchen, Hall, Upstairs, Spare then Main */
  tryFuse(index) {
    this.fuseState[index] = !this.fuseState[index];
    // Win: indices 0,2,3,5 true and 1 (main) true last — check pattern
    const [kitchen, main, hall, up, base, spare] = this.fuseState.map(Boolean);
    // Correct: kitchen, hall, up, spare on; basement off; then main on
    const ready = kitchen && hall && up && spare && !base;
    if (main && ready) {
      this.setPower(true);
      return { powered: true, state: [...this.fuseState] };
    }
    if (main && !ready) {
      // wrong — trip main back off
      this.fuseState[1] = false;
      this.setPower(false);
      return { powered: false, tripped: true, state: [...this.fuseState] };
    }
    return { powered: false, state: [...this.fuseState] };
  }

  updateMovingProps(camera, fear) {
    if (fear < 0.2) return;
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    for (const p of this.movingProps) {
      const to = p.mesh.position.clone().sub(camera.position).normalize();
      const looking = fwd.dot(to) > 0.55;
      const target = looking ? p.home : p.home.clone().add(p.shift);
      p.mesh.position.lerp(target, looking ? 0.15 : 0.02);
    }
  }
}
