import fs from "node:fs";
import path from "node:path";

const out = path.resolve("public/discover/deep");
fs.mkdirSync(out, { recursive: true });

const topics = {
  "time-zones": ["EARTH ROTATION", "UTC", "LOCAL CLOCK", "DATE LINE", "DAYLIGHT SAVING", "15° / HOUR"],
  "mortgage-amortization": ["BALANCE", "INTEREST", "PRINCIPAL", "PAYMENT", "TERM", "EXTRA PAYDOWN"],
  "recommendation-algorithms": ["ACTIONS", "SIGNALS", "RANKING", "OBJECTIVE", "FEEDBACK", "EXPOSURE"],
  "cloud-computing": ["DATA CENTRE", "VIRTUAL", "STORAGE", "NETWORK", "SHARED DUTY", "RECOVERY"],
  "internet-latency": ["DEVICE", "ROUTER", "HOPS", "QUEUE", "SERVER", "ROUND TRIP"],
  "password-hashing": ["PASSWORD", "SALT", "HASH", "GUESS", "WORK FACTOR", "VERIFY"],
  "heat-pumps": ["OUTDOOR HEAT", "EVAPORATE", "COMPRESS", "CONDENSE", "INDOOR HEAT", "EXPAND"],
  "traffic-jams": ["ARRIVAL", "DENSITY", "BRAKE WAVE", "BOTTLENECK", "QUEUE", "FLOW"],
  "supply-chains": ["MATERIAL", "FACTORY", "WAREHOUSE", "TRANSPORT", "DEMAND", "BUFFER"],
  "probability-biases": ["BASE RATE", "EVIDENCE", "CONDITION", "STREAK", "OUTCOME", "RISK"],
  "memory-reconstruction": ["ATTENTION", "TRACE", "RECALL", "CONTEXT", "REWRITE", "EVIDENCE"],
  "habit-loops": ["CUE", "CRAVING", "RESPONSE", "REWARD", "CONTEXT", "FRICTION"],
  "stress-response": ["THREAT", "ALARM", "CORTISOL", "ENERGY", "RECOVERY", "CONTROL"],
  "placebo-effect": ["EXPECTATION", "SIGNAL", "CARE", "TRIAL", "COMPARISON", "NOCEBO"],
  "taxes-and-salary": ["GROSS PAY", "BRACKET", "TAX", "PENSION", "WITHHOLDING", "NET PAY"],
  "bridge-expansion": ["HEAT", "STEEL", "EXPAND", "JOINT", "BEARING", "LOAD"],
  "digital-privacy": ["DEVICE", "IDENTITY", "DATA", "TRACKER", "CHOICE", "BOUNDARY"],
  "language-change": ["SPEAKERS", "CONTACT", "BORROW", "SHIFT", "GENERATION", "VARIETY"],
  "opportunity-cost": ["CHOICE A", "CHOICE B", "TIME", "TRADE-OFF", "VALUE", "NEXT BEST"],
  "feedback-loops": ["INPUT", "SYSTEM", "OUTPUT", "MEASURE", "AMPLIFY", "STABILISE"],
};

