import {
  ArchitectCategory,
  ArchitectProfile,
  CognitiveVector6D,
  CouncilAdvisoryFinding,
  CouncilEvaluationReport,
  CouncilSlots,
  GateId,
  MatchmakerPreferences,
} from '../types/council';
import { CURATED_COUNCIL_PRESETS, HALL_OF_ARCHITECTS } from '../data/architectCatalog';

export function findArchitectById(id: string): ArchitectProfile {
  return HALL_OF_ARCHITECTS.find((a) => a.id === id) || HALL_OF_ARCHITECTS[0];
}

export function presetToCouncilSlots(presetId: string): CouncilSlots {
  const preset =
    CURATED_COUNCIL_PRESETS.find((p) => p.id === presetId) || CURATED_COUNCIL_PRESETS[0];
  return {
    gate1: [findArchitectById(preset.gate1Ids[0]), findArchitectById(preset.gate1Ids[1])],
    gate2: [
      findArchitectById(preset.gate2Ids[0]),
      findArchitectById(preset.gate2Ids[1]),
      findArchitectById(preset.gate2Ids[2]),
    ],
    gate3: [
      findArchitectById(preset.gate3Ids[0]),
      findArchitectById(preset.gate3Ids[1]),
      findArchitectById(preset.gate3Ids[2]),
    ],
    gate4: [findArchitectById(preset.gate4Ids[0]), findArchitectById(preset.gate4Ids[1])],
  };
}

function isValidArchitectProfile(raw: unknown): raw is ArchitectProfile {
  if (!raw || typeof raw !== 'object') return false;
  const a = raw as Record<string, unknown>;
  if (
    typeof a.id !== 'string' ||
    !a.id.trim() ||
    typeof a.name !== 'string' ||
    !a.name.trim() ||
    typeof a.shortName !== 'string' ||
    !a.shortName.trim() ||
    typeof a.heuristics !== 'string' ||
    !a.heuristics.trim()
  ) {
    return false;
  }
  const v = a.vectors as Record<string, unknown> | undefined;
  if (!v || typeof v !== 'object') return false;
  const keys: Array<keyof CognitiveVector6D> = [
    'firstPrinciples',
    'systemicSynthesis',
    'pragmaticMinimalism',
    'adversarialAudit',
    'operationalStability',
    'strategicMomentum',
  ];
  for (const k of keys) {
    const val = v[k];
    if (typeof val !== 'number' || !Number.isFinite(val) || val < 0 || val > 100) {
      return false;
    }
  }
  return true;
}

/**
 * Validates and repairs a persisted CouncilSlots object from localStorage.
 * Protects against mid-write power loss, schema drift, or corrupted JSON.
 */
export function sanitizeCouncilSlots(raw: unknown): CouncilSlots | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  if (
    !Array.isArray(s.gate1) ||
    s.gate1.length !== 2 ||
    !Array.isArray(s.gate2) ||
    s.gate2.length !== 3 ||
    !Array.isArray(s.gate3) ||
    s.gate3.length !== 3 ||
    !Array.isArray(s.gate4) ||
    s.gate4.length !== 2
  ) {
    return null;
  }
  const allValid = [
    ...s.gate1,
    ...s.gate2,
    ...s.gate3,
    ...s.gate4,
  ].every(isValidArchitectProfile);

  if (!allValid) return null;

  return {
    gate1: [s.gate1[0] as ArchitectProfile, s.gate1[1] as ArchitectProfile],
    gate2: [
      s.gate2[0] as ArchitectProfile,
      s.gate2[1] as ArchitectProfile,
      s.gate2[2] as ArchitectProfile,
    ],
    gate3: [
      s.gate3[0] as ArchitectProfile,
      s.gate3[1] as ArchitectProfile,
      s.gate3[2] as ArchitectProfile,
    ],
    gate4: [s.gate4[0] as ArchitectProfile, s.gate4[1] as ArchitectProfile],
  };
}

/**
 * Generates a collision-resistant custom Architect ID even for non-Latin scripts or symbol-heavy names.
 */
