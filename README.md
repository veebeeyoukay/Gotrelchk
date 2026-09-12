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

## Comparing two people

Two people each complete their own check-up, then either of them opens the
comparison from the results screen. Still no server — the two sets of answers
meet on one device, or not at all.

**Two ways in:**

- **They sent me a file.** They export a *share file* from their results
  (`Share my answers for comparison`) and send it however they like. A share
  file carries answers, a display name, and a short non-reversible owner tag —
  **not** the access code, and not their predictions about you. Loading it is
  read-only: it never touches your profile, your login, or your saved answers.
- **They use this device.** If both profiles live in the same browser, pick
  theirs from the list — then *they* enter *their own* 6-digit code to unlock
  it. One person can't read the other's answers without them present.

**What the comparison shows**, over the questions you've both answered:

| Section | What it's for |
| --- | --- |
| Section bars, both real | Where each of you lands, side by side |
| *You both already agree this is hard* | Both in the difficult range — shared ground, and the shortest route to a change you'd both back |
| *You both see this as working* | Both in the strong range — what a harder conversation argues *from* |
| *You're living this differently* | The same question, answered two steps or more apart |
| *How well you read [them]* | Your **predictions** against their **actual** answers, split into *harder than you thought* and *better than you thought*, with a hit rate |

That last one is the point of the `How would they answer?` pass — it's the only
part that tells you where you're guessing instead of asking.

`Print / save as PDF` produces a clean copy (no nav, no top bar) to take to a
counsellor. `Close comparison` drops their answers from the session; they are
never written into your profile.

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
assets/app.js       Login, tooltips, scoring, save/load, flat-file export/import,
                    two-person comparison
assets/styles.css   Styling (no frameworks)
```

## Content / coverage

`data.js` is organised as `SECTIONS → items` — **12 sections, 76 items**. Every
item carries the full guidance set (*How to decide*, *Why this matters*,
*Distinguish carefully*, *Don't soften it*, *Gut check*) plus per-option
meanings; 19 carry a `contextNote(profile)` that adapts to the logged-in
person. The **Trust** section remains the reference template — copy its shape
to add anything new. Sections cover the breadth of the Gottman Relationship
Checkup's five categories:

- **Friendship & Intimacy** — Love Maps, Fondness & Admiration, Turning Toward,
  Emotional Connection & Disengagement, Romance & Passion
- **Conflict Scales** — harsh start-up, the Four Horsemen, flooding, repair,
  accepting influence, gridlock
- **Shared Meaning System** — rituals, roles & values, goals
- **Safety Scales** — Trust, Stability/Chaos, Commitment, emotional philosophies
- **Individual Areas of Concern** — Sexual intimacy, plus everyday partnership
  (finances, housework, parenting, fun)

The wording is *representative*, not the verbatim licensed Gottman instrument.
The item framing, diagnostic distinctions and interpretation guidance are
reconstructed from the source assessment chat that seeded this project.

### Not covered

The source material's **Section 5 (Individual Areas of Concern)** is
deliberately **not** implemented: substance use, suicidal ideation, physical
violence, coercive control, sexual coercion, property destruction and
depression screening. Those items need a different response model from the rest
of the check-up — they have to surface crisis resources, they must never be
shareable through the comparison feature, and several of them indicate that
standard couples work is contraindicated rather than indicated. Adding them is
a separate decision, not a content gap.

One item that borders on that territory *is* included — `ev_money_control`, on
financial control — because it belongs to the standard finances cluster. Its
guidance names the pattern as coercive control and carries hotline details.

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

Comparison is built so that sharing answers never means sharing access:

- The **share file** contains answers and a display name. It does **not**
  contain the access code, the situation text, the profile flags, or your
  predictions about your partner.
- Unlocking a profile stored on the same device requires **that person's** own
  code.
- A loaded comparison is held in memory only. Signing out or closing the
  comparison discards it; nothing about the other person is written into your
  saved profile.

None of this is a substitute for consent. If reading someone's answers without
them present would be a problem in your relationship, it is a problem here too —
the app says so on the way in.
