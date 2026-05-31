/*
 * data.js — Content for the Gottman-style Relationship Check-Up
 *
 * Everything here is plain data so it can live in a flat file with no backend.
 * - GLOSSARY: term -> definition, surfaced as hover/tap tooltips.
 * - SECTIONS: the assessment, organized by the levels of the Sound
 *   Relationship House plus the two "weight-bearing walls" (Trust & Commitment).
 *
 * Each question:
 *   id      unique key used for saving answers
 *   text    the statement the user agrees / disagrees with
 *   reverse if true, agreeing indicates a RISK rather than a strength
 *           (scoring flips it so every section scores in the same direction)
 *
 * Definitions are written in plain language, based on the publicly described
 * Gottman Method concepts (Sound Relationship House, the Four Horsemen, bids,
 * repair attempts, etc.). Edit any wording here to match your own preferred
 * tooltip copy — nothing else needs to change.
 */

const GLOSSARY = {
  "Sound Relationship House":
    "The Gottman model of what makes relationships work: seven 'floors' (from knowing each other well up to shared meaning) supported by two walls — Trust and Commitment.",
  "Love Maps":
    "Your detailed mental map of your partner's inner world — their worries, hopes, history, stresses, and what matters to them right now. Strong love maps mean you really know each other.",
  "Fondness and Admiration":
    "The habit of noticing and expressing what you genuinely like and respect about your partner. It's the antidote to contempt and the foundation of affection.",
  "Bids for connection":
    "Any small attempt to get attention, affection, or connection — a comment, a question, a touch, a look. How partners respond to bids strongly predicts relationship health.",
  "Turning toward":
    "Responding positively to a partner's bid for connection — engaging, acknowledging, showing interest. The opposite is turning away (ignoring) or turning against (reacting with irritation).",
  "Emotional Bank Account":
    "The running balance of positive vs. negative interactions. Turning toward, fondness, and repair make 'deposits'; criticism and contempt make 'withdrawals'.",
  "Positive Perspective":
    "When the emotional bank account is healthy, partners give each other the benefit of the doubt (Positive Sentiment Override). When it's depleted, even neutral acts feel hostile (Negative Sentiment Override).",
  "Negative Sentiment Override":
    "A state where the relationship account is so depleted that you interpret neutral or even positive actions from your partner as negative.",
  "The Four Horsemen":
    "Four communication patterns that strongly predict relationship breakdown: Criticism, Contempt, Defensiveness, and Stonewalling.",
  "Criticism":
    "Attacking your partner's character or personality ('you always…', 'you never…') rather than raising a specific complaint about a behavior. Antidote: a gentle start-up.",
  "Contempt":
    "Treating your partner with disrespect — mockery, sarcasm, eye-rolling, name-calling. It's the single biggest predictor of break-up. Antidote: build a culture of fondness and admiration.",
  "Defensiveness":
    "Warding off a perceived attack by making excuses or counter-attacking, instead of taking any responsibility. Antidote: accept your partner's perspective and take some responsibility.",
  "Stonewalling":
    "Shutting down and withdrawing from the interaction — going silent, looking away, stopping responding. Often a sign of flooding. Antidote: take a break and self-soothe.",
  "Gentle start-up":
    "Raising an issue softly, without blame — describing the situation and what you feel and need, rather than accusing. The antidote to criticism and a harsh start-up.",
  "Harsh start-up":
    "Beginning a conversation with criticism, blame, or contempt. Discussions almost always end on the same note they begin, so a harsh start-up predicts a bad outcome.",
  "Flooding":
    "Feeling so emotionally and physically overwhelmed during conflict that you can't think clearly or listen. The body goes into fight-or-flight. The fix is a real break to self-soothe.",
  "Repair attempts":
    "Any word or action that de-escalates tension during conflict — humor, an apology, a touch, 'let me try again.' The ability to make and receive repairs is crucial.",
  "Solvable problems":
    "Conflicts that are situational and have a workable solution, versus perpetual problems rooted in lasting differences in personality or needs.",
  "Perpetual problems":
    "Ongoing differences most couples never fully solve. The goal is to move from gridlock to dialogue and learn to live with them with humor and acceptance.",
  "Gridlock":
    "When a perpetual problem becomes stuck and painful, with each conversation feeling like hitting a wall. Usually there are hidden dreams behind each position.",
  "Dreams within conflict":
    "The deeper hopes, values, or history underneath a stuck position. Understanding the dream behind your partner's stance is how gridlock turns into dialogue.",
  "Accepting influence":
    "Letting your partner's opinions and feelings genuinely affect your decisions. Partners who share power and accept influence have far stronger relationships.",
  "Shared meaning":
    "The inner life you build together — rituals, roles, goals, and symbols that give the relationship a sense of purpose and 'us'.",
  "Rituals of connection":
    "Predictable, meaningful routines you can count on — how you say goodbye, reunite, eat, celebrate, or unwind together.",
  "Trust":
    "The sense that your partner has your back and acts in your best interest, not just their own. A core 'wall' holding up the whole house.",
  "Commitment":
    "Believing this relationship is your journey for the long haul, cherishing your partner, and nurturing gratitude rather than comparing them to alternatives."
};

