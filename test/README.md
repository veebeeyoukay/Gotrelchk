# Reflex Rumble 🏎️⚡

A one-phone, pass-around **4-player reaction game** — built as a single,
dependency-free HTML file. Made for the backseat crew.

## Play it

Just open `index.html` in any mobile browser (or double-click it on a
desktop). No build step, no server, no internet needed. It's also deployed
live via Netlify (`netlify.toml` publishes this folder).

## How it works

1. Each of the 4 players picks a name (or keeps Player 1–4) and gets a color
   (red, blue, green, yellow).
2. The screen splits into 4 quadrants — one per player. Top-row quadrants are
   rotated 180° so two kids can face the phone from across the seat.
3. A round starts: **"Wait for it…"** with a random 2–6 second delay.
4. The screen flashes **"TAP NOW!"** — the first quadrant tapped wins the point.
5. Tap during the wait phase and you're **locked out** for the round (😬) — the
   anti-cheat catch.
6. **First to 5 points wins**, with a confetti celebration and a *Play Again*
   button.

## Notes

- Designed for mobile portrait, no scrolling, giant touch targets and fonts.
- Sound-free feedback: emojis, screen shakes, and score pop animations.
- Scoreboard stays visible at the top the whole game.