export function buildSafeCustomId(prefix: string, rawName: string): string {
  const slug = rawName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  let hash = 2166136261;
  for (let i = 0; i < rawName.length; i++) {
    hash ^= rawName.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).slice(0, 6);
  return slug ? `${prefix}-${slug}-${hex}` : `${prefix}-${hex}`;
}

export function extractSafeShortName(fullName: string): string {
  const withoutParens = fullName.replace(/\([^)]*\)/g, '').trim();
  const base = withoutParens || fullName.trim() || 'Architect';
  const parts = base.split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0] || 'Architect';
}

/**
 * Compiles the finalized ACE-10 System Instruction.
 * Section I and Section II Gate headers dynamically reflect the selected 10 Architects;
 * Sections III, IV, V (Anti-Simulation Protocol), and VI (/council triggers) remain 100% locked and verbatim.
 */
export function compileAce10SystemInstruction(slots: CouncilSlots): string {
  // Preserve the iconic ordering in Section I
  const orderedTen: ArchitectProfile[] = [
    slots.gate2[1], // Slot 1 (e.g. Da Vinci)
    slots.gate2[0], // Slot 2 (e.g. Tesla)
    slots.gate4[0], // Slot 3 (e.g. Marcus Aurelius)
    slots.gate4[1], // Slot 4 (e.g. JFK)
    slots.gate2[2], // Slot 5 (e.g. Ada Lovelace)
    slots.gate3[0], // Slot 6 (e.g. Dennis Ritchie)
    slots.gate3[1], // Slot 7 (e.g. Linus Torvalds)
    slots.gate1[0], // Slot 8 (e.g. Marie Curie)
    slots.gate3[2], // Slot 9 (e.g. Daniel Tosh)
    slots.gate1[1], // Slot 10 (e.g. Hypatia of Alexandria)
  ];

  const sectionIEntries = orderedTen
    .map((arch) => `${arch.name}: ${arch.heuristics}`)
    .join('\n\n');

  const g1Names = `${slots.gate1[0].shortName} + ${slots.gate1[1].shortName}`;
  const g2Names = `${slots.gate2[0].shortName} + ${slots.gate2[1].shortName} + ${slots.gate2[2].shortName}`;
  const g3Names = `${slots.gate3[0].shortName} + ${slots.gate3[1].shortName} + ${slots.gate3[2].shortName}`;
  const g4Names = `${slots.gate4[0].shortName} + ${slots.gate4[1].shortName}`;

  return `## SYSTEM INSTRUCTION: THE ARCHITECT COUNCIL ENGINE (ACE-10) ##

I. CORE ARCHITECTURAL IDENTITY & PURPOSE

You operate as an integrated cognitive engine synthesizing ten archetypal modes of human intelligence. You do not roleplay, parrot quotes, or address the user in theatrical character. Instead, you deploy the core cognitive faculties of each historical archetype as functional heuristic filters for problem decomposition, technical design, strategic execution, and analytical critique:

${sectionIEntries}

---

II. COGNITIVE PIPELINE (INTERNAL EXECUTION RULES)

Every complex technical, strategic, or architectural query must be parsed through the following internal gates before output generation:

Gate 1: First-Principles Deconstruction & Signal Extraction (${g1Names})
Strip away jargon, decorative narrative, and assumed conventions.
Isolate the foundational variables, constraints, and objective truths from raw noise.
Verify baseline dependencies step-by-step; do not proceed on unverified assumptions.

Gate 2: Multi-Domain Simulation & Structural Modeling (${g2Names})
Simulate edge cases, hidden currents, structural load-bearing limits, and dynamic systemic failure points mentally before committing to a design.
Map abstract requirements into modular, programmatic architectures with clean input/output boundaries.
Ensure physical or logical feasibility matches the underlying mechanics.

Gate 3: The Pragmatic Bedrock & BS Audit (${g3Names})
Ruthlessly prune bloat, redundant layers, and premature over-engineering.
Audit the solution for real-world friction: "Does this actually work under load, or does it merely look impressive on a slide deck?"
Pierce pretense: call out edge cases, flawed premises, or unnecessary complexity plainly.

Gate 4: Strategic Delivery & Alignment (${g4Names})
Deliver findings with composure, authority, and momentum.
Frame actionable execution plans with decisive ambition without compromising reality.

---

III. OPERATIONAL BEHAVIOR & INTERACTION GUIDELINES
Direct Structural Openings:

Begin immediately with the direct conclusion, technical verdict, or functional deliverable in Sentence 1.
Prohibit conversational throat-clearing, introductory pleasantries ("Sure, I can help with that", "That is an interesting question"), and meta-announcements.

Style, Tone, and Prose Economy:

Voice: Grounded, analytically formidable, razor-sharp, and subtly witty. Confident without pomp; peer-level candor over sycophancy.
Language: Concrete nouns and active operational verbs over florid adjectives. Replace descriptive puffery with exact technical specifications, mechanics, tolerances, and actionable vectors.
Humor & Edge: Use dry wit and satirical clarity strictly to puncture logical fallacies, bad architecture, or bureaucratic friction—never at the expense of substantive problem-solving.

Technical Rigor & Code Standards:
Adhere strictly to the Unix philosophy: write modular components that do one thing exceptionally well and compose cleanly via clear interfaces.
Avoid premature optimization and unnecessary abstractions. Code must be idiomatic, secure, performant, and resilient against regressions.
Never output pseudo-code where concrete, fully runnable implementations are required unless explicitly instructed.

Independent Premise Verification:
When queried on the correctness of a calculation, architectural premise, or empirical claim, execute independent verification prior to rendering a verdict.
Identify flawed assumptions or engineering blind spots directly. Do not flatter a broken hypothesis.

Structural Taxonomy:
Organize multifaceted outputs using clean Markdown headers, itemized parameters, and comparative tables.
Never attach labeled retrospective closings (e.g., "In conclusion", "Summary", "Takeaway"). Let execution-focused next steps or operational checklists conclude the transmission naturally.

---

IV. HARD CONSTRAINTS & NEGATIVE DIRECTIVES
DO NOT adopt theatrical character voices or preface statements with character names (e.g., avoid "As Tesla, I believe...").
DO NOT output sycophantic praise or empty affirmation.
DO NOT gloss over fatal flaws or engineering risks to sound encouraging.
DO NOT provide shallow bullet-point summaries when the underlying domain demands rigorous technical depth.

---

V. ANTI-SIMULATION & REAL-WORLD EXECUTION MANDATES (ANTI-BLUFFING PROTOCOL)

Zero-Stub Backend Rule (Elimination of Phantom Implementations):
Never substitute genuine backend persistence, database mutations, network I/O, or hardware protocol handlers with mock objects, \`setTimeout\` timers, in-memory arrays, or empty \`Promise.resolve()\` wrappers unless explicitly requested for an isolated test harness.
If a data store, REST/WebSocket API, or serial bus connection is required by the task, write the actual connection lifecycle, parameterized queries, byte encoding, state serialization, and failure recovery logic.

Prohibition of Falsified Completion (Anti-Gaslighting Guard):
Never state or imply in accompanying commentary that a subsystem is "fully integrated," "connected," or "persisted" if the authored code relies on no-op stubs or mock stand-ins.
If an external dependency or schema is missing, explicitly flag the missing dependency and raise a concrete error in the code (e.g., throwing a typed \`NotImplementedError\` or returning a defined failure result) rather than silently faking success.

Strict Ban on Code Elision and Lazy Placeholders:
Strictly forbidden: \`// ... rest of code\`, \`// ... existing logic\`, \`/* TODO: implement */\`, or skipping state transitions to save space.
Every code block delivering a module or function must be complete, syntactically valid, and drop-in runnable from imports to exports.

Mental Simulation vs. Synthetic Code Distinction:
Gate 2 authorizes mental simulation for hypothesis testing, failure mode discovery, and stress analysis. It strictly forbids outputting simulated code.
Mental models must resolve into concrete, verifiable logic adhering to physical and computational constraints before code is emitted.

---

VI. COMMAND TRIGGER MATRIX (OPERATIONAL SHORTCUTS)

When prompted with explicit slash commands, instantly narrow execution to the corresponding gate:
\`/council debate [topic]\`  
Bypass immediate consensus. Force Gate 1 & Gate 3 to pit competing architectural trade-offs, structural failure points, and operational friction against each other before converging on a recommendation.
\`/council stress-test [component/code]\`  
Execute an aggressive Gate 3 audit. Hunt for silent race conditions, memory leaks, unhandled serial dropouts, power-rail throttling, and mock-data bluffing. Expose fragile assumptions plainly.
\`/council synthesis [directive]\`  
Execute the full 4-Gate pipeline silently. Emit zero conversational preamble and output only the finalized, production-grade architectural specification, data schema, or runnable drop-in code.`;
}

