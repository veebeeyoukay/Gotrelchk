/*
 * data.js — Content + structure for the Relationship Check-Up
 * (Gottman-style), reconstructed from the source assessment chat.
 *
 * NO BACKEND, NO DATABASE. This is a flat file. app.js reads window.CHECKUP.
 *
 * ─── The model ──────────────────────────────────────────────────────────────
 * The assessment is a list of SECTIONS (clusters). Each section has ITEMS.
 * Every item is a single statement the participant responds to, plus a rich
 * set of "hints and tips" (How to decide / Why this matters / Distinguish /
 * Don't soften / Gut check) that the UI shows on demand.
 *
 * THE TWO THINGS THE TEMPLATE MUST PROVE:
 *   1. Hints & tips are easy to surface  -> every item carries a `guide` object,
 *      rendered as expandable panels + the answer options carry per-option
 *      `meaning` text.
 *   2. The "context bit" differs per participant -> every item MAY carry a
 *      `contextNote(profile)` function. It receives the logged-in participant's
 *      profile and returns a note tailored to THEM (or null for no note).
 *
 * Response types:
 *   "scale5"  -> Strongly Disagree .. Strongly Agree  (value 1..5)
 *   "tf"      -> True / False                          (value 1 / 0)
 *   "binary"  -> two custom options                    (value 0 / 1)
 *
 * `reverse: true` means the "high" / "agree" / "true" answer signals a RISK,
 * not a strength. Scoring flips these so every section reads in one direction.
 */

/* ── Reusable answer scales ──────────────────────────────────────────────── */

// 5-point Likert. value 1..5, low = disagree.
const SCALE5 = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" }
];

// True / False.
const SCALE_TF = [
  { value: 1, label: "True" },
  { value: 0, label: "False" }
];

/* ── Inline glossary (hover/tap a term for its definition) ────────────────── */

const GLOSSARY = {
  "Sound Relationship House":
    "The Gottman model of what makes relationships work: seven 'floors' supported by two weight-bearing walls — Trust and Commitment.",
  "The Four Horsemen":
    "Four patterns that strongly predict breakdown: Criticism, Contempt, Defensiveness, and Stonewalling.",
  "Stonewalling":
    "Shutting down and withdrawing from an interaction — going silent, looking away, refusing to engage. One of the Four Horsemen; often a sign of flooding.",
  "Flooding":
    "Feeling so emotionally and physically overwhelmed during conflict that you can't think clearly or listen. The body goes into fight-or-flight.",
  "Contempt":
    "Treating a partner with disrespect — mockery, sarcasm, eye-rolling, name-calling. The single biggest predictor of break-up.",
  "Betrayal":
    "In Gottman's later work, not just affairs — any pattern where one partner consistently fails to act in the interest of the relationship.",
  "Negative comparison":
    "The mental habit of comparing your partner unfavourably to imagined alternatives. Gottman calls the healthy opposite 'nurturing gratitude'.",
  "Nurturing gratitude":
    "Actively focusing on what you value about your partner — especially after conflict. Builds commitment over time; its opposite (nurturing resentment) erodes it.",
  "Emotional reliability":
    "Whether your partner can be counted on to be emotionally available when you most need them — Gottman's core trust question: 'Can I count on you to be there for me?'",
  "Responsive desire":
    "Desire that emerges in response to intimacy or arousal rather than arriving spontaneously. Mismatches between spontaneous and responsive desire drive many discrepancy dynamics.",
  "Desire discrepancy":
    "A persistent mismatch in how much sex each partner wants, or when/how — distinct from either partner simply having low desire.",
  "Shared Meaning System":
    "The inner life a couple builds together — rituals, roles, goals and symbols that give the relationship a sense of purpose and 'us'.",
  "Emotion-coaching":
    "Treating emotions as important and worth attending to — slowing down to feel them, talk about them, integrate them.",
  "Love Maps":
    "The detailed mental map you hold of your partner's inner world — their worries, hopes, history and current life. Gottman's ground floor; maps go stale unless actively updated.",
  "Turning Toward":
    "Responding to a partner's bid rather than ignoring it or snapping back. Couples who stay together turn toward roughly 86% of bids; couples who divorce, roughly 33%.",
  "Bid":
    "Any small attempt to get attention, affection or connection — a remark, a question, a touch, a look. The basic currency of everyday closeness.",
  "Harsh start-up":
    "Opening a difficult conversation with criticism, blame or contempt. Gottman could predict a discussion's outcome from its first three minutes.",
  "Repair attempt":
    "Anything either partner does to de-escalate — humour, an apology, a kind word, a pause. Whether repairs LAND is the single strongest predictor of long-term outcomes.",
  "Kitchen-sinking":
    "Letting one disagreement pull in every other grievance, so the original issue is lost under a list of faults.",
  "Accepting influence":
    "Genuinely letting a partner's opinions and feelings change your decisions. Refusing it is the single strongest predictor of divorce for heterosexual men.",
  "Perpetual problem":
    "A difference rooted in personality or core need that will never be fully solved — about 69% of all relationship conflict. The goal is dialogue, not resolution.",
  "Gridlock":
    "A perpetual problem that can no longer be discussed at all — every conversation hits the same wall. Usually hides an unspoken dream on each side.",
  "Rituals of connection":
    "Deliberate, repeated practices that carry meaning — a real goodbye, a reunion, a weekend habit. Distinct from routines, which are merely logistics.",
  "Negative sentiment override":
    "A state where global perception has tilted so negative that neutral or even kind behaviour gets read as hostile. Once established, repair attempts stop landing.",
  "Stress spillover":
    "Carrying stress from outside the relationship and discharging it onto your partner.",
  "Life Dreams":
    "The deepest hopes each partner holds for their own life. Whether each feels the other knows, values and supports those dreams is the strongest single predictor of long-term satisfaction.",
  "Emotion-dismissing":
    "Treating emotions as transient and not worth dwelling on — preferring action and forward motion to processing feeling."
};

/* ── Helper: render the participant's free-text situation, if any ─────────── */
function situationLine(profile) {
  const s = (profile && profile.situation || "").trim();
  return s ? ` You told us a bit about your situation: “${s}”. Read this item against that backdrop.` : "";
}

/* ─────────────────────────────────────────────────────────────────────────────
 * SECTIONS
 * ───────────────────────────────────────────────────────────────────────────*/

