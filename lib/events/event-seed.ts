// Event "Moments" — bundled seed for the Studio.
//
// `event-seed.json` is generated verbatim from the Flutter app's baked-in
// `kEventCalendar` (regenerate: `flutter test --dart-define=DUMP_EVENTS=1
// test/tool/dump_event_calendar_test.dart`). It is the authoritative default —
// the Studio loads it when Firestore has no published `settings/events` yet, so
// a first publish carries every Moment the app already knows.
//
// The special questions below are ported from the app's currently hard-coded
// set (`lib/core/events/event_special_puzzle.dart`). Attaching them here makes
// the published document the single source going forward.

import rawSeed from "./event-seed.json";
import type { EventQuestion, EventTheme } from "./event-theme";

const SEED_QUESTIONS: Record<string, EventQuestion> = {
  batman_day: {
    kicker: "THE RIDDLER ASKS",
    prompt: "In which city does Batman protect the innocent from the shadows?",
    options: ["Gotham City", "Metropolis", "Central City", "Star City"],
    correctIndex: 0,
    xp: 30,
    factoid: "Gotham City — Batman's brooding home since 1940.",
  },
  halloween: {
    kicker: "A SPOOKY RIDDLE",
    prompt: "Before pumpkins, what vegetable was carved into jack-o'-lanterns?",
    options: ["Turnips", "Apples", "Melons", "Potatoes"],
    correctIndex: 0,
    xp: 30,
    factoid: "Turnips! Irish tradition switched to pumpkins in America.",
  },
  new_year: {
    kicker: "NEW YEAR QUIZ",
    prompt: "Which ancient civilization held the first known New Year festival, ~4000 years ago?",
    options: ["Romans", "Egyptians", "Babylonians", "Greeks"],
    correctIndex: 2,
    xp: 30,
    factoid: "The Babylonians welcomed the new year with an 11-day festival called Akitu.",
  },
  world_logic_day: {
    kicker: "A LOGIC PUZZLE",
    prompt: "All Bloops are Razzies, and all Razzies are Lazzies. So every Bloop is definitely a…?",
    options: ["Not a Lazzie", "Lazzie", "Sometimes a Lazzie", "Impossible to tell"],
    correctIndex: 1,
    xp: 30,
    factoid: "Transitivity: if A→B and B→C, then A→C.",
  },
  puzzle_day: {
    kicker: "TODAY'S PUZZLER",
    prompt: "What is the best-selling puzzle toy of all time?",
    options: ["Rubik's Cube", "Jenga", "Tangram", "Sudoku book"],
    correctIndex: 0,
    xp: 30,
    factoid: "Over 450 million Rubik's Cubes have sold since 1980.",
  },
  valentines: {
    kicker: "A SWEET RIDDLE",
    prompt: "Which Roman festival is often cited as an early root of Valentine's Day?",
    options: ["Saturnalia", "Bacchanalia", "Floralia", "Lupercalia"],
    correctIndex: 3,
    xp: 30,
    factoid: "Lupercalia, held in mid-February, is a commonly cited precursor.",
  },
  pi_day: {
    kicker: "THE PI CHALLENGE",
    prompt: "What are the first three digits of π after the decimal point?",
    options: ["314", "159", "141", "161"],
    correctIndex: 2,
    xp: 30,
    factoid: "π ≈ 3.14159… — which is why Pi Day falls on 3/14.",
  },
  earth_day: {
    kicker: "EARTH DAY QUIZ",
    prompt: "Roughly what share of Earth's surface is covered by water?",
    options: ["50%", "71%", "60%", "85%"],
    correctIndex: 1,
    xp: 30,
    factoid: "About 71% of Earth's surface is water.",
  },
  star_wars_day: {
    kicker: "A GALACTIC RIDDLE",
    prompt: 'Complete the phrase: "May the ___ be with you."',
    options: ["Force", "Stars", "Light", "Power"],
    correctIndex: 0,
    xp: 30,
    factoid: "And may the 4th be with you too!",
  },
  yoga_day: {
    kicker: "A MINDFUL QUESTION",
    prompt: "In which country did the practice of yoga originate?",
    options: ["China", "Japan", "India", "Greece"],
    correctIndex: 2,
    xp: 30,
    factoid: "Yoga originated in ancient India over 5,000 years ago.",
  },
  emoji_day: {
    kicker: "EMOJI TRIVIA",
    prompt: "In which country were the first emoji created in the late 1990s?",
    options: ["USA", "Japan", "Finland", "South Korea"],
    correctIndex: 1,
    xp: 30,
    factoid: '"Emoji" is Japanese: e (picture) + moji (character).',
  },
  diwali: {
    kicker: "FESTIVAL OF LIGHTS",
    prompt: 'The word "Diwali" comes from "Deepavali", which means…?',
    options: ["Night of stars", "Day of joy", "Feast of sweets", "Row of lights"],
    correctIndex: 3,
    xp: 30,
    factoid: '"Deepavali" means a row (avali) of clay lamps (deepa).',
  },
  christmas: {
    kicker: "A FESTIVE RIDDLE",
    prompt: 'How many gifts are given in total across "The Twelve Days of Christmas"?',
    options: ["364", "78", "144", "100"],
    correctIndex: 0,
    xp: 30,
    factoid: "Adding every gift across all 12 days totals 364.",
  },
  new_years_eve: {
    kicker: "COUNTDOWN QUIZ",
    prompt: "Which city's Times Square ball drop is famously watched on New Year's Eve?",
    options: ["London", "New York", "Sydney", "Tokyo"],
    correctIndex: 1,
    xp: 30,
    factoid: "The Times Square ball has dropped every year since 1907.",
  },
  thanksgiving: {
    kicker: "THANKSGIVING TRIVIA",
    prompt: "The 1621 harvest feast was shared between the Pilgrims and which Native American people?",
    options: ["Cherokee", "Sioux", "Wampanoag", "Apache"],
    correctIndex: 2,
    xp: 30,
    factoid: "The Wampanoag joined the Pilgrims for the 1621 harvest feast.",
  },
  easter: {
    kicker: "EASTER QUIZ",
    prompt: "Which animal traditionally delivers eggs at Easter?",
    options: ["Lamb", "Bunny", "Chick", "Dove"],
    correctIndex: 1,
    xp: 30,
    factoid: 'The "Easter Bunny" (Osterhase) came from German Lutheran custom.',
  },
  holi: {
    kicker: "FESTIVAL OF COLOURS",
    prompt: "Holi joyfully celebrates the arrival of which season?",
    options: ["Summer", "Autumn", "Winter", "Spring"],
    correctIndex: 3,
    xp: 30,
    factoid: "Holi welcomes spring and the triumph of good over evil.",
  },
  lunar_new_year: {
    kicker: "LUNAR NEW YEAR",
    prompt: "The Lunar New Year zodiac cycles through how many animals?",
    options: ["10", "12", "7", "15"],
    correctIndex: 1,
    xp: 30,
    factoid: "12 animals — from the Rat all the way to the Pig.",
  },
  hanukkah: {
    kicker: "A HANUKKAH RIDDLE",
    prompt: "How many candles does a Hanukkah menorah hold in total, including the helper?",
    options: ["7", "8", "9", "12"],
    correctIndex: 2,
    xp: 30,
    factoid: "A hanukkiah holds 9 — eight nights plus the shamash (helper).",
  },
};

/** The bundled default calendar with seed questions attached where they exist. */
export const SEED_EVENTS: EventTheme[] = (rawSeed as EventTheme[]).map((e) => {
  const question = SEED_QUESTIONS[e.id];
  return question ? { ...e, question } : e;
});

/** Ids that ship with a hard-coded question in the current app build. */
export const SEED_QUESTION_IDS = new Set(Object.keys(SEED_QUESTIONS));
