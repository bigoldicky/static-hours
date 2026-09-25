const KEY = 'static_hours_save_v1';
const SETTINGS_KEY = 'static_hours_settings_v1';

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { sens: 1.2, vol: 0.7, amb: 0.6 };
    return { sens: 1.2, vol: 0.7, amb: 0.6, ...JSON.parse(raw) };
  } catch {
    return { sens: 1.2, vol: 0.7, amb: 0.6 };
  }
}

export function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function hasSave() {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveGame(state) {
  const data = {
    version: 1,
    savedAt: Date.now(),
    checkpoint: state.checkpoint,
    flags: { ...state.flags },
    inventory: [...state.inventory],
    readNotes: [...state.readNotes],
    position: state.position ? { ...state.position } : null,
    yaw: state.yaw ?? 0,
    pitch: state.pitch ?? 0,
    act: state.act,
    objective: state.objective,
    powerRestored: !!state.powerRestored,
    doors: { ...state.doors },
  };
  localStorage.setItem(KEY, JSON.stringify(data));
  return data;
}

export function clearSave() {
  localStorage.removeItem(KEY);
}
