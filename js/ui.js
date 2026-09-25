import { NOTES, ENDINGS, OBJECTIVES } from './content.js';
import { loadSettings, saveSettings, hasSave } from './save.js';

export class UI {
  constructor(audio) {
    this.audio = audio;
    this.settings = loadSettings();
    this.reading = false;
    this.choosing = false;
    this.onNewGame = null;
    this.onContinue = null;
    this.onResume = null;
    this.onQuitMenu = null;
    this.onChoice = null;
    this.onCloseReader = null;

    this.$ = (id) => document.getElementById(id);
    this._bindMenus();
    this.applySettingsToAudio();
    this.refreshContinue();
  }

  refreshContinue() {
    const btn = this.$('btn-continue');
    if (btn) btn.disabled = !hasSave();
  }

  applySettingsToAudio() {
    this.audio.setMaster(this.settings.vol);
    this.audio.setAmb(this.settings.amb);
  }

  _bindMenus() {
    const click = (id, fn) => {
      const el = this.$(id);
      if (!el) return;
      const go = (e) => {
        e.preventDefault();
        this.audio.click();
        fn();
      };
      el.addEventListener('click', go);
      el.addEventListener(
        'touchend',
        (e) => {
          e.preventDefault();
          this.audio.click();
          fn();
        },
        { passive: false }
      );
    };

    click('btn-new', () => this.onNewGame?.());
    click('btn-continue', () => this.onContinue?.());
    click('btn-settings', () => this.showScreen('settings-screen'));
    click('btn-credits', () => this.showScreen('credits-screen'));
    click('btn-settings-back', () => {
      this._saveSettingsFromDom();
      this.showScreen('title-screen');
    });
    click('btn-credits-back', () => this.showScreen('title-screen'));
    click('btn-resume', () => this.onResume?.());
    click('btn-pause-settings', () => this.showScreen('settings-screen'));
    click('btn-quit-menu', () => this.onQuitMenu?.());
    click('btn-ending-menu', () => {
      this.hideAllScreens();
      this.showScreen('title-screen');
      this.refreshContinue();
    });

    const sens = this.$('set-sens');
    const vol = this.$('set-vol');
    const amb = this.$('set-amb');
    if (sens) sens.value = this.settings.sens;
    if (vol) vol.value = this.settings.vol;
    if (amb) amb.value = this.settings.amb;
    sens?.addEventListener('input', () => {
      this.settings.sens = parseFloat(sens.value);
      saveSettings(this.settings);
    });
    vol?.addEventListener('input', () => {
      this.settings.vol = parseFloat(vol.value);
      this.audio.setMaster(this.settings.vol);
      saveSettings(this.settings);
    });
    amb?.addEventListener('input', () => {
      this.settings.amb = parseFloat(amb.value);
      this.audio.setAmb(this.settings.amb);
      saveSettings(this.settings);
    });
  }

  _saveSettingsFromDom() {
    this.settings.sens = parseFloat(this.$('set-sens').value);
    this.settings.vol = parseFloat(this.$('set-vol').value);
    this.settings.amb = parseFloat(this.$('set-amb').value);
    saveSettings(this.settings);
    this.applySettingsToAudio();
  }

  showScreen(id) {
    ['title-screen', 'settings-screen', 'credits-screen', 'pause-screen', 'ending-screen'].forEach((s) => {
      this.$(s)?.classList.toggle('hidden', s !== id);
    });
  }

  hideAllScreens() {
    ['title-screen', 'settings-screen', 'credits-screen', 'pause-screen', 'ending-screen'].forEach((s) => {
      this.$(s)?.classList.add('hidden');
    });
  }

  showHud(on) {
    this.$('hud')?.classList.toggle('hidden', !on);
  }

  setObjective(keyOrText) {
    const text = OBJECTIVES[keyOrText] || keyOrText;
    const el = this.$('obj-text');
    if (el) el.textContent = text;
  }

  setPrompt(text) {
    const el = this.$('prompt');
    if (!el) return;
    if (!text) {
      el.classList.remove('show');
      el.textContent = '';
      return;
    }
    const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    el.innerHTML = isTouch ? text : text.replace(/\[E\]/g, '<kbd>E</kbd>').replace(/\[F\]/g, '<kbd>F</kbd>');
    el.classList.add('show');
  }

  showPhoneNotif(from, msg) {
    const n = this.$('phone-notif');
    this.$('notif-from').textContent = from;
    this.$('notif-msg').textContent = msg;
    n.classList.add('show');
    setTimeout(() => n.classList.remove('show'), 4500);
  }