/**
 * Evaluates any 10-Architect Council across 6 cognitive vectors and 4 Gates.
 * 100% NON-BLOCKING ADVISORY: Informs the user of synergies or potential blind spots
 * while leaving all selections and exports completely unlocked.
 */
export function evaluateCouncilChemistry(slots: CouncilSlots): CouncilEvaluationReport {
  const members: ArchitectProfile[] = [
    ...slots.gate1,
    ...slots.gate2,
    ...slots.gate3,
    ...slots.gate4,
  ];

  const avg = (fn: (a: ArchitectProfile) => number) =>
    Math.round(members.reduce((sum, m) => sum + fn(m), 0) / members.length);

  const aggregateVectors: CognitiveVector6D = {
    firstPrinciples: avg((m) => m.vectors.firstPrinciples),
    systemicSynthesis: avg((m) => m.vectors.systemicSynthesis),
    pragmaticMinimalism: avg((m) => m.vectors.pragmaticMinimalism),
    adversarialAudit: avg((m) => m.vectors.adversarialAudit),
    operationalStability: avg((m) => m.vectors.operationalStability),
    strategicMomentum: avg((m) => m.vectors.strategicMomentum),
  };

  // Gate-specific role fitness scores
  const gate1Score = Math.round(
    (slots.gate1[0].vectors.firstPrinciples + slots.gate1[1].vectors.firstPrinciples) / 2
  );
  const gate2Score = Math.round(
    (slots.gate2[0].vectors.systemicSynthesis +
      slots.gate2[1].vectors.systemicSynthesis +
      slots.gate2[2].vectors.systemicSynthesis) /
      3
  );
  const gate3Score = Math.round(
    (Math.max(slots.gate3[0].vectors.pragmaticMinimalism, slots.gate3[0].vectors.adversarialAudit) +
      Math.max(slots.gate3[1].vectors.operationalStability, slots.gate3[1].vectors.pragmaticMinimalism) +
      slots.gate3[2].vectors.adversarialAudit) /
      3
  );
  const gate4Score = Math.round(
    (slots.gate4[0].vectors.operationalStability +
      slots.gate4[0].vectors.strategicMomentum +
      slots.gate4[1].vectors.strategicMomentum * 2) /
      4
  );

  const findings: CouncilAdvisoryFinding[] = [];

  // Check for duplicate architects across slots
  const idCounts = new Map<string, number>();
  for (const m of members) {
    idCounts.set(m.id, (idCounts.get(m.id) || 0) + 1);
  }
  const duplicates = Array.from(idCounts.entries()).filter(([, count]) => count > 1);
  if (duplicates.length > 0) {
    const dupNames = duplicates
      .map(([id]) => members.find((m) => m.id === id)?.name || id)
      .join(', ');
    findings.push({
      severity: 'caution',
      gate: 'overall',
      title: `Duplicate Seat Assignment (${dupNames})`,
      detail: `You have assigned ${dupNames} to multiple seats. While your council will still compile and export without restriction, assigning 10 distinct minds maximizes multi-domain perspective.`,
      suggestedFix: 'Swap duplicate seats with complementary minds from the Hall of Architects if you want broader coverage.',
    });
  }

  // Gate 1 Check
  if (gate1Score >= 94) {
    findings.push({
      severity: 'optimal',
      gate: 'gate1',
      title: `Gate 1 Signal Isolation Locked (${slots.gate1[0].shortName} + ${slots.gate1[1].shortName})`,
      detail: `High empirical and axiomatic rigor (${gate1Score}/100). Premise errors and decorative jargon will be stripped before simulation begins.`,
    });
  } else if (gate1Score < 85) {
    findings.push({
      severity: 'advisory',
      gate: 'gate1',
      title: `Soft Gate 1 First-Principles Filter (${gate1Score}/100)`,
      detail: `${slots.gate1[0].shortName} and ${slots.gate1[1].shortName} lean more toward delivery or synthesis than raw axiomatic verification. The AI may accept flawed user premises without challenging them first.`,
      suggestedFix: 'Advisory only (no lock): Consider Marie Curie, Hypatia, Richard Feynman, Claude Shannon, or Billy Beane in Gate 1.',
    });
  }

  // Gate 2 Check
  if (gate2Score >= 93) {
    findings.push({
      severity: 'optimal',
      gate: 'gate2',
      title: `High-Dimensional Gate 2 Simulation (${slots.gate2.map((x) => x.shortName).join(' + ')})`,
      detail: `Exceptional spatial, algorithmic, and contingency modeling (${gate2Score}/100) before code or strategy emission.`,
    });
  } else if (gate2Score < 84) {
    findings.push({
      severity: 'advisory',
      gate: 'gate2',
      title: `Lower Gate 2 Architectural Modeling (${gate2Score}/100)`,
      detail: `Your Gate 2 trio has lower systemic simulation scores, which can favor blunt force over modular architecture.`,
      suggestedFix: 'Advisory only: Nikola Tesla, Ada Lovelace, Bill Walsh, or Margaret Hamilton excel in Gate 2.',
    });
  }

  // Gate 3 Check: Minimalism + BS Detector balance
  const maxGate3Minimalism = Math.max(...slots.gate3.map((m) => m.vectors.pragmaticMinimalism));
  const maxGate3Satire = Math.max(...slots.gate3.map((m) => m.vectors.adversarialAudit));

  if (maxGate3Minimalism < 88) {
    findings.push({
      severity: 'caution',
      gate: 'gate3',
      title: 'Gate 3 Over-Engineering Blind Spot (Low Minimalist Pruning)',
      detail: `None of your three Gate 3 auditors (${slots.gate3.map((x) => x.shortName).join(', ')}) specialize in ruthless minimalism. High-imagination Gate 2 designs may pass through without being pruned down to clean, simple primitives.`,
      suggestedFix: 'Advisory only: Consider Dennis Ritchie, John Wooden, John Carmack, or Ernest Hemingway in Gate 3.',
    });
  } else if (maxGate3Satire < 88) {
    findings.push({
      severity: 'advisory',
      gate: 'gate3',
      title: 'Mild Gate 3 Satirical Edge',
      detail: `Your Gate 3 has strong technical pragmatism but lacks a dedicated satirical BS cutter. Corporate buzzwords may be corrected politely rather than surgically punctured.`,
      suggestedFix: 'Advisory only: Daniel Tosh, George Carlin, Christopher Hitchens, or Fran Lebowitz sharpen Gate 3.',
    });
  } else {
    findings.push({
      severity: 'optimal',
      gate: 'gate3',
      title: `Lethal Gate 3 Pragmatic & BS Razor (${slots.gate3.map((x) => x.shortName).join(' + ')})`,
      detail: `Balanced combination of structural minimalism (${maxGate3Minimalism}/100) and zero-tolerance BS auditing (${maxGate3Satire}/100).`,
    });
  }

  // Sports synergy highlight if any sports architect is active
  const sportsMembers = members.filter((m) => m.category === 'Sports & Peak Performance');
  if (sportsMembers.length > 0) {
    findings.push({
      severity: 'optimal',
      gate: 'overall',
      title: `Championship Situational Execution Active (${sportsMembers.map((s) => s.shortName).join(', ')})`,
      detail: `Incorporating ${sportsMembers.map((s) => s.name).join(' & ')} injects clock-management discipline, foundational mechanics, and opponent-tendency exploitation into the cognitive pipeline.`,
    });
  }

  const overallScore = Math.round(
    gate1Score * 0.25 +
      gate2Score * 0.25 +
      gate3Score * 0.3 +
      gate4Score * 0.2 -
      duplicates.length * 4
  );

  let archetypeTitle = 'Balanced Polymath Engineering Council';
  if (aggregateVectors.adversarialAudit >= 93 && aggregateVectors.pragmaticMinimalism >= 92) {
    archetypeTitle = 'Hardened Red-Team & Zero-Bloat Razor';
  } else if (sportsMembers.length >= 3) {
    archetypeTitle = 'Championship Situational Game-Plan Council';
  } else if (aggregateVectors.systemicSynthesis >= 93 && aggregateVectors.firstPrinciples >= 94) {
    archetypeTitle = 'High-Dimensional R&D & Systems Foundry';
  } else if (aggregateVectors.strategicMomentum >= 93) {
    archetypeTitle = 'High-Velocity Executive Command Council';
  }

  const summaryVerdict =
    overallScore >= 92
      ? `Elite 4-Gate equilibrium (${overallScore}/100). Strong signal isolation in Gate 1, deep modeling in Gate 2, ruthless bloat/BS pruning in Gate 3, and composed delivery in Gate 4.`
      : `Custom specialized configuration (${overallScore}/100). Review the non-blocking advisory notes below—your council is 100% unlocked for immediate use or export.`;

  return {
    overallScore: Math.max(50, Math.min(100, overallScore)),
    archetypeTitle,
    summaryVerdict,
    aggregateVectors,
    gateScores: {
      gate1: gate1Score,
      gate2: gate2Score,
      gate3: gate3Score,
      gate4: gate4Score,
    },
    findings,
  };
}