const SECTIONS = [

  /* ════════════════════════════════════════════════════════════════════════
   * LOVE MAPS  (Friendship & Intimacy)
   * ════════════════════════════════════════════════════════════════════════*/
  {
    id: "love_maps",
    title: "Love Maps",
    term: "Love Maps",
    intro:
      "Your Love Maps are the room in your mind where you keep your partner's inner world — what's weighing on them, what they're hoping for, who matters to them. It's the ground floor of the Sound Relationship House, and the one that goes stale fastest: a map built five years ago describes a person who has since changed.",
    items: [
      {
        id: "lm_friends",
        text: "I can name my partner's two closest friends right now.",
        type: "tf",
        reverse: false,
        optionMeanings: {
          1: "True — you know who currently matters in their social world.",
          0: "False — you're not certain who their closest people are at the moment."
        },
        guide: {
          howToDecide:
            "‘Right now’ is the whole item. Not who their closest friends were when you met, or who you'd assume — who they actually lean on this year.",
          why:
            "The cast of your partner's life is the most basic layer of a Love Map. Knowing it is what lets you ask the right question at the right moment; not knowing it means their social world is running without you.",
          distinguish: [
            "Knowing OF someone isn't the same as knowing they're currently close. People's inner circles quietly reorder after moves, job changes, new parenthood and falling-outs.",
            "If you'd have to check their phone, scroll their messages, or guess — that's False."
          ],
          honesty:
            "Easy to answer True on reputation rather than knowledge. Name them silently before you answer.",
          gutCheck:
            "Two names, right now, without checking. Did they come?"
        },
        contextNote: (profile) => {
          let note = "";
          if (profile.flags && profile.flags.highWorkload) {
            note += "Running at high load doesn't make you a worse partner, but it does ration attention, and the social layer of a Love Map is usually the first thing rationing takes. Don't score this on how much you care — score it on what you currently know. ";
          }
          if (profile.flags && profile.flags.neurodivergent) {
            note += `Holding names and relational detail is a working-memory task, and ${profile.flags.neurodivergent} can make that genuinely harder without any drop in attachment. Answer on retrieval, not on affection. `;
          }
          if (!note) note = "Answer on what you can retrieve right now, not on how close you feel.";
          return note.trim() + situationLine(profile);
        }
      },
      {
        id: "lm_stress",
        text: "I know what my partner is currently most worried or stressed about.",
        type: "tf",
        reverse: false,
        optionMeanings: {
          1: "True — you could name their main current stressor.",
          0: "False — you couldn't name it with confidence."
        },
        guide: {
          howToDecide:
            "Current period — this month, not their general disposition. The bar is familiarity, not a precise inventory: you should be able to say what the big one is.",
          why:
            "Love Maps have to stay updated to be worth anything. Knowing your partner's live stressors is the mechanism that lets you turn toward them at the moments that actually matter, instead of offering support aimed at last year's problem.",
          distinguish: [
            "Stressors are situations — the job, the diagnosis, the money, the family thing. Knowing the situation is this item; knowing what it's doing to them inside is the next one.",
            "‘They're stressed about work’ is too vague to count if you couldn't say what about work."
          ],
          honesty:
            "The comfortable answer is True. The useful answer is whatever you could actually say out loud if asked.",
          gutCheck:
            "If someone asked ‘what's weighing on them this month?’, could you answer specifically?"
        },
        contextNote: null
      },
      {
        id: "lm_worries",
        text: "I know what my partner is privately worried about — not just what's going on, but what it's doing to them inside.",
        type: "tf",
        reverse: false,
        optionMeanings: {
          1: "True — you know the inner layer, not only the circumstances.",
          0: "False — you know the situation, but not what they're carrying about it."
        },
        guide: {
          howToDecide:
            "This is deliberately a harder question than the last one. Stressors are external and often visible; worries are internal and have to be told to you. Answer True only if they've actually let you in.",
          why:
            "The worry layer can't be inferred — it requires vulnerability to have been shared, and a listener it was safe to share with. A couple can have accurate maps of each other's circumstances and no map at all of each other's interior. That gap is what ‘lonely together’ is made of.",
          distinguish: [
            "Guessing accurately isn't the same as being told. If you're deducing it, that's closer to False.",
            "Knowing they're worried isn't knowing what the worry IS — the fear underneath the situation.",
            "If they used to tell you and stopped, answer for now, not for then — and note the change; withdrawn confiding is an early disengagement signal."
          ],
          honesty:
            "Many people answer this True on the strength of how well they know their partner generally. Ask instead when they last told you something they were frightened of.",
          gutCheck:
            "Could you name the fear underneath the situation — and did they tell you, or are you inferring it?"
        },
        contextNote: null
      },
      {
        id: "lm_hopes",
        text: "I know my partner's hopes and aspirations for the next few years.",
        type: "tf",
        reverse: false,
        optionMeanings: {
          1: "True — you know where they want to go, as they would put it.",
          0: "False — you're unclear on what they're hoping for."
        },
        guide: {
          howToDecide:
            "Their aspirations as THEY would state them — not what you want for them, and not what you think they should want. The bar here is fluency: could you lay them out, not merely recognise them if prompted.",
          why:
            "This is the layer that feeds the top floor of the Sound Relationship House. You cannot support Life Dreams you can't name, and most partners who feel unsupported are not being blocked — they're being supported in a direction that was never theirs.",
          distinguish: [
            "Shared plans (the move, the house, the holiday) are not the same as their personal aspirations, which may have nothing to do with you.",
            "Career goals are the easy layer. What they hope to become, make, or be known for is the layer this item is aiming at."
          ],
          honesty:
            "If you find yourself answering with the couple's plans rather than their private hopes, that itself is the answer.",
          gutCheck:
            "What are they quietly hoping for that isn't about you? Blank → False."
        },
        contextNote: null
      },
      {
        id: "lm_relatives",
        text: "I could name the relatives my partner likes least, and why.",
        type: "tf",
        reverse: false,
        optionMeanings: {
          1: "True — you know the friction points in their family and the history behind them.",
          0: "False — you couldn't say who they find hardest, or why."
        },
        guide: {
          howToDecide:
            "An odd-sounding item that works well precisely because it's specific. General goodwill toward your partner won't produce this answer — only particular knowledge will.",
          why:
            "Gottman uses items like this to test whether a Love Map is detailed or merely warm. Family friction is also load-bearing in its own right: knowing who your partner dreads at a gathering is what lets you take their side in the moment, which is one of the strongest predictors in the whole Checkup.",
          distinguish: [
            "Knowing there's ‘tension with their family’ is not this item. Which person, and what happened, is.",
            "If there is genuinely no such relative — some people do like their whole family — answer True if you know that with confidence."
          ],
          honesty:
            "Specificity is the test. If your answer is a category rather than a name, it's False.",
          gutCheck:
            "Name the person and the reason. Both, or it's False."
        },
        contextNote: null
      },
      {
        id: "lm_unknown",
        text: "I really don't know much about what's going on in my partner's inner life these days.",
        type: "tf",
        reverse: true,
        optionMeanings: {
          1: "True — you've lost touch with their inner world.",
          0: "False — you stay current with what's going on inside them."
        },
        guide: {
          howToDecide:
            "Reverse-scored: True is the risk signal. ‘These days’ matters — this asks about the current state of the map, not its best-ever state.",
          why:
            "Love Map drift is one of the quietest early signs of disconnection, because nothing appears to go wrong. There's no fight, no incident — the two of you simply stop updating each other, and one day the map describes someone who isn't there any more.",
          distinguish: [
            "Drift isn't always mutual withdrawal. Sometimes one partner stopped telling; sometimes one stopped asking; often both, gradually, without either deciding to.",
            "A period of heavy external load is a common cause and doesn't make it less true — the map still went stale."
          ],
          honesty:
            "This one gets softened because True feels like an admission of failure. It's a status report, not a verdict.",
          gutCheck:
            "When did you last have a conversation about their inner life that told you something you didn't already know?"
        },
        contextNote: (profile) => {
          let note = "Drift usually comes from bandwidth, not from indifference — which is worth separating, because the two have different fixes.";
          if (profile.flags && profile.flags.highWorkload) {
            note += " With your load, the likely story is that the updating conversations got displaced rather than avoided. That's still drift; it just means the repair is scheduling, not motivation.";
          }
          if (profile.flags && profile.flags.contemplativePractice) {
            note += ` You already keep a regular ${profile.flags.contemplativePractice} practice — proof you can hold a standing commitment. The question is whether the relationship has one of its own.`;
          }
          return note + situationLine(profile);
        }
      }
    ]
  },

  /* ════════════════════════════════════════════════════════════════════════
   * FONDNESS & ADMIRATION
   * ════════════════════════════════════════════════════════════════════════*/
  {
    id: "fondness",
    title: "Fondness & Admiration",
    term: "Contempt",
    intro:
      "The habit of noticing and saying what you genuinely like and respect about your partner. Gottman treats this as the direct antidote to contempt — the single biggest predictor of break-up — which is why its erosion matters more than it looks.",
    items: [
      {
        id: "fa_admire",
        text: "I can easily list things I genuinely admire about my partner.",
        type: "tf",
        reverse: false,
        optionMeanings: {
          1: "True — specifics come readily to mind.",
          0: "False — it's hard to call admiration to mind right now."
        },
        guide: {
          howToDecide:
            "Two words carry the item: ‘easily’ and ‘genuinely’. Admiration you have to reason your way to, or produce out of fairness, isn't what's being measured.",
          why:
            "Gottman's research found that how readily a partner can access admiration predicts a great deal — because the same cognitive habit that makes admiration easy to reach also makes generous interpretations easy to reach during conflict. When admiration goes hard to find, negative sentiment override is usually already setting in.",
          distinguish: [
            "‘They're a good person’ is a verdict, not admiration. ‘They sat with my mother for four hours and never once checked their phone’ is admiration.",
            "Admiring what they DO for you isn't the same as admiring who they ARE. The second is the stronger signal.",
            "You can be angry with someone and still admire them. Current conflict doesn't automatically make this False."
          ],
          honesty:
            "In a rough patch people answer True out of loyalty. Run the test before answering rather than after.",
          gutCheck:
            "Three specific things, right now, in under thirty seconds. Easy, or effortful?"
        },
        contextNote: null
      },
      {
        id: "fa_express",
        text: "My partner and I express appreciation and affection regularly.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Almost never — it's essentially stopped.",
          2: "Rarely — occasional, and usually prompted by an occasion.",
          3: "Sometimes — it happens, unevenly.",
          4: "Regularly — a normal part of how you speak to each other.",
          5: "Very regularly — woven into ordinary days."
        },
        guide: {
          howToDecide:
            "Expressed, not felt. The question is whether it leaves your mouth and reaches them — unspoken appreciation does no work in a relationship, however sincere.",
          why:
            "Expressed appreciation is what maintains the positive climate that makes conflict survivable. Gottman's stable couples run a high ratio of positive to negative exchanges in everyday life, which is what lets a hard conversation be absorbed rather than escalate.",
          distinguish: [
            "Appreciation (what they did) and affection (that they matter) are different currencies, and some couples are rich in one and poor in the other. Score the pair honestly.",
            "Affection that only appears during repair after a fight is transactional, and belongs low on this scale even if it's frequent.",
            "‘We don't need to say it’ is a common and unreliable belief. This item asks whether it's said."
          ],
          honesty:
            "Long-married couples routinely overrate this, scoring the early years rather than the current ones.",
          gutCheck:
            "When did either of you last say something appreciative out loud, unprompted, with no occasion attached?"
        },
        contextNote: (profile) => {
          let note = "";
          if (profile.flags && profile.flags.contemplativePractice) {
            note += `A ${profile.flags.contemplativePractice} practice tends to build gratitude as an inner discipline. Gottman's point is that the inner version doesn't do the relational work — the question here is strictly whether it gets spoken. `;
          }
          if (profile.flags && profile.flags.highWorkload) {
            note += "Under heavy load, appreciation is usually the first thing to go silent while still being fully felt. Score what was said, not what was meant. ";
          }
          if (!note) note = "Score what actually got said out loud, not what you felt and assumed was obvious.";
          return note.trim() + situationLine(profile);
        }
      },
      {
        id: "fa_glad",
        text: "When I come into a room, my partner is glad to see me.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Almost never — my arrival barely registers.",
          2: "Rarely — sometimes acknowledged, rarely warmly.",
          3: "Sometimes — it depends on the day.",
          4: "Usually — there's a genuine lift.",
          5: "Almost always — they're visibly glad."
        },
        guide: {
          howToDecide:
            "Score the unguarded half-second before manners take over: the face on the way up, or nothing much. This is a micro-moment item, and it works precisely because it's too small to be performed.",
          why:
            "Gottman pays close attention to small, involuntary responses, because they report the state of the fondness floor more reliably than anything a partner could tell you in an interview. Deliberate kindness can be produced on request; gladness at someone's arrival cannot.",
          distinguish: [
            "Politeness isn't gladness. A pleasant greeting delivered without a change of expression belongs in the middle of this scale.",
            "Deep concentration is not indifference — a partner interrupted mid-task may take a moment to surface. Score the pattern across ordinary entrances.",
            "This measures their response to you, not yours to them, however unfair that feels to rate."
          ],
          honesty:
            "People round this up hard, because the honest answer is a lonely one to sit with.",
          gutCheck:
            "Picture walking in tonight. What happens on their face?"
        },
        contextNote: null
      },
      {
        id: "fa_appreciated",
        text: "My partner appreciates the things I do in our relationship.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Not at all — what I do goes unnoticed.",
          2: "Rarely — noticed occasionally, rarely acknowledged.",
          3: "Mixed — some things land, much doesn't.",
          4: "Generally — I feel what I do is seen.",
          5: "Strongly — I feel genuinely appreciated."
        },
        guide: {
          howToDecide:
            "Your felt experience of being appreciated, which is the thing that matters here — not an audit of whether they say thank you often enough.",
          why:
            "Chronic unappreciation is one of the most reliable fuels for the Four Horsemen. The felt sequence is consistent: what I do goes unseen, so resentment builds, so it comes out as criticism, which draws defensiveness, which confirms the original feeling.",
          distinguish: [
            "Invisible work is the usual site of the deficit — the mental load, the planning, the thing that only gets noticed when it stops.",
            "Being thanked isn't the same as being seen. Ritual thanks with no evidence of noticing belongs mid-scale.",
            "If you've stopped mentioning what you do because mentioning it felt like begging, score low and note it."
          ],
          honesty:
            "There's a strong pull to answer for how it should be rather than how it is. Answer for how it is.",
          gutCheck:
            "Does the work you do for this relationship feel seen, or does it feel like weather — only noticed when it's bad?"
        },
        contextNote: null
      },
      {
        id: "fa_respected",
        text: "I feel genuinely respected and valued by my partner.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Not at all — I don't feel respected.",
          2: "Rarely — respect is inconsistent or conditional.",
          3: "Mixed — respected in some domains, not others.",
          4: "Generally — I feel respected and valued.",
          5: "Strongly — I feel held in genuine regard."
        },
        guide: {
          howToDecide:
            "The felt experience, regardless of what your partner intends. Intentions are not the measurement here; reception is.",
          why:
            "Respect is what the fondness floor is built on, and its absence is the doorway contempt comes through. Watch for the specific signals Gottman treats as contempt indicators: eye-rolling, sarcasm, mockery, dismissive tone, being talked over, being corrected in front of others, being treated as the less competent adult.",
          distinguish: [
            "Respect for what you do (competence) and respect for who you are (regard) come apart often. Someone can rate your work highly and still treat you dismissively.",
            "Conditional respect — present when you're succeeding, withdrawn when you're struggling — belongs low on this scale, not in the middle.",
            "One contemptuous incident isn't a pattern. A tone you brace for is."
          ],
          honesty:
            "If any of those contempt signals are a recurring feature, this is not a 4 no matter how much you love each other.",
          gutCheck:
            "Do you feel like someone your partner looks up to — or someone they tolerate?"
        },
        contextNote: null
      },
      {
        id: "fa_attraction",
        text: "I find it hard to remember what attracted me to my partner.",
        type: "scale5",
        reverse: true,
        optionMeanings: {
          1: "Strongly disagree — I remember clearly and it still lands.",
          2: "Disagree — the memory is intact.",
          3: "Mixed — I can recall it, but it feels distant.",
          4: "Agree — it's genuinely hard to reach.",
          5: "Strongly agree — I can't really get back to it."
        },
        guide: {
          howToDecide:
            "Reverse-scored: agreement is the risk signal. This asks about access to the memory, not whether the attraction is at its original intensity — those are different questions and only the first is diagnostic.",
          why:
            "Losing the origin story of fondness is a specific and late marker. Gottman found that couples heading for dissolution rewrite their own history — the early days get recast as naïve or mistaken — and once the past has been reinterpreted that way, the present has nothing to be measured against.",
          distinguish: [
            "Faded intensity is normal and expected. Inability to reach the memory is not.",
            "‘I remember, and I'm angry about it’ is Disagree — the memory is intact.",
            "‘I remember the facts but can't feel why it mattered’ sits around the middle and is worth noticing."
          ],
          honesty:
            "A high score here is painful to record, which is why it's often the most informative answer in the section.",
          gutCheck:
            "Can you get back to the early pull — or has the story gone fuzzy, or been rewritten?"
        },
        contextNote: null
      }
    ]
  },

  /* ════════════════════════════════════════════════════════════════════════
   * TURNING TOWARD  (the Emotional Bank Account)
   * ════════════════════════════════════════════════════════════════════════*/
  {
    id: "turning",
    title: "Turning Toward",
    term: "Turning Toward",
    intro:
      "All day, partners make small bids for attention, affection or connection — a remark, a question, a hand on a shoulder. Turning toward them, rather than away or against, is what fills the relationship's emotional bank account. Gottman's finding is stark: couples who stayed together turned toward roughly 86% of bids; couples who divorced, roughly 33%.",
    items: [
      {
        id: "tt_respond",
        text: "When my partner makes a small bid for attention or connection, I usually respond.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Rarely — most bids pass me by.",
          2: "Sometimes — I catch a minority of them.",
          3: "About half the time.",
          4: "Usually — I catch most of them.",
          5: "Almost always — I'm tuned to them."
        },
        guide: {
          howToDecide:
            "Bids are smaller than people expect: reading something out loud, a sigh, a question about nothing, a hand on your back as they pass. This is a self-assessment — rate your own catching, not theirs.",
          why:
            "This is the single most-studied everyday behaviour in Gottman's work, and the gap between stable and dissolving couples is enormous. The mechanism is cumulative rather than dramatic: no individual missed bid matters, but a few thousand of them is what ‘we grew apart’ actually consists of.",
          distinguish: [
            "Turning AWAY (missing it, absorbed elsewhere) and turning AGAINST (snapping, dismissing) are different failures. Both score low here, but the first is usually attention and the second is usually resentment.",
            "A brief acknowledgement counts as turning toward. The bar is engagement, not a conversation.",
            "‘I respond when it's important’ misses the point — bids are trivial by definition. The triviality is what makes the response mean something."
          ],
          honesty:
            "Nearly everyone rates themselves better at this than their partner would. Adjust accordingly.",
          gutCheck:
            "When they reach for you in small ways, do you come toward them — or finish the sentence you were reading?"
        },
        contextNote: (profile) => {
          let note = "";
          if (profile.flags && profile.flags.neurodivergent) {
            note += `Missing bids while deep in something is an attention pattern, not a verdict on how much you care — and with ${profile.flags.neurodivergent} that pattern can be strong. But score what your partner experiences, because the emotional bank account is debited by the miss regardless of why it happened. The fix is usually a visible re-entry ("give me two minutes and I'm yours"), not trying harder to notice. `;
          }
          if (profile.flags && profile.flags.highWorkload) {
            note += "High cognitive load produces the same result as indifference from the outside. Rate what lands, then decide separately what to do about the cause. ";
          }
          if (!note) note = "Rate what your partner would have experienced, not what you intended.";
          return note.trim() + situationLine(profile);
        }
      },
      {
        id: "tt_daily",
        text: "We stay connected through small daily moments, not just big occasions.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Not at all — connection only happens on occasions.",
          2: "Rarely — ordinary days are mostly logistics.",
          3: "Sometimes — some days have it, many don't.",
          4: "Often — most ordinary days include real contact.",
          5: "Consistently — it's the texture of normal life."
        },
        guide: {
          howToDecide:
            "About the texture of an ordinary Tuesday, not anniversaries, holidays or date nights. If your evidence for connection is all special occasions, that's the answer.",
          why:
            "Couples who rely on big occasions are running the relationship on periodic large deposits into an account with continuous small withdrawals. It works until a stretch of life gets busy enough to cancel the deposits, at which point there's nothing underneath them.",
          distinguish: [
            "Logistics are not connection. Coordinating the week efficiently can feel like a good partnership while producing no deposits at all.",
            "Being in the same room isn't connection either — parallel time on separate screens is proximity.",
            "A couple can be excellent at grand gestures and poor at Tuesdays. That's a real and specific pattern, not a contradiction."
          ],
          honesty:
            "Count the last ordinary week, not the last memorable one.",
          gutCheck:
            "Yesterday — was there a moment of genuine contact, or only administration?"
        },
        contextNote: null
      },
      {
        id: "tt_interested",
        text: "My partner is genuinely interested in me — curious about what I think and who I'm becoming.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Not at all — they don't seem curious about me.",
          2: "Rarely — interest is occasional or perfunctory.",
          3: "Sometimes — interested in some parts of me.",
          4: "Usually — they're genuinely curious.",
          5: "Strongly — they're actively interested in who I'm becoming."
        },
        guide: {
          howToDecide:
            "Rate the behavioural signal, not the declaration. Leaning in, remembering what you said last week, asking the follow-up question — that's interest. ‘Of course I'm interested in you’ is not evidence.",
          why:
            "Interest is the engine that builds and maintains Love Maps, which is why it sits upstream of so much else. It's also distinct from attention: attention is noticing you're in the room, interest is wanting to know what's happening inside you. A relationship can have plenty of the first and none of the second.",
          distinguish: [
            "Interest in your logistics (‘how was your day’ as a formality) is different from interest in your interior.",
            "Interest in your success is different from interest in your thinking — some partners are proud of you and incurious about you.",
            "‘Who I'm becoming’ is deliberate: people change, and a partner can be interested in the person you were while having stopped tracking the person you're turning into."
          ],
          honesty:
            "Answer for the last year. Interest is the thing that quietly lapses without anyone noticing it lapse.",
          gutCheck:
            "When you say something you've been thinking about, do they ask a second question?"
        },
        contextNote: null
      },
      {
        id: "tt_tries",
        text: "My partner tries hard to meet my needs.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Not at all — there's no real effort.",
          2: "Rarely — effort is occasional.",
          3: "Mixed — effort in some areas, not others.",
          4: "Usually — they genuinely try.",
          5: "Strongly — they work at it."
        },
        guide: {
          howToDecide:
            "Rate EFFORT, not outcome. This is the one item in the section where a partner who tries hard and gets it wrong should score high.",
          why:
            "Gottman separates two different kinds of erosion, and they need different responses. Friendship erosion is the slow drift of closeness, interest and attention. Care erosion is one or both partners having stopped WORKING on it. A relationship with low closeness but high effort is in much better shape than the reverse, because effort is the thing that can be aimed better.",
          distinguish: [
            "Trying and missing (wrong gift, wrong comfort, wrong moment) is still trying. Score it as such — then take up the aim separately.",
            "Effort that only appears after a fight, or after you've threatened to leave, is repair under pressure rather than sustained effort. Mid-scale at best.",
            "Effort you had to ask for repeatedly still counts, but note the pattern — chronically prompted effort has a different meaning to spontaneous effort."
          ],
          honesty:
            "If you're hurt about outcomes, this item is easy to score low unfairly. Separate the two deliberately.",
          gutCheck:
            "Ignore whether they get it right. Are they trying?"
        },
        contextNote: null
      },
      {
        id: "tt_ignore",
        text: "We tend to ignore each other's small attempts to connect.",
        type: "scale5",
        reverse: true,
        optionMeanings: {
          1: "Strongly disagree — bids get caught on both sides.",
          2: "Disagree — bids are mostly caught.",
          3: "Mixed — a fair number go unanswered.",
          4: "Agree — bids often get missed.",
          5: "Strongly agree — most bids go nowhere."
        },
        guide: {
          howToDecide:
            "Reverse-scored: agreement is the risk signal. Unlike the first item, this one is about the pair, not about you — the mutual pattern.",
          why:
            "Sustained mutual missing is how the emotional bank account goes into overdraft, and the ending is quiet: people stop bidding. A couple that has stopped bidding looks peaceful from outside and reports loneliness from inside, because there's no conflict left to signal anything is wrong.",
          distinguish: [
            "Ask whether bids are still being MADE. If they've stopped, the honest score here is at the high end — the ignoring already did its work.",
            "One-sided missing (one catches, one doesn't) still scores mid-to-high; the account is still draining, just asymmetrically."
          ],
          honesty:
            "Peaceful and disconnected reads as ‘fine’ from the inside. Score the bids, not the absence of arguments.",
          gutCheck:
            "How often does one of you reach, and nothing comes back?"
        },
        contextNote: null
      }
    ]
  },

  /* ════════════════════════════════════════════════════════════════════════
   * EMOTIONAL CONNECTION & DISENGAGEMENT
   * (Real items from the source assessment — high-signal cascade items.)
   * ════════════════════════════════════════════════════════════════════════*/
  {
    id: "connection",
    title: "Emotional Connection & Disengagement",
    term: "Emotional reliability",
    intro:
      "These items measure emotional closeness and its absence — loneliness, disappointment, and the felt sufficiency of connection. They're among the highest-signal items in the whole check-up. Answer honestly; the diagnostic value depends on it.",
    items: [
      {
        id: "con_happy",
        text: "I consider myself happy in this relationship.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Not at all happy.",
          2: "Largely unhappy.",
          3: "Mixed — genuinely in between.",
          4: "Generally happy.",
          5: "Strongly — I'm happy in this relationship."
        },
        guide: {
          howToDecide:
            "A global, whole-relationship judgement, not a reading of this week. Answer for yourself alone — don't average yours with what you think your partner's answer would be.",
          why:
            "One of the most diagnostically important single items in the whole Checkup. Its value is that it bypasses every component question: a person can rate friendship, conflict and sex reasonably and still be unhappy, and that gap is itself the finding worth looking at.",
          distinguish: [
            "Happy is not the same as committed, and not the same as grateful. You can be all three, or only one.",
            "A recent bad patch shouldn't drag this down; a long good history shouldn't prop it up. Aim at the current period, generously defined.",
            "If your answer swings hard depending on the day, that instability is itself information — score the average and note the swing."
          ],
          honesty:
            "The item people most want to round up. Round-ups here quietly invalidate everything else you answer.",
          gutCheck:
            "Asked by someone you'd never have to see again — what's the honest number?"
        },
        contextNote: null
      },
      {
        id: "con_confide",
        text: "My partner is the person I turn to with what's really going on in me.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Almost never — I take it elsewhere, or nowhere.",
          2: "Rarely — only some things, rarely the real ones.",
          3: "Sometimes — it depends on the subject.",
          4: "Usually — they're my first call for most of it.",
          5: "Almost always — they're who I go to."
        },
        guide: {
          howToDecide:
            "Confiding is a behaviour, not a feeling — this asks what you actually do, not how close you feel. Score where your inner material actually goes.",
          why:
            "Withdrawal of confiding is one of the earliest observable indicators of emotional disengagement, and it usually precedes any conscious decision to withdraw. It's also gradual and self-concealing: you don't decide to stop telling them things, you just find yourself having told someone else first, repeatedly.",
          distinguish: [
            "Having other confidants is healthy. The question is whether your partner is still among them for the things that matter most.",
            "‘I don't want to burden them’ is the most common reason for a low score and still counts as a low score — the reason doesn't change the state.",
            "If you've stopped because previous attempts landed badly, score low and note that the cause is reception, not choice."
          ],
          honesty:
            "People answer this for how the relationship is supposed to work rather than how it currently does.",
          gutCheck:
            "The last genuinely hard thing — who did you tell first?"
        },
        contextNote: (profile) => {
          let note = "";
          if (profile.flags && profile.flags.highWorkload) {
            note += "There's a specific pattern worth checking here: people carrying a lot often route the hard material to colleagues, co-founders or advisors because those people have context — and the partner ends up hearing the summary rather than the thing itself. That's still withdrawn confiding, even when it's efficient. ";
          }
          if (profile.flags && profile.flags.contemplativePractice) {
            note += `A ${profile.flags.contemplativePractice} practice can absorb a great deal of what might otherwise be confided, which is genuinely healthy and can also quietly replace the partner as the place things go. Worth noticing which is happening. `;
          }
          if (!note) note = "Score where the material actually goes, not where you'd say it belongs.";
          return note.trim() + situationLine(profile);
        }
      },
      {
        id: "con_disappointed", text: "I often find myself disappointed in this relationship.", type: "tf", reverse: true,
        optionMeanings: { 1: "True — disappointment is a recurring feature of your experience.", 0: "False — disappointment is occasional, situational, or rare." },
        guide: {
          howToDecide: "The bar is ‘often’ — recurring, not occasional. Disappointment is the felt gap between what you hoped for and what you're getting.",
          why: "Chronic disappointment is one of the most corrosive patterns Gottman tracks — it builds slowly, often without overt conflict, quietly eroding fondness and hope.",
          distinguish: ["It asks whether YOU experience disappointment — your felt state — not whether your partner ‘is a disappointment’.", "Don't overreport on a hard week; calibrate to the last several months."],
          honesty: "Commonly underreported because ‘disappointed’ feels like a harsh judgment of the partner. If you feel it, the honest answer is True.",
          gutCheck: "In quiet moments over recent months, does disappointment show up as a recurring emotional note?"
        }
      },
      {
        id: "con_lonely", text: "At times, I find myself quite lonely in this relationship.", type: "tf", reverse: true,
        optionMeanings: { 1: "True — at times you feel quite lonely in this relationship.", 0: "False — you don't experience loneliness in this relationship." },
        guide: {
          howToDecide: "‘At times’ sets a low frequency bar; ‘quite lonely’ sets a meaningful intensity bar. It shows up sometimes and, when it does, it's notable.",
          why: "Loneliness within a partnership (‘alone together’) is one of the most painful and predictive experiences in long relationships — heavier than loneliness without a partner, because it signals the relationship itself isn't providing the connection it should.",
          distinguish: ["It can come from eroded friendship, stopped confiding, thinned closeness, faded interest, lost romance, or chronic conflict — the item doesn't ask which, only whether it's happening.", "Combined with disappointment + friendship erosion, it's a classic signature of late-stage distress."],
          honesty: "Underreported because it can feel like an accusation or like ‘something's wrong with me’. It's just asking whether you experience it.",
          gutCheck: "Over recent months, have there been times you felt quite lonely while WITH your partner — unmet, separate, unseen?"
        }
      },
      {
        id: "con_deep_feelings", text: "It is hard for my deepest feelings to get much attention in this relationship.", type: "tf", reverse: true,
        optionMeanings: { 1: "True — your deepest feelings tend not to get much attention.", 0: "False — your deepest feelings do get real attention." },
        guide: {
          howToDecide: "High bar on both sides: ‘deepest feelings’ (fears, longings, grief, identity-level concerns) and ‘much attention’ (meaningful reception, not surface response).",
          why: "The deep layer is where the most important emotional bond lives. Surface communication can be intact (logistics, work, kids) while the deep layer goes unmet — producing ‘technically connected, fundamentally alone’.",
          distinguish: ["Distinct from everyday listening / interest / closeness items — this is the depth-specific one.", "A True can mean you've stopped bringing deep feelings because they don't land, your partner deflects, there's a skill or capacity gap, or logistics have crowded depth out."],
          honesty: "Underreported because the honest answer feels accusatory or sad. It's a structural question about depth capacity, not a character verdict.",
          gutCheck: "When something genuinely deep is happening for you, do you bring it to your partner — and does it get real attention?"
        }
      },
      {
        id: "con_closeness", text: "There is not enough closeness between us.", type: "tf", reverse: true,
        optionMeanings: { 1: "True — there is not enough closeness between you.", 0: "False — there is enough closeness between you." },
        guide: {
          howToDecide: "A sufficiency item — ‘enough’ is the key word. Not whether closeness exists, but whether the amount meets YOUR need.",
          why: "Negative framing (‘not enough’) deliberately lowers the threshold for naming a deficit; it's easier to say ‘this isn't enough’ than to claim ‘we're perfectly close’.",
          distinguish: ["Grade against your own threshold, not other couples or what your partner would say.", "If the felt-closeness, loneliness, and deep-feelings items leaned to deficit, this is almost certainly True."],
          honesty: "A common True: a relationship that was close, where closeness thinned over time, and the current level falls short of what you need.",
          gutCheck: "Is the closeness at or above the level you need to feel satisfied with the connection, or below it?"
        }
      },
      {
        id: "con_adapted", text: "I have adapted to a lot in this relationship and I am not sure it has been a good idea.", type: "tf", reverse: true,
        optionMeanings: { 1: "True — you've adapted a lot and you doubt it was wise.", 0: "False — you haven't adapted much, or the adapting has been worthwhile." },
        guide: {
          howToDecide: "Two clauses, both must land: (1) you've made meaningful accommodations/sacrifices, AND (2) you doubt they were the right call. Either alone is False.",
          why: "Captures a specific late-stage state — self-doubt about your own choices to accommodate. When you've adapted heavily but no longer feel it's repaid, the relationship has, in your felt accounting, tipped into deficit and adaptations look like losses rather than investments.",
          distinguish: ["Different from ‘do I regret the relationship’ — it's the subtler question of self-erasure or self-distortion plus retrospective doubt.", "Adapted a lot but feel good about it → False. Haven't adapted much → False."],
          honesty: "Often carried quietly and not even articulated to oneself; the forced binary can surface a felt truth that hadn't been put into words.",
          gutCheck: "Looking back at the accommodations and sacrifices you've made — were they worth it, or are you uncertain they were a good idea?"
        }
      }
    ]
  },

  /* ════════════════════════════════════════════════════════════════════════
   * ROMANCE & PASSION
   * ════════════════════════════════════════════════════════════════════════*/
  {
    id: "romance",
    title: "Romance & Passion",
    intro:
      "The ‘lover’ dimension — romance, desire, being pursued. Gottman treats this as a distinct system from the friendship one, which is why it can fade while the friendship stays strong, and why attending to the friendship alone doesn't revive it.",
    items: [
      {
        id: "rom_strong",
        text: "There is still a strong sense of romance between us.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Not at all — romance isn't part of what we are now.",
          2: "A little — traces, rarely.",
          3: "Somewhat — it surfaces sometimes.",
          4: "Mostly — romance is genuinely present.",
          5: "Strongly — it's alive between us."
        },
        guide: {
          howToDecide:
            "Romance as currently felt. Not nostalgia, and not the romance of the story you tell people about how you met.",
          why:
            "The lover system needs its own maintenance. Couples often work hard on communication and logistics, find the friendship improves, and are confused that the romantic dimension doesn't follow — because it doesn't. It has separate inputs.",
          distinguish: [
            "Romance is intentionality and charge — being chosen, pursued, delighted in. It isn't the same as sex, and it isn't the same as warmth.",
            "Comfortable companionship can be excellent and still score low here. That's a real finding, not a contradiction."
          ],
          honesty:
            "There's a strong pull to answer for the relationship's history rather than its present.",
          gutCheck:
            "In the last month, was there a moment that felt romantic rather than affectionate?"
        },
        contextNote: null
      },
      {
        id: "rom_courted",
        text: "My partner still pursues me — I feel wanted, not just accepted.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Not at all — I feel taken for granted.",
          2: "Rarely — pursuit has largely stopped.",
          3: "Sometimes — occasionally, unpredictably.",
          4: "Usually — I feel actively wanted.",
          5: "Strongly — they still pursue me."
        },
        guide: {
          howToDecide:
            "The felt experience of being desired and sought after, distinct from being loved or being had. Rate how it lands, not how often anything happens.",
          why:
            "This is one of the more precise items in the Checkup because it separates two states that look similar from outside and feel completely different from inside: being securely accepted, and being actively wanted. Long relationships drift toward the first and mistake it for the second.",
          distinguish: [
            "Pursuit isn't only sexual. Being sought out for your company, planned for, chosen when there were other options — all of it counts.",
            "Frequency of sex and feeling desired come apart routinely. Sex can be regular while pursuit has entirely stopped.",
            "‘They'd say yes if I initiated’ is acceptance. This item asks whether they initiate."
          ],
          honesty:
            "A hard item to score low, because doing so feels like a complaint about being loved. It isn't — it's a different question.",
          gutCheck:
            "Wanted, or simply available and accepted?"
        },
        contextNote: null
      },
      {
        id: "rom_mine",
        text: "I still feel romantic and passionate toward my partner.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Not at all — that feeling is gone for me.",
          2: "Rarely — occasional flickers.",
          3: "Mixed — it comes and goes.",
          4: "Usually — I still feel it.",
          5: "Strongly — it's very much alive in me."
        },
        guide: {
          howToDecide:
            "Your own internal state, regardless of whether it's expressed, returned, or acted on. This is the one item in the section that doesn't depend on your partner's behaviour at all.",
          why:
            "Diagnostically this is the heaviest item here. Where a partner still feels it but it isn't being met, the problem is a stuck channel and the material is present. Where the feeling itself has gone, the work is different and more serious — and knowing which of the two you're in changes what should happen next.",
          distinguish: [
            "Withheld feeling is not absent feeling. If you've stopped expressing it out of hurt or self-protection, the feeling is still there — score it.",
            "Anger can mask it entirely and temporarily. Ask whether the feeling is gone or currently buried.",
            "Don't average this with how they treat you. That's a different item, deliberately."
          ],
          honesty:
            "Resentment makes this easy to underreport, and hope makes it easy to overreport. Both distort.",
          gutCheck:
            "Setting aside what you get back — is it still in you?"
        },
        contextNote: null
      },
      {
        id: "rom_faded",
        text: "The romantic, passionate side of our relationship has faded.",
        type: "scale5",
        reverse: true,
        optionMeanings: {
          1: "Strongly disagree — it hasn't faded.",
          2: "Disagree — largely intact.",
          3: "Mixed — dimmer than it was.",
          4: "Agree — it has clearly faded.",
          5: "Strongly agree — the fire is going out."
        },
        guide: {
          howToDecide:
            "Reverse-scored: agreement is the risk signal. This is a trajectory question — the direction of travel, not the current level.",
          why:
            "Fade is common, addressable, and a reliable driver of the loneliness items elsewhere in this check-up. Naming it as a trajectory rather than a state matters, because trajectories can be turned and states feel permanent.",
          distinguish: [
            "Settling into a sustainable rhythm after the early intensity is normal. A continuing downward slope is the thing being asked about.",
            "If you and your partner would place the fade at different points in time, that gap is itself worth discussing."
          ],
          honesty:
            "Agreeing here isn't a prediction about the relationship's future. It's a status report on one system within it.",
          gutCheck:
            "Compared with two years ago — brighter, the same, or dimmer?"
        },
        contextNote: null
      },
      {
        id: "rom_time",
        text: "We make time for romance and physical affection.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Almost never — it gets whatever's left, which is nothing.",
          2: "Rarely — only when everything else is done.",
          3: "Sometimes — inconsistently protected.",
          4: "Often — we deliberately make room.",
          5: "Consistently — it's protected time."
        },
        guide: {
          howToDecide:
            "Deliberate time, not residual time. The question is whether romance gets protected against everything else competing for the same hours.",
          why:
            "Under load, romance is almost never actively abandoned — it's simply always last in the queue, and the queue never empties. Which is why the fix is structural rather than emotional: couples who sustain this one schedule it, and feel slightly ridiculous about scheduling it.",
          distinguish: [
            "Physical affection here means non-sexual touch as well — the casual contact that keeps a couple physically familiar with each other.",
            "Time that exists but gets cancelled whenever anything else comes up isn't protected time.",
            "Sharing a sofa while working isn't this."
          ],
          honesty:
            "Score the last two months of the actual calendar, not the intention.",
          gutCheck:
            "Is there time that belongs to this, which other things don't get to take?"
        },
        contextNote: (profile) => {
          let note = "";
          if (profile.flags && profile.flags.highWorkload) {
            note += "This is the item where high workload does the most damage, and it does it without any decision being made — romance doesn't get cancelled, it just never wins a scheduling contest against something urgent. If everything else in your life is calendared and this isn't, you already know the score. ";
          }
          if (profile.flags && profile.flags.neurodivergent) {
            note += `Time-blindness and task absorption — common with ${profile.flags.neurodivergent} — hit protected time harder than they hit intentions. Judge the calendar, not the wish. `;
          }
          if (!note) note = "Judge this on what the calendar shows, not on what you both mean to do.";
          return note.trim() + situationLine(profile);
        }
      }
    ]
  },

  /* ════════════════════════════════════════════════════════════════════════
   * CONFLICT MANAGEMENT  (Conflict Scales — Four Horsemen, repair, influence)
   * ════════════════════════════════════════════════════════════════════════*/
  {
    id: "conflict",
    title: "Managing Conflict",
    term: "The Four Horsemen",
    intro:
      "How you handle disagreement: the start-up, the Four Horsemen (Criticism, Contempt, Defensiveness, Stonewalling), flooding, whether repair attempts land, and whether power is genuinely shared. Gottman's point about this section is that about 69% of couple conflict is perpetual and never gets solved — so what's being measured isn't whether you resolve things, but whether you can keep talking.",
    items: [
      {
        id: "cf_harsh",
        text: "Our discussions about problems tend to start harshly — with criticism or blame.",
        type: "scale5",
        reverse: true,
        optionMeanings: {
          1: "Strongly disagree — we open gently, with a complaint rather than a charge.",
          2: "Disagree — start-ups are usually soft.",
          3: "Mixed — depends on the topic and the day.",
          4: "Agree — they often open harshly.",
          5: "Strongly agree — hard conversations start as accusations."
        },
        guide: {
          howToDecide:
            "Reverse-scored. A harsh start-up opens with criticism, blame or contempt in the first moments — ‘you always’, ‘you never’, ‘why can't you ever’.",
          why:
            "Gottman could predict the outcome of a conflict discussion from its first three minutes with high accuracy, because conversations end more or less on the note they begin. That makes the start-up the highest-leverage single thing in this whole section: the antidote is a gentle start-up — say what you feel, about a specific situation, and state a positive need.",
          distinguish: [
            "A complaint is about a behaviour (‘the bins didn't go out and I'm annoyed’). Criticism is about a character (‘you're so lazy’). The first is healthy and necessary; the second is Horseman number one.",
            "Volume isn't harshness. A quietly delivered character attack is a harsh start-up; a loud specific complaint often isn't.",
            "Score how conversations OPEN, not how they escalate later — that's a different item."
          ],
          honesty:
            "Each partner tends to notice the other's harsh start-ups and to experience their own as justified. Rate the pattern, including yours.",
          gutCheck:
            "Replay the opening line of the last hard conversation. Complaint, or charge?"
        },
        contextNote: null
      },
      {
        id: "cf_contempt",
        text: "During conflict, contempt shows up — sarcasm, mockery, eye-rolling, or name-calling.",
        type: "scale5",
        reverse: true,
        optionMeanings: {
          1: "Strongly disagree — never.",
          2: "Disagree — rare, and out of character when it happens.",
          3: "Sometimes — it appears under pressure.",
          4: "Agree — fairly often.",
          5: "Strongly agree — it's a regular feature of how we fight."
        },
        guide: {
          howToDecide:
            "Reverse-scored. Contempt is disrespect delivered from a position of superiority — not anger, which is level, but looking down.",
          why:
            "This is the single biggest predictor of break-up in Gottman's research, and it's also the one that predicts physical illness in the partner receiving it. Its antidote isn't better conflict technique — it's the fondness and admiration floor, which is why the two sections are linked.",
          distinguish: [
            "Anger is not contempt. A furious partner treating you as an equal is in a different category from a calm one treating you as beneath them.",
            "Watch for the specific forms: eye-rolling, sneering, mimicry, sarcasm, name-calling, and the ‘hostile humour’ that's technically a joke.",
            "Contempt disguised as insight — ‘this is just who you are’ delivered pityingly — counts."
          ],
          honesty:
            "People minimise their own contempt as ‘just how I talk when I'm frustrated’. If your partner would name it, score it.",
          gutCheck:
            "Does either of you, mid-fight, communicate that the other is beneath you?"
        },
        contextNote: null
      },
      {
        id: "cf_defensive",
        text: "When my partner raises an issue, I tend to defend myself rather than take any responsibility.",
        type: "scale5",
        reverse: true,
        optionMeanings: {
          1: "Strongly disagree — I can hear it and take a share.",
          2: "Disagree — I usually take some responsibility.",
          3: "Mixed — depends how it's raised.",
          4: "Agree — I default to defending.",
          5: "Strongly agree — I defend almost automatically."
        },
        guide: {
          howToDecide:
            "Reverse-scored, and deliberately a self-assessment — this is the Horseman you can see from the inside better than your partner can.",
          why:
            "Defensiveness is warding off a perceived attack, usually with an excuse or a counter-complaint, and its real cost is that it tells your partner their concern won't be received. The antidote is accepting some responsibility — even a small part, even when the charge is largely unfair, because it's the accepting that unlocks the conversation rather than the proportion.",
          distinguish: [
            "‘Yes, but…’ is defensiveness. So is ‘what about when YOU…’, which is counter-attack rather than defence.",
            "Genuinely being wrongly accused is real and happens. The item asks about your default move, not whether you're ever right.",
            "Explaining context isn't automatically defensive — the test is whether any responsibility gets taken alongside the explanation."
          ],
          honesty:
            "Defensiveness feels entirely reasonable from inside, every time. That's what makes it hard to score.",
          gutCheck:
            "When criticised, is your first instinct to explain why you're not at fault?"
        },
        contextNote: (profile) => {
          let note = "";
          if (profile.flags && profile.flags.neurodivergent) {
            note += `If ${profile.flags.neurodivergent} comes with a strong sensitivity to criticism, the defensive reflex can fire before you've even finished hearing the sentence — fast, physical, and hard to override in the moment. That's worth naming, because the useful work is usually buying yourself a pause rather than trying to feel less. Score the behaviour as it lands, not how justified the reflex feels. `;
          }
          if (!note) note = "Score your default first move, not the cases where you turned out to be right.";
          return note.trim() + situationLine(profile);
        }
      },
      {
        id: "cf_stonewall",
        text: "When things get heated, one of us shuts down and withdraws.",
        type: "scale5",
        reverse: true,
        optionMeanings: {
          1: "Strongly disagree — we both stay in the conversation.",
          2: "Disagree — withdrawal is rare.",
          3: "Sometimes — it happens under real pressure.",
          4: "Agree — one of us regularly checks out.",
          5: "Strongly agree — shutting down is how our fights end."
        },
        guide: {
          howToDecide:
            "Reverse-scored. Stonewalling is going silent, looking away, giving monosyllables, or physically leaving and not returning — the listener withdrawing entirely from the interaction.",
          why:
            "Stonewalling is usually flooding made visible rather than indifference: the body has gone into fight-or-flight and the person has lost access to the part of themselves that could respond. It reads as contempt from the outside and feels like drowning from the inside, which is why it escalates so reliably.",
          distinguish: [
            "A structured break is not stonewalling. ‘I need twenty minutes, then let's finish this’ — and then actually returning — is the healthy version of the same impulse.",
            "The difference is the return. Withdrawal that never comes back is stonewalling; withdrawal with a stated re-entry is self-regulation.",
            "Stonewalling isn't always silent. Talking without engaging — deflecting, joking, going procedural — is the same manoeuvre."
          ],
          honesty:
            "The stonewalling partner often doesn't experience it as doing anything. Ask what it looks like from the other chair.",
          gutCheck:
            "Does one of you leave the field — and if so, does that person come back?"
        },
        contextNote: null
      },
      {
        id: "cf_flooding",
        text: "During arguments I often feel emotionally overwhelmed and unable to think clearly.",
        type: "scale5",
        reverse: true,
        optionMeanings: {
          1: "Strongly disagree — I stay regulated.",
          2: "Disagree — rarely overwhelmed.",
          3: "Sometimes — in the harder ones.",
          4: "Agree — I'm often overwhelmed.",
          5: "Strongly agree — I reliably lose the ability to think."
        },
        guide: {
          howToDecide:
            "Reverse-scored. This is flooding: heart rate climbing, chest tight, thoughts narrowing, the sense of being under attack and needing it to stop.",
          why:
            "Flooding is physiological, not attitudinal, and above roughly 100 beats per minute most people lose access to humour, perspective and problem-solving. Continuing to talk past that point cannot work — the equipment is offline — which is why the only real intervention is a 20-plus minute break spent genuinely self-soothing rather than rehearsing the argument.",
          distinguish: [
            "Flooding is different from being angry. Anger still has access to words and reasoning; flooding doesn't.",
            "The tell is usually bodily — heat, tunnel vision, a roaring in the ears — before it's cognitive.",
            "People who flood easily often stonewall as a consequence. If you scored the last item high, look here."
          ],
          honesty:
            "Flooding is nothing to be ashamed of and is largely not under your control. Underreporting it removes the most actionable finding in this section.",
          gutCheck:
            "Do your fights reach a point where you genuinely can't think straight?"
        },
        contextNote: (profile) => {
          let note = "";
          if (profile.flags && profile.flags.neurodivergent) {
            note += `Nervous systems vary enormously in how fast they flood, and ${profile.flags.neurodivergent} often means a faster, harder response with a slower return to baseline. Score your actual physiology rather than what you think a reasonable threshold would be — and note that a slower return means your break needs to be longer than the standard twenty minutes, not that you're doing it wrong. `;
          }
          if (profile.flags && profile.flags.highWorkload) {
            note += "Sustained high load lowers the flooding threshold for everyone — an argument that would have been manageable rested becomes unmanageable depleted. If your answer differs between busy and quiet periods, score the busy ones, because that's when the conflicts happen. ";
          }
          if (profile.flags && profile.flags.contemplativePractice) {
            note += `Your ${profile.flags.contemplativePractice} practice may give you real regulation capacity — but practised calm in a quiet setting and calm under a partner's anger are different skills. Score the second. `;
          }
          if (!note) note = "Score the body, not the intention — flooding is physiological and mostly not a choice.";
          return note.trim() + situationLine(profile);
        }
      },
      {
        id: "cf_kitchen_sink",
        text: "Our discussions get to the point where we start bringing up each other's faults.",
        type: "scale5",
        reverse: true,
        optionMeanings: {
          1: "Strongly disagree — we stay on the issue at hand.",
          2: "Disagree — rarely spreads.",
          3: "Sometimes — it spreads when things get heated.",
          4: "Agree — most arguments widen out.",
          5: "Strongly agree — every issue becomes all the issues."
        },
        guide: {
          howToDecide:
            "Reverse-scored. This is kitchen-sinking — one disagreement pulling in every other grievance until the original subject has disappeared.",
          why:
            "Kitchen-sinking guarantees that nothing gets resolved, because no single item is ever on the table long enough to be addressed. It also reliably produces flooding on both sides, since a list of your faults is far harder to absorb than a single complaint.",
          distinguish: [
            "Genuine pattern-naming (‘this is the third time this month’) is legitimate and isn't this — the subject is still the same subject.",
            "Kitchen-sinking is the move to a DIFFERENT grievance, then another.",
            "It's usually a flooding symptom: when overwhelmed, people reach for more ammunition rather than less."
          ],
          honesty:
            "Both partners typically do this and each remembers the other starting it.",
          gutCheck:
            "Do your arguments end on the topic they started on?"
        },
        contextNote: null
      },
      {
        id: "cf_repair",
        text: "We're able to use repair attempts — humour, an apology, a kind word — to calm things down.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Almost never — attempts don't land, or aren't made.",
          2: "Rarely — they usually get rejected.",
          3: "Sometimes — it depends how far in we are.",
          4: "Usually — repairs generally work.",
          5: "Reliably — either of us can bring the temperature down."
        },
        guide: {
          howToDecide:
            "Both making AND receiving repairs counts, and the receiving half is where most couples actually fail. Score whether they LAND, not whether they're attempted.",
          why:
            "Gottman describes failed repair as the single strongest predictor of long-term outcomes — stronger than how much a couple fights, or about what. Every couple has conflict; the ones that last are the ones where either partner can reach over mid-fight and be met. When repairs stop landing, negative sentiment override has usually set in: the gesture is read as manipulation rather than as an offer.",
          distinguish: [
            "Repairs are often clumsy, badly timed, or barely verbal — a hand, a bad joke, changing the subject. Clumsiness doesn't disqualify them.",
            "A repair that's rejected has still been made. If you're making them and they bounce, the problem is reception, not effort — score low but note which half is failing.",
            "‘We never need repair because we never fight’ is not a 5. Look at whether conflict is being avoided rather than managed."
          ],
          honesty:
            "This is the most important item in the section. Score what happens, not what's intended.",
          gutCheck:
            "When one of you tries to de-escalate mid-fight, does the other take it?"
        },
        contextNote: null
      },
      {
        id: "cf_influence",
        text: "I genuinely let my partner's opinions and feelings influence my decisions.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Rarely — I hear them out and do what I was going to do.",
          2: "Sometimes — on smaller things.",
          3: "About half — depends on the domain.",
          4: "Usually — their view changes my decisions.",
          5: "Consistently — we decide together in practice, not just in principle."
        },
        guide: {
          howToDecide:
            "Accepting influence means actual shared power — decisions changing because of what your partner thinks. Listening attentively and then proceeding as planned is not this.",
          why:
            "This is among the most-studied dynamics in Gottman's work, and refusing influence is the single strongest predictor of divorce for heterosexual men. The underlying mechanism is simple: a partner whose views never change anything eventually stops offering them, and a relationship where one person's preferences are the default has stopped being a partnership.",
          distinguish: [
            "Conceding to end an argument isn't accepting influence — that's capitulation, and it tends to be logged as a debt.",
            "Ask about domains. Many couples accept influence readily in some areas (the house, the kids) and not at all in others (money, work), and an average hides that.",
            "Yielding on small things while holding all the large ones scores mid at best."
          ],
          honesty:
            "Almost everyone rates themselves as open to influence. Test it against decisions that actually changed.",
          gutCheck:
            "Name a real decision in the last year that went differently because of what your partner thought."
        },
        contextNote: null
      },
      {
        id: "cf_gridlock",
        text: "On our biggest recurring issues, we feel gridlocked — every conversation hits the same wall.",
        type: "scale5",
        reverse: true,
        optionMeanings: {
          1: "Strongly disagree — we can still talk about the hard ones.",
          2: "Disagree — mostly still in dialogue.",
          3: "Mixed — some topics are stuck.",
          4: "Agree — the big ones are gridlocked.",
          5: "Strongly agree — we've stopped trying on those."
        },
        guide: {
          howToDecide:
            "Reverse-scored. Gridlock isn't an unsolved problem — most problems stay unsolved. It's a problem that can no longer be discussed at all.",
          why:
            "Since about 69% of conflict is perpetual, the working goal was never resolution — it's dialogue. Gottman's finding is that gridlock nearly always has an unspoken dream inside it on each side: the position each partner defends so fiercely is standing in for something they haven't said out loud. Understanding the dream behind the position is what unsticks it, which is why gridlock is more workable than it feels.",
          distinguish: [
            "Silence about a topic is not agreement. If you've stopped raising something because it's not worth the fight, that's gridlock — score it high.",
            "A topic you argue about repeatedly but can still discuss is perpetual conflict, not gridlock. That's normal and much less serious.",
            "Gridlock usually comes with a sense of rejection, entrenchment, and a feeling that the other person is refusing to understand something obvious."
          ],
          honesty:
            "The topics you've quietly given up on are the ones this item is asking about. Include them.",
          gutCheck:
            "Is there something you've stopped bringing up entirely? That's the answer."
        },
        contextNote: null
      }
    ]
  },

  /* ════════════════════════════════════════════════════════════════════════
   * SHARED MEANING SYSTEM
   * ════════════════════════════════════════════════════════════════════════*/
  {
    id: "meaning",
    title: "Shared Meaning",
    term: "Shared Meaning System",
    intro:
      "The inner life you build together — rituals, roles, goals and symbols that give the relationship a sense of purpose and ‘us’. The top floor of the Sound Relationship House sits here too: whether each of you feels the other knows and supports your deepest Life Dreams is the strongest single predictor of long-term satisfaction in Gottman's research.",
    items: [
      {
        id: "sm_rituals",
        text: "We have meaningful rituals we can count on — real goodbyes and reunions, meals, things we always do.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Almost none — nothing is reliably ours.",
          2: "Few — one or two, loosely held.",
          3: "Some — a handful, unevenly kept.",
          4: "Several — dependable and they matter.",
          5: "Many — rituals structure our life together."
        },
        guide: {
          howToDecide:
            "Rituals are deliberate and carry meaning. Routines are merely logistics. Both are repeated — the difference is whether anything would be lost if it stopped.",
          why:
            "Rituals protect connection from operational gravity. Without them, closeness depends on spontaneity, and spontaneity is the first thing displaced by a demanding period — which is exactly when connection is most needed. The daily reunion is the most-studied of these, and the leading indicator is anticipation: whether you look forward to it.",
          distinguish: [
            "Eating in the same room while both on phones is a routine. A meal where you talk is a ritual.",
            "The smallest ones carry the most weight — a proper goodbye, a proper hello, a standing check-in.",
            "Rituals you used to have and dropped should be scored as absent, but they're the easiest to restart, which is worth knowing."
          ],
          honesty:
            "Count what actually still happens this season, not what you'd describe to someone as ‘what we do’.",
          gutCheck:
            "Name three. If it's hard, that's the score."
        },
        contextNote: (profile) => {
          let note = "";
          if (profile.flags && profile.flags.highWorkload) {
            note += "Rituals are the specific countermeasure to the thing high load does to relationships — they don't require spare energy, only a fixed place in the week, and they hold when motivation doesn't. If you're carrying a heavy load, this is the highest-leverage item in the section for you. ";
          }
          if (profile.flags && profile.flags.contemplativePractice) {
            note += `You already keep a ${profile.flags.contemplativePractice} practice, so you know how a fixed observance carries you through periods when feeling alone wouldn't. Ask whether the relationship has anything with that same standing. `;
          }
          if (!note) note = "Judge this on what reliably happens, not on what you'd both say you value.";
          return note.trim() + situationLine(profile);
        }
      },
      {
        id: "sm_renewal",
        text: "When we're burned out or tired, we have ways of becoming renewed together.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Not at all — depletion just accumulates.",
          2: "Rarely — we recover separately, if at all.",
          3: "Sometimes — occasionally it works.",
          4: "Usually — we have things that reliably help.",
          5: "Consistently — renewal is something we do together."
        },
        guide: {
          howToDecide:
            "Ask whether there is a known, repeatable way you two recover — not whether you each have your own way of coping alone.",
          why:
            "Every couple hits depleted stretches; the ones that hold have a mechanism for coming back rather than waiting for conditions to improve. This item matters disproportionately for high-intensity lives, where depleted is the default state rather than the exception, and recovery has to be built rather than waited for.",
          distinguish: [
            "Individual recovery (a run, a bath, an evening alone) is legitimate and necessary but isn't what's being asked. This is about joint renewal.",
            "A holiday once a year is not a renewal ritual — the interval is too long to catch the depletion that accumulates weekly.",
            "Collapsing in front of a screen together may genuinely work for you. If it does, score it honestly; the test is whether you come out restored."
          ],
          honesty:
            "Score whether it works, not whether it sounds like it should.",
          gutCheck:
            "Last time you were both wrung out — was there something you did that actually helped?"
        },
        contextNote: null
      },
      {
        id: "sm_values",
        text: "We largely agree on the roles and values that matter in our life together.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Rarely agree — we're pulling in different directions.",
          2: "Often differ on things that matter.",
          3: "Mixed — aligned in places, not in others.",
          4: "Mostly agree on the things that count.",
          5: "Strongly aligned on roles and values."
        },
        guide: {
          howToDecide:
            "Roles and core values, not every preference. The question is whether you agree about what your life together is FOR, and who does what within it.",
          why:
            "Gottman separates conduct from meaning, and both matter here: values about how one ought to behave, and roles about how work, family and obligation should be balanced. The heaviest piece is mission support — whether each of you experiences the partnership as backing your fundamental direction in life rather than competing with it.",
          distinguish: [
            "Differing and knowing it is workable. Assuming you agree and never having checked is the more common failure.",
            "Role friction often shows up as a fairness complaint about chores when the actual disagreement is about what a partner is FOR.",
            "Faith, culture and family-of-origin expectations sit underneath a lot of this and frequently go unexamined until they collide."
          ],
          honesty:
            "Chronic quiet disagreement is still disagreement. Silence on a topic isn't alignment.",
          gutCheck:
            "If asked separately what your life together is for, how close would the two answers be?"
        },
        contextNote: null
      },
      {
        id: "sm_goals",
        text: "We share important goals and a sense of where we're headed.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Not at all — no shared direction.",
          2: "A little — some overlap, no real trajectory.",
          3: "Somewhat — shared in parts.",
          4: "Mostly — a clear enough common direction.",
          5: "Strongly — we know what we're building."
        },
        guide: {
          howToDecide:
            "A felt sense of a shared trajectory rather than two parallel ones. Take the long view Gottman's items use — will these paths have meshed well by old age?",
          why:
            "Shared goals are what make a relationship feel like it's going somewhere rather than merely continuing. Where they're absent, couples often report nothing specifically wrong and a persistent sense of drift, which is the state that ‘growing in different directions’ describes.",
          distinguish: [
            "Logistical plans (the move, the renovation) aren't goals. Direction is.",
            "You can share goals and disagree about timing or method — that's normal and much less serious than not sharing them.",
            "Financial goals are worth checking separately; they're where misalignment tends to surface first and most concretely."
          ],
          honesty:
            "Answer on direction, not on how much you like each other.",
          gutCheck:
            "Are you building a life together, or living two lives side by side efficiently?"
        },
        contextNote: null
      },
      {
        id: "sm_dreams",
        text: "My partner knows my deepest life dreams and is genuinely behind them.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Not at all — they don't know them, or aren't behind them.",
          2: "Rarely — known vaguely, supported thinly.",
          3: "Mixed — known, with real support in some areas only.",
          4: "Usually — known and genuinely supported.",
          5: "Strongly — they know them and are entirely behind them."
        },
        guide: {
          howToDecide:
            "Two conditions, and both must hold: they KNOW the dreams, and they're BEHIND them. Knowing without support, or support for something that isn't actually your dream, both score low.",
          why:
            "This is the top floor of the Sound Relationship House, and in Gottman's research whether each partner feels the other knows, values and supports their deepest dreams is the strongest single predictor of long-term satisfaction. It's also what sits underneath most gridlock: the position someone defends immovably is usually a dream they've never said out loud.",
          distinguish: [
            "Dreams aren't goals. A goal is a thing to achieve; a dream is about who you want to become, what you want to have made, what you want your life to have meant.",
            "Support for the version of your dream that's convenient for the relationship isn't support for your dream.",
            "Being left alone to pursue something isn't the same as being backed in it. Non-interference is not support.",
            "If you've never told them, score honestly and note that the gap may be disclosure rather than rejection."
          ],
          honesty:
            "People protect their partner by scoring this generously. It's the most diagnostic item in the section — score it straight.",
          gutCheck:
            "Could they state your deepest life dream in their own words? And do they act like they want it for you?"
        },
        contextNote: (profile) => {
          let note = "";
          if (profile.flags && profile.flags.highWorkload) {
            note += "Founders and people carrying several ventures often score this low in a particular way: the partner knows the work but has never been told what it's FOR. Before deciding they don't support the dream, check whether it's ever been articulated to them rather than just enacted in front of them. ";
          }
          if (profile.flags && profile.flags.contemplativePractice) {
            note += `Where a ${profile.flags.contemplativePractice} practice is central to how you understand your life, the dream layer includes it — and spiritual or contemplative direction is one of the most commonly unspoken dreams in a partnership. Include it when you score. `;
          }
          if (!note) note = "Include the dreams you've never said out loud — and note whether that's the actual gap.";
          return note.trim() + situationLine(profile);
        }
      },
      {
        id: "sm_symbolic",
        text: "We rarely do anything together that feels special or symbolic as a couple.",
        type: "scale5",
        reverse: true,
        optionMeanings: {
          1: "Strongly disagree — plenty that feels meaningfully ours.",
          2: "Disagree — we have symbolic things.",
          3: "Mixed — some, thinly.",
          4: "Agree — very little feels symbolic.",
          5: "Strongly agree — nothing does."
        },
        guide: {
          howToDecide:
            "Reverse-scored: agreement is the deficit signal. Symbols are the things that carry meaning past their literal content — a place, a date, an object, a phrase that means something only to you two.",
          why:
            "Symbols are how a couple builds a culture rather than an arrangement. Gottman also uses the word in a second sense worth checking: what home means, what money means, what sex means, what independence means. Partners frequently use the same word for genuinely different things, and that mismatch is a common source of conflict that never gets named because both sides assume they're talking about the same thing.",
          distinguish: [
            "Expense is irrelevant. A ten-year-old private joke can carry more symbolic weight than an anniversary trip.",
            "Inherited traditions (their family's, yours) aren't automatically yours as a couple, though they can become so.",
            "If you're unsure, test the second sense: would you and your partner define ‘home’ the same way?"
          ],
          honesty:
            "Agreeing here is common in busy periods and is very fixable — it's among the lowest-cost things to change.",
          gutCheck:
            "Is there anything that would mean nothing to anyone else and a lot to you two?"
        },
        contextNote: null
      }
    ]
  },

  /* ════════════════════════════════════════════════════════════════════════
   * TRUST  —  THE FULLY-BUILT TEMPLATE SECTION
   * Every field a section/item can carry is populated here. Copy this shape
   * to build any other section.
   * ════════════════════════════════════════════════════════════════════════*/
  {
    id: "trust",
    title: "Trust",
    term: "Betrayal",
    intro:
      "Trust is one of the two weight-bearing walls of the Sound Relationship House. These items ask whether you believe your partner has your back and acts in your interest — not just whether they're loyal, but whether you can count on them.",
    items: [
      {
        id: "trust_shattered",
        text: "My trust in this relationship has been seriously shattered.",
        type: "scale5",
        reverse: true,
        optionMeanings: {
          1: "Trust is intact. Nothing has shattered it.",
          2: "Trust is largely intact — minor scrapes, nothing shattering.",
          3: "Trust is mixed — significantly affected, but you wouldn't call it shattered.",
          4: "Trust has been seriously shattered — an event or pattern produced real damage.",
          5: "Trust has been seriously shattered in a deep, sustained way."
        },
        guide: {
          howToDecide:
            "The word ‘shattered’ is doing heavy work — not everyday letdowns, but trust broken substantially by an event, a pattern, or an accumulation that crossed a threshold. ‘Seriously’ doubles the bar.",
          why:
            "This is the gate to the trust cluster. The rest of the section means different things depending on which side of this gate you're on. Trust can be shattered by affairs (sexual or emotional), financial betrayal, chronic lying, public humiliation, promise-breaking patterns, withdrawal of commitment, or sustained contempt — and sometimes by accumulation, where many small breaches finally cross a line.",
          distinguish: [
            "Shattered trust typically shows up as hypervigilance, an inability to relax around your partner, loss of felt safety, active doubt about their loyalty or honesty, intrusive thoughts about the breach, and losing the assumption that they're on your team.",
            "A single fresh wound can feel like shattering — if the global pattern is ‘damaged not shattered’, answer Neutral or Disagree."
          ],
          honesty:
            "People underreport here out of loyalty, hope of rebuilding, or denial about how serious the damage is. The assessment needs the honest answer to be useful.",
          gutCheck:
            "Are several of those signals — hypervigilance, lost safety, intrusive doubt — present at sustained levels? Yes → Agree/Strongly Agree. None → Strongly Disagree. Some, milder, partly worked through → Neutral/Disagree."
        },
        contextNote: null
      },
      {
        id: "trust_left_alone",
        text: "Often, when I really need to turn towards my partner for emotional support, I am disappointed and left alone.",
        type: "scale5",
        reverse: true,
        optionMeanings: {
          1: "Your partner shows up consistently when you need support. Reliably there.",
          2: "Your partner generally shows up, with occasional lapses. The pattern is reliable.",
          3: "Mixed — sometimes there, sometimes not. Inconsistent.",
          4: "Your partner often doesn't show up when you need them. Frequently disappointed and left alone.",
          5: "Your partner consistently fails to show up in moments of real need. A pattern."
        },
        guide: {
          howToDecide:
            "The bar is ‘often, when I really need’ — the moments of real emotional need, not everyday moments. This tests whether your partner is reliably present when it matters most.",
          why:
            "This measures emotional reliability — Gottman's core trust question, ‘Can I count on you to be there for me?’ When the answer is ‘often not’, trust is structurally damaged even with no classic betrayal: you're partnered but emotionally alone when it counts. ‘Disappointed’ = the gap between expectation and reality; ‘left alone’ = the felt abandonment in the moment of need.",
          distinguish: [
            "A partner can be warm in everyday moments and still fail in crisis (gets overwhelmed, withdraws, gets logical). This item is about the crisis dimension specifically.",
            "Distinct from everyday listening / warmth / effort items — those are low-stakes; this is high-stakes."
          ],
          honesty:
            "One of the most quietly-carried experiences in long relationships, and one people most underreport. Underreporting removes the most important signal.",
          gutCheck:
            "When you bring real emotional need — hurting, scared, struggling — how often does it go well vs. leave you alone? Consistently well → Strongly Disagree. Consistently disappointing → Strongly Agree."
        },
        contextNote: null
      },
      {
        id: "trust_refused",
        text: "There have been times when my partner refused to discuss an emotional event that was very important to me.",
        type: "scale5",
        reverse: true,
        optionMeanings: {
          1: "Your partner doesn't refuse — they engage when these things come up.",
          2: "Refusal is rare — a few small instances at most, not a pattern.",
          3: "Some instances, but not a consistent pattern.",
          4: "Real, notable times when your partner refused to discuss something very important to you.",
          5: "Refusing emotionally important conversations is a sustained pattern."
        },
        guide: {
          howToDecide:
            "The bar is ‘refused’ — active refusal, not just failed listening: ‘I'm not talking about this’, walking out, going silent, changing the subject and not returning, deflecting with anger, postponing indefinitely. Note the ‘there have been times’ framing lowers the bar — even notable instances lean toward Agree.",
          why:
            "Refusing to engage with what matters is a structural breach of the partnership contract, and it's stonewalling — one of the Four Horsemen. As a pattern it erodes trust and removes the relationship's function as a place emotional events can be processed together.",
          distinguish: [
            "Refusal ≠ inadequacy. A partner who tries and does it poorly is in a different category than one who won't engage at all.",
            "Refusal ≠ flooding. A partner who steps away to regulate and comes back is coping. One who steps away and never re-engages has crossed into refusal."
          ],
          honesty:
            "Underreported because naming the refusal pattern makes it real and feels accusatory. The honest read is what makes the diagnostic useful.",
          gutCheck:
            "Can you bring to mind specific important events your partner refused to discuss? Notable instances → Agree. Repeatedly → Strongly Agree. Rarely/never → Disagree/Strongly Disagree."
        },
        contextNote: null
      },
      {
        id: "trust_not_important",
        text: "Sometimes, I don't feel important to my partner.",
        type: "scale5",
        reverse: true,
        optionMeanings: {
          1: "You consistently feel important to your partner.",
          2: "You generally feel important, with rare moments of doubt.",
          3: "Mixed — sometimes you feel important, sometimes you don't.",
          4: "Real, recurring moments when you don't feel important to your partner.",
          5: "Feeling unimportant to your partner is a sustained pattern."
        },
        guide: {
          howToDecide:
            "‘Sometimes’ sets a low frequency bar — it's asking whether feeling secondary, deprioritised, taken for granted or overlooked happens recurrently enough to be real.",
          why:
            "Gottman treats ‘mattering’ as a core dimension of trust: ‘Do I matter to you the way I'm supposed to?’ Chronic deprioritisation is a form of betrayal in his broader sense (failing to act in the relationship's interest), even with no classic betrayal — when a partner is consistently ranked below work, family, friends or hobbies.",
          distinguish: [
            "Not feeling important ≠ not feeling loved. A partner can love you and still not treat you as important.",
            "Not feeling important ≠ feeling disrespected. Mattering is its own dimension."
          ],
          honesty:
            "Deliberately softened wording (‘sometimes’) lowers the loyalty cost of an honest answer — use that. If sometimes you don't feel important even though usually you do, it's worth naming.",
          gutCheck:
            "In your partner's hierarchy of attention, time and priority, are you consistently where you should be (central), or are there recurring moments you're not? Consistently central → Disagree/Strongly Disagree. Recurring moments → Agree/Strongly Agree."
        },
        contextNote: null
      },
      {
        id: "trust_lies",
        text: "I think my partner lies to me.",
        type: "scale5",
        reverse: true,
        optionMeanings: {
          1: "You believe your partner is honest with you.",
          2: "Largely honest — maybe rare small instances, not a pattern.",
          3: "Mixed — some real doubt about honesty, but not certain.",
          4: "You believe your partner lies to you. Dishonesty is part of how they communicate.",
          5: "You believe your partner lies to you regularly and substantially."
        },
        guide: {
          howToDecide:
            "A binary-feeling question in a 5-point dress; the scale captures degree. Crucially it asks about your BELIEF, not what you can prove — outright lies, lies of omission, lies about feelings, whereabouts, money, or gaslighting all count.",
          why:
            "One of the items most strongly tied to ‘trust has been shattered’. If you believe your partner lies — even unconfirmed — that belief itself degrades trust, because trust requires the felt sense of honesty.",
          distinguish: [
            "Suspicion is data — sustained suspicion is at least Neutral, probably Agree. The item asks what you think, not what you can prove.",
            "Social-pleasantry ‘white’ lies only → closer to Disagree.",
            "Past lies that were genuinely repaired → calibrate to the current state."
          ],
          honesty:
            "Heavily underreported — it feels accusatory to write down. But lying is one of the highest-signal items; underreporting hides exactly what a clinician most needs.",
          gutCheck:
            "Across money, time, communications, feelings, history — do you experience your partner as fundamentally honest, or as lying? Trust your gut; it's usually clearer than people expect."
        },
        contextNote: null
      },
      {
        id: "trust_deceitful",
        text: "I think my partner can be deceitful with me in many ways.",
        type: "scale5",
        reverse: true,
        optionMeanings: {
          1: "You don't experience your partner as deceitful — transparent and honest.",
          2: "Largely non-deceitful, with rare minor exceptions.",
          3: "Mixed — some real concern about deceit, not certain.",
          4: "You think your partner is deceitful in real ways.",
          5: "Deceitful in many ways — a substantial pattern."
        },
        guide: {
          howToDecide:
            "Broader than lying. Deceit includes strategic withholding, misleading framing, hidden behaviours/accounts, manipulation, public-vs-private inconsistency, strategic ambiguity, and hidden agendas. ‘In many ways’ asks whether it shows up across multiple dimensions (money, time, communications, intentions, behaviour, history).",
          why:
            "Triangulates the honesty dimension of trust from a second angle. Some patterns of deceit involve no clear lies (omission, hidden behaviour, gaslighting) and would be missed by the lying item alone.",
          distinguish: [
            "Both-low or both-high (with the lying item) are the most internally consistent patterns.",
            "Lies-low + this-high is possible: no outright false statements, but deceit via omission/manipulation/hidden behaviour."
          ],
          honesty:
            "Same underreporting pressure as the lying item — putting deceit on the record feels heavy, but the honest answer is what makes the cluster diagnostic.",
          gutCheck:
            "Across the full range of how your partner relates to you, do you experience them as fundamentally transparent, or deceitful across one or more dimensions?"
        },
        contextNote: null
      },
      {
        id: "trust_wounds",
        text: "There are some wounds my partner has created that can never fully heal between us.",
        type: "scale5",
        reverse: true,
        optionMeanings: {
          1: "No such wounds. Whatever happened has healed or will heal.",
          2: "Minor lasting marks at most — nothing you'd call unhealable wounds.",
          3: "Maybe some lasting damage, but you're uncertain whether it's permanent.",
          4: "There are wounds your partner created that you believe will never fully heal.",
          5: "Significant, lasting wounds that will never fully heal. The damage is permanent."
        },
        guide: {
          howToDecide:
            "‘Wounds’ means significant injury, not everyday hurts. ‘Can never fully heal’ means you've made a felt assessment that the damage is permanent — not merely that it hasn't healed yet.",
          why:
            "The belief that wounds won't heal materially changes what's possible: limited investment in repair, sustained vigilance, a lowered trust ceiling, and acceptance of the relationship WITH the wound rather than as it would be without it. (Gottman's research suggests some wounds heal more than partners expect, especially with structured betrayal-recovery work — but many leave lasting marks.)",
          distinguish: [
            "Current pain that you believe can heal ≠ a permanent wound — that's just hurt.",
            "An ongoing breach ≠ a wound that can't heal — it's a breach that hasn't healed because it's still happening.",
            "Resentment, which can dissolve, ≠ permanent damage."
          ],
          honesty:
            "People underreport out of hope — not wanting to ‘write the permanence into existence’. Naming it doesn't make it permanent; the item just asks whether you've made the assessment. If the wound is fresh and you're unsure, Neutral is honest.",
          gutCheck:
            "Imagine the worst things that have happened here. Can they fully heal with time and work, or do you carry the felt sense of permanent damage?"
        },
        contextNote: null
      }
    ]
  },

  /* ════════════════════════════════════════════════════════════════════════
   * STABILITY & ENVIRONMENT
   * This section demonstrates the PER-PARTICIPANT CONTEXT NOTE. Several items
   * carry contextNote(profile) — the text changes with who is logged in.
   * ════════════════════════════════════════════════════════════════════════*/
  {
    id: "stability",
    title: "Stability & Environment",
    term: "Shared Meaning System",
    intro:
      "The home is meant to be the recovery zone — the place partners restore from outside stress. These items ask about the felt quality of your shared life, and several adapt to your own situation.",
    items: [
      {
        id: "env_chaotic",
        text: "Our home life together feels chaotic.",
        type: "tf",
        reverse: true,
        optionMeanings: {
          1: "True — your home life together feels chaotic.",
          0: "False — your home life together doesn't feel chaotic."
        },
        guide: {
          howToDecide:
            "Asks about the experiential texture of your SHARED domestic life — not a busy schedule, a messy house, or intense work. Chaos = disorganisation with no rhythm, emotional volatility, missing rituals, constant urgency, partners pulling in different directions, a home that isn't a place of stability or restoration.",
          why:
            "When home itself becomes a source of stress, the relationship loses one of its primary functions — the safe harbour. Chaotic home life correlates with elevated cortisol, less recovery between stressors, and worse repair after conflict. It's also a Shared Meaning indicator: rituals are the containers that prevent chaos.",
          distinguish: [
            "Busy ≠ chaotic; a high-density life with strong structure isn't chaotic.",
            "Stressful ≠ chaotic; stress can exist in an orderly life.",
            "Your partner's individual chaos ≠ home-life chaos unless it spills into the shared life."
          ],
          honesty:
            "Some answer False out of pride in coping; others answer True out of normal-range domestic stress. The question is the integrated felt quality of the shared home life as it is right now.",
          gutCheck:
            "When you sit in your home life as it is, does it feel like a stable, settled place, or like ongoing chaos?"
        },
        contextNote: (profile) => {
          let note = "This item is specifically about the home life BETWEEN you and your partner — not your overall life load.";
          if (profile.flags && profile.flags.highWorkload) {
            note += " You carry high cognitive load by design (multiple ventures / demanding work), so your overall life may be intense even when home is steady. Separate the two: is home a refuge from that intensity, or part of the chaos?";
          }
          return note + situationLine(profile);
        }
      },
      {
        id: "env_disorder",
        text: "There is a sense of disorder in our life together.",
        type: "tf",
        reverse: true,
        optionMeanings: {
          1: "True — there is a sense of disorder in your life together.",
          0: "False — there is not a sense of disorder."
        },
        guide: {
          howToDecide:
            "Paired with the chaos item but broader: chaos is about felt intensity, disorder is about STRUCTURE — the presence or absence of ordered patterns. A home can feel disordered without feeling chaotic (low-grade lack of structure, decisions deferred, rhythms never established, things slipping through cracks).",
          why:
            "Gottman frames disorder as a marker of an underdeveloped or eroded Shared Meaning System — who does what, when meals happen, how decisions get made, how holidays are organised. Those structures ARE the order; when absent or contested, the felt experience is disorder, even when nothing is overtly wrong.",
          distinguish: [
            "If you answered True to chaos, this is likely True too — chaos almost always includes disorder.",
            "You can answer False to chaos but True here — order can be absent without things feeling acutely chaotic."
          ],
          honesty:
            "Low-key but useful — disorder often goes unnamed because it produces no overt distress, just a chronic background sense that nothing is settled in how you live together.",
          gutCheck:
            "Picturing the rhythms, rituals, roles and the way things are organised between you — does it feel ordered, or is ‘disorder’ the more accurate word?"
        },
        contextNote: null
      },
      {
        id: "env_function",
        text: "I am not able to function well in my own life while I am in this relationship.",
        type: "tf",
        reverse: true,
        optionMeanings: {
          1: "True — you can't function well in your own life while in this relationship.",
          0: "False — you can function well in your own life alongside the relationship."
        },
        guide: {
          howToDecide:
            "A heavy item. Not whether the relationship is hard or stressful — whether your capacity to function in the REST of your life (work, health, friendships, goals, sense of self) has been degraded by what's happening in the relationship.",
          why:
            "Gottman tracks this as a marker of a relationship crossing from difficult into destructive. Relationships can be hard and still net-positive; but when distress spills into your work, health, friendships, goals or identity, the relationship has moved from a challenge you manage to a force degrading your life. Paired with separation ideation, loneliness, and disappointment, a True here is a clinical-level signal.",
          distinguish: [
            "Consider each domain: work (output, focus), health (sleep, stress, energy), friendships (withdrawal), goals (on track or bandwidth pulled away), sense of self (still you, or hollowed out).",
            "Don't overreport on one hard week — the honest question is the sustained pattern over several months."
          ],
          honesty:
            "Often carried silently — many high-functioning people don't notice how much capacity the relationship consumes until they answer this honestly.",
          gutCheck:
            "Is your individual life functioning at the level you'd expect of yourself, or visibly diminished by the energy this relationship takes?"
        },
        contextNote: (profile) => {
          let note = "";
          if (profile.flags && profile.flags.highWorkload) {
            note += "You operate at high intensity and demand a lot of yourself — the question isn't whether you're still going (you are), it's whether you're going AS WELL as you would be without the relationship's weight. ";
          }
          if (profile.flags && profile.flags.neurodivergent) {
            note += `Your ${profile.flags.neurodivergent} pattern already shapes how you focus and switch tasks; ask whether the relationship is adding drag on top of that, not whether the baseline is hard. `;
          }
          if (profile.flags && profile.flags.contemplativePractice) {
            note += `Include your ${profile.flags.contemplativePractice} practice in the check — is the relationship a support or a drag on it? `;
          }
          if (!note) note = "Compare where you are now to where you'd be without this drag — that gap is the honest calibration.";
          return note.trim() + situationLine(profile);
        }
      },
      {
        id: "env_unplanned",
        text: "Unplanned negative events keep happening to us.",
        type: "tf",
        reverse: true,
        optionMeanings: {
          1: "True — unplanned negative events keep happening to you.",
          0: "False — unplanned negative events are not a recurring feature."
        },
        guide: {
          howToDecide:
            "Bar is ‘keep happening’ (recurring, not occasional), ‘unplanned’ (surprised you), and ‘negative’ (set you back). A hard year with notable events isn't the same as a pattern.",
          why:
            "Sounds external but functions as a relational indicator: it captures external stress load, your coping capacity (strong systems experience the same events as recoverable), whether ‘unplanned’ events are actually predictable consequences of unaddressed patterns, and the besieged psychological state chronic exposure produces.",
          distinguish: [
            "Anticipated stressors (a planned move, a known business challenge) aren't ‘unplanned’.",
            "Internal relationship problems (fights, disconnection) are relational dynamics captured elsewhere — this is about external/circumstantial hits."
          ],
          honesty:
            "If you find yourselves often saying ‘what's going wrong now’, that's True. A normal share of contained difficulties is False.",
          gutCheck:
            "In the last 6–12 months, has your shared life had a recurring pattern of genuinely unplanned negative hits — health, family, financial, relational?"
        },
        contextNote: (profile) => {
          if (profile.flags && profile.flags.highWorkload) {
            return "Running ventures comes with expected operational volatility — outages, failures, financial pressure. Those are largely EXPECTED features of your environment, not the ‘unplanned negative events’ this item means. Ask whether, beyond that expected volatility, your shared life keeps getting hit by genuinely unplanned events." + situationLine(profile);
          }
          return situationLine(profile).trim() || null;
        }
      },
      {
        id: "env_adapt_change",
        text: "We always have to adapt to changing circumstances.",
        type: "tf",
        reverse: true,
        optionMeanings: {
          1: "True — you always have to adapt to changing circumstances.",
          0: "False — you don't constantly have to adapt to changing circumstances."
        },
        guide: {
          howToDecide:
            "Bar is ‘always’ — perpetual adjustment as the default mode of your shared life, not the occasional adaptation every couple does.",
          why:
            "Pairs with chaos, disorder and unplanned-events to map your operational environment. Constant adaptation is exhausting — each adjustment spends cognitive/emotional resources that then aren't available for building the bond. A subtler signal: WHO is doing the adapting (constant one-sided adapting is harder).",
          distinguish: [
            "Operational complexity (running projects) ≠ constant adaptation if there's structure around it.",
            "Both partners growing/evolving ≠ constant adaptation, though it can feel similar.",
            "Healthy flexibility in a stable relationship isn't this item."
          ],
          honesty:
            "If you answered True to chaos/disorder/unplanned-events, this likely clusters True as well.",
          gutCheck:
            "Does your shared life have stable ground beneath it, or does it feel like you're always adapting to the next thing?"
        },
        contextNote: (profile) => {
          if (profile.flags && (profile.flags.highWorkload || profile.flags.neurodivergent)) {
            let n = "Your individual life requires adaptation by design";
            if (profile.flags.neurodivergent) n += ` (${profile.flags.neurodivergent} surfaces new opportunities and problems constantly)`;
            n += ". The honest question is whether the SHARED life with your partner is in perpetual adjustment mode, beyond the natural adaptation of each of your individual lives.";
            return n + situationLine(profile);
          }
          return situationLine(profile).trim() || null;
        }
      }
    ]
  },

  /* ════════════════════════════════════════════════════════════════════════
   * COMMITMENT  (second weight-bearing wall)
   * ════════════════════════════════════════════════════════════════════════*/
  {
    id: "commitment",
    title: "Commitment",
    term: "Nurturing gratitude",
    intro:
      "Commitment is the foundational floor of the Sound Relationship House — the basic assumption that you're both in for the long term and not shopping for alternatives. Several of these items ask about YOUR behaviour, not your partner's.",
    items: [
      {
        id: "commit_stay",
        text: "I feel confident that I will stay in this relationship even if we go through hard times.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "You don't feel confident you'll stay. Hard times might end it.",
          2: "Weak confidence — significant doubt about staying through hard times.",
          3: "Uncertain — mixed feelings about your own commitment to stay.",
          4: "You feel confident you'll stay through hard times.",
          5: "Deeply confident — your commitment to stay is unshakable."
        },
        guide: {
          howToDecide:
            "About YOUR felt confidence in your own future behaviour — not whether you want to or plan to stay, but whether you feel confident you WILL, even when things get hard. The ‘even if we go through hard times’ qualifier is a stress-test.",
          why:
            "Commitment sits at the very bottom of the Sound Relationship House, below Trust. It's the structural element that determines how much weight the relationship can carry. It is not the same as love or current satisfaction.",
          distinguish: [
            "Confidence about staying ≠ love, and ≠ current satisfaction.",
            "Your own commitment ≠ trusting your partner's commitment (a different item)."
          ],
          honesty:
            "People answer Agree out of loyalty or aspiration when the truth is closer to Neutral. If you've leaned to deficit on separation ideation, shattered trust, or unhealable wounds, high confidence here may not be internally consistent — and surfacing that is the point.",
          gutCheck:
            "Picture significantly harder times than you've faced — financial crisis, health crisis, loss. Do you feel confident you'd stay through it?"
        },
        contextNote: null
      },
      {
        id: "commit_meet_needs",
        text: "When my partner is feeling bad, I am willing to meet their needs.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Not willing to meet your partner's needs when they're feeling bad.",
          2: "Limited willingness — you do it sometimes, with significant reluctance.",
          3: "Mixed — sometimes willing, sometimes not.",
          4: "Willing to meet your partner's needs when they're feeling bad.",
          5: "Deeply willing — consistently oriented toward meeting their needs in hard moments."
        },
        guide: {
          howToDecide:
            "A self-assessment about your WILLINGNESS — your orientation and desire, not whether you execute perfectly. When your partner is sad, sick, scared or hurting, is your instinct to turn toward them?",
          why:
            "Gottman defines commitment as acting in the relationship's interest, especially in hard moments. Willingness to meet a suffering partner's needs is one of its most direct behavioural expressions. This item maps YOUR contribution to the relationship's reliability (many earlier items asked whether your partner shows up for you).",
          distinguish: [
            "Willing ≠ capable. Capacity gaps (don't know what to do, get overwhelmed) differ from willingness gaps (don't want to be on the hook).",
            "Willing ≠ liking it. You can be willing even when it's hard for you.",
            "Willingness isn't contingent on your partner being good to you — answer your current willingness regardless of what's broken."
          ],
          honesty:
            "Don't inflate (social-desirability pull to be ‘the good partner’) and don't deflate. Chronic depletion eroding your willingness is real data, not a moral failing → Neutral/Disagree, not auto-Agree.",
          gutCheck:
            "When your partner is genuinely suffering, what's your honest internal posture — drawn toward them, mixed, or reluctant/depleted?"
        },
        contextNote: null
      },
      {
        id: "commit_no_threat",
        text: "I do not threaten to leave my partner when we fight.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "You DO threaten to leave when you fight — frequently or consistently.",
          2: "You sometimes threaten to leave when you fight.",
          3: "You've done it occasionally — not a clear pattern.",
          4: "You generally don't threaten to leave when you fight.",
          5: "You do not threaten to leave. This is something you don't do."
        },
        guide: {
          howToDecide:
            "Read the negative framing carefully: Strongly Agree = a strong ‘no threats’ position; Strongly Disagree = threats are part of how you fight. Includes direct (‘I want a divorce’), indirect (‘maybe we shouldn't be together’), behavioural (packing a bag, leaving), conditional, and tactical threats.",
          why:
            "Gottman found threatening to leave during conflict is one of the most corrosive behaviours regardless of sincerity: it activates abandonment fear, treats the relationship as conditional on a fight outcome, erodes trust over time, and signals weak commitment. Committed partners keep the relationship itself off the table during ordinary conflict.",
          distinguish: [
            "Sincere vs. tactical doesn't matter — both count. A threat you ‘didn't really mean’ still counts.",
            "Distinct from having once suggested separation in a calm moment — this is about threats as a conflict tactic."
          ],
          honesty:
            "Social-desirability pressure is strong. If you've done this — even occasionally, even in heat, even regretting it — Disagree/Strongly Disagree is more honest than Agree.",
          gutCheck:
            "During fights, has leaving been used by you as part of the conflict, explicitly or implicitly? Sometimes → Disagree. A pattern → Strongly Disagree. Never → Agree/Strongly Agree."
        },
        contextNote: null
      },
      {
        id: "commit_committed",
        text: "I am committed to this relationship.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "You are not committed to this relationship.",
          2: "Your commitment is weak or significantly diminished.",
          3: "You're genuinely uncertain about your commitment.",
          4: "You are committed.",
          5: "You are deeply committed."
        },
        guide: {
          howToDecide:
            "The most direct commitment question in the assessment. Beyond the specifics of the current period, what is your overall commitment to remaining in this relationship and acting in its interest?",
          why:
            "Commitment in Gottman's sense: you're in this (not holding exit as a standing option), you nurture gratitude rather than resentment, you don't shop for alternatives, and you invest in a shared future. A Strongly Agree — even in a struggling relationship — is the foundation repair work builds on. A Disagree withdraws that foundation.",
          distinguish: [
            "Not measuring whether you SHOULD be committed, whether it's rational, whether your partner deserves it, or whether you love them enough — only what your commitment actually IS.",
            "It measures a stable posture (‘I'm in this’ / ‘I'm not sure’ / ‘I'm not’), not today's mood."
          ],
          honesty:
            "Strong pressure to inflate (loyalty, hope, identity). If this answer doesn't match the pattern of your other answers, that mismatch is itself worth noticing.",
          gutCheck:
            "Sitting with your underlying posture toward the relationship, what's the honest descriptor — ‘I'm in this’, ‘I'm uncertain’, or ‘I'm not in this anymore’?"
        },
        contextNote: null
      },
      {
        id: "commit_loved",
        text: "I make sure that my partner feels loved by me.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "You don't actively make sure your partner feels loved.",
          2: "You do some of this, but inconsistently or with limited effort.",
          3: "Mixed — sometimes you make the effort, sometimes not.",
          4: "You regularly make sure your partner feels loved.",
          5: "You consistently, actively work at making sure your partner feels loved."
        },
        guide: {
          howToDecide:
            "‘Make sure’ is the key phrase — not whether you love your partner, but whether you actively work so your love actually LANDS in them, adjusting how you express it to match what makes them feel loved.",
          why:
            "Active expression that ensures the partner feels loved is one of the most concrete behavioural expressions of commitment. Many couples love each other while neither actively ensures the other feels it — producing parallel ‘I love them but I don't feel loved’ experiences.",
          distinguish: [
            "Making sure they feel loved ≠ being affectionate (one channel), ≠ meeting needs (functional), ≠ loving them (internal state).",
            "The item is about producing the experiential OUTCOME of love in your partner."
          ],
          honesty:
            "Strong pull to answer Agree to feel like a loving partner — but also don't deflate if you genuinely do this even while other dimensions struggle.",
          gutCheck:
            "Over recent months, do you regularly do specific things — words, gestures, attention — intentionally shaped so they land as love for YOUR partner?"
        },
        contextNote: null
      },
      {
        id: "commit_no_compare",
        text: "After an argument, I don't usually think about being happier with someone else.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "After arguments you DO usually think about being happier with someone else — a regular pattern.",
          2: "You sometimes think about being happier with someone else after arguments.",
          3: "Occasionally — not clearly a pattern.",
          4: "You generally don't think about being happier with someone else after arguments.",
          5: "Your mind doesn't go to alternative partners after arguments."
        },
        guide: {
          howToDecide:
            "Negative framing — Strongly Agree = your mind stays with the current relationship after a fight. Includes direct (‘I'd be happier with someone who didn't do this’), comparative, fantasy, and regret-comparison thoughts. ‘Usually’ — occasional flickers aren't the same as a pattern.",
          why:
            "Gottman calls this negative comparison / failing to nurture gratitude — one of the strongest predictors of dissolution even with no affair. Each rehearsal of ‘I'd be happier with someone else’ reinforces treating the relationship as inferior to alternatives and hollows out commitment. The inverse — nurturing gratitude after conflict — builds it.",
          distinguish: [
            "Thinking about it ≠ having an affair — this is about cognition, not behaviour.",
            "Wondering if you'd be happier ALONE is a different ideation than happier with SOMEONE ELSE."
          ],
          honesty:
            "Quietly carried; exposing it feels uncomfortable. Named, the pattern is workable; hidden, it keeps eroding commitment.",
          gutCheck:
            "After a fight, where does your mind usually go — working through it with the current relationship, or imagining alternatives?"
        },
        contextNote: null
      },
      {
        id: "belief_move_on",
        text: "I believe that people should put bad experiences behind them and just get on with life.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Bad experiences need to be worked through and processed, not just dropped.",
          2: "You generally don't believe in just-get-on-with-it; bad experiences usually need attention.",
          3: "Mixed view — depends on the experience.",
          4: "You generally believe people should put bad experiences behind them and move on.",
          5: "Strong belief in putting bad experiences behind you and moving forward."
        },
        guide: {
          howToDecide:
            "A BELIEF item, not a relationship-state item — your general philosophy: process-and-integrate vs. put-it-behind-you-and-move-on. Answer your actual default across life, not what you think you should believe.",
          why:
            "A strong put-it-behind-you orientation can be healthy (releasing minor hurts, resilience) or unhealthy (‘premature forgiveness’ / bypassing serious breaches that need processing — which produces the unhealable-wounds dynamic). The opposite extreme can tip into rumination and grudge-holding. The item maps your orientation because it shapes how repair and trust work for you.",
          distinguish: [
            "Notice tension with earlier answers: if you said some wounds can't heal but also strongly believe in just moving on, that's worth seeing.",
            "Most people sit in the middle (some things processed, some released) — that's Neutral."
          ],
          honesty:
            "Answer what your operating belief actually is, not the aspirational one.",
          gutCheck:
            "When someone is still affected by a past bad experience, is your instinct ‘process it more fully’ (Disagree side) or ‘put it behind them and move on’ (Agree side)?"
        },
        contextNote: (profile) => {
          if (profile.flags && profile.flags.contemplativePractice) {
            return `Your ${profile.flags.contemplativePractice} practice may have its own teachings about suffering, attachment and the past that pull against a simple ‘just move on’. Answer your CURRENT operating belief — the aspirational direction and the present default can both be real and different.` + situationLine(profile);
          }
          return situationLine(profile).trim() || null;
        }
      },
      {
        id: "belief_dwelling",
        text: "There is not much point in dwelling on your inner feelings.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "You strongly believe there's great value in attending to inner feelings.",
          2: "You generally believe inner feelings deserve attention; dwelling is worthwhile.",
          3: "Mixed — some value, some limits.",
          4: "You generally believe there isn't much point in dwelling on inner feelings.",
          5: "You strongly believe dwelling on inner feelings is unproductive."
        },
        guide: {
          howToDecide:
            "Another BELIEF item. ‘Dwelling’ means sustained attention, not just noticing. The orientation: feelings are information worth processing vs. feelings are transient and focusing on them amplifies them.",
          why:
            "Maps onto Gottman's emotion-coaching vs. emotion-dismissing philosophies. Emotion-coaching partners can stay with each other's emotional experience and do repair (which needs sustained engagement with difficult feeling). Emotion-dismissing isn't pathological — it correlates with action-orientation and resilience — the issue is whether it leaves you unable to engage when engagement is needed.",
          distinguish: [
            "Pairs with the previous item: both-Agree = strong action/forward orientation (dismissing); both-Disagree = strong processing orientation (coaching).",
            "Neither orientation is universally correct."
          ],
          honesty:
            "If you carry strong feelings (loneliness, disappointment, wounds) but believe in not dwelling, note that tension — feelings registered but not processed can produce their own suffering.",
          gutCheck:
            "If a close friend said they were spending real time dwelling on their inner feelings, is your instinct ‘that's valuable work’ (Disagree side) or ‘that's not productive, get on with things’ (Agree side)?"
        },
        contextNote: (profile) => {
          let parts = [];
          if (profile.flags && profile.flags.neurodivergent) parts.push(`your ${profile.flags.neurodivergent} pattern and forward-motion default`);
          if (profile.flags && profile.flags.contemplativePractice) parts.push(`a contemplative practice (${profile.flags.contemplativePractice}) that values sustained interior attention`);
          if (parts.length) {
            return `Your honest answer likely sits between ${parts.join(" and ")}. Your operational default and your aspirational practice can point in different directions — the item asks about your CURRENT belief.` + situationLine(profile);
          }
          return situationLine(profile).trim() || null;
        }
      }
    ]
  },

  /* ════════════════════════════════════════════════════════════════════════
   * SEXUAL INTIMACY  (binary-pair items — proves the third response type)
   * ════════════════════════════════════════════════════════════════════════*/
  {
    id: "sex",
    title: "Sexual Intimacy",
    term: "Desire discrepancy",
    intro:
      "These items use a forced binary. Answer the honest read — diagnostic value here is high.",
    items: [
      {
        id: "sex_talk",
        text: "Being able to talk about sex, or talk about sexual problems…",
        type: "binary",
        reverse: false,
        options: [
          { value: 1, label: "…is NOT a serious issue between us.",
            meaning: "You can talk about sex when needed — not necessarily comfortably or constantly, but the capacity is there." },
          { value: 0, label: "…IS a serious issue between us.",
            meaning: "Talking about sex itself is a problem — it gets shut down, avoided, defensive, hurtful, or doesn't happen at all." }
        ],
        guide: {
          howToDecide:
            "The bar is CAPACITY, not comfort. Can you raise sexual topics — preferences, frustrations, problems, desires — and have a real conversation that doesn't blow up or shut down? Yes → first option. Consistently fails → second.",
          why:
            "Possibly the single most important sex item — a meta-item. Sexual communication is one of the strongest predictors of long-term sexual satisfaction (stronger than frequency, skill, or initial compatibility), because it's the only mechanism that lets a sex life adapt as bodies, desire and life-load change over decades. If communication works, the other sex items become workable; if it doesn't, even fixable problems stay stuck.",
          distinguish: [
            "Not talking about sex ≠ not being able to. A couple that simply hasn't lately but could → first option.",
            "Discomfort ≠ incapacity. Most people find it somewhat uncomfortable; the question is whether it can't happen productively.",
            "Avoidance after past attempts went badly → second option. One-sided capacity (one can, one can't/won't) is functionally broken → second."
          ],
          honesty:
            "One of the items most worth being honest on — the diagnostic value is high.",
          gutCheck:
            "If you needed to raise something about sex tomorrow — a frustration, desire, problem — could you, and would it go somewhere productive? Yes → first. No, or you'd avoid it → second."
        },
        contextNote: null
      },
      {
        id: "sex_frequency",
        text: "The frequency of sex…",
        type: "binary",
        reverse: false,
        options: [
          { value: 1, label: "…is NOT a problem between us.",
            meaning: "Whatever the frequency is, it isn't a source of tension for either of you." },
          { value: 0, label: "…IS a problem between us.",
            meaning: "How often you have sex is a live source of tension, disappointment or pressure." }
        ],
        guide: {
          howToDecide:
            "There is no correct frequency, and this item doesn't ask for one. It asks whether the frequency you have is causing a problem.",
          why:
            "Frequency is the dimension couples most often lead with and the one that most often turns out to be a symptom. Kept separate from the desire item deliberately: you can have a frequency problem with no desire mismatch at all — both of you want more, and life keeps eating it — which is a scheduling and energy problem rather than a relational one, and it responds to completely different interventions.",
          distinguish: [
            "Both wanting more and not getting it is a frequency problem without a discrepancy. That's the more tractable version.",
            "One wanting more than the other is desire discrepancy, which the next item covers — don't score it twice.",
            "A frequency that suits you both, however unusual it would look to anyone else, is not a problem."
          ],
          honesty:
            "Answer for whether it's causing friction, not for whether the number sounds respectable.",
          gutCheck:
            "Does the frequency itself generate tension, or is it just the number it is?"
        },
        contextNote: (profile) => {
          let note = "";
          if (profile.flags && profile.flags.highWorkload) {
            note += "Chronic depletion suppresses desire in a way that's physiological rather than relational, and it's easily misread as a problem with the relationship or with attraction. If the honest account is ‘we're both exhausted’, that's a different diagnosis with a different fix. ";
          }
          if (!note) note = "Separate ‘we both want more and life is in the way’ from ‘one of us wants more than the other’.";
          return note.trim() + situationLine(profile);
        }
      },
      {
        id: "sex_touch",
        text: "Everyday physical affection — touch, cuddling, casual contact…",
        type: "binary",
        reverse: false,
        options: [
          { value: 1, label: "…is alive between us.",
            meaning: "You touch each other easily and often outside of sex — it's a normal part of how you are together." },
          { value: 0, label: "…has largely stopped.",
            meaning: "Casual, non-sexual physical contact has faded or ceased." }
        ],
        guide: {
          howToDecide:
            "Non-sexual touch specifically: a hand in passing, sitting close, cuddling, contact that isn't going anywhere.",
          why:
            "The Checkup separates touch from sex because they come apart in both directions and each tells you something different. Everyday touch is the physical equivalent of turning toward — small, constant, and largely unnoticed until it stops. Its loss usually precedes sexual problems rather than following them, which makes it an earlier signal than anything in the sex cluster.",
          distinguish: [
            "Touch that's always an initiation isn't casual touch — if every contact is read as a proposition, that's the deficit this item measures.",
            "Cuddling and casual contact are distinct: some couples cuddle deliberately and never touch in passing.",
            "Score the ordinary week, not the affectionate exception."
          ],
          honesty:
            "One of the easiest to overrate, because the memory of being a physically easy couple persists long after the habit does.",
          gutCheck:
            "In an ordinary day, do you touch each other without it meaning anything in particular?"
        },
        contextNote: null
      },
      {
        id: "sex_desire",
        text: "Differences in sexual desire…",
        type: "binary",
        reverse: false,
        options: [
          { value: 1, label: "…are NOT a big issue in our relationship.",
            meaning: "Your desire levels are roughly aligned, or the gap doesn't create significant friction." },
          { value: 0, label: "…ARE a big issue in our relationship.",
            meaning: "A meaningful mismatch in desire creates real tension or distress." }
        ],
        guide: {
          howToDecide:
            "Not about whether either partner has desire — about whether your desires LINE UP (level, timing, context). Roughly aligned → first. Real, persistent mismatch (one wanting more, one feeling rejected, the other pressured) → second.",
          why:
            "Desire discrepancy is one of the most common and most distinct sexual issues in long-term relationships. The classic pattern: one partner has higher spontaneous desire, the other primarily responsive or lower baseline; over time repeated initiation/declining layers in hurt, resentment, pressure and rejection. It's not about who's right — both profiles are legitimate; the issue is the mismatch and how it's managed.",
          distinguish: [
            "Distinct from the frequency question: you can have a frequency problem without a discrepancy (both want more, life is in the way), or a discrepancy without a stark frequency problem.",
            "If frequency felt like the issue, ask whether the underlying driver is desire mismatch specifically or something else (logistics, exhaustion, conflict spillover)."
          ],
          honesty:
            "Trust the honest read.",
          gutCheck:
            "Is it ‘we both want this but it's not happening enough’ (→ first) or ‘one of us wants more than the other, and we feel that gap’ (→ second)?"
        },
        contextNote: null
      }
    ]
  },

  /* ════════════════════════════════════════════════════════════════════════
   * EVERYDAY PARTNERSHIP  (practical Individual-Areas-of-Concern items)
   * Skip any item that doesn't apply to your situation.
   * ════════════════════════════════════════════════════════════════════════*/
  {
    id: "everyday",
    title: "Everyday Partnership",
    intro:
      "The operational layer — money, workload, parenting and play. These are classic perpetual problems: the aim isn't to solve them but to keep them discussable. Skip any item that doesn't apply to you.",
    items: [
      {
        id: "ev_team",
        text: "We work well as a team.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Not at all — we're not functioning as a team right now.",
          2: "Rarely — we mostly operate separately.",
          3: "Mixed — team in some areas, not others.",
          4: "Usually — we function well together.",
          5: "Strongly — we're genuinely a team."
        },
        guide: {
          howToDecide:
            "The operational question: when something has to get handled, do the two of you handle it together, or does it fall to whoever notices?",
          why:
            "Teamwork is the layer where most daily resentment is generated or prevented. It's also the most visible signal of whether the partnership is currently functioning, independent of how either of you feels about it — a couple can be affectionate and operationally broken, or operationally excellent and emotionally distant.",
          distinguish: [
            "Efficient division of labour is teamwork. Both doing everything together isn't the standard.",
            "The test is what happens with the unallocated things — the ones nobody owns.",
            "Score the current period; teamwork degrades sharply under acute stress and recovers."
          ],
          honesty:
            "If one of you would describe this very differently, that gap matters more than the score.",
          gutCheck:
            "When something unexpected lands on the household, what happens?"
        },
        contextNote: null
      },
      {
        id: "ev_alone",
        text: "I feel alone in managing our family and household.",
        type: "scale5",
        reverse: true,
        optionMeanings: {
          1: "Strongly disagree — it's genuinely shared.",
          2: "Disagree — I rarely feel alone in it.",
          3: "Mixed — alone in some areas.",
          4: "Agree — I'm largely carrying it.",
          5: "Strongly agree — I'm managing it alone."
        },
        guide: {
          howToDecide:
            "Reverse-scored. This is about MANAGING — noticing, planning, remembering, deciding — not about executing tasks once they've been assigned.",
          why:
            "This is the operational form of loneliness, and it's distinct from the fairness question. A partner can do a genuinely equal share of the tasks while the entire cognitive load of running the household — knowing what needs doing and when — sits with one person. That asymmetry is invisible in a chore audit and is one of the most reliable generators of slow resentment.",
          distinguish: [
            "Doing versus managing is the whole item. ‘Tell me what to do and I'll do it’ is help with execution and no help with management.",
            "Being the manager by preference is different from being the manager by default. Score the felt aloneness either way, but the distinction matters for what you do about it.",
            "Includes the emotional management of the family — who tracks how everyone is doing."
          ],
          honesty:
            "Often carried without ever being named, because each individual instance is too small to raise.",
          gutCheck:
            "If you stopped keeping track for a fortnight, what would happen?"
        },
        contextNote: (profile) => {
          let note = "";
          if (profile.flags && profile.flags.neurodivergent) {
            note += `Executive-function load is the specific thing this item measures, and ${profile.flags.neurodivergent} changes its cost in both directions — the managing role may be far more expensive for you than it looks from outside, or you may be the partner for whom noticing-and-tracking genuinely doesn't happen. Either way, score the felt load rather than the intent. `;
          }
          if (profile.flags && profile.flags.highWorkload) {
            note += "If you're already holding a heavy operational load at work, household management competes for exactly the same faculty, and the depletion compounds rather than adds. ";
          }
          if (!note) note = "Score the managing — noticing, planning, remembering — not the doing.";
          return note.trim() + situationLine(profile);
        }
      },
      {
        id: "ev_chores",
        text: "The division of household responsibilities feels fair to me.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Strongly unfair.",
          2: "Often unfair.",
          3: "Mixed — fair in some areas.",
          4: "Mostly fair.",
          5: "Feels genuinely fair."
        },
        guide: {
          howToDecide:
            "Your felt sense of fairness, mental load included. Fairness here means acceptable to you, not mathematically equal.",
          why:
            "Perceived fairness — not measured fairness — is what predicts resentment. Two people can agree on the facts of who does what and disagree entirely about whether it's fair, because they're weighting invisible work differently.",
          distinguish: [
            "Style differences (you'd each do it differently) are a separate friction from volume differences (one of you does more).",
            "A split that was fair when it was set and hasn't been revisited since circumstances changed is a common source of quiet unfairness.",
            "Score fairness, not competence."
          ],
          honesty:
            "If you've stopped raising it because raising it never changes anything, score low — the giving-up is part of the finding.",
          gutCheck:
            "Does the load feel fairly shared, mental load included?"
        },
        contextNote: null
      },
      {
        id: "ev_money",
        text: "We can talk about money without it becoming a serious conflict.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Almost never — money is a flashpoint.",
          2: "Rarely — it usually goes badly.",
          3: "Sometimes — depends on the topic.",
          4: "Usually — money talk is manageable.",
          5: "Reliably — we discuss money fine."
        },
        guide: {
          howToDecide:
            "About the CAPACITY to discuss money, not about the state of your finances or anyone's skill with them.",
          why:
            "Money is the textbook perpetual problem, and like every perpetual problem what matters is whether it stays discussable. Couples with very little money and good money conversations do better on this dimension than wealthy couples who can't raise the subject.",
          distinguish: [
            "Not discussing money isn't the same as not being able to. If the subject simply hasn't come up but could, score high.",
            "Separate the strands: earning, spending, saving, and what money MEANS to each of you. The last one is usually where the real disagreement lives.",
            "Avoidance that followed previous bad attempts scores low, not high."
          ],
          honesty:
            "If there's a money topic you've silently shelved, that's the answer to this item.",
          gutCheck:
            "Could you raise a money concern tomorrow without bracing first?"
        },
        contextNote: null
      },
      {
        id: "ev_money_control",
        text: "I feel controlled or put down because of my partner's attitude to our money.",
        type: "scale5",
        reverse: true,
        optionMeanings: {
          1: "Strongly disagree — nothing like this.",
          2: "Disagree — not a feature.",
          3: "Mixed — occasionally, mildly.",
          4: "Agree — this is a real pattern.",
          5: "Strongly agree — this is how money works between us."
        },
        guide: {
          howToDecide:
            "Reverse-scored, and a different question from the last one. That item asked whether money is hard to DISCUSS. This asks whether money is used to control or diminish you.",
          why:
            "The Checkup screens this separately because financial control is a recognised form of coercive control, not a communication problem — and it doesn't respond to better communication. The markers are specific: being made to account for ordinary spending, having money withheld, having to ask permission, being made to feel stupid about money, or having no independent access to funds.",
          distinguish: [
            "Disagreeing about spending, even sharply, is not this. Being supervised, rationed, or belittled is.",
            "A genuinely agreed budget you both hold each other to is not control. A budget only one of you is subject to might be.",
            "If money is used as leverage during conflict — withdrawn, threatened, weaponised — that belongs at the high end."
          ],
          honesty:
            "If you scored this 4 or 5, that pattern is worth taking seriously in its own right, outside this check-up. In the US, the National Domestic Violence Hotline is 1-800-799-7233 (text START to 88788, thehotline.org); internationally, hotpeachpages.net lists local services. Where financial control is present, standard couples work is often not the right first step.",
          gutCheck:
            "Do you have the same freedom with money that your partner has?"
        },
        contextNote: null
      },
      {
        id: "ev_parenting",
        text: "My partner and I are aligned on parenting and family decisions.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Rarely aligned.",
          2: "Often differ.",
          3: "Mixed — aligned on goals, not methods, or vice versa.",
          4: "Mostly aligned.",
          5: "Strongly aligned."
        },
        guide: {
          howToDecide:
            "Skip if this doesn't apply to you. About alignment and teamwork, not about either of you parenting perfectly.",
          why:
            "Parenting disagreement is one of the heaviest loads a couple carries, partly because it's continuous and partly because it arrives already loaded with each partner's own upbringing. What predicts damage isn't the disagreement itself but the tension around it — and whether children see the two of you undermining each other.",
          distinguish: [
            "Goals for the children, what warrants discipline, and how to discipline are three separate questions. Couples are often aligned on one and not the others.",
            "Being undermined in front of the children is a distinct and more serious problem than disagreeing in private.",
            "Score the emotional charge as well as the content — a small disagreement carrying a lot of anger is the worse finding."
          ],
          honesty:
            "Include the disagreements you've stopped having because they always went badly.",
          gutCheck:
            "Do you parent as a team, or manage each other?"
        },
        contextNote: null
      },
      {
        id: "ev_stress_spill",
        text: "My partner takes work or other outside stress out on me.",
        type: "scale5",
        reverse: true,
        optionMeanings: {
          1: "Strongly disagree — never.",
          2: "Disagree — rarely.",
          3: "Sometimes — under real pressure.",
          4: "Agree — it's a recurring pattern.",
          5: "Strongly agree — outside stress reliably lands on me."
        },
        guide: {
          howToDecide:
            "Reverse-scored. This is stress spillover — external stress discharged onto you, rather than shared with you.",
          why:
            "Gottman's countermeasure here is the stress-reducing conversation: a daily decompression about stresses OUTSIDE the relationship, where the listener's whole job is to understand rather than solve, to validate before doing anything else, and never to take the other side. Where that channel doesn't exist, the stress still arrives — just as irritability aimed at whoever is nearest.",
          distinguish: [
            "Bringing stress home to be heard is healthy. Bringing it home to be discharged at you is not.",
            "The tell is direction: are you the audience, or the target?",
            "This asks about your partner. If the honest answer is that you're the one doing it, note that — it's the more actionable finding."
          ],
          honesty:
            "Easy to excuse indefinitely because the cause is genuinely external and genuinely hard.",
          gutCheck:
            "After a bad day of theirs, do you get told about it, or do you get it?"
        },
        contextNote: null
      },
      {
        id: "ev_fun",
        text: "We have enough fun and play together.",
        type: "scale5",
        reverse: false,
        optionMeanings: {
          1: "Almost none — fun has stopped.",
          2: "Rarely — very little.",
          3: "Sometimes — less than we'd like.",
          4: "Often — a good amount.",
          5: "Plenty — we genuinely enjoy each other."
        },
        guide: {
          howToDecide:
            "A sufficiency item — ‘enough’ against your own threshold. Shared enjoyment, humour and play, not organised activity.",
          why:
            "Fun replenishes the account that conflict draws down, and its absence is one of the better early indicators of friendship erosion. The Checkup distinguishes several different failures here, and they have different fixes: no time for fun, too stressed for fun, fun that gets planned and never happens, and the harder one — time spent together that simply isn't enjoyable any more.",
          distinguish: [
            "Which failure is it? No time, no energy, plans that evaporate, or trying and not enjoying it? The last one points at the friendship system rather than the calendar.",
            "Parallel leisure — same room, separate screens — isn't play.",
            "Laughing at the same things counts more than doing activities together."
          ],
          honesty:
            "Score the last couple of months honestly; this is one people answer from memory of better periods.",
          gutCheck:
            "When did you last properly laugh together?"
        },
        contextNote: (profile) => {
          let note = "";
          if (profile.flags && profile.flags.highWorkload) {
            note += "Under sustained load, fun is usually the first thing cut and the last thing restored, and it rarely gets a decision — it just stops being scheduled. If you're scoring low here while scoring high on teamwork, you may have become excellent colleagues and stopped being anything else. ";
          }
          if (!note) note = "If fun has gone, work out which failure it is — no time, no energy, or no longer enjoyable.";
          return note.trim() + situationLine(profile);
        }
      }
    ]
  }
];

/* ── Expose to app.js ─────────────────────────────────────────────────────── */
if (typeof window !== "undefined") {
  window.CHECKUP = { GLOSSARY, SECTIONS, SCALE5, SCALE_TF };
}
