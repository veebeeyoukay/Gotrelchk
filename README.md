# Relationship Check-Up

A private, **flat-file, no-backend, no-database** web app: a Gottman-Method-style
relationship check-up where **every question carries definitions and guidance**
("hints & tips"), and the guidance can be **tailored per participant**.

> Reflective self-assessment inspired by the Gottman Method and the Sound
> Relationship House. **Not** a diagnostic instrument or a substitute for
> professional care. All data stays on the user's own device.

## Run it

It's just static files — no build step, no server required.

- **Easiest:** open `index.html` in a browser.
- **Recommended (so `localStorage` is stable):** serve the folder, e.g.
  ```bash
  python3 -m http.server 8000
  # then visit http://localhost:8000
  ```

## How "login" works without a backend

The brief was a *multi-person login using flat files only*:

1. A person enters a **username or email** and we generate a **random 6-digit
   access code**, shown on screen.
2. They can **copy it**, **email it to themselves** (a `mailto:` link — the
   closest thing to "get sent" with no server), or **download a key file**.
3. To return, they sign in with **identifier + 6-digit code**.
4. Progress is saved to the browser's `localStorage` and is also
   **exportable / importable as a flat JSON file** (`Restore from file…`),
   so a profile can move between devices without any database.

Each person gets their own profile, so the app is **multi-person by design**.
A **Compare** option is stubbed in the results view for a future build (it will
let two saved profiles compare answers side by side).

## The two things the template proves

1. **Hints & tips are easy to surface.** Every item has an `ⓘ` button that opens
   a guide panel — *How to decide*, *Why this matters*, *Distinguish carefully*,
   *Don't soften it*, *Gut check* — and every answer option shows its own
   meaning. Key terms are underlined and show a definition on hover/tap; a full
   **Glossary** drawer is in the top bar.
2. **The "context bit" differs per participant.** At sign-up each person can
   describe their situation and tick flags (high work/cognitive load,
   neurodivergent, active contemplative practice). Items can carry a
   `contextNote(profile)` function that returns text tailored to *that* person —
   e.g. the Stability and Emotional-Philosophy items adapt their note depending
   on who is logged in.

## Files

```
index.html          App shell (login → assessment → results)
assets/data.js      All content: sections, items, per-option meanings,
                    guidance, glossary, and per-participant context notes
assets/app.js       Login, tooltips, scoring, save/load, flat-file export/import
assets/styles.css   Styling (no frameworks)
```

## Content / coverage

`data.js` is organised as `SECTIONS → items`. The **Trust** section is the
fully-built reference template (all fields populated); copy its shape to build
any other section. Representative sections cover the breadth of the Gottman
Relationship Checkup's five categories:

- **Friendship & Intimacy** — Love Maps, Fondness & Admiration, Turning Toward,
  Emotional Connection & Disengagement, Romance & Passion
- **Conflict Scales** — harsh start-up, the Four Horsemen, flooding, repair,
  accepting influence, gridlock
- **Shared Meaning System** — rituals, roles & values, goals
- **Safety Scales** — Trust, Stability/Chaos, Commitment, emotional philosophies
- **Individual Areas of Concern** — Sexual intimacy, plus everyday partnership
  (finances, housework, parenting, fun)

The wording is *representative*, not the verbatim licensed Gottman instrument.
Several high-signal items (Trust, Commitment, Emotional Connection, Sex) are
reconstructed closely from the source assessment chat that seeded this project.

## Editing content

- **Change wording / add an item:** edit `assets/data.js`. Each item needs an
  `id`, `text`, `type` (`scale5` | `tf` | `binary`), optional `reverse`,
  optional `optionMeanings`, a `guide` object, and an optional
  `contextNote(profile)`.
- **Add a glossary term:** add a key to `GLOSSARY`; it auto-links wherever it
  appears in intros and guidance.
- **Scoring direction:** set `reverse: true` when agreeing/True signals a *risk*
  rather than a strength — scoring flips it so every section reads one way.

## Privacy

There is no server and no analytics. Everything lives in the browser. Because
there's no backend, a lost 6-digit code can't be recovered — keep the key file
or the emailed code.