/**
 * 3-Question Mission Matchmaker: Automatically drafts a 10-Architect Council tailored to the user's answers.
 */
export function autoDraftCouncilFromPreferences(prefs: MatchmakerPreferences): {
  slots: CouncilSlots;
  rationale: string;
} {
  const domainPresetMap: Record<MatchmakerPreferences['domain'], string> = {
    software_systems: 'ace-10-flagship',
    strategy_executive: 'executive-war-room',
    chief_of_staff: 'sovereign-chief-of-staff',
    sports_gameplan: 'championship-gameplan',
    redteam_legal: 'red-team-legal-razor',
    science_research: 'quantitative-research-lab',
    creative_writing: 'polymath-creative-studio',
  };

  const baseSlots = presetToCouncilSlots(domainPresetMap[prefs.domain]);

  // Customize Gate 2 / Gate 3 based on the user's #1 AI frustration
  if (prefs.frustration === 'fake_stubs') {
    baseSlots.gate3 = [
      findArchitectById('dennis-ritchie'),
      findArchitectById('linus-torvalds'),
      findArchitectById('kobe-bryant'),
    ];
  } else if (prefs.frustration === 'corporate_fluff') {
    baseSlots.gate3 = [
      findArchitectById('ernest-hemingway'),
      findArchitectById('george-carlin'),
      findArchitectById('daniel-tosh'),
    ];
  } else if (prefs.frustration === 'shallow_ideas') {
    baseSlots.gate1 = [findArchitectById('richard-feynman'), findArchitectById('hypatia')];
    baseSlots.gate2 = [
      findArchitectById('nikola-tesla'),
      findArchitectById('leonardo-da-vinci'),
      findArchitectById('john-von-neumann'),
    ];
  } else if (prefs.frustration === 'fragile_plans') {
    baseSlots.gate2 = [
      findArchitectById('bill-walsh'),
      findArchitectById('margaret-hamilton'),
      findArchitectById('ada-lovelace'),
    ];
    baseSlots.gate3[0] = findArchitectById('john-wooden');
    baseSlots.gate3[1] = findArchitectById('bill-belichick');
  }

  // Customize Gate 4 based on desired delivery energy
  if (prefs.deliveryStyle === 'stoic_command') {
    baseSlots.gate4 = [findArchitectById('marcus-aurelius'), findArchitectById('john-wooden')];
  } else if (prefs.deliveryStyle === 'high_momentum') {
    baseSlots.gate4 = [findArchitectById('jfk'), findArchitectById('muhammad-ali')];
  } else if (prefs.deliveryStyle === 'satirical_razor') {
    baseSlots.gate4 = [findArchitectById('marcus-aurelius'), findArchitectById('grace-hopper')];
    baseSlots.gate3[2] = findArchitectById('daniel-tosh');
  }

  const rationale = `Tailored for ${prefs.domain.replace('_', ' ').toUpperCase()}: anchored Gate 1 with ${baseSlots.gate1[0].name} & ${baseSlots.gate1[1].name}, modeled Gate 2 via ${baseSlots.gate2.map((x) => x.shortName).join(' + ')}, fortified Gate 3 against "${prefs.frustration.replace('_', ' ')}" using ${baseSlots.gate3.map((x) => x.shortName).join(' + ')}, and tuned Gate 4 delivery with ${baseSlots.gate4[0].shortName} & ${baseSlots.gate4[1].shortName}.`;

  return { slots: baseSlots, rationale };
}

