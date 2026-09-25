import { Game } from './game.js';
import { hasSave } from './save.js';

function boot() {
  const canvas = document.getElementById('game');
  if (!canvas) {
    console.error('Missing #game canvas');
    return;
  }

  // Unlock audio on first user gesture (critical for iOS)
  const unlock = () => {
    game.unlockAudio();
  };
  ['touchstart', 'touchend', 'click'].forEach((ev) => {
    document.addEventListener(ev, unlock, { once: false, passive: true });
  });

  const game = new Game(canvas);
  window.__STATIC_HOURS__ = game;

  // Enable continue button
  const cont = document.getElementById('btn-continue');
  if (cont) cont.disabled = !hasSave();

  // Hide address-bar-ish: scroll lock
  window.scrollTo(0, 0);

  console.info('[Static Hours] ready — touch:', game.mobile.isTouch);
  if (new URLSearchParams(location.search).has('autostart')) {
    setTimeout(() => game.startNew().then(() => console.info('[Static Hours] autostart OK')).catch((e) => console.error('[Static Hours] autostart FAIL', e)), 200);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
