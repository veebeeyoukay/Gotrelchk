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
    term: "Sound Relationship House",
    intro:
      "Your ‘love map’ is how well you know your partner's inner world — their worries, hopes, history and what matters to them right now. It's the ground floor of the Sound Relationship House.",
    items: [
      {
        id: "lm_friends", text: "I can name my partner's two closest friends right now.", type: "tf", reverse: false,
        optionMeanings: { 1: "True — you know who matters in their social world.", 0: "False — you're not sure who their closest people currently are." },
        guide: { howToDecide: "Current is the key word — who they actually lean on now, not years ago.", why: "Knowing the cast of your partner's life is a basic measure of staying current with their world.", gutCheck: "Could you name them without checking their phone?" }
      },
      {
        id: "lm_stress", text: "I know what my partner is currently most worried or stressed about.", type: "tf", reverse: false,
        optionMeanings: { 1: "True — you know their current main stressor.", 0: "False — you couldn't name it confidently." },
        guide: { howToDecide: "About the present period, not their general personality.", why: "Knowing your partner's live worries is what lets you turn toward them at the right moments.", gutCheck: "If asked ‘what's weighing on them this month?’, could you answer?" }
      },
      {
        id: "lm_hopes", text: "I know my partner's hopes and aspirations for the next few years.", type: "tf", reverse: false,
        optionMeanings: { 1: "True — you know where they want to go.", 0: "False — you're unclear on their forward-looking hopes." },
        guide: { howToDecide: "Their dreams as they'd state them, not what you'd want for them.", why: "Shared knowledge of each other's dreams underpins supporting them later (see Life Dreams).", gutCheck: "Do you know what they're quietly hoping for?" }
      },
      {
        id: "lm_unknown", text: "I really don't know much about what's going on in my partner's inner life these days.", type: "tf", reverse: true,
        optionMeanings: { 1: "True — you've lost touch with their inner world.", 0: "False — you stay current with their inner life." },
        guide: { howToDecide: "Reverse-scored: True signals erosion of the love map.", why: "Drift in love maps is one of the quiet early signs of disconnection.", gutCheck: "When did you last have a real conversation about their inner life?" }
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
      "The habit of noticing and expressing what you genuinely like and respect about your partner. It's the direct antidote to contempt.",
    items: [
      {
        id: "fa_admire", text: "I can easily list things I genuinely admire about my partner.", type: "tf", reverse: false,
        optionMeanings: { 1: "True — admiration comes readily to mind.", 0: "False — it's hard to call admiration to mind." },
        guide: { howToDecide: "Can you produce specifics, not just ‘they're a good person’?", why: "Easy access to admiration is one of the strongest protective factors against contempt.", gutCheck: "Name three things right now — easy or hard?" }
      },
      {
        id: "fa_express", text: "My partner and I express appreciation and affection regularly.", type: "scale5", reverse: false,
        optionMeanings: { 1: "Almost never.", 2: "Rarely.", 3: "Sometimes.", 4: "Regularly.", 5: "Very regularly — it's woven into daily life." },
        guide: { howToDecide: "Expressed, not just felt — does it actually reach your partner?", why: "Regular expressed appreciation keeps the emotional climate positive.", gutCheck: "When did either of you last say something appreciative out loud?" }
      },
      {
        id: "fa_respected", text: "I feel genuinely respected and valued by my partner.", type: "scale5", reverse: false,
        optionMeanings: { 1: "Not at all.", 2: "Rarely.", 3: "Mixed.", 4: "Generally yes.", 5: "Strongly — I feel respected and valued." },
        guide: { howToDecide: "The felt experience of respect, regardless of intentions.", why: "Feeling respected is foundational; its absence predicts contempt dynamics.", gutCheck: "Do you feel like someone your partner looks up to?" }
      },
      {
        id: "fa_attraction", text: "I find it hard to remember what attracted me to my partner.", type: "scale5", reverse: true,
        optionMeanings: { 1: "Strongly disagree — I remember clearly.", 2: "Disagree.", 3: "Mixed.", 4: "Agree.", 5: "Strongly agree — it's hard to recall." },
        guide: { howToDecide: "Reverse-scored: agreement is the risk signal.", why: "Losing access to the origin story of fondness is a marker of erosion.", gutCheck: "Can you recall the early pull, or has it gone fuzzy?" }
      }
    ]
  },

  /* ════════════════════════════════════════════════════════════════════════
   * TURNING TOWARD  (the Emotional Bank Account)
   * ════════════════════════════════════════════════════════════════════════*/
  {
    id: "turning",
    title: "Turning Toward",
    intro:
      "Every day partners make small ‘bids’ for attention, affection or connection. Turning toward them — rather than away or against — is what fills the relationship's emotional bank account.",
    items: [
      {
        id: "tt_respond", text: "When my partner makes a small bid for attention or connection, I usually respond.", type: "scale5", reverse: false,
        optionMeanings: { 1: "Rarely.", 2: "Sometimes.", 3: "About half the time.", 4: "Usually.", 5: "Almost always." },
        guide: { howToDecide: "Bids are small — a comment, a question, a touch, a look.", why: "Gottman found the rate of turning toward bids strongly predicts stability.", gutCheck: "When they reach for you in small ways, do you engage or tune out?" }
      },
      {
        id: "tt_daily", text: "We stay connected through small daily moments, not just big occasions.", type: "scale5", reverse: false,
        optionMeanings: { 1: "Not at all.", 2: "Rarely.", 3: "Sometimes.", 4: "Often.", 5: "Consistently." },
        guide: { howToDecide: "About the texture of ordinary days, not anniversaries.", why: "Connection is built in small moments more than grand gestures.", gutCheck: "Do ordinary days include real moments of connection?" }
      },
      {
        id: "tt_ignore", text: "We tend to ignore each other's small attempts to connect.", type: "scale5", reverse: true,
        optionMeanings: { 1: "Strongly disagree.", 2: "Disagree.", 3: "Mixed.", 4: "Agree.", 5: "Strongly agree — bids often get missed." },
        guide: { howToDecide: "Reverse-scored: agreement is the risk signal (turning away).", why: "Repeatedly missing bids drains the emotional bank account.", gutCheck: "How often do bids go unanswered between you?" }
      },
      {
        id: "tt_interest", text: "I feel my partner is genuinely interested in the details of my day.", type: "scale5", reverse: false,
        optionMeanings: { 1: "Not at all.", 2: "Rarely.", 3: "Sometimes.", 4: "Usually.", 5: "Strongly — they're genuinely curious." },
        guide: { howToDecide: "Felt interest, not dutiful asking.", why: "Curiosity about your day is a steady form of turning toward.", gutCheck: "Do they ask, and actually want to know?" }
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
      "The romantic, passionate, ‘lover’ dimension of the relationship — distinct from the friendship system.",
    items: [
      {
        id: "rom_strong", text: "There is still a strong sense of romance between us.", type: "scale5", reverse: false,
        optionMeanings: { 1: "Not at all.", 2: "A little.", 3: "Somewhat.", 4: "Mostly.", 5: "Strongly." },
        guide: { howToDecide: "Romance as currently felt, not nostalgia.", why: "The lover dimension is a distinct system from friendship; it needs its own attention.", gutCheck: "Does romance still feel alive between you?" }
      },
      {
        id: "rom_faded", text: "The romantic, passionate side of our relationship has faded.", type: "scale5", reverse: true,
        optionMeanings: { 1: "Strongly disagree.", 2: "Disagree.", 3: "Mixed.", 4: "Agree.", 5: "Strongly agree — it has faded." },
        guide: { howToDecide: "Reverse-scored: agreement is the risk signal.", why: "Romantic fade is a common, addressable driver of dissatisfaction and loneliness.", gutCheck: "Has the passionate side thinned over time?" }
      },
      {
        id: "rom_time", text: "We make time for romance and physical affection.", type: "scale5", reverse: false,
        optionMeanings: { 1: "Almost never.", 2: "Rarely.", 3: "Sometimes.", 4: "Often.", 5: "Consistently." },
        guide: { howToDecide: "Deliberate time, not whatever's left over.", why: "Romance is sustained by intentional time and affection, especially under life-load.", gutCheck: "Do you protect time for the romantic side, or does it get crowded out?" }
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
      "How you handle disagreement — the start-up, the Four Horsemen (Criticism, Contempt, Defensiveness, Stonewalling), flooding, repair, and whether you share power.",
    items: [
      {
        id: "cf_harsh", text: "Our discussions about problems tend to start harshly — with criticism or blame.", type: "scale5", reverse: true,
        optionMeanings: { 1: "Strongly disagree — we start gently.", 2: "Disagree.", 3: "Mixed.", 4: "Agree.", 5: "Strongly agree — they start harshly." },
        guide: { howToDecide: "Reverse-scored. A harsh start-up is criticism/blame/contempt in the opening moments.", why: "Discussions almost always end on the note they begin — Gottman could predict the outcome from the first 3 minutes. The antidote is a gentle start-up.", gutCheck: "How do your hard conversations tend to open?" }
      },
      {
        id: "cf_contempt", text: "During conflict, contempt shows up — sarcasm, mockery, eye-rolling, or name-calling.", type: "scale5", reverse: true,
        optionMeanings: { 1: "Strongly disagree — never.", 2: "Disagree — rare.", 3: "Sometimes.", 4: "Agree — fairly often.", 5: "Strongly agree — regularly." },
        guide: { howToDecide: "Reverse-scored. Contempt = treating your partner with disrespect from a position of superiority.", why: "Contempt is the single biggest predictor of break-up. Its antidote is building a culture of fondness and admiration.", gutCheck: "Does either of you express disgust or superiority during fights?" }
      },
      {
        id: "cf_defensive", text: "When my partner raises an issue, I tend to defend myself rather than take any responsibility.", type: "scale5", reverse: true,
        optionMeanings: { 1: "Strongly disagree.", 2: "Disagree.", 3: "Mixed.", 4: "Agree.", 5: "Strongly agree." },
        guide: { howToDecide: "Reverse-scored, and a self-assessment. Defensiveness = warding off a perceived attack with excuses or counter-attack.", why: "Defensiveness escalates conflict; the antidote is accepting some responsibility, even a small part.", gutCheck: "When criticised, is your first move to defend or to take some responsibility?" }
      },
      {
        id: "cf_stonewall", text: "When things get heated, one of us shuts down and withdraws.", type: "scale5", reverse: true,
        optionMeanings: { 1: "Strongly disagree.", 2: "Disagree.", 3: "Sometimes.", 4: "Agree.", 5: "Strongly agree." },
        guide: { howToDecide: "Reverse-scored. Stonewalling = going silent, looking away, ceasing to respond.", why: "Stonewalling is one of the Four Horsemen and usually a sign of flooding. The antidote is a real break to self-soothe, then return.", gutCheck: "Does one of you tend to go blank or leave the field when it gets intense?" }
      },
      {
        id: "cf_flooding", text: "During arguments I often feel emotionally overwhelmed and unable to think clearly.", type: "scale5", reverse: true,
        optionMeanings: { 1: "Strongly disagree.", 2: "Disagree.", 3: "Sometimes.", 4: "Agree.", 5: "Strongly agree." },
        guide: { howToDecide: "Reverse-scored. This is flooding — the body going into fight-or-flight mid-conflict.", why: "When flooded you can't listen or problem-solve; continuing makes things worse. The fix is a 20+ minute break to physiologically self-soothe.", gutCheck: "Do you hit a point in fights where you can't think straight?" }
      },
      {
        id: "cf_repair", text: "We're able to use repair attempts — humour, an apology, a kind word — to calm things down.", type: "scale5", reverse: false,
        optionMeanings: { 1: "Almost never.", 2: "Rarely.", 3: "Sometimes.", 4: "Usually.", 5: "Reliably." },
        guide: { howToDecide: "Both making AND receiving repairs counts.", why: "The ability to make and accept repair attempts is one of the strongest distinguishers between happy and unhappy couples.", gutCheck: "When one of you tries to de-escalate, does it land?" }
      },
      {
        id: "cf_influence", text: "I genuinely let my partner's opinions and feelings influence my decisions.", type: "scale5", reverse: false,
        optionMeanings: { 1: "Rarely.", 2: "Sometimes.", 3: "About half.", 4: "Usually.", 5: "Consistently." },
        guide: { howToDecide: "Accepting influence = real sharing of power, not just listening then doing your own thing.", why: "Partners who accept influence have far stronger, more stable relationships; refusing it predicts breakdown.", gutCheck: "Do your partner's views actually change your decisions?" }
      },
      {
        id: "cf_gridlock", text: "On our biggest recurring issues, we feel gridlocked — every conversation hits a wall.", type: "scale5", reverse: true,
        optionMeanings: { 1: "Strongly disagree — we can dialogue.", 2: "Disagree.", 3: "Mixed.", 4: "Agree.", 5: "Strongly agree — stuck." },
        guide: { howToDecide: "Reverse-scored. Most perpetual problems can be moved from gridlock to dialogue.", why: "Gridlock usually hides unspoken dreams within conflict; understanding the dream behind each position is how it unsticks.", gutCheck: "On your stuck issues, can you talk, or does it always hit a wall?" }
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
      "The inner life you build together — the rituals, roles, goals and values that give the relationship a sense of purpose and ‘us’.",
    items: [
      {
        id: "sm_rituals", text: "We have meaningful rituals we can count on (meals, goodbyes and reunions, celebrations).", type: "scale5", reverse: false,
        optionMeanings: { 1: "Almost none.", 2: "Few.", 3: "Some.", 4: "Several.", 5: "Many, and they matter." },
        guide: { howToDecide: "Rituals of connection are predictable, meaningful routines, not just logistics.", why: "Rituals are the containers that create order and belonging; their absence invites disorder.", gutCheck: "Are there routines that feel meaningfully ‘ours’?" }
      },
      {
        id: "sm_values", text: "We largely agree on the roles and values that matter in our life together.", type: "scale5", reverse: false,
        optionMeanings: { 1: "Rarely agree.", 2: "Often differ.", 3: "Mixed.", 4: "Mostly agree.", 5: "Strongly aligned." },
        guide: { howToDecide: "About roles and core values, not every preference.", why: "Alignment on roles and values reduces friction and builds shared meaning.", gutCheck: "Do you broadly agree on what your life together is for?" }
      },
      {
        id: "sm_goals", text: "We share important goals and a sense of where we're headed.", type: "scale5", reverse: false,
        optionMeanings: { 1: "Not at all.", 2: "A little.", 3: "Somewhat.", 4: "Mostly.", 5: "Strongly — clear shared direction." },
        guide: { howToDecide: "A felt sense of a shared trajectory, not parallel lives.", why: "Shared goals give the relationship purpose and pull you forward together.", gutCheck: "Are you building a life together, or living side by side?" }
      },
      {
        id: "sm_symbolic", text: "We rarely do anything together that feels special or symbolic as a couple.", type: "scale5", reverse: true,
        optionMeanings: { 1: "Strongly disagree.", 2: "Disagree.", 3: "Mixed.", 4: "Agree.", 5: "Strongly agree." },
        guide: { howToDecide: "Reverse-scored: agreement is the deficit signal.", why: "Symbols and special moments are part of the shared meaning system.", gutCheck: "Is there anything you do that feels meaningfully symbolic of ‘us’?" }
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
      "Practical areas the full Checkup screens — money, housework, parenting, and play. Skip any item that doesn't apply to you.",
    items: [
      {
        id: "ev_money", text: "We can talk about money without it becoming a serious conflict.", type: "scale5", reverse: false,
        optionMeanings: { 1: "Almost never — money is a flashpoint.", 2: "Rarely.", 3: "Sometimes.", 4: "Usually.", 5: "Reliably — money talk goes fine." },
        guide: { howToDecide: "About the capacity to discuss money, not your actual finances.", why: "Money is one of the most common perpetual-problem areas; the ability to talk about it determines whether it stays workable.", gutCheck: "Can you raise a money issue without it blowing up?" }
      },
      {
        id: "ev_chores", text: "The division of household responsibilities feels fair to me.", type: "scale5", reverse: false,
        optionMeanings: { 1: "Strongly unfair.", 2: "Often unfair.", 3: "Mixed.", 4: "Mostly fair.", 5: "Feels fair." },
        guide: { howToDecide: "Your felt sense of fairness, including invisible/mental load.", why: "Perceived fairness in housework is a recurring driver of resentment when it's off.", gutCheck: "Does the load feel fairly shared, mental load included?" }
      },
      {
        id: "ev_parenting", text: "My partner and I are aligned on parenting and family decisions.", type: "scale5", reverse: false,
        optionMeanings: { 1: "Rarely aligned.", 2: "Often differ.", 3: "Mixed.", 4: "Mostly aligned.", 5: "Strongly aligned." },
        guide: { howToDecide: "Skip if not applicable. About alignment and teamwork, not perfection.", why: "Parenting disagreements are a major stressor; alignment protects the couple bond.", gutCheck: "Do you parent as a team, or pull in different directions?" }
      },
      {
        id: "ev_fun", text: "We have enough fun and play together.", type: "scale5", reverse: false,
        optionMeanings: { 1: "Almost none.", 2: "Rarely.", 3: "Sometimes.", 4: "Often.", 5: "Plenty." },
        guide: { howToDecide: "Shared enjoyment, adventure, and humour.", why: "Fun and play replenish the relationship and buffer against stress.", gutCheck: "Do you still laugh and play together?" }
      }
    ]
  }
];

/* ── Expose to app.js ─────────────────────────────────────────────────────── */
if (typeof window !== "undefined") {
  window.CHECKUP = { GLOSSARY, SECTIONS, SCALE5, SCALE_TF };
}
