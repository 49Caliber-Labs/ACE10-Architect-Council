export type GateId = 'gate1' | 'gate2' | 'gate3' | 'gate4';

export type ArchitectCategory =
  | 'Science & Math'
  | 'Systems & Code'
  | 'Strategy & Statecraft'
  | 'Sports & Peak Performance'
  | 'Philosophy & Stoicism'
  | 'Satire & Red-Team'
  | 'Creative & Literature';

export interface CognitiveVector6D {
  firstPrinciples: number;     // Gate 1: Signal extraction, empirical isolation, mathematical truth
  systemicSynthesis: number;   // Gate 2: Spatial/multi-domain mental simulation, architectural design
  pragmaticMinimalism: number; // Gate 3: Bloat pruning, Unix simplicity, fundamentals mastery
  adversarialAudit: number;    // Gate 3: Satirical BS detection, red-teaming, fallacy destruction
  operationalStability: number;// Gate 3/4: Regression defense, clutch reliability, fault tolerance
  strategicMomentum: number;   // Gate 4: Audacious mission framing, composed authority, alignment
}

export interface ArchitectProfile {
  id: string;
  name: string;
  shortName: string;
  eraOrTitle: string;
  category: ArchitectCategory;
  recommendedGate: GateId;
  heuristics: string;
  signatureStrength: string;
  vectors: CognitiveVector6D;
  isCustom?: boolean;
  wikiVerified?: boolean;
  wikiExtract?: string;
}

export interface CouncilSlots {
  gate1: [ArchitectProfile, ArchitectProfile];
  gate2: [ArchitectProfile, ArchitectProfile, ArchitectProfile];
  gate3: [ArchitectProfile, ArchitectProfile, ArchitectProfile];
  gate4: [ArchitectProfile, ArchitectProfile];
}

export interface CuratedCouncilPreset {
  id: string;
  name: string;
  badge: string;
  tagline: string;
  targetUseCase: string;
  gate1Ids: [string, string];
  gate2Ids: [string, string, string];
  gate3Ids: [string, string, string];
  gate4Ids: [string, string];
  samplePrompt: string;
  standardAiResponse: string;
  ace10Response: string;
}

export interface CouncilAdvisoryFinding {
  severity: 'optimal' | 'advisory' | 'caution';
  gate: GateId | 'overall';
  title: string;
  detail: string;
  suggestedFix?: string;
}

export interface CouncilEvaluationReport {
  overallScore: number;
  archetypeTitle: string;
  summaryVerdict: string;
  aggregateVectors: CognitiveVector6D;
  gateScores: {
    gate1: number;
    gate2: number;
    gate3: number;
    gate4: number;
  };
  findings: CouncilAdvisoryFinding[];
}

export interface MatchmakerPreferences {
  domain:
    | 'software_systems'
    | 'strategy_executive'
    | 'chief_of_staff'
    | 'sports_gameplan'
    | 'redteam_legal'
    | 'science_research'
    | 'creative_writing';
  frustration:
    | 'fake_stubs'
    | 'corporate_fluff'
    | 'shallow_ideas'
    | 'fragile_plans';
  deliveryStyle:
    | 'stoic_command'
    | 'high_momentum'
    | 'satirical_razor';
}
