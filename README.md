# Static Hours

A first-person psychological horror walking simulator for the browser (desktop + **iPhone Safari**).

**Fiction.** Dark adult themes around an unreliable night of withdrawal / comedown. This is not medical advice — if you're struggling with substances, seek real help.

Inspired by the *tone* of grounded horror walking sims (not a clone; original story/IP).

## Download

Get the game as a ZIP and play offline (after unzipping + a local static server):

- **Release package:** [StaticHours-v1.0.zip](https://github.com/bigoldicky/static-hours/releases/download/v1.0.0/StaticHours-v1.0.zip)
- **Direct ZIP (main branch):** [https://github.com/bigoldicky/static-hours/archive/refs/heads/main.zip](https://github.com/bigoldicky/static-hours/archive/refs/heads/main.zip)
- Or on GitHub: click **Code → Download ZIP**
- Also in-repo: [`dist/StaticHours-v1.0.zip`](https://github.com/bigoldicky/static-hours/raw/main/dist/StaticHours-v1.0.zip)

Unzip, then from the extracted folder:

```bash
python3 -m http.server 8765
```

Open `http://localhost:8765/` on desktop, or `http://<your-LAN-IP>:8765/` on an iPhone on the same Wi‑Fi (Safari). Any static file server works; ES modules require HTTP (not `file://`).

**Play online (no install):** [https://raw.githack.com/bigoldicky/static-hours/main/index.html](https://raw.githack.com/bigoldicky/static-hours/main/index.html)

> Note: the official GitHub Pages URL may still return **404** until Pages is configured; use the ZIP download or the raw.githack link above.

## How to run

Serve this folder over HTTP (required for ES modules):

```bash
python3 -m http.server 8765
```

Then open:

- Desktop: `http://localhost:8765/`
- iPhone on same network: `http://<your-machine-ip>:8765/`

Three.js is vendored at `js/three.module.js`, so a downloaded copy works **offline** once served locally.

## Controls

### Desktop
| Action | Key |
|--------|-----|
| Move | WASD |
| Look | Mouse (click to lock) |
| Interact | E |
| Flashlight | F |
| Sprint | Shift |
| Pause | Esc |

### iPhone / touch
- **Left side:** virtual joystick (move)
- **Right side:** drag to look
- **USE** — interact
- **LIGHT** — flashlight
- **SPRINT** — hold to run
- **❚❚** — pause

Large tap targets, `viewport-fit=cover`, safe-area insets, Web Audio unlock on first tap. No keyboard required.

## iPhone Safari (LAN)

1. On the machine hosting the files: `python3 -m http.server 8765` from this folder  
2. On iPhone (same Wi‑Fi): open `http://<LAN-IP>:8765/` in **Safari**  
3. Tap **New Game** — audio unlocks on tap; use left joystick + right-side look drag + USE / LIGHT / SPRINT  

## Story premise

You rent a remote house to sweat out a rough night alone. Phones lie. Clocks disagree. Something learns your breathing. Notes, texts, and the house itself tell a story of guests who never quite left.

**Estimated playtime:** ~20–35 minutes if you explore (shorter if you rush the fuse → key → climax path).

## Rooms (9)

1. Porch / front exterior  
2. Entry / hallway  
3. Living room  
4. Kitchen  
5. Bathroom  
6. Upstairs hall  
7. Bedroom  
8. Office  
9. Basement (+ secret crawlspace)

## Endings (3)

At the climax, when something knocks:

1. **Stay** — lock in; the night does not end cleanly.  
2. **Leave** — take the keys into the trees; something matches your pace.  
3. **Answer** — open the door; the house gains a new vacancy.

## Easter eggs (spoilers)

<details>
<summary>Click to reveal</summary>

1. **Crawlspace** — interact with the back of the linen/closet area (ground floor, back-left). Find wall scrawl + polaroid.  
2. **Radio frequency** — basement radio → tune to **102.4**.  
3. **Hidden polaroid** — inside the crawlspace; cryptic border text about a timestamp that is *tonight*.

</details>

## Fuse puzzle (mild spoiler)

Basement fuse box: turn **Kitchen, Hall, Upstairs, Spare** ON; leave **Basement** OFF; flip **MAIN** last.

## Save

Autosave checkpoints to `localStorage` (`static_hours_save_v1`). Continue from the title screen.

## Settings

Mouse/look sensitivity, master volume, ambience volume (persisted).

## Tech

- Pure HTML/CSS/JS, Three.js r170 vendored under `js/`
- Web Audio API (procedural hum, rain, creaks, heart, stings)
- AABB collision, SpotLight flashlight, Exp2 fog
- No build step

## File tree

```
static-hours/
  index.html
  README.md
  .nojekyll
  css/style.css
  js/
    main.js
    game.js
    player.js
    world.js
    audio.js
    ui.js
    mobile.js
    save.js
    content.js
    three.module.js
    PointerLockControls.js
  assets/
  dist/StaticHours-v1.0.zip
```