  showSaveToast() {
    const t = this.$('save-toast');
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 1600);
  }

  openNote(noteId) {
    const note = NOTES[noteId];
    if (!note) return;
    this.reading = true;
    const paper = this.$('reader-paper');
    const reader = this.$('reader');
    if (note.isPhone) {
      paper.className = 'paper phone';
      paper.innerHTML =
        '<div style="text-align:center;font-size:0.7rem;color:#6a6570;margin-bottom:0.8rem;">MESSAGES</div>' +
        note.messages
          .map(
            (m) =>
              `<div class="bubble ${m.me ? 'me' : ''}"><div style="font-size:0.65rem;color:#8a8070">${m.from}</div>${m.text}<div class="time">${m.time}</div></div>`
          )
          .join('');
    } else {
      paper.className = 'paper';
      paper.textContent = (note.title ? note.title + '\n\n' : '') + note.body;
    }
    reader.classList.remove('hidden');
  }

  closeReader() {
    this.reading = false;
    this.$('reader')?.classList.add('hidden');
    this.onCloseReader?.();
  }

  showChoices(question, options) {
    this.choosing = true;
    this.$('choice-q').textContent = question;
    const box = this.$('choice-btns');
    box.innerHTML = '';
    options.forEach((opt) => {
      const b = document.createElement('button');
      b.className = 'menu-btn';
      b.textContent = opt.label;
      const fire = (e) => {
        e.preventDefault();
        this.audio.click();
        this.hideChoices();
        this.onChoice?.(opt.id);
      };
      b.addEventListener('click', fire);
      b.addEventListener('touchend', fire, { passive: false });
      box.appendChild(b);
    });
    this.$('choice').classList.remove('hidden');
  }

  hideChoices() {
    this.choosing = false;
    this.$('choice')?.classList.add('hidden');
  }

  showEnding(id) {
    const e = ENDINGS[id];
    if (!e) return;
    this.hideAllScreens();
    this.showHud(false);
    this.$('ending-tag').textContent = e.tag;
    this.$('ending-title').textContent = e.title;
    this.$('ending-body').textContent = e.body;
    this.$('ending-screen').classList.remove('hidden');
  }

  setVignetteScared(on) {
    this.$('vignette')?.classList.toggle('scared', on);
  }

  flash(ms = 80) {
    const f = this.$('flash-overlay');
    f.style.opacity = '0.7';
    setTimeout(() => {
      f.style.opacity = '0';
    }, ms);
  }

  async fadeOut(ms = 800) {
    const f = this.$('fade');
    f.style.transition = `opacity ${ms}ms`;
    f.classList.add('on');
    await new Promise((r) => setTimeout(r, ms));
  }

  async fadeIn(ms = 800) {
    const f = this.$('fade');
    f.style.transition = `opacity ${ms}ms`;
    f.classList.remove('on');
    await new Promise((r) => setTimeout(r, ms));
  }

  showFuseUI(state, onToggle) {
    this.reading = true;
    const paper = this.$('reader-paper');
    paper.className = 'paper';
    const labels = ['Kitchen', 'MAIN', 'Hall', 'Upstairs', 'Basement', 'Spare'];
    paper.innerHTML =
      '<div style="font-family:system-ui;font-size:0.85rem;color:#2a2418"><strong>FUSE BOX</strong><p style="margin:0.6rem 0;color:#5a5040;font-size:0.75rem">Flip breakers. Main last — and only when the rest are right.</p>' +
      labels
        .map(
          (lab, i) =>
            `<button type="button" data-fuse="${i}" style="display:block;width:100%;margin:0.35rem 0;padding:0.7rem;font-size:0.95rem;border:1px solid #4a4030;background:${state[i] ? '#6a8a5a' : '#4a3030'};color:#eee;border-radius:6px;min-height:44px">${lab}: ${state[i] ? 'ON' : 'OFF'}</button>`
        )
        .join('') +
      '</div>';
    this.$('reader').classList.remove('hidden');
    paper.querySelectorAll('[data-fuse]').forEach((btn) => {
      const fire = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.audio.click();
        onToggle(parseInt(btn.getAttribute('data-fuse'), 10));
      };
      btn.addEventListener('click', fire);
      btn.addEventListener('touchend', fire, { passive: false });
    });
  }

  showRadioUI(freq, onTune, onClose) {
    this.reading = true;
    const paper = this.$('reader-paper');
    paper.className = 'paper';
    paper.innerHTML = `<div style="font-family:system-ui;text-align:center">
      <strong>BASEMENT RADIO</strong>
      <p style="font-size:2rem;margin:1rem 0;letter-spacing:0.1em" id="radio-freq">${freq.toFixed(1)}</p>
      <p style="font-size:0.75rem;color:#5a5040;margin-bottom:1rem">Tune carefully. Some frequencies remember.</p>
      <button type="button" id="rad-down" style="min-width:64px;min-height:48px;margin:0.3rem;font-size:1.2rem">−</button>
      <button type="button" id="rad-up" style="min-width:64px;min-height:48px;margin:0.3rem;font-size:1.2rem">+</button>
      <br/><button type="button" id="rad-close" style="margin-top:1rem;min-height:44px;padding:0.5rem 1.2rem">Close</button>
    </div>`;
    this.$('reader').classList.remove('hidden');
    let f = freq;
    const upd = () => {
      paper.querySelector('#radio-freq').textContent = f.toFixed(1);
      onTune(f);
    };
    const bind = (id, fn) => {
      const el = paper.querySelector(id);
      el.addEventListener('click', (e) => {
        e.preventDefault();
        fn();
      });
      el.addEventListener(
        'touchend',
        (e) => {
          e.preventDefault();
          fn();
        },
        { passive: false }
      );
    };
    bind('#rad-down', () => {
      this.audio.click();
      f = Math.max(88.0, Math.round((f - 0.1) * 10) / 10);
      upd();
    });
    bind('#rad-up', () => {
      this.audio.click();
      f = Math.min(108.0, Math.round((f + 0.1) * 10) / 10);
      upd();
    });
    bind('#rad-close', () => {
      this.closeReader();
      onClose?.();
    });
  }
}