const SECTIONS = [
  {
    id: "love_maps",
    title: "Love Maps",
    term: "Love Maps",
    blurb: "How well you know your partner's inner world.",
    questions: [
      { id: "lm1", text: "I can name my partner's current worries and stresses." },
      { id: "lm2", text: "I know my partner's hopes and dreams for the future." },
      { id: "lm3", text: "I know who my partner's closest friends are right now." },
      { id: "lm4", text: "I can tell you what's been going on in my partner's life lately." },
      { id: "lm5", text: "I really don't know what my partner is going through these days.", reverse: true },
      { id: "lm6", text: "I know what my partner finds most stressful about their work." }
    ]
  },
  {
    id: "fondness",
    title: "Fondness & Admiration",
    term: "Fondness and Admiration",
    blurb: "How much affection and respect you actively express.",
    questions: [
      { id: "fa1", text: "I can easily list things I genuinely admire about my partner." },
      { id: "fa2", text: "My partner and I express appreciation for each other regularly." },
      { id: "fa3", text: "I feel respected and valued by my partner." },
      { id: "fa4", text: "I often tell my partner that I love and appreciate them." },
      { id: "fa5", text: "I find it hard to remember what attracted me to my partner.", reverse: true },
      { id: "fa6", text: "My partner is one of my best friends." }
    ]
  },
  {
    id: "turning",
    title: "Turning Toward",
    term: "Turning toward",
    blurb: "How you respond to each other's everyday bids for connection.",
    questions: [
      { id: "tt1", text: "When my partner reaches out for connection, I usually respond." },
      { id: "tt2", text: "We stay connected through small daily moments, not just big events." },
      { id: "tt3", text: "My partner notices and responds when I want attention or support." },
      { id: "tt4", text: "We often ignore each other's small attempts to connect.", reverse: true },
      { id: "tt5", text: "I feel like my partner is genuinely interested in my day." },
      { id: "tt6", text: "We make time to talk and check in with each other." }
    ]
  },
  {
    id: "positive",
    title: "The Positive Perspective",
    term: "Positive Perspective",
    blurb: "Whether you give each other the benefit of the doubt.",
    questions: [
      { id: "pp1", text: "I generally assume my partner means well, even when things go wrong." },
      { id: "pp2", text: "We can laugh together easily." },
      { id: "pp3", text: "I tend to read my partner's neutral actions as hostile.", reverse: true },
      { id: "pp4", text: "I feel like my partner is on my side." },
      { id: "pp5", text: "Even during stress, I can see the good in my partner." },
      { id: "pp6", text: "I often feel lonely or distant even when we're together.", reverse: true }
    ]
  },
  {
    id: "conflict",
    title: "Managing Conflict",
    term: "The Four Horsemen",
    blurb: "How you handle disagreements — start-up, repair, and the Four Horsemen.",
    questions: [
      { id: "mc1", text: "When I raise an issue, I describe what I need rather than attack my partner." },
      { id: "mc2", text: "Our arguments often start harshly, with blame or criticism.", reverse: true },
      { id: "mc3", text: "When things heat up, we can use humor or a kind word to calm down." },
      { id: "mc4", text: "Contempt — sarcasm, mockery, eye-rolling — shows up in our fights.", reverse: true },
      { id: "mc5", text: "I take some responsibility instead of getting defensive." },
      { id: "mc6", text: "When I feel overwhelmed, I withdraw and stop responding.", reverse: true },
      { id: "mc7", text: "We're able to repair and reconnect after a disagreement." }
    ]
  },
  {
    id: "dreams",
    title: "Life Dreams & Influence",
    term: "Dreams within conflict",
    blurb: "Whether you support each other's dreams and share power.",
    questions: [
      { id: "ld1", text: "My partner supports my hopes and life dreams." },
      { id: "ld2", text: "I understand the dreams and values behind my partner's stronger opinions." },
      { id: "ld3", text: "We share decision-making and I accept my partner's influence." },
      { id: "ld4", text: "I feel like my partner tries to control or dismiss my goals.", reverse: true },
      { id: "ld5", text: "Even on stuck issues, we can talk without it turning into a wall." },
      { id: "ld6", text: "We help each other pursue what's important to us." }
    ]
  },
  {
    id: "meaning",
    title: "Shared Meaning",
    term: "Shared meaning",
    blurb: "The rituals, roles, and goals that make you a team.",
    questions: [
      { id: "sm1", text: "We have rituals and routines that feel meaningful to us." },
      { id: "sm2", text: "We share important goals and a sense of where we're headed." },
      { id: "sm3", text: "We agree on the roles and values that matter in our life together." },
      { id: "sm4", text: "Our relationship gives my life a sense of purpose." },
      { id: "sm5", text: "We feel like we're building a life together, not just living parallel lives." },
      { id: "sm6", text: "We rarely do anything that feels special or symbolic as a couple.", reverse: true }
    ]
  },
  {
    id: "trust",
    title: "Trust",
    term: "Trust",
    blurb: "Whether you believe your partner has your back.",
    questions: [
      { id: "tr1", text: "I believe my partner acts with my best interests at heart." },
      { id: "tr2", text: "I can count on my partner to be there when I need them." },
      { id: "tr3", text: "I sometimes feel my partner puts their own interests first at my expense.", reverse: true },
      { id: "tr4", text: "I feel safe being emotionally open with my partner." },
      { id: "tr5", text: "My partner keeps their word." }
    ]
  },
  {
    id: "commitment",
    title: "Commitment",
    term: "Commitment",
    blurb: "Whether you're cherishing this relationship for the long haul.",
    questions: [
      { id: "cm1", text: "I'm committed to this relationship for the long term." },
      { id: "cm2", text: "I cherish my partner and feel grateful for them." },
      { id: "cm3", text: "I often compare my partner unfavorably to other people.", reverse: true },
      { id: "cm4", text: "I see us facing life's challenges together as a team." },
      { id: "cm5", text: "I rarely think about whether I'd be better off elsewhere." }
    ]
  }
];

// Answer scale shown to the user. Value is on a 0..4 scale.
const SCALE = [
  { value: 4, label: "Strongly agree" },
  { value: 3, label: "Agree" },
  { value: 2, label: "Neutral" },
  { value: 1, label: "Disagree" },
  { value: 0, label: "Strongly disagree" }
];

// Expose for app.js (works whether loaded as module or plain script).
if (typeof window !== "undefined") {
  window.GOTTMAN_DATA = { GLOSSARY, SECTIONS, SCALE };
}
