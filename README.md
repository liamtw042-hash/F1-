# Crazy Grand Prix 🏎️💨

A fast, low-poly 3D F1 racing game that runs in any browser — no install, no
accounts, no servers. **Open `index.html` and race.**

## Play with your mates at school — no server needed

Click **ONLINE WITH MATES**. One person hosts, up to 3 join, AI fills the grid:

1. **Host** clicks *CREATE INVITE* and sends the code to a mate over any chat
   (Google Chat, email, a shared Doc — anything you can paste text into)
2. **Mate** goes to *JOIN A RACE*, pastes the invite, clicks *CREATE MY REPLY
   CODE*, and sends the reply back
3. **Host** pastes the reply, clicks *CONNECT*, then *START RACE*

The connection is peer-to-peer (WebRTC) — after the code swap, no server is
involved at all, which is why it works on a static site like GitHub Pages.

Also on the menu: **2 PLAYER SPLIT** for two players on one keyboard
(split-screen), plus Quick Race, Custom Race, and a 5-round **Championship**
with saved standings.

## Features

- **Low-poly 3D worlds** with rolling elevation (Spa climbs 16m), vivid kerbs,
  trackside marker posts, trees, grandstands, clouds and distance fog
- **Sense of speed**: FOV that stretches as you accelerate, camera shake,
  speed-line streaks, 13m road stripes flickering past
- **Real racing systems** — DRS (green edge-lined zones, within 1.4s of the car
  ahead), **slipstream tow** (⚡ TOW), ERS boost, tyre wear + temperature across
  5 compounds, fuel burn, pit stops
- **Contact with consequences** — dive into someone and YOU usually come off
  worse: a head-on punt destabilises you and can break your front wing (pit to
  repair) — but a clean hit on their rear quarter sends THEM loose instead
- **Race craft tools** — live delta to your best lap, sector pips, race
  engineer radio (tyre calls, defend warnings, final-lap push), per-track
  records saved on your machine, R to instantly restart from pause
- **Drive with WASD or arrow keys** — both work at once in single player
- **5 circuits** at real lap lengths: Monaco, Spa, Silverstone, Monza, Suzuka
- **19 AI drivers** with real names who overtake, defend, and pit for the
  right tyres when the rain comes
- **Weather** — dry, rain, or *Changing* with mid-race showers
- Overtake popups, podium confetti, fastest-lap tracking, position tower,
  mini-map, race lights start

## Controls

| Action | Player 1 | Player 2 (split) |
|---|---|---|
| Throttle / Brake | W / S | ↑ / ↓ |
| Steer | A / D | ← / → |
| DRS (when READY) | Space | Enter |
| ERS boost | Left Shift | Right Shift |
| Pit stop | P | / |
| Reset car | R | \ |
| Camera (chase/cockpit/top) | C | shared |
| Pause / Mute | Esc / M | — |

## Development

Two-file engine (`js/f1.js` race core + browser layer, `js/gl.js` WebGL
renderer, `js/net.js` multiplayer) with a fully headless-testable core:

```bash
npm test   # race sim on all circuits + 3D geometry + multiplayer protocol + renderer smoke
```
