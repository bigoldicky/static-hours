import * as THREE from 'three';

const EYE_HEIGHT = 1.65;
const RADIUS = 0.28;
const WALK = 3.2;
const SPRINT = 5.4;
const GRAVITY = 18;

export class Player {
  constructor(camera, audio) {
    this.camera = camera;
    this.audio = audio;
    this.yaw = 0;
    this.pitch = 0;
    this.velocity = new THREE.Vector3();
    this.position = new THREE.Vector3(0, EYE_HEIGHT, 5.2);
    this.keys = {};
    this.locked = false;
    this.enabled = false;
    this.sensitivity = 1.2;
    this.flashlightOn = false;
    this.flashlight = null;
    this._footTimer = 0;
    this.onGround = true;
    this.colliderBoxes = [];
    this.heightZones = [];
    this.floorY = 0;
    this._mobileAxis = null; // {x,y} analog from joystick
    this.usePointerLock = true; // false on touch devices
  }

  attachFlashlight(light) {
    this.flashlight = light;
    this.camera.add(light);
    light.position.set(0.15, -0.1, -0.2);
    light.target.position.set(0, -0.05, -1);
    this.camera.add(light.target);
    light.visible = false;
  }

  setColliders(boxes) {
    this.colliderBoxes = boxes;
  }

  setHeightZones(zones) {
    this.heightZones = zones;
  }

  lock(el) {
    if (!this.usePointerLock) return;
    try {
      const r = el.requestPointerLock?.();
      if (r && typeof r.then === 'function') r.catch(() => {});
    } catch (_) {}
  }

  onPointerLockChange() {
    this.locked = document.pointerLockElement !== null;
  }

  onMouseMove(e) {
    if (!this.enabled) return;
    if (this.usePointerLock && !this.locked) return;
    if (!this.usePointerLock) return; // touch handled by MobileControls
    const sens = 0.0022 * this.sensitivity;
    this.yaw -= e.movementX * sens;
    this.pitch -= e.movementY * sens;
    this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch));
  }

  onKey(e, down) {
    this.keys[e.code] = down;
    if (down && e.code === 'KeyF' && this.enabled) {
      this.toggleFlashlight();
    }
  }

  toggleFlashlight() {
    this.flashlightOn = !this.flashlightOn;
    if (this.flashlight) this.flashlight.visible = this.flashlightOn;
    this.audio?.click();
  }

  getForward() {
    const e = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    return new THREE.Vector3(0, 0, -1).applyEuler(e);
  }

  _floorAt(x, z) {
    if (this.heightZones) {
      for (const zoned of this.heightZones) {
        if (x >= zoned.minX && x <= zoned.maxX && z >= zoned.minZ && z <= zoned.maxZ) {
          return zoned.y;
        }
      }
    }
    return this.floorY;
  }

  _overlaps(px, py, pz, b) {
    const r = RADIUS;
    const feet = py - EYE_HEIGHT;
    const head = py + 0.15;
    if (head < b.min.y || feet > b.max.y) return false;
    return (
      px + r > b.min.x &&
      px - r < b.max.x &&
      pz + r > b.min.z &&
      pz - r < b.max.z
    );
  }

  _collide(from, to) {
    const boxes = this.colliderBoxes;
    let x = to.x;
    let z = to.z;
    let y = to.y;

    for (const b of boxes) {
      if (this._overlaps(x, from.y, from.z, b)) x = from.x;
    }
    for (const b of boxes) {
      if (this._overlaps(x, from.y, z, b)) z = from.z;
    }

    const floor = this._floorAt(x, z);
    if (y - EYE_HEIGHT < floor) {
      y = floor + EYE_HEIGHT;
      this.velocity.y = 0;
      this.onGround = true;
    } else if (y - EYE_HEIGHT > floor + 0.35) {
      this.onGround = false;
    } else {
      // snap down small steps / stairs
      y = floor + EYE_HEIGHT;
      this.velocity.y = 0;
      this.onGround = true;
    }
    const ceil = floor + 2.85;
    if (y > ceil - 0.1) {
      y = ceil - 0.1;
      this.velocity.y = 0;
    }
    return new THREE.Vector3(x, y, z);
  }

  update(dt) {
    if (!this.enabled) {
      this._applyCamera();
      return;
    }

    const sprint = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    const speed = sprint ? SPRINT : WALK;

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wish = new THREE.Vector3();

    if (this._mobileAxis && (Math.abs(this._mobileAxis.x) > 0.05 || Math.abs(this._mobileAxis.y) > 0.05)) {
      const ax = this._mobileAxis;
      const mag = Math.min(1, Math.hypot(ax.x, ax.y));
      wish.addScaledVector(forward, ax.y * mag);
      wish.addScaledVector(right, ax.x * mag);
      if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed * mag);
    } else {
      if (this.keys['KeyW']) wish.add(forward);
      if (this.keys['KeyS']) wish.sub(forward);
      if (this.keys['KeyD']) wish.add(right);
      if (this.keys['KeyA']) wish.sub(right);
      if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed);
    }

    this.velocity.x = wish.x;
    this.velocity.z = wish.z;
    this.velocity.y -= GRAVITY * dt;

    const next = this.position.clone().addScaledVector(this.velocity, dt);
    this.position.copy(this._collide(this.position, next));

    if (wish.lengthSq() > 0.1 && this.onGround) {
      this._footTimer -= dt;
      if (this._footTimer <= 0) {
        this.audio?.footstep(sprint);
        this._footTimer = sprint ? 0.28 : 0.42;
      }
    }

    this._applyCamera();
  }

  _applyCamera() {
    this.camera.position.copy(this.position);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  setPose(pos, yaw, pitch) {
    this.position.set(pos.x, pos.y, pos.z);
    if (yaw !== undefined && yaw !== null) this.yaw = yaw;
    if (pitch !== undefined && pitch !== null) this.pitch = pitch;
    this._applyCamera();
  }
}
