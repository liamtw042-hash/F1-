# F1 Racing Championship 🏎️

A complete F1 racing game that runs in your browser — no install, no build step.

**Play it: open `index.html` in Chrome or Firefox.** Or enable GitHub Pages
(Settings → Pages → deploy from branch) and share the link with your mates.

## Features

- **5 real circuits** — Monaco, Spa-Francorchamps, Silverstone, Monza, Suzuka —
  auto-scaled to their real lap lengths, with kerbs, DRS zones and a working racing line
- **19 AI drivers** with real 2024 names, team liveries, individual skill and
  consistency, overtaking, defending, and pit strategy
- **Physics** — grip-limited cornering, downforce, slipstream-era DRS, ERS
  deployment/harvesting, fuel burn, tyre wear + temperature across 5 compounds
- **Weather** — dry, light rain, heavy rain, or dynamic *Changing* conditions where
  rain arrives mid-race and the whole field dives for inters
- **Low-poly 3D graphics (WebGL)** — flat-shaded PolyTrack-style world: rolling
  elevation on every circuit (Spa climbs 16m!), two-tone grass, vivid raised
  kerbs, checkered start line under a start gantry, low-poly trees, ad boards,
  grandstands with crowds, clouds, distance fog, and a chase camera whose FOV
  widens with speed. Press **C** for cockpit view (halo, mirrors, rotating
  steering wheel) or classic top-down. Falls back to a canvas renderer if
  WebGL is unavailable
- **Race weekend structure** — grid start with lights, sectors, lap timing, fastest
  lap, pit stops, position tower, mini-map
- **Championship mode** — 5-round season with persistent standings (saved locally)
- **2-player split-screen** on one keyboard — each player gets their own cockpit

## Controls

| Action | Player 1 | Player 2 |
|---|---|---|
| Throttle / Brake | W / S | ↑ / ↓ |
| Steer | A / D | ← / → |
| DRS (when READY) | Space | Enter |
| ERS boost | Left Shift | Right Shift |
| Pit stop | P | / |
| Reset car | R | \ |
| Camera (cockpit/chase/top) | C | shared |
| Pause / Mute | Esc / M | — |

**Tips:** brake before the corner, not in it. DRS only opens in the green zones
when you're within 1.4s of the car ahead (after lap 1). Watch tyre wear — the ring
around the compound letter — and pit before it goes red. Slow down near the
start/finish straight to enter your pit box.

## Development

The whole game is two files: `js/tracks.js` (circuit data) and `js/f1.js` (engine).
The race core is headless and fully testable:

```bash
npm test                # simulates full AI races on all 5 circuits, checks lap sanity
node test/gl-geom.js    # builds all 3D track worlds + car meshes, checks geometry
node test/render3d.js   # renders thousands of fallback-renderer frames headless
```
