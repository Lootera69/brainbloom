import type { DiscoverLesson, DiscoverStep } from "@/types/discover";

type StepDraft = Omit<DiscoverStep, "id" | "imageUrl" | "imageAlt"> & { imageAlt?: string };

function lesson(input: {
  id: string;
  title: string;
  summary: string;
  category: string;
  accent: DiscoverLesson["accent"];
  durationMinutes: number;
  steps: StepDraft[];
  takeaways: string[];
}): DiscoverLesson {
  return {
    ...input,
    coverImageUrl: `/discover/${input.id}.svg`,
    coverImageAlt: input.title,
    difficulty: "beginner",
    published: true,
    featured: false,
    createdAt: 1791676800000,
    updatedAt: 1791676800000,
    steps: input.steps.map((step, index) => ({
      ...step,
      id: `${input.id}-${index + 1}`,
      imageUrl: `/discover/${input.id}-${index + 1}.svg`,
      imageAlt: step.imageAlt ?? step.title,
    })),
  };
}

export const POPULAR_DISCOVER_LESSONS: DiscoverLesson[] = [
  lesson({
    id: "how-wifi-works",
    title: "How does Wi‑Fi work?",
    summary: "Follow a message from your phone to a router and back again, without a cable between them.",
    category: "Technology",
    accent: "sky",
    durationMinutes: 4,
    steps: [
      { title: "Turn data into radio", body: "Your device turns digital bits into carefully timed changes in a radio signal. The antenna sends that signal through the room at a chosen Wi‑Fi frequency.", caption: "Wi‑Fi carries patterns through radio waves.", keyFact: "Wi‑Fi is radio communication, like a tiny local radio station for data." },
      { title: "The router listens", body: "The router receives the radio pattern, checks that it arrived intact, and turns it back into data. It then sends the request towards the internet or another device on your network.", caption: "The router translates between radio and wired networks.", keyFact: "Your router is both a radio access point and a traffic director." },
      { title: "Packets find their way home", body: "Large messages are split into packets. Each packet can be checked, resent if lost, and reassembled so a video, page, or photo appears as one continuous thing.", caption: "Small packets make a large message resilient.", keyFact: "A Wi‑Fi connection can be busy even when no web page is visibly loading." },
    ],
    takeaways: ["Wi‑Fi uses radio waves to move digital patterns.", "A router connects the wireless local network to other networks.", "Messages travel as packets that can be checked and reassembled."],
  }),
  lesson({
    id: "how-gps-knows-where-you-are",
    title: "How does GPS know where you are?",
    summary: "The location pin on your phone is built from clocks, distance measurements, and several satellites overhead.",
    category: "Science",
    accent: "violet",
    durationMinutes: 4,
    steps: [
      { title: "Satellites keep precise time", body: "GPS satellites broadcast their position and the exact time a signal left them. Your phone compares that timestamp with the time it receives the signal.", caption: "A signal's travel time becomes a distance estimate.", keyFact: "GPS depends on extremely accurate clocks because tiny timing errors become large distance errors." },
      { title: "Distances make overlapping circles", body: "One distance says you are somewhere on a circle around a satellite. More satellites create more overlapping possibilities until only a small region fits them all.", caption: "Several measurements narrow one huge possibility down to one place.", keyFact: "The everyday word is trilateration: using distances, not angles." },
      { title: "Your phone corrects the answer", body: "The receiver also accounts for satellite motion, atmospheric delay, and the fact that its own clock is less precise. Maps then match the coordinate to roads and buildings.", caption: "A raw coordinate becomes a useful map location.", keyFact: "GPS gives position; the map app adds meaning such as a street name." },
    ],
    takeaways: ["GPS measures signal travel time from known satellite positions.", "Multiple distances intersect to identify a small region.", "Corrections and map data turn a coordinate into a helpful location."],
  }),
  lesson({
    id: "why-seasons-happen",
    title: "Why do seasons happen?",
    summary: "Earth's seasons are caused mainly by its tilted axis, not by being dramatically closer to or farther from the Sun.",
    category: "Space",
    accent: "amber",
    durationMinutes: 3,
    steps: [
      { title: "Earth leans as it travels", body: "Earth's rotation axis is tilted by about 23.5 degrees. As Earth orbits the Sun, that tilt keeps pointing in nearly the same direction in space.", caption: "The same tilt changes which hemisphere faces the Sun.", keyFact: "The tilt is the reason the seasons reverse between the Northern and Southern Hemispheres." },
      { title: "Sunlight arrives at different angles", body: "A hemisphere tilted towards the Sun receives more direct light and longer days. The same energy is spread over a smaller area, making the surface warmer.", caption: "Direct light concentrates energy.", keyFact: "Day length and sunlight angle work together to shape seasonal temperature." },
      { title: "The cycle repeats", body: "Six months later, that hemisphere tilts away. Its days are shorter and sunlight arrives at a lower angle, while the other hemisphere experiences summer.", caption: "One orbit creates a repeating rhythm of light and warmth.", keyFact: "Earth's slightly elliptical orbit is not the main cause of our seasons." },
    ],
    takeaways: ["Earth's 23.5-degree tilt drives the seasons.", "Direct sunlight and longer days deliver more energy.", "The two hemispheres experience opposite seasons at the same time."],
  }),
  lesson({
    id: "why-planes-fly",
    title: "Why can an aeroplane fly?",
    summary: "Lift is the result of moving air, wing shape, angle, and the aircraft's forward speed working together.",
    category: "Engineering",
    accent: "sky",
    durationMinutes: 4,
    steps: [
      { title: "The wing meets the air", body: "Engines provide thrust, pushing the aircraft forwards. The wing is shaped and angled so it deflects air downwards as it moves through it.", caption: "Forward motion gives the wing airflow to work with.", keyFact: "A wing can create lift even when it is not a perfectly curved shape." },
      { title: "Air changes direction", body: "The moving wing creates a pressure pattern and turns a stream of air downward. The equal-and-opposite reaction is an upward force on the wing: lift.", caption: "Downward-moving air corresponds to upward lift.", keyFact: "Lift is not only a pressure story; changing the air's momentum matters too." },
      { title: "Four forces balance", body: "In steady level flight, lift balances weight and thrust balances drag. Pilots adjust speed, wing angle, and control surfaces whenever that balance needs to change.", caption: "Flight is a controlled balance, not a single magic effect.", keyFact: "A stall happens when the wing angle becomes too large for the airflow to stay attached." },
    ],
    takeaways: ["Engines create forward motion; wings use airflow to create lift.", "The wing pushes air down and receives an upward reaction.", "Level flight balances lift with weight and thrust with drag."],
  }),
  lesson({
    id: "how-vaccines-train-immunity",
    title: "How do vaccines train immunity?",
    summary: "A vaccine gives the immune system a safe rehearsal so it can respond faster to a real infection later.",
    category: "Health",
    accent: "emerald",
    durationMinutes: 4,
    steps: [
      { title: "Show the immune system a clue", body: "Vaccines present an antigen or instructions related to a germ without requiring the full dangerous disease. Immune cells inspect the clue and begin organising a response.", caption: "The immune system learns from a safer introduction.", keyFact: "Different vaccines use different ways to present the immune clue." },
      { title: "Build a targeted response", body: "B cells can make antibodies that recognise the antigen, while other immune cells coordinate and remove cells carrying the threat. This first response takes time to develop.", caption: "Recognition turns into specialised defence.", keyFact: "Antibodies are one part of immunity; memory cells help make the next response faster." },
      { title: "Remember the rehearsal", body: "After the vaccine signal fades, memory cells can remain. If the real germ appears later, the body is prepared to react more quickly and strongly.", caption: "Immune memory is the long-term benefit.", keyFact: "Boosters refresh memory when protection needs strengthening over time." },
    ],
    takeaways: ["Vaccines provide a safer rehearsal for immune recognition.", "The body builds antibodies and memory cells against the target.", "Memory helps a later response start sooner and work more effectively."],
  }),
  lesson({
    id: "why-antibiotics-do-not-treat-viruses",
    title: "Why don't antibiotics cure colds?",
    summary: "Antibiotics target bacterial machinery, while viruses reproduce using a very different strategy inside our cells.",
    category: "Health",
    accent: "rose",
    durationMinutes: 3,
    steps: [
      { title: "Bacteria are tiny cells", body: "Bacteria have their own cell membranes, ribosomes, and chemical pathways. Many antibiotics interfere with one of these features while leaving human cells mostly unharmed.", caption: "A bacterial cell has machinery a drug can target.", keyFact: "Antibiotics do not mean 'strong medicine'; they are specific tools for bacterial infections." },
      { title: "Viruses use our cells", body: "A virus carries genetic instructions but usually lacks the full machinery to reproduce alone. It enters a host cell and redirects that cell's systems to make more virus.", caption: "Viruses hide their reproduction inside host cells.", keyFact: "A drug that damages a bacterial ribosome cannot automatically stop a virus using a human cell." },
      { title: "Use the right tool", body: "Rest, fluids, vaccination, and targeted antiviral medicines can be useful depending on the illness. Unneeded antibiotics expose bacteria to selection pressure and can encourage resistance.", caption: "Correct diagnosis protects both the patient and future treatments.", keyFact: "Resistance is an evolutionary response, not the body becoming immune to antibiotics." },
    ],
    takeaways: ["Antibiotics target features of bacterial cells.", "Viruses reproduce inside host cells and need different strategies.", "Unnecessary antibiotic use encourages resistant bacteria."],
  }),
  lesson({
    id: "how-inflation-works",
    title: "What is inflation?",
    summary: "See why the same amount of money can buy fewer things when prices rise across an economy.",
    category: "Money",
    accent: "amber",
    durationMinutes: 4,
    steps: [
      { title: "A basket gets more expensive", body: "Inflation is a sustained rise in the average price of goods and services. One item can become expensive for many reasons without the whole economy experiencing inflation.", caption: "Economists watch a broad basket, not one isolated price.", keyFact: "Inflation measures changing purchasing power, not simply whether prices are high." },
      { title: "Demand and costs push prices", body: "Prices can rise when demand outpaces supply, when energy or materials become more expensive, or when bottlenecks make products harder to deliver. These forces can interact.", caption: "Many routes can lead to the same visible result: rising prices.", keyFact: "Inflation is usually a story about many prices moving together." },
      { title: "Money meets policy", body: "Central banks often raise interest rates to cool borrowing and demand. The goal is to slow price growth without causing unnecessary harm to jobs and investment.", caption: "Policy tries to bring the pace of price change under control.", keyFact: "Stable prices do not mean every individual price stays unchanged." },
    ],
    takeaways: ["Inflation is broad, sustained price growth.", "Supply, demand, and production costs can all contribute.", "Interest-rate policy can cool demand and slow inflation."],
  }),
  lesson({
    id: "how-compound-interest-grows",
    title: "How does compound interest grow?",
    summary: "The simple idea behind compound growth: future growth can earn growth on the growth that came before it.",
    category: "Money",
    accent: "emerald",
    durationMinutes: 3,
    steps: [
      { title: "Start with a principal", body: "You begin with an amount of money called the principal. Interest is calculated as a percentage of that amount over a chosen period.", caption: "A percentage describes a relationship, not a fixed number.", keyFact: "The same rate produces different interest amounts on different balances." },
      { title: "Leave the growth in place", body: "With compound interest, earned interest stays in the account and becomes part of the balance. The next period calculates growth on the larger total.", caption: "Growth joins the base before the next round begins.", keyFact: "Compounding frequency changes the result, especially over long periods." },
      { title: "Time bends the curve", body: "Early contributions have more time to compound, so the balance can begin slowly and accelerate later. Fees, withdrawals, and changing rates can reduce the effect.", caption: "Time is the quiet force behind compound growth.", keyFact: "Compound growth also works in reverse for debt, where interest can grow what you owe." },
    ],
    takeaways: ["Interest is a percentage applied to a balance.", "Compounding adds previous growth to the base for the next period.", "Time, fees, withdrawals, and rates all shape the final result."],
  }),
  lesson({
    id: "how-blockchain-works",
    title: "How does a blockchain work?",
    summary: "Understand the shared record, cryptographic links, and network agreement behind a blockchain.",
    category: "Technology",
    accent: "violet",
    durationMinutes: 5,
    steps: [
      { title: "Collect proposed records", body: "A network receives transactions or other records. These are grouped into a candidate block with a reference to the block before it.", caption: "A block is a batch of records, not a single coin.", keyFact: "Blockchains can store many kinds of data; a cryptocurrency is one application." },
      { title: "Link the history", body: "Each block contains a cryptographic fingerprint of its contents and the previous block. Changing an old record changes its fingerprint and breaks the chain after it.", caption: "The links make quiet changes easy for the network to detect.", keyFact: "A hash is designed to be easy to check but hard to reverse into the original input." },
      { title: "Agree on the next block", body: "Network participants follow a consensus process to decide which candidate block becomes the next shared version. Copies are then updated across many computers.", caption: "The hard part is agreement between computers that do not share one owner.", keyFact: "A blockchain is not automatically accurate; its trust comes from rules and incentives around consensus." },
    ],
    takeaways: ["Blocks batch records and link to earlier blocks.", "Hashes make changes to the history detectable.", "Consensus helps a distributed network agree on one next version."],
  }),
  lesson({
    id: "how-search-engines-find-results",
    title: "How does a search engine find results?",
    summary: "From crawling pages to ranking answers, follow the pipeline behind a search box.",
    category: "Technology",
    accent: "sky",
    durationMinutes: 4,
    steps: [
      { title: "Discover pages", body: "Automated crawlers follow links and visit public pages. They read text, structure, media descriptions, and signals about when a page changed.", caption: "The web becomes discoverable through links and submitted addresses.", keyFact: "A page can exist online but still be missing from an index." },
      { title: "Build an index", body: "The engine stores useful information in a large index so it does not have to reread the whole web for every query. Duplicate and low-quality pages may be treated differently.", caption: "An index is the search engine's organised map of known content.", keyFact: "Search is fast because most work happens before you type the question." },
      { title: "Rank the useful matches", body: "When you search, systems interpret the words and context, retrieve candidates, and rank them using relevance, quality, freshness, and many other signals.", caption: "Ranking tries to put the most helpful answer near the top.", keyFact: "The top result is a prediction of usefulness, not a guarantee of truth." },
    ],
    takeaways: ["Crawlers discover pages and collect their content.", "An index stores information for fast retrieval.", "Ranking systems estimate which results will best answer a query."],
  }),
  lesson({
    id: "how-ai-learns-patterns",
    title: "How does AI learn patterns?",
    summary: "See how examples, adjustable parameters, and feedback allow a model to make useful predictions.",
    category: "Technology",
    accent: "rose",
    durationMinutes: 5,
    steps: [
      { title: "Turn examples into signals", body: "Training data is converted into numbers a model can process. Text, images, sound, and measurements each become structured patterns with useful relationships.", caption: "A model learns from representations, not from human-like understanding.", keyFact: "The quality and coverage of examples strongly affect what a model can learn." },
      { title: "Adjust many small weights", body: "The model makes a prediction, compares it with a target or feedback signal, and adjusts internal weights to reduce the error. Repeating this across many examples changes the model's behaviour.", caption: "Learning is repeated correction at a huge scale.", keyFact: "Weights are numerical relationships, not a list of stored answers in the usual sense." },
      { title: "Use the pattern on new input", body: "After training, the model receives new input and calculates a likely output. It can be impressive when the new example resembles the patterns it learned, and unreliable when it does not.", caption: "Inference is the trained model making a new prediction.", keyFact: "Confidence and correctness are different things; a model can sound certain and still be wrong." },
    ],
    takeaways: ["Training converts examples into numerical patterns.", "Feedback adjusts internal weights to reduce prediction error.", "A model generalises from learned patterns but can fail outside its experience."],
  }),
  lesson({
    id: "how-electricity-reaches-your-home",
    title: "How does electricity reach your home?",
    summary: "Trace energy from a generator through high-voltage lines, substations, and the circuit behind a wall socket.",
    category: "Engineering",
    accent: "amber",
    durationMinutes: 4,
    steps: [
      { title: "Generate and raise the voltage", body: "A generator converts mechanical motion into electrical energy. A transformer raises the voltage so power can travel long distances with less energy lost as heat.", caption: "High voltage makes long-distance transmission more efficient.", keyFact: "Voltage is electrical pressure; it is not the same thing as energy use." },
      { title: "Switch it through the grid", body: "Transmission lines carry power to substations. Transformers step the voltage down in stages, while switches and protection systems isolate faults and balance changing demand.", caption: "The grid is a network of routes, controls, and safety boundaries.", keyFact: "The electricity grid must constantly match generation with consumption." },
      { title: "Complete the local circuit", body: "A neighbourhood transformer lowers the voltage again before it reaches homes. When you connect a device, current flows through a complete circuit and the device converts electrical energy into light, motion, heat, or computation.", caption: "A socket is the last link in a much larger system.", keyFact: "The return path is just as important as the live path for a complete circuit." },
    ],
    takeaways: ["Generators make electricity and transformers change voltage.", "High-voltage transmission reduces long-distance losses.", "A device works when it completes a safe local circuit."],
  }),
  lesson({
    id: "how-batteries-store-energy",
    title: "How does a battery store energy?",
    summary: "Inside a rechargeable battery, chemical reactions push electrons through a circuit while ions move internally.",
    category: "Engineering",
    accent: "emerald",
    durationMinutes: 4,
    steps: [
      { title: "Separate the chemical roles", body: "A battery has two electrodes and an electrolyte. Chemical reactions at the electrodes create a difference in electrical potential between them.", caption: "A voltage difference is stored chemical opportunity.", keyFact: "A battery does not store electricity like water in a tank; it stores energy chemically." },
      { title: "Electrons take the outside route", body: "When a circuit connects the electrodes, electrons flow through the wire and power a device. Ions move through the electrolyte to keep charge balanced inside the battery.", caption: "Electrons power the device; ions complete the internal chemistry.", keyFact: "The separator helps prevent a direct internal short while allowing ions to pass." },
      { title: "Charging reverses the path", body: "A charger supplies energy that drives the chemical reactions in the opposite direction. The battery returns close to its earlier state, although every cycle causes some wear.", caption: "Charging is forced chemistry in reverse.", keyFact: "Heat, fast charging, and deep cycling can all affect battery life." },
    ],
    takeaways: ["Batteries store energy in separated chemical states.", "Electrons flow through the external circuit while ions move inside.", "Charging uses external energy to reverse the reaction."],
  }),
  lesson({
    id: "how-fridges-move-heat",
    title: "How does a refrigerator make things cold?",
    summary: "A refrigerator does not destroy heat; it uses a repeating loop to move heat from inside the box to the room.",
    category: "Everyday science",
    accent: "sky",
    durationMinutes: 4,
    steps: [
      { title: "Evaporate a working fluid", body: "A refrigerant evaporates inside coils near the cold compartment. Changing from liquid to gas requires energy, which the refrigerant takes from the air and food inside.", caption: "Evaporation pulls heat out of the cold space.", keyFact: "Cold air is a result of heat leaving, not a substance being pumped in." },
      { title: "Compress and release heat", body: "A compressor squeezes the refrigerant gas, making it hotter. Outside the cabinet, the hot gas releases heat into the room and condenses back into a liquid.", caption: "The back of a refrigerator feels warm because it is exporting heat.", keyFact: "The refrigerator adds the compressor's electrical energy to the heat it moves." },
      { title: "Expand and repeat", body: "The liquid passes through a narrow expansion device, dropping in pressure and temperature. It returns to the inside coils ready to absorb more heat.", caption: "Pressure changes reset the refrigerant for another cooling pass.", keyFact: "A refrigerator can cool its inside while warming the room overall." },
    ],
    takeaways: ["Evaporation absorbs heat from inside the refrigerator.", "Compression and condensation release that heat outside.", "Expansion cools the refrigerant so the cycle can repeat."],
  }),
  lesson({
    id: "how-noise-cancelling-works",
    title: "How does noise cancellation work?",
    summary: "Noise-cancelling headphones listen to unwanted sound and create a carefully timed opposite wave.",
    category: "Technology",
    accent: "violet",
    durationMinutes: 3,
    steps: [
      { title: "Measure the outside sound", body: "A microphone samples the pressure changes travelling through the air. The electronics estimate the repeating pattern of an engine, train, or room hum.", caption: "The system listens before it can respond.", keyFact: "Noise cancellation works best when the unwanted sound is predictable." },
      { title: "Create the opposite pattern", body: "The headphones play a wave with the opposite phase. When the original and generated waves meet near your ear, their pressure changes partly cancel.", caption: "Opposite waves can reduce the combined movement of air.", keyFact: "The headphones are not making silence everywhere; they shape the sound near the listener." },
      { title: "Handle the limits", body: "Low, steady sounds are easier to cancel than sudden high-frequency sounds. The ear cups also use passive seals to block some sound directly.", caption: "Active cancellation and passive isolation work together.", keyFact: "The best result is usually a quieter background, not perfect silence." },
    ],
    takeaways: ["Microphones measure the unwanted sound.", "Speakers produce a phase-opposite wave near your ears.", "Passive seals and active cancellation cover different kinds of noise."],
  }),
  lesson({
    id: "why-moon-changes-shape",
    title: "Why does the Moon change shape?",
    summary: "The Moon does not actually change shape; we see different portions of its sunlit half as it orbits Earth.",
    category: "Space",
    accent: "amber",
    durationMinutes: 3,
    steps: [
      { title: "The Sun lights half", body: "At every moment, sunlight illuminates roughly half of the Moon. The boundary between day and night moves across the lunar surface as the Moon rotates and orbits.", caption: "The Moon always has a sunlit half and a dark half.", keyFact: "The Moon shines by reflected sunlight; it does not make its own visible light." },
      { title: "Your viewpoint changes", body: "As the Moon travels around Earth, the angle between the Sun, Moon, and observer changes. From Earth, we see different fractions of the illuminated half.", caption: "A phase is a viewing angle, not a new lunar shape.", keyFact: "A full Moon is bright because the visible side is facing mostly towards the Sun and us." },
      { title: "One cycle takes a month", body: "The familiar sequence runs from new Moon through crescent, quarter, gibbous, and full Moon, then back again. The cycle takes about 29.5 days from one new Moon to the next.", caption: "The phases follow the Moon's repeating orbit.", keyFact: "Most phases are not caused by Earth's shadow; that happens during a lunar eclipse." },
    ],
    takeaways: ["Sunlight always illuminates about half of the Moon.", "The phase depends on how much of that lit half we can see.", "The complete phase cycle repeats about every 29.5 days."],
  }),
  lesson({
    id: "why-sky-is-blue",
    title: "Why is the sky blue but sunsets red?",
    summary: "Air molecules scatter some colours of sunlight more strongly than others, and the path through the atmosphere changes what reaches your eyes.",
    category: "Everyday science",
    accent: "sky",
    durationMinutes: 3,
    steps: [
      { title: "Sunlight contains a spectrum", body: "Sunlight looks white but contains many visible wavelengths. Blue light has a shorter wavelength than red light.", caption: "White sunlight carries a whole range of colours.", keyFact: "The colours are properties of light, not paints mixed inside the sky." },
      { title: "Air scatters short waves", body: "Tiny molecules in the atmosphere scatter shorter wavelengths more strongly in many directions. Blue light therefore arrives at your eyes from across the sky, not only from the Sun's position.", caption: "Scattered blue light fills the daytime sky.", keyFact: "Violet scatters even more, but our eyes are less sensitive to it and some is absorbed higher up." },
      { title: "Sunset takes the long route", body: "When the Sun is low, its light travels through a longer slice of atmosphere. Much of the blue light is scattered away before the direct beam reaches you, leaving warmer reds and oranges.", caption: "A longer atmospheric path shifts the direct light toward warm colours.", keyFact: "Dust, smoke, and clouds can make sunsets unusually vivid by changing the scattering." },
    ],
    takeaways: ["Sunlight contains many visible wavelengths.", "Air scatters short blue wavelengths across the daytime sky.", "At sunset, a longer path removes more blue from the direct sunlight."],
  }),
];
