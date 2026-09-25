/** Touch controls for iOS Safari / mobile — joystick, look-drag, action buttons */

export class MobileControls {
  constructor(player, opts = {}) {
    this.player = player;
    this.enabled = false;
    this.isTouch = false;
    this.moveX = 0;
    this.moveY = 0;
    this.sprint = false;
    this._lookId = null;
    this._joyId = null;
    this._lookLast = null;
    this.onInteract = opts.onInteract || (() => {});
    this.onFlashlight = opts.onFlashlight || (() => {});
    this.onAudioUnlock = opts.onAudioUnlock || (() => {});
    this._built = false;
  }

  detect() {
    this.isTouch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      /iPad|iPhone|iPod|Android/i.test(navigator.userAgent);
    return this.isTouch;
  }

  build() {
    if (this._built) return;
    this._built = true;
    const root = document.createElement('div');
    root.id = 'mobile-controls';
    root.innerHTML = `
      <div id="joy-zone">
        <div id="joy-base"><div id="joy-knob"></div></div>
      </div>
      <div id="look-zone"></div>
      <div id="mobile-actions">
        <button type="button" id="m-sprint" class="m-btn" aria-label="Sprint">SPRINT</button>
        <button type="button" id="m-flash" class="m-btn" aria-label="Flashlight">LIGHT</button>
        <button type="button" id="m-interact" class="m-btn m-btn-primary" aria-label="Interact">USE</button>
      </div>
      <button type="button" id="m-pause" class="m-btn m-pause" aria-label="Pause">❚❚</button>
    `;
    document.body.appendChild(root);
    this.root = root;
    this.joyBase = root.querySelector('#joy-base');
    this.joyKnob = root.querySelector('#joy-knob');
    this.lookZone = root.querySelector('#look-zone');
    this.joyZone = root.querySelector('#joy-zone');

    this._bindJoystick();
    this._bindLook();
    this._bindButtons();
    this.hide();
  }

  show() {
    if (!this._built) this.build();
    this.root.classList.add('active');
    this.enabled = true;
  }

  hide() {
    if (this.root) this.root.classList.remove('active');
    this.enabled = false;
    this.moveX = 0;
    this.moveY = 0;
    this._resetKnob();
  }

  _bindButtons() {
    const flash = this.root.querySelector('#m-flash');
    const interact = this.root.querySelector('#m-interact');
    const sprint = this.root.querySelector('#m-sprint');
    const pause = this.root.querySelector('#m-pause');

    const tap = (el, fn) => {
      el.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.onAudioUnlock();
          fn(e);
        },
        { passive: false }
      );
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.onAudioUnlock();
        fn(e);
      });
    };

    tap(flash, () => this.onFlashlight());
    tap(interact, () => this.onInteract());
    tap(pause, () => {
      document.dispatchEvent(new CustomEvent('mobile-pause'));
    });

    const setSprint = (on) => {
      this.sprint = on;
      sprint.classList.toggle('held', on);
    };
    sprint.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onAudioUnlock();
        setSprint(true);
      },
      { passive: false }
    );
    sprint.addEventListener(
      'touchend',
      (e) => {
        e.preventDefault();
        setSprint(false);
      },
      { passive: false }
    );
    sprint.addEventListener('touchcancel', () => setSprint(false));
  }

  _bindJoystick() {
    const zone = this.joyZone;
    const base = this.joyBase;
    const maxR = 48;

    const start = (e) => {
      if (!this.enabled) return;
      const t = e.changedTouches[0];
      this._joyId = t.identifier;
      this.onAudioUnlock();
      const rect = base.getBoundingClientRect();
      this._joyCx = rect.left + rect.width / 2;
      this._joyCy = rect.top + rect.height / 2;
      this._moveJoy(t.clientX, t.clientY, maxR);
      e.preventDefault();
    };
    const move = (e) => {
      if (this._joyId === null) return;
      for (const t of e.changedTouches) {
        if (t.identifier === this._joyId) {
          this._moveJoy(t.clientX, t.clientY, maxR);
          e.preventDefault();
          break;
        }
      }
    };
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this._joyId) {
          this._joyId = null;
          this.moveX = 0;
          this.moveY = 0;
          this._resetKnob();
          e.preventDefault();
          break;
        }
      }
    };

    zone.addEventListener('touchstart', start, { passive: false });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end, { passive: false });
    window.addEventListener('touchcancel', end, { passive: false });
  }

  _moveJoy(x, y, maxR) {
    let dx = x - this._joyCx;
    let dy = y - this._joyCy;
    const len = Math.hypot(dx, dy) || 1;
    if (len > maxR) {
      dx = (dx / len) * maxR;
      dy = (dy / len) * maxR;
    }
    this.joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    this.moveX = dx / maxR;
    this.moveY = dy / maxR;
  }

  _resetKnob() {
    if (this.joyKnob) this.joyKnob.style.transform = 'translate(0,0)';
  }

  _bindLook() {
    const zone = this.lookZone;
    zone.addEventListener(
      'touchstart',
      (e) => {
        if (!this.enabled) return;
        // Ignore if touching action buttons area — buttons stopPropagation
        const t = e.changedTouches[0];
        this._lookId = t.identifier;
        this._lookLast = { x: t.clientX, y: t.clientY };
        this.onAudioUnlock();
        e.preventDefault();
      },
      { passive: false }
    );
    window.addEventListener(
      'touchmove',
      (e) => {
        if (this._lookId === null || !this.enabled) return;
        for (const t of e.changedTouches) {
          if (t.identifier === this._lookId) {
            const dx = t.clientX - this._lookLast.x;
            const dy = t.clientY - this._lookLast.y;
            this._lookLast = { x: t.clientX, y: t.clientY };
            const sens = 0.0045 * (this.player.sensitivity || 1.2);
            this.player.yaw -= dx * sens;
            this.player.pitch -= dy * sens;
            this.player.pitch = Math.max(-1.4, Math.min(1.4, this.player.pitch));
            e.preventDefault();
            break;
          }
        }
      },
      { passive: false }
    );
    const endLook = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this._lookId) {
          this._lookId = null;
          this._lookLast = null;
          break;
        }
      }
    };
    window.addEventListener('touchend', endLook, { passive: false });
    window.addEventListener('touchcancel', endLook, { passive: false });
  }

  /** Apply virtual stick into player.key-like movement each frame */
  applyToPlayer(player) {
    if (!this.enabled) return;
    const dead = 0.12;
    const mx = Math.abs(this.moveX) < dead ? 0 : this.moveX;
    const my = Math.abs(this.moveY) < dead ? 0 : this.moveY;
    player.keys['KeyW'] = my < -dead;
    player.keys['KeyS'] = my > dead;
    player.keys['KeyA'] = mx < -dead;
    player.keys['KeyD'] = mx > dead;
    // Analog magnitude: stash for player if needed
    player._mobileAxis = { x: mx, y: -my };
    player.keys['ShiftLeft'] = this.sprint;
  }
}