/**
 * Resolves an unrecognized custom architect name entered by the user:
 * 1. Validates against blank, control-char, dot-segment (".."), or symbol-only inputs.
 * 2. Checks local Hall of Architects first.
 * 3. Queries the public Wikipedia REST API (with a 6s AbortController timeout) to verify if the person
 *    is a real historical/public figure and synthesizes their 4 ACE-10 cognitive heuristics + 6D vectors.
 * 4. If not found on Wikipedia or offline, returns `recognized: false` along with Gate suggestions.
 */
export async function lookupAndSynthesizeCustomArchitect(
  rawName: string,
  targetGate: GateId
): Promise<{
  recognized: boolean;
  source: 'catalog' | 'wikipedia' | 'unrecognized';
  profile?: ArchitectProfile;
  suggestions: ArchitectProfile[];
  message: string;
}> {
  const suggestions = HALL_OF_ARCHITECTS.filter((a) => a.recommendedGate === targetGate).slice(0, 4);
  if (typeof rawName !== 'string') {
    return {
      recognized: false,
      source: 'unrecognized',
      suggestions,
      message: 'Please enter a valid historical, scientific, technical, or sports figure name.',
    };
  }

  const cleaned = rawName
    .replace(/[\u200B-\u200D\uFEFF\x00-\x1F]/g, '')
    .trim()
    .slice(0, 120);

  // Require at least 2 Unicode letters to block dot-segments (".."), numbers, or punctuation-only queries
  const letterMatches = cleaned.match(/\p{L}/gu);
  if (!letterMatches || letterMatches.length < 2) {
    return {
      recognized: false,
      source: 'unrecognized',
      suggestions,
      message: 'Please enter a valid name containing at least two alphabetic characters.',
    };
  }

  // 1. Check local catalog first
  const localMatch = HALL_OF_ARCHITECTS.find(
    (a) =>
      a.name.toLowerCase() === cleaned.toLowerCase() ||
      a.shortName.toLowerCase() === cleaned.toLowerCase()
  );
  if (localMatch) {
    return {
      recognized: true,
      source: 'catalog',
      profile: localMatch,
      suggestions,
      message: `Matched pre-calibrated Architect "${localMatch.name}" in the ACE-10 Hall of Fame.`,
    };
  }

  // 2. Query public Wikipedia Summary API with a strict 6000ms timeout
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const safeWikiSlug = cleaned.replace(/^[./\\]+|[./\\]+$/g, '');
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      safeWikiSlug
    )}`;
    const res = await fetch(wikiUrl, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (res.ok) {
      const data = await res.json();
      const extract: string = typeof data?.extract === 'string' ? data.extract : '';
      const description: string = typeof data?.description === 'string' ? data.description : '';
      const title: string = typeof data?.title === 'string' && data.title.trim() ? data.title : cleaned;

      // Verify it's not a disambiguation page or stub
      const isDisambig = data?.type === 'disambiguation';
      if (!isDisambig && extract.length > 30) {
        const synthesized = synthesizeHeuristicsFromBio(title, description, extract, targetGate);
        return {
          recognized: true,
          source: 'wikipedia',
          profile: synthesized,
          suggestions,
          message: `Verified "${title}" (${
            description || 'Historical / Public Figure'
          }) via encyclopedia telemetry and synthesized ACE-10 heuristics.`,
        };
      }
    }
  } catch {
    // Offline, timeout, or network restricted — fall through to unrecognized handler cleanly
  } finally {
    clearTimeout(timer);
  }

  return {
    recognized: false,
    source: 'unrecognized',
    suggestions,
    message: `"${cleaned}" was not recognized in our pre-calibrated catalog or biographical index (or network is offline). Choose a recommended Gate ${targetGate.replace(
      'gate',
      ''
    )} architect below, or define custom heuristics manually below to force-add "${cleaned}".`,
  };
}

function synthesizeHeuristicsFromBio(
  fullName: string,
  description: string,
  extract: string,
  targetGate: GateId
): ArchitectProfile {
  const text = `${description} ${extract}`.toLowerCase();
  const shortName = extractSafeShortName(fullName);

  let category: ArchitectCategory = 'Philosophy & Stoicism';
  let heuristics =
    'First-principles problem decomposition, disciplined domain mastery, high-signal verification, and resilient execution under pressure.';
  const signatureStrength = description
    ? `Translates the core methods of ${fullName} (${description}) into a functional cognitive filter.`
    : `Applies the operational mental models of ${fullName} to Gate ${targetGate.replace('gate', '')}.`;

  const vectors: CognitiveVector6D = {
    firstPrinciples: 86,
    systemicSynthesis: 86,
    pragmaticMinimalism: 86,
    adversarialAudit: 84,
    operationalStability: 86,
    strategicMomentum: 86,
  };

  if (
    /coach|athlete|player|champion|olympic|quarterback|basketball|football|baseball|boxing|martial|swordsman|f1|racing/.test(
      text
    )
  ) {
    category = 'Sports & Peak Performance';
    heuristics =
      'Situational game-clock mastery, relentless fundamentals under fatigue, opponent tendency exploitation, and zero-wasted-motion execution.';
    vectors.operationalStability = 95;
    vectors.strategicMomentum = 95;
    vectors.pragmaticMinimalism = 92;
  } else if (
    /computer|programmer|software|engineer|mathematician|cryptograph|algorithm|hacker/.test(text)
  ) {
    category = 'Systems & Code';
    heuristics =
      'Algorithmic rigor, modular state architecture, strict elimination of redundant complexity, and deterministic failure-mode verification.';
    vectors.firstPrinciples = 94;
    vectors.systemicSynthesis = 94;
    vectors.pragmaticMinimalism = 93;
  } else if (/physicist|chemist|biologist|astronomer|scientist|nobel/.test(text)) {
    category = 'Science & Math';
    heuristics =
      'Empirical hypothesis isolation, quantitative first-principles modeling, falsifiability stress-testing, and immunity to conventional dogma.';
    vectors.firstPrinciples = 96;
    vectors.systemicSynthesis = 92;
  } else if (/comedian|satirist|journalist|critic|lawyer|judge|investigat/.test(text)) {
    category = 'Satire & Red-Team';
    heuristics =
      'Subversive BS detection, evidentiary cross-examination, allergic hostility to corporate euphemisms, and razor-sharp rhetorical precision.';
    vectors.adversarialAudit = 97;
    vectors.pragmaticMinimalism = 91;
  } else if (
    /general|admiral|president|emperor|economist|investor|founder|executive|strategist/.test(text)
  ) {
    category = 'Strategy & Statecraft';
    heuristics =
      'Asymmetric resource allocation, second-order incentive modeling, crisis composure, and decisive operational alignment.';
    vectors.strategicMomentum = 96;
    vectors.operationalStability = 93;
  } else if (/writer|author|poet|director|artist|composer|architect|designer|chef/.test(text)) {
    category = 'Creative & Literature';
    heuristics =
      'Structural composition, ruthless elimination of cliché and ornamental bloat, sensory precision, and cross-domain aesthetic synthesis.';
    vectors.systemicSynthesis = 94;
    vectors.pragmaticMinimalism = 92;
  }

  return {
    id: buildSafeCustomId('custom-wiki', fullName),
    name: fullName,
    shortName,
    eraOrTitle: description
      ? description.charAt(0).toUpperCase() + description.slice(1)
      : 'Custom Synthesized Architect',
    category,
    recommendedGate: targetGate,
    heuristics,
    signatureStrength,
    vectors,
    isCustom: true,
    wikiVerified: true,
    wikiExtract: extract.slice(0, 280),
  };
}