const palette = ["#72d6e6", "#a98cff", "#ffc46b", "#74d6a0", "#ff8c9e"];
const esc = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const arrow = (x1, y1, x2, y2, color = "#72d6e6") => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${color}" stroke-width="4" stroke-linecap="round" marker-end="url(#arrow)"/>`;
const text = (x, y, value, size = 22, color = "#e9f6fa", anchor = "middle") => `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${color}" font-size="${size}" font-family="Arial, sans-serif" letter-spacing="1">${esc(value)}</text>`;

function svg(id, labels, variant, name) {
  const [a, b, c, d, e, f] = labels;
  const title = `${name} diagram ${variant}`;
  let art = "";
  if (variant === 0) {
    const cards = [a, b, c, d].map((label, i) => `<g><rect x="${110 + i * 260}" y="300" width="190" height="112" rx="24" fill="#112d42" stroke="${palette[i]}" stroke-opacity=".7" stroke-width="3"/><circle cx="${205 + i * 260}" cy="335" r="15" fill="${palette[i]}" fill-opacity=".18" stroke="${palette[i]}"/><text x="${205 + i * 260}" y="341" text-anchor="middle" fill="${palette[i]}" font-size="14" font-family="Arial">0${i + 1}</text>${text(205 + i * 260, 382, label, 17)}</g>`).join("");
    art = cards + arrow(300, 355, 350, 355) + arrow(560, 355, 610, 355) + arrow(820, 355, 870, 355);
  } else if (variant === 1) {
    art = `<path d="M150 560 C250 160 430 160 520 400 S790 650 1050 210" fill="none" stroke="#244b61" stroke-width="34" stroke-linecap="round"/><path d="M150 560 C250 160 430 160 520 400 S790 650 1050 210" fill="none" stroke="#72d6e6" stroke-width="4" stroke-dasharray="12 18"/>${[a,b,c,d].map((label,i)=>`<circle cx="${180+i*280}" cy="${[535,240,475,245][i]}" r="34" fill="#122e43" stroke="${palette[i]}" stroke-width="4"/>${text(180+i*280,[535,240,475,245][i]+6,label,14)}`).join("")}`;
  } else if (variant === 2) {
    art = `<circle cx="600" cy="395" r="105" fill="#15354a" stroke="#72d6e6" stroke-width="4"/><circle cx="600" cy="395" r="48" fill="#72d6e6" fill-opacity=".12"/>${text(600,401,b,18)}${[[260,220,a],[940,220,c],[260,590,d],[940,590,e]].map(([x,y,label],i)=>`<path d="M600 395 L${x} ${y}" stroke="${palette[i+1]}" stroke-width="3" stroke-dasharray="8 10"/> <circle cx="${x}" cy="${y}" r="58" fill="#112d42" stroke="${palette[i+1]}" stroke-width="3"/>${text(x,y+5,label,15)}`).join("")}`;
  } else if (variant === 3) {
    art = `<path d="M150 610 V180 M150 610 H1060" stroke="#6b98aa" stroke-width="3"/>${[a,b,c,d,e].map((label,i)=>{const h=80+i*62;const x=230+i*155;return `<rect x="${x}" y="${610-h}" width="82" height="${h}" rx="12" fill="${palette[i]}" fill-opacity=".72"/><text x="${x+41}" y="650" text-anchor="middle" fill="#a7c4cf" font-size="13" font-family="Arial">${esc(label.slice(0,11))}</text>`}).join("")}<path d="M180 515 C380 430 450 470 610 350 S850 270 1030 210" fill="none" stroke="#ffcf76" stroke-width="5" stroke-linecap="round"/>`;
  } else {
    art = `<circle cx="600" cy="395" r="200" fill="none" stroke="#244b61" stroke-width="28"/><path d="M600 195 A200 200 0 0 1 765 507" fill="none" stroke="#72d6e6" stroke-width="10" marker-end="url(#arrow)"/>${[[600,145,a],[850,395,b],[600,645,c],[350,395,d]].map(([x,y,label],i)=>`<circle cx="${x}" cy="${y}" r="50" fill="#112d42" stroke="${palette[i]}" stroke-width="4"/>${text(x,y+5,label,14)}`).join("")} ${text(600,405,f,22,"#e9f6fa")}`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-labelledby="title desc"><title id="title">${esc(title)}</title><desc id="desc">A brand-neutral educational schematic explaining ${esc(name)}.</desc><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#071725"/><stop offset="1" stop-color="#122c40"/></linearGradient><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#b1e7f4" stroke-opacity=".04"/></pattern><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1 9 5 1 9" fill="none" stroke="#72d6e6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></marker></defs><rect width="1200" height="800" fill="url(#bg)"/><rect width="1200" height="800" fill="url(#grid)"/><text x="72" y="78" fill="#72d6e6" font-size="14" font-family="Arial, sans-serif" letter-spacing="4">DEEP DIVE / ${esc(id.replaceAll("-", " ").toUpperCase())}</text><text x="72" y="132" fill="#e9f6fa" font-size="38" font-family="Arial, sans-serif">${esc(name)}</text><text x="72" y="174" fill="#86aaba" font-size="17" font-family="Arial, sans-serif">${esc(title)}</text>${art}<text x="72" y="748" fill="#5e879b" font-size="12" font-family="Arial, sans-serif" letter-spacing="2">SCHEMATIC · NOT TO SCALE</text></svg>`;
}

for (const [id, labels] of Object.entries(topics)) {
  const name = id.replaceAll("-", " ");
  for (let variant = 0; variant < 5; variant += 1) {
    const suffix = variant === 0 ? "cover" : String(variant);
    fs.writeFileSync(path.join(out, `${id}-${suffix}.svg`), svg(id, labels, variant, name));
  }
}
