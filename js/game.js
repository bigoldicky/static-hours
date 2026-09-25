import * as THREE from 'three';
import { Player } from './player.js';
import { World } from './world.js';
import { AudioEngine } from './audio.js';
import { UI } from './ui.js';
import { MobileControls } from './mobile.js';
import { saveGame, loadGame, clearSave, hasSave } from './save.js';
import { NOTES } from './content.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.audio = new AudioEngine();
    this.ui = new UI(this.audio);
    this.mobile = null;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x0a0a0e);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.08, 80);
    this.player = new Player(this.camera, this.audio);
    this.world = null;

    this.clock = new THREE.Clock();
    this.running = false;
    this.paused = false;
    this.state = this._freshState();
    this._near = null;
    this._phantom = null;
    this._hallucTimer = 0;
    this._knockTimer = 0;
    this._climaxActive = false;
    this._audioUnlocked = false;

    this._setupMobile();
    this._bindUI();
    this._bindInput();
    window.addEventListener('resize', () => this._onResize());
    // iOS: prevent scroll/bounce on document
    document.addEventListener(
      'touchmove',
      (e) => {
        if (e.target === this.canvas || e.target.closest?.('#mobile-controls')) {
          e.preventDefault();
        }
      },
      { passive: false }
    );
  }

  _freshState() {
    return {
      checkpoint: 'start',
      flags: {},
      inventory: [],
      readNotes: [],
      eggs: [],
      position: null,
      yaw: Math.PI,
      pitch: 0,
      act: 0,
      objective: 'start',
      powerRestored: false,
      doors: {},
      fear: 0,
    };
  }

  _setupMobile() {
    this.mobile = new MobileControls(this.player, {
      onInteract: () => {
        if (this.ui.reading) {
          this.ui.closeReader();
          return;
        }
        this._tryInteract();
      },
      onFlashlight: () => this.player.toggleFlashlight(),
      onAudioUnlock: () => this.unlockAudio(),
    });
    const touch = this.mobile.detect();
    this.player.usePointerLock = !touch;
    if (touch) {
      this.mobile.build();
      // Soften pixel ratio on phones
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    }
    document.addEventListener('mobile-pause', () => {
      if (this.running && !this.paused) this.pause();
    });
  }

  async unlockAudio() {
    try {
      if (this._audioUnlocked) {
        if (this.audio.ctx?.state === 'suspended') {
          await Promise.race([
            this.audio.ctx.resume(),
            new Promise((r) => setTimeout(r, 400)),
          ]);
        }
        return;
      }
      await this.audio.ensure();
      this._audioUnlocked = true;
    } catch (e) {
      console.warn('[Static Hours] audio unlock', e);
      this._audioUnlocked = true;
    }
  }

  _bindUI() {
    this.ui.onNewGame = () => this.startNew();
    this.ui.onContinue = () => this.continueGame();
    this.ui.onResume = () => this.resume();
    this.ui.onQuitMenu = () => this.quitToMenu();
    this.ui.onChoice = (id) => this._resolveEnding(id);
    this.ui.onCloseReader = () => {
      if (this.running && !this.paused && !this.ui.choosing) {
        this._relock();
      }
    };
  }

  _bindInput() {
    const canvas = this.canvas;
    canvas.addEventListener('click', () => {
      this.unlockAudio();
      if (this.running && !this.paused && !this.ui.reading && !this.ui.choosing) {
        this._relock();
      }
    });

    document.addEventListener('pointerlockchange', () => this.player.onPointerLockChange());
    document.addEventListener('mousemove', (e) => this.player.onMouseMove(e));
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        if (this.ui.reading) {
          this.ui.closeReader();
          return;
        }
        if (this.running && !this.ui.choosing) {
          if (this.paused) this.resume();
          else this.pause();
        }
        return;
      }
      if (e.code === 'KeyE' && this.running && !this.paused) {
        if (this.ui.reading) {
          this.ui.closeReader();
          return;
        }
        this._tryInteract();
        return;
      }
      this.player.onKey(e, true);
    });
    document.addEventListener('keyup', (e) => this.player.onKey(e, false));
  }

  _relock() {
    if (this.player.usePointerLock) this.player.lock(this.canvas);
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  async startNew() {
    await this.unlockAudio();
    clearSave();
    this.state = this._freshState();
    await this._bootWorld(true);
  }

  async continueGame() {
    await this.unlockAudio();
    const data = loadGame();
    if (!data) return this.startNew();
    this.state = { ...this._freshState(), ...data, flags: { ...data.flags }, inventory: [...(data.inventory || [])], readNotes: [...(data.readNotes || [])] };
    await this._bootWorld(false);
  }

  async _bootWorld(isNew) {
    this.ui.hideAllScreens();
    await this.ui.fadeOut(500);

    // Clear scene
    while (this.scene.children.length) this.scene.remove(this.scene.children[0]);
    this.world = new World(this.scene);
    const built = this.world.build();
    this.player.setColliders(built.colliders);
    this.player.setHeightZones(built.heightZones);

    const spot = new THREE.SpotLight(0xffe8c8, 2.2, 18, Math.PI / 7, 0.45, 1.2);
    this.player.attachFlashlight(spot);

    if (isNew || !this.state.position) {
      this.player.setPose({ x: 0, y: 1.65, z: 5.4 }, Math.PI, 0);
      this.state.yaw = Math.PI;
    } else {
      this.player.setPose(this.state.position, this.state.yaw, this.state.pitch);
    }

    if (this.state.powerRestored) this.world.setPower(true);

    // Restore door states loosely
    if (this.state.flags.basement_unlocked) {
      this.world.doors.basement.locked = false;
    }

    this.ui.showHud(true);
    this.ui.setObjective(this.state.objective || 'start');
    this.player.enabled = true;
    this.running = true;
    this.paused = false;

    if (this.mobile.isTouch) this.mobile.show();
    else this._relock();

    await this.ui.fadeIn(900);

    if (isNew) {
      this.ui.showPhoneNotif('M', 'Did you make it okay?');
      this._checkpoint('prologue');
    }

    if (!this._raf) this._loop();
  }

  pause() {
    if (!this.running) return;
    this.paused = true;
    this.player.enabled = false;
    try {
      document.exitPointerLock?.();
    } catch (_) {}
    if (this.mobile.isTouch) this.mobile.hide();
    this.ui.showScreen('pause-screen');
  }

  resume() {
    if (!this.running) return;
    this.ui.hideAllScreens();
    this.ui.showHud(true);
    this.paused = false;
    this.player.enabled = true;
    if (this.mobile.isTouch) this.mobile.show();
    else this._relock();
    // re-apply sens
    this.player.sensitivity = this.ui.settings.sens;
  }

  quitToMenu() {
    this.running = false;
    this.paused = false;
    this.player.enabled = false;
    this.ui.showHud(false);
    this.mobile.hide();
    try {
      document.exitPointerLock?.();
    } catch (_) {}
    this.ui.hideAllScreens();
    this.ui.showScreen('title-screen');
    this.ui.refreshContinue();
    this._checkpoint(this.state.checkpoint || 'manual');
  }

  _checkpoint(name) {
    this.state.checkpoint = name;
    this.state.position = {
      x: this.player.position.x,
      y: this.player.position.y,
      z: this.player.position.z,
    };
    this.state.yaw = this.player.yaw;
    this.state.pitch = this.player.pitch;
    this.state.powerRestored = this.world?.powerOn || this.state.powerRestored;
    saveGame(this.state);
    this.ui.showSaveToast();
  }

  _tryInteract() {
    if (!this.running || this.paused || this.ui.reading || this.ui.choosing) return;
    const hit = this._rayInteract();
    if (!hit) return;
    this._handleInteract(hit);
  }

  _rayInteract() {
    const origin = this.player.position.clone();
    const dir = this.player.getForward();
    let best = null;
    let bestDist = 2.4;
    for (const it of this.world.interactables) {
      if (it.taken) continue;
      if (it.type === 'climax' && !this._climaxActive) continue;
      if (it.type === 'climax' && this._climaxActive) {
        // prefer climax when active near door
      }
      const to = it.position.clone().sub(origin);
      const dist = to.length();
      if (dist > it.radius + 0.6) continue;
      to.normalize();
      const dot = dir.dot(to);
      // Allow wider angle on mobile
      const need = this.mobile.isTouch ? 0.25 : 0.45;
      if (dot < need && dist > 1.0) continue;
      if (dist < bestDist) {
        bestDist = dist;
        best = it;
      }
    }
    // Also proximity-only for mobile (no need to look exactly)
    if (!best && this.mobile.isTouch) {
      for (const it of this.world.interactables) {
        if (it.taken) continue;
        if (it.type === 'climax' && !this._climaxActive) continue;
        const dist = it.position.distanceTo(origin);
        if (dist < it.radius * 0.85 && dist < bestDist) {
          bestDist = dist;
          best = it;
        }
      }
    }
    return best;
  }

  _handleInteract(it) {
    switch (it.type) {
      case 'note':
      case 'phone':
        this.ui.openNote(it.data.noteId);
        if (!this.state.readNotes.includes(it.data.noteId)) {
          this.state.readNotes.push(it.data.noteId);
          this.audio.pickup();
        }
        if (it.data.egg && !this.state.eggs.includes(it.data.egg)) {
          this.state.eggs.push(it.data.egg);
        }
        if (it.id === 'phone') {
          this.state.flags.phone_found = true;
          this.ui.setObjective('explore');
          this.state.objective = 'explore';
          this._checkpoint('phone');
        }
        if (it.id === 'crawl_scrawl' && !this.state.eggs.includes('crawlspace')) {
          this.state.eggs.push('crawlspace');
        }
        this._advanceStory();
        try {
          document.exitPointerLock?.();
        } catch (_) {}
        break;
      case 'item':
        if (!this.state.inventory.includes(it.data.item)) {
          this.state.inventory.push(it.data.item);
          this.audio.pickup();
          this.ui.setPrompt(`Got: ${it.data.label}`);
          setTimeout(() => this.ui.setPrompt(''), 2000);
          it.taken = true;
          if (it.marker) it.marker.visible = false;
          if (it.data.item === 'basement_key') {
            this.state.flags.basement_unlocked = true;
            this.world.doors.basement.locked = false;
            this.ui.setObjective('basement');
            this.state.objective = 'basement';
            this._checkpoint('got_key');
          }
        }
        break;
      case 'door':
        this._useDoor(it.data.door);
        break;
      case 'fusebox':
        try {
          document.exitPointerLock?.();
        } catch (_) {}
        this._openFuse();
        break;
      case 'radio':
        try {
          document.exitPointerLock?.();
        } catch (_) {}
        this._openRadio();
        break;
      case 'crawl':
        this.audio.creak();
        this.player.setPose({ x: -6.0, y: 1.0, z: -6.5 }, this.player.yaw, 0.2);
        this.state.flags.crawl_entered = true;
        if (!this.state.eggs.includes('crawlspace')) this.state.eggs.push('crawlspace');
        this.ui.setPrompt('The air tastes like dust and old film.');
        setTimeout(() => this.ui.setPrompt(''), 2500);
        this._checkpoint('crawl');
        break;
      case 'climax':
        this._beginChoice();
        break;
      default:
        break;
    }
  }

  _useDoor(name) {
    const res = this.world.openDoor(name, this.state.inventory);
    if (!res.ok && res.reason === 'locked') {
      this.audio.doorLocked();
      this.ui.setPrompt('Locked.');
      setTimeout(() => this.ui.setPrompt(''), 1200);
      return;
    }
    if (res.ok) {
      this.audio.doorOpen();
      if (name === 'basement' && res.opened) {
        this.state.flags.entered_basement = true;
        this.ui.setObjective('evidence');
        this.state.objective = 'evidence';
        this.state.act = Math.max(this.state.act, 2);
        this._checkpoint('basement_open');
        this.ui.showPhoneNotif('Unknown', 'better. now we can see each other');
      }
      if (name === 'bedroom' && res.opened) {
        this.state.flags.upstairs = true;
        this.state.act = Math.max(this.state.act, 2);
        this.ui.setObjective('upstairs');
        this.state.objective = 'upstairs';
        this._checkpoint('upstairs');
      }
      if (name === 'front' && res.opened && this._climaxActive) {
        this._beginChoice();
      }
    }
  }

  _openFuse() {
    const refresh = () => {
      this.ui.showFuseUI(this.world.fuseState, (idx) => {
        const r = this.world.tryFuse(idx);
        this.audio.click();
        if (r.tripped) {
          this.audio.sting();
          this.ui.flash(60);
        }
        if (r.powered) {
          this.audio.powerOn();
          this.state.powerRestored = true;
          this.state.flags.power = true;
          this.state.act = Math.max(this.state.act, 1);
          this.ui.setObjective('upstairs');
          this.state.objective = 'upstairs';
          this.ui.closeReader();
          this.ui.showPhoneNotif('Unknown', 'better. now we can see each other');
          this._checkpoint('power');
          // Unlock a bit of fear / hallway flicker
          this.state.fear = Math.max(this.state.fear, 0.3);
        } else {
          refresh();
        }
      });
    };
    refresh();
  }

  _openRadio() {
    this.audio.radioStatic(true);
    this.ui.showRadioUI(this.world.radioFreq, (f) => {
      this.world.radioFreq = f;
      // Easter egg: 102.4
      if (Math.abs(f - 102.4) < 0.05) {
        this.audio.whisper();
        this.audio.knock();
        if (!this.state.eggs.includes('radio')) {
          this.state.eggs.push('radio');
          this.ui.showPhoneNotif('Radio', 'THE KNOCKING MATCHES');
          this.state.fear = Math.max(this.state.fear, 0.55);
        }
      }
      // 94.0 — delayed voice feel
      if (Math.abs(f - 94.0) < 0.05) this.audio.whisper();
    }, () => {
      this.audio.radioStatic(false);
    });
  }

  _advanceStory() {
    const n = this.state.readNotes.length;
    if (n >= 3 && !this.state.powerRestored) {
      this.ui.setObjective('power');
      this.state.objective = 'power';
    }
    if (this.state.flags.phone_found && !this.state.flags.lights_died) {
      this.state.flags.lights_died = true;
      // Lights already mostly off until fuse
    }
    // Trigger climax after enough evidence
    const need = this.state.powerRestored && this.state.readNotes.length >= 6 && (this.state.flags.entered_basement || this.state.inventory.includes('basement_key'));
    if (need && !this.state.flags.climax_ready) {
      this.state.flags.climax_ready = true;
      this._scheduleClimax();
    }
  }

  _scheduleClimax() {
    this.ui.setObjective('climax');
    this.state.objective = 'climax';
    this.state.act = 3;
    this._checkpoint('pre_climax');
    setTimeout(() => {
      if (!this.running) return;
      this.audio.knock();
      this.ui.showPhoneNotif('Unknown', "im at the door. you know the rules.");
      this.ui.setVignetteScared(true);
      this.audio.setFear(0.8);
      this.state.fear = 0.85;
      this._climaxActive = true;
      // Spawn vague phantom near front
      this._spawnPhantom();
      setTimeout(() => this._beginChoice(), 8000);
    }, 2500);
  }

  _spawnPhantom() {
    if (this._phantom) return;
    const geo = new THREE.CapsuleGeometry(0.35, 1.1, 4, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0a0a10,
      transparent: true,
      opacity: 0.55,
      roughness: 1,
      depthWrite: false,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(0, 1.2, 4.2);
    this.scene.add(m);
    this._phantom = m;
  }

  _beginChoice() {
    if (this.state.flags.ending) return;
    this._climaxActive = true;
    this.player.enabled = false;
    try {
      document.exitPointerLock?.();
    } catch (_) {}
    if (this.mobile.isTouch) this.mobile.hide();
    this.audio.knock();
    this.ui.showChoices('Something waits at the threshold.', [
      { id: 'stay', label: 'Lock every door. Stay.' },
      { id: 'leave', label: 'Take the keys. Leave.' },
      { id: 'answer', label: 'Open the door.' },
    ]);
  }

  _resolveEnding(id) {
    this.state.flags.ending = id;
    this.audio.sting();
    this.ui.fadeOut(1200).then(() => {
      this.running = false;
      this.player.enabled = false;
      this.mobile.hide();
      this.ui.showHud(false);
      this.audio.setFear(0);
      this.ui.showEnding(id);
      this.ui.fadeIn(1000);
      // Keep save but mark finished
      this._checkpoint('ending_' + id);
    });
  }

  _updatePrompt() {
    if (this.ui.reading || this.ui.choosing || this.paused) {
      this.ui.setPrompt('');
      return;
    }
    const hit = this._rayInteract();
    this._near = hit;
    if (hit) {
      const prefix = this.mobile.isTouch ? '[USE] ' : '[E] ';
      this.ui.setPrompt(prefix + (hit.prompt || 'Interact'));
    } else {
      this.ui.setPrompt('');
    }
  }

  _horrorTick(dt) {
    const fear = this.state.fear || 0;
    this.world?.flickerLights(dt, fear);
    this.world?.updateMovingProps(this.camera, fear);

    // Escalate fear with act / notes
    let target = 0.1;
    if (this.state.powerRestored) target = 0.35;
    if (this.state.flags.entered_basement) target = 0.5;
    if (this.state.readNotes.length >= 7) target = 0.65;
    if (this._climaxActive) target = 0.9;
    this.state.fear += (target - this.state.fear) * Math.min(1, dt * 0.3);
    this.audio.setFear(this.state.fear);
    this.ui.setVignetteScared(this.state.fear > 0.55);

    // Hallucination flash / double
    this._hallucTimer -= dt;
    if (this.state.fear > 0.4 && this._hallucTimer <= 0 && Math.random() < 0.004) {
      this._hallucTimer = 6 + Math.random() * 10;
      this.ui.flash(40);
      this.audio.whisper();
      // Brief camera hitch
      this.player.pitch += (Math.random() - 0.5) * 0.08;
    }

    // Phantom footsteps when fear high
    if (this.state.fear > 0.45 && Math.random() < 0.002) {
      this.audio.creak();
    }

    if (this._phantom) {
      // Drift toward player slowly but stay outside
      const p = this.player.position;
      this._phantom.position.x += (p.x - this._phantom.position.x) * dt * 0.15;
      this._phantom.position.z = 3.8 + Math.sin(performance.now() * 0.001) * 0.2;
      this._phantom.material.opacity = 0.35 + Math.sin(performance.now() * 0.003) * 0.2;
    }

    // Auto-progress climax readiness
    if (!this.state.flags.climax_ready) this._advanceStory();
  }

  _loop() {
    this._raf = requestAnimationFrame(() => this._loop());
    const dt = Math.min(0.05, this.clock.getDelta());

    if (this.running && !this.paused && !this.ui.reading && !this.ui.choosing) {
      if (this.mobile.isTouch) this.mobile.applyToPlayer(this.player);
      this.player.sensitivity = this.ui.settings.sens;
      this.player.update(dt);
      this._updatePrompt();
      this._horrorTick(dt);
    } else if (this.running && this.ui.reading) {
      // still render
    }

    this.renderer.render(this.scene, this.camera);
  }
}