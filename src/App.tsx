import React, { useState, useMemo, useEffect } from 'react';
import {
  ArchitectCategory,
  ArchitectProfile,
  CouncilSlots,
  GateId,
  MatchmakerPreferences,
} from './types/council';
import { CURATED_COUNCIL_PRESETS, HALL_OF_ARCHITECTS } from './data/architectCatalog';
import {
  autoDraftCouncilFromPreferences,
  buildSafeCustomId,
  compileAce10SystemInstruction,
  evaluateCouncilChemistry,
  extractSafeShortName,
  lookupAndSynthesizeCustomArchitect,
  presetToCouncilSlots,
  sanitizeCouncilSlots,
} from './utils/councilCompiler';
import { LiveTestBench } from './components/LiveTestBench';
import {
  Shield,
  Sparkles,
  Copy,
  Check,
  Download,
  Sliders,
  Users,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  Terminal,
  Trophy,
  Cpu,
  Scale,
  Compass,
  X,
  PlusCircle,
  BookOpen,
  Layers,
} from 'lucide-react';

const GATE_METADATA: Record<
  GateId,
  {
    number: number;
    title: string;
    subtitle: string;
    roleDescription: string;
    accentColor: string;
    badgeBg: string;
    seatCount: number;
  }
> = {
  gate1: {
    number: 1,
    title: 'Gate 1: First-Principles Deconstruction & Signal Extraction',
    subtitle: '2 Seats • Truth Isolation & Premise Verification',
    roleDescription:
      'Strips away jargon, decorative narrative, and assumed conventions. Isolates foundational variables and objective truths before modeling.',
    accentColor: 'border-cyan-400/60',
    badgeBg: 'bg-cyan-400 text-slate-950',
    seatCount: 2,
  },
  gate2: {
    number: 2,
    title: 'Gate 2: Multi-Domain Simulation & Structural Modeling',
    subtitle: '3 Seats • Mental Simulation & Programmatic Architecture',
    roleDescription:
      'Simulates edge cases, load-bearing limits, and systemic failure points mentally before committing to a modular architecture.',
    accentColor: 'border-amber-400/60',
    badgeBg: 'bg-amber-400 text-slate-950',
    seatCount: 3,
  },
  gate3: {
    number: 3,
    title: 'Gate 3: The Pragmatic Bedrock & BS Audit',
    subtitle: '3 Seats • Minimalism, Regression Defense & Satirical Razor',
    roleDescription:
      'Ruthlessly prunes bloat, redundant layers, and slide-deck pretense. Audits whether the solution actually works under real-world friction.',
    accentColor: 'border-rose-500/60',
    badgeBg: 'bg-rose-500 text-white',
    seatCount: 3,
  },
  gate4: {
    number: 4,
    title: 'Gate 4: Strategic Delivery & Alignment',
    subtitle: '2 Seats • Composed Authority & High-Stakes Momentum',
    roleDescription:
      'Delivers findings immediately in Sentence 1 with stoic equilibrium, concrete operational verbs, and decisive execution momentum.',
    accentColor: 'border-emerald-400/60',
    badgeBg: 'bg-emerald-400 text-slate-950',
    seatCount: 2,
  },
};

const ALL_CATEGORIES: Array<'ALL' | ArchitectCategory> = [
  'ALL',
  'Sports & Peak Performance',
  'Systems & Code',
  'Science & Math',
  'Strategy & Statecraft',
  'Satire & Red-Team',
  'Creative & Literature',
  'Philosophy & Stoicism',
];

const STUDIO_STORAGE_KEY = 'ace10_studio_state_v1';

export default function App() {
  const [activePresetId, setActivePresetId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STUDIO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed?.activePresetId === 'string' &&
          CURATED_COUNCIL_PRESETS.some((p) => p.id === parsed.activePresetId)
        ) {
          return parsed.activePresetId;
        }
      }
    } catch {
      // Recover cleanly on corrupted localStorage
    }
    return 'ace-10-flagship';
  });

  const [councilSlots, setCouncilSlots] = useState<CouncilSlots>(() => {
    try {
      const saved = localStorage.getItem(STUDIO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const validSlots = sanitizeCouncilSlots(parsed?.councilSlots);
        if (validSlots) return validSlots;
      }
    } catch {
      // Recover cleanly on corrupted localStorage
    }
    return presetToCouncilSlots('ace-10-flagship');
  });

  const [customBannerNote, setCustomBannerNote] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STUDIO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.customBannerNote === 'string' && parsed.customBannerNote.trim()) {
          return parsed.customBannerNote;
        }
      }
    } catch {
      // Recover cleanly
    }
    return null;
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        STUDIO_STORAGE_KEY,
        JSON.stringify({
          activePresetId,
          councilSlots,
          customBannerNote,
        })
      );
    } catch {
      // Quota or private browsing fallback
    }
  }, [activePresetId, councilSlots, customBannerNote]);

  // Matchmaker state
  const [isMatchmakerOpen, setIsMatchmakerOpen] = useState<boolean>(false);
  const [matchPrefs, setMatchPrefs] = useState<MatchmakerPreferences>({
    domain: 'software_systems',
    frustration: 'fake_stubs',
    deliveryStyle: 'stoic_command',
  });

  // Seat Picker Modal state
  const [editingSeat, setEditingSeat] = useState<{ gate: GateId; index: number } | null>(null);
  const [catalogCategory, setCatalogCategory] = useState<'ALL' | ArchitectCategory>('ALL');
  const [catalogSearch, setCatalogSearch] = useState<string>('');

  // Custom / Unrecognized Architect Lookup state
  const [customNameInput, setCustomNameInput] = useState<string>('');
  const [customHeuristicsInput, setCustomHeuristicsInput] = useState<string>('');
  const [isLookingUpCustom, setIsLookingUpCustom] = useState<boolean>(false);
  const [customLookupResult, setCustomLookupResult] = useState<{
    recognized: boolean;
    source: 'catalog' | 'wikipedia' | 'unrecognized';
    profile?: ArchitectProfile;
    suggestions: ArchitectProfile[];
    message: string;
  } | null>(null);

  // Copy feedback state
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);

  const activePreset = useMemo(
    () =>
      CURATED_COUNCIL_PRESETS.find((p) => p.id === activePresetId) ||
      CURATED_COUNCIL_PRESETS[0],
    [activePresetId]
  );

  const compiledInstruction = useMemo(
    () => compileAce10SystemInstruction(councilSlots),
    [councilSlots]
  );

  const evaluation = useMemo(
    () => evaluateCouncilChemistry(councilSlots),
    [councilSlots]
  );

  const handleSelectPreset = (presetId: string) => {
    setActivePresetId(presetId);
    setCouncilSlots(presetToCouncilSlots(presetId));
    setCustomBannerNote(null);
  };

  const handleAssignArchitectToSeat = (
    gate: GateId,
    index: number,
    architect: ArchitectProfile
  ) => {
    setCouncilSlots((prev) => {
      const updated = { ...prev };
      if (gate === 'gate1') {
        const next: [ArchitectProfile, ArchitectProfile] = [prev.gate1[0], prev.gate1[1]];
        next[index] = architect;
        updated.gate1 = next;
      } else if (gate === 'gate2') {
        const next: [ArchitectProfile, ArchitectProfile, ArchitectProfile] = [
          prev.gate2[0],
          prev.gate2[1],
          prev.gate2[2],
        ];
        next[index] = architect;
        updated.gate2 = next;
      } else if (gate === 'gate3') {
        const next: [ArchitectProfile, ArchitectProfile, ArchitectProfile] = [
          prev.gate3[0],
          prev.gate3[1],
          prev.gate3[2],
        ];
        next[index] = architect;
        updated.gate3 = next;
      } else if (gate === 'gate4') {
        const next: [ArchitectProfile, ArchitectProfile] = [prev.gate4[0], prev.gate4[1]];
        next[index] = architect;
        updated.gate4 = next;
      }
      return updated;
    });
    setCustomBannerNote(
      `Custom Council Active: Seated ${architect.name} into ${GATE_METADATA[gate].title.split(':')[0]}.`
    );
    setEditingSeat(null);
    setCustomLookupResult(null);
    setCustomNameInput('');
    setCustomHeuristicsInput('');
  };

  const handleRunMatchmaker = () => {
    const { slots, rationale } = autoDraftCouncilFromPreferences(matchPrefs);
    setCouncilSlots(slots);
    setCustomBannerNote(rationale);
    setIsMatchmakerOpen(false);
  };

  const handleLookupCustomPerson = async () => {
    if (!editingSeat || !customNameInput.trim()) return;
    setIsLookingUpCustom(true);
    try {
      const res = await lookupAndSynthesizeCustomArchitect(
        customNameInput,
        editingSeat.gate
      );
      setCustomLookupResult(res);
      if (res.profile && !customHeuristicsInput) {
        setCustomHeuristicsInput(res.profile.heuristics);
      }
    } finally {
      setIsLookingUpCustom(false);
    }
  };

  const handleForceCustomArchitect = () => {
    if (!editingSeat || !customNameInput.trim()) return;
    const raw = customNameInput.replace(/[\u200B-\u200D\uFEFF\x00-\x1F]/g, '').trim();
    if (!raw) return;
    const shortName = extractSafeShortName(raw);
    const heuristics =
      customHeuristicsInput.trim() ||
      'First-principles problem decomposition, disciplined domain mastery, high-signal verification, and resilient execution under pressure.';

    const forcedProfile: ArchitectProfile = {
      id: buildSafeCustomId('custom-user', raw),
      name: raw,
      shortName,
      eraOrTitle: 'User-Defined Custom Architect',
      category: 'Philosophy & Stoicism',
      recommendedGate: editingSeat.gate,
      heuristics,
      signatureStrength: `Custom heuristic filter defined for ${raw}.`,
      vectors: {
        firstPrinciples: 88,
        systemicSynthesis: 88,
        pragmaticMinimalism: 88,
        adversarialAudit: 88,
        operationalStability: 88,
        strategicMomentum: 88,
      },
      isCustom: true,
    };

    handleAssignArchitectToSeat(editingSeat.gate, editingSeat.index, forcedProfile);
  };

  const handleCopyPrompt = async (label = 'raw') => {
    try {
      await navigator.clipboard.writeText(compiledInstruction);
      setCopiedTarget(label);
      setTimeout(() => setCopiedTarget(null), 2200);
    } catch {
      // Fallback
    }
  };

  const handleDownloadFile = (filename: string) => {
    const blob = new Blob([compiledInstruction], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredCatalog = useMemo(() => {
    return HALL_OF_ARCHITECTS.filter((arch) => {
      if (catalogCategory !== 'ALL' && arch.category !== catalogCategory) return false;
      if (catalogSearch.trim()) {
        const q = catalogSearch.toLowerCase();
        const hay = `${arch.name} ${arch.shortName} ${arch.eraOrTitle} ${arch.category} ${arch.heuristics}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [catalogCategory, catalogSearch]);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 pb-24">
      {/* Top Accent Gradient Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-500" />

      {/* =================================================================== */}
      {/* STICKY COMMAND HEADER                                               */}
      {/* =================================================================== */}
      <header className="sticky top-0 z-30 bg-[#0b1120]/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 via-rose-500 to-cyan-400 p-0.5 shadow-lg">
              <div className="w-full h-full bg-[#070b14] rounded-[10px] flex items-center justify-center text-amber-400 font-display font-bold text-lg">
                10
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display font-bold text-lg sm:text-xl tracking-tight text-white">
                  ACE-10 • Architect Council Engine
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-400 text-slate-950">
                  OPEN-SOURCE STUDIO v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                10-Archetype Cognitive Heuristic Pipeline • Anti-Simulation &amp; Zero-Stub System Instructions
              </p>
            </div>
          </div>

          {/* Right Action Bar: Matchmaker + One-Click Exports */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsMatchmakerOpen(!isMatchmakerOpen)}
              className="h-9 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Compass className="w-4 h-4" />
              <span>3-Click Council Matchmaker</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopyPrompt('header')}
              className="h-9 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-md"
            >
              {copiedTarget === 'header' ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Copied ACE-10 Prompt!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy System Instruction</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleDownloadFile('GEMINI.md')}
              className="h-9 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              title="Download as GEMINI.md for Google Antigravity / Gemini CLI"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>GEMINI.md</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadFile('.cursorrules')}
              className="h-9 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              title="Download as .cursorrules"
            >
              <Download className="w-3.5 h-3.5 text-rose-400" />
              <span>.cursorrules</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* =================================================================== */}
        {/* COLLAPSIBLE 3-QUESTION MISSION MATCHMAKER                           */}
        {/* =================================================================== */}
        {isMatchmakerOpen && (
          <section className="rounded-2xl border-2 border-cyan-400/60 bg-[#0d1527] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-cyan-400" />
                <h2 className="font-display font-bold text-base sm:text-lg text-white">
                  3-Click Mission Matchmaker — Auto-Cater Your 10-Architect Council
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsMatchmakerOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Q1 */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 block">
                  1. Primary Mission Domain
                </label>
                <select
                  value={matchPrefs.domain}
                  onChange={(e) =>
                    setMatchPrefs({
                      ...matchPrefs,
                      domain: e.target.value as MatchmakerPreferences['domain'],
                    })
                  }
                  className="w-full h-10 rounded-lg bg-slate-950 border border-slate-700 px-3 text-xs font-bold text-white"
                >
                  <option value="software_systems">Full-Stack Software &amp; Hardware Engineering</option>
                  <option value="sports_gameplan">Championship Game-Plan &amp; Clutch Execution (Sports)</option>
                  <option value="strategy_executive">Startup Strategy, Venture &amp; Negotiation</option>
                  <option value="chief_of_staff">Personal Assistant, Calendar &amp; Life Triage</option>
                  <option value="redteam_legal">Adversarial Red-Team, Security &amp; Contracts</option>
                  <option value="science_research">Hard Science, Math &amp; Empirical Research</option>
                  <option value="creative_writing">Creative Worldbuilding, Copywriting &amp; Prose</option>
                </select>
              </div>

              {/* Q2 */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-amber-400 block">
                  2. Biggest AI Frustration to Eliminate
                </label>
                <select
                  value={matchPrefs.frustration}
                  onChange={(e) =>
                    setMatchPrefs({
                      ...matchPrefs,
                      frustration: e.target.value as MatchmakerPreferences['frustration'],
                    })
                  }
                  className="w-full h-10 rounded-lg bg-slate-950 border border-slate-700 px-3 text-xs font-bold text-white"
                >
                  <option value="fake_stubs">Fake stubs, "// TODO" placeholders &amp; lazy code</option>
                  <option value="corporate_fluff">Wordy corporate buzzwords &amp; sycophantic praise</option>
                  <option value="shallow_ideas">Unoriginal, inside-the-box thinking</option>
                  <option value="fragile_plans">Fragile plans that break under real-world pressure</option>
                </select>
              </div>

              {/* Q3 */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-rose-400 block">
                  3. Gate 4 Delivery Energy
                </label>
                <select
                  value={matchPrefs.deliveryStyle}
                  onChange={(e) =>
                    setMatchPrefs({
                      ...matchPrefs,
                      deliveryStyle: e.target.value as MatchmakerPreferences['deliveryStyle'],
                    })
                  }
                  className="w-full h-10 rounded-lg bg-slate-950 border border-slate-700 px-3 text-xs font-bold text-white"
                >
                  <option value="stoic_command">Stoic, Clinical &amp; Unshakeable (Aurelius + Wooden)</option>
                  <option value="high_momentum">Audacious &amp; High-Momentum (JFK + Muhammad Ali)</option>
                  <option value="satirical_razor">Piercing Satirical Honesty (Tosh + Hopper)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={handleRunMatchmaker}
                className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <Sparkles className="w-4 h-4" />
                <span>Assemble My Tailored 10-Architect Council</span>
              </button>
            </div>
          </section>
        )}

        {/* =================================================================== */}
        {/* STEP 1: 8 CURATED COUNCIL PRESETS                                   */}
        {/* =================================================================== */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                Step 1 • Select a Curated Council Preset or Customize Any Seat
              </span>
              <h2 className="font-display font-bold text-lg sm:text-xl text-white">
                8 Pre-Engineered Architect Councils (Sections III–VI Locked)
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              Includes 8 Sports &amp; Tactical Legends (Wooden, Walsh, Kobe, Belichick, Moneyball, Ali, Senna, Summitt)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CURATED_COUNCIL_PRESETS.map((preset) => {
              const isSelected = activePresetId === preset.id && !customBannerNote;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#111c33] border-amber-400 shadow-lg shadow-amber-500/10'
                      : 'bg-[#0b1120] border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          preset.id === 'championship-gameplan'
                            ? 'bg-emerald-400 text-slate-950'
                            : isSelected
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-sky-300'
                        }`}
                      >
                        {preset.badge}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-extrabold text-amber-400">● ACTIVE</span>
                      )}
                    </div>
                    <h3 className="font-display font-bold text-sm sm:text-base text-white">
                      {preset.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {preset.tagline}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 text-[11px] font-mono text-cyan-300 truncate">
                    {preset.targetUseCase}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Custom Matchmaker / Seat Override Status Banner */}
        {customBannerNote && (
          <div className="rounded-xl bg-cyan-950/50 border border-cyan-400/50 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 text-xs text-cyan-100 font-medium">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{customBannerNote}</span>
            </div>
            <button
              type="button"
              onClick={() => handleSelectPreset(activePresetId)}
              className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-bold text-amber-300 border border-slate-700 cursor-pointer shrink-0"
            >
              Reset to {activePreset.name}
            </button>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 2: INTERACTIVE 4-GATE COGNITIVE PIPELINE (THE 10 SEATS)        */}
        {/* =================================================================== */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-400">
                Step 2 • Interactive 4-Gate Seat Assignment
              </span>
              <h2 className="font-display font-bold text-lg sm:text-xl text-white">
                Active 10-Architect Council (Click Any Seat to Swap or Add Custom Figure)
              </h2>
            </div>
            <div className="text-xs text-slate-400">
              Swapping any seat automatically updates <strong className="text-white">Section I</strong> and <strong className="text-white">Section II (Gates 1–4)</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(['gate1', 'gate2', 'gate3', 'gate4'] as GateId[]).map((gateKey) => {
              const meta = GATE_METADATA[gateKey];
              const seats = councilSlots[gateKey];
              const gateScore = evaluation.gateScores[gateKey];

              return (
                <div
                  key={gateKey}
                  className={`rounded-2xl bg-[#0b1120] border-2 ${meta.accentColor} p-4 sm:p-5 space-y-3.5 shadow-lg`}
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${meta.badgeBg}`}>
                          GATE {meta.number} ({seats.map((s) => s.shortName).join(' + ')})
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-400">
                          Gate Fitness: {gateScore}/100
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-base text-white mt-1">
                        {meta.title.split(': ')[1]}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">{meta.roleDescription}</p>
                    </div>
                  </div>

                  {/* Seats inside this Gate */}
                  <div className="space-y-2.5">
                    {seats.map((arch, idx) => (
                      <div
                        key={`${gateKey}-${idx}-${arch.id}`}
                        className="rounded-xl bg-[#111a2e] border border-slate-800 hover:border-slate-600 p-3.5 flex items-start justify-between gap-3 transition-all"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-extrabold text-amber-400">
                              Seat #{idx + 1}:
                            </span>
                            <span className="font-display font-bold text-sm sm:text-base text-white">
                              {arch.name}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-sky-300 border border-slate-700">
                              {arch.category}
                            </span>
                            {arch.isCustom && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-900/70 text-purple-200 border border-purple-500/40">
                                {arch.wikiVerified ? 'WIKI-SYNTHESIZED' : 'CUSTOM ARCHITECT'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium">
                            {arch.eraOrTitle}
                          </div>
                          <p className="text-xs text-slate-200 leading-relaxed pt-0.5">
                            <strong className="text-cyan-300">Heuristics:</strong> {arch.heuristics}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingSeat({ gate: gateKey, index: idx });
                            setCatalogCategory('ALL');
                            setCatalogSearch('');
                            setCustomLookupResult(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-200 font-extrabold text-xs border border-slate-700 cursor-pointer shrink-0 transition-colors"
                        >
                          Swap Seat
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* =================================================================== */}
        {/* STEP 3: NON-BLOCKING COUNCIL CHEMISTRY & BLIND-SPOT EVALUATOR       */}
        {/* =================================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Cols: 6-Vector Chemistry & Non-Blocking Advisory Findings */}
          <div className="lg:col-span-7 rounded-2xl bg-[#0b1120] border-2 border-slate-800 p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-400 text-slate-950">
                    NON-BLOCKING ADVISORY AUDIT
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    All Custom Lineups 100% Unlocked
                  </span>
                </div>
                <h3 className="font-display font-bold text-lg text-white mt-1">
                  {evaluation.archetypeTitle} ({evaluation.overallScore}/100)
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">{evaluation.summaryVerdict}</p>
              </div>
            </div>

            {/* 6-Vector Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {[
                { label: 'First-Principles Rigor (Gate 1)', val: evaluation.aggregateVectors.firstPrinciples, color: 'bg-cyan-400' },
                { label: 'Systemic & Spatial Synthesis (Gate 2)', val: evaluation.aggregateVectors.systemicSynthesis, color: 'bg-amber-400' },
                { label: 'Pragmatic Minimalism (Gate 3)', val: evaluation.aggregateVectors.pragmaticMinimalism, color: 'bg-emerald-400' },
                { label: 'Adversarial & Satirical BS Audit (Gate 3)', val: evaluation.aggregateVectors.adversarialAudit, color: 'bg-rose-500' },
                { label: 'Operational & Clutch Stability', val: evaluation.aggregateVectors.operationalStability, color: 'bg-sky-400' },
                { label: 'Strategic Delivery Momentum (Gate 4)', val: evaluation.aggregateVectors.strategicMomentum, color: 'bg-purple-400' },
              ].map((vec) => (
                <div key={vec.label} className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300">{vec.label}</span>
                    <span className="font-mono text-white">{vec.val}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${vec.color}`}
                      style={{ width: `${vec.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Findings List */}
            <div className="space-y-2.5 pt-2">
              {evaluation.findings.map((f, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                    f.severity === 'optimal'
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-100'
                      : f.severity === 'caution'
                      ? 'bg-amber-950/40 border-amber-400/50 text-amber-100'
                      : 'bg-sky-950/40 border-sky-400/40 text-sky-100'
                  }`}
                >
                  <div className="font-extrabold flex items-center gap-1.5">
                    {f.severity === 'optimal' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span>{f.title}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{f.detail}</p>
                  {f.suggestedFix && (
                    <p className="text-[11px] font-mono text-amber-300 pt-0.5">
                      💡 {f.suggestedFix}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right 5 Cols: Standard AI vs. ACE-10 Live Output Comparison */}
          <div className="lg:col-span-5 rounded-2xl bg-[#0b1120] border-2 border-slate-800 p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="border-b border-slate-800 pb-3">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
                  BEHAVIORAL BENCHMARK
                </span>
                <h3 className="font-display font-bold text-lg text-white mt-1">
                  Standard AI vs. {activePreset.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  See how the 4-Gate pipeline eliminates sycophancy and throat-clearing on a real prompt.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <div className="text-[10px] font-mono uppercase text-cyan-400 font-bold mb-1">
                  Test User Prompt:
                </div>
                <div className="font-semibold text-white">&ldquo;{activePreset.samplePrompt}&rdquo;</div>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-950/25 border border-rose-500/30 text-xs space-y-1">
                <div className="text-[10px] font-mono uppercase text-rose-400 font-extrabold">
                  ❌ Default Unconfigured LLM (Sycophantic &amp; Shallow):
                </div>
                <p className="text-slate-300 italic leading-relaxed">
                  &ldquo;{activePreset.standardAiResponse}&rdquo;
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-400/50 text-xs space-y-1">
                <div className="text-[10px] font-mono uppercase text-emerald-400 font-extrabold">
                  ⚡ ACE-10 Compiled Output (Sentence-1 Verdict + Concrete Mechanics):
                </div>
                <p className="text-white font-medium leading-relaxed">
                  &ldquo;{activePreset.ace10Response}&rdquo;
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Sections III, IV, V &amp; VI Enforced</span>
              <span className="font-mono text-amber-400">/council debate • /council stress-test</span>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* STEP 4: LIVE EXECUTION HARNESS & SECTION III–V COMPLIANCE LINTER    */}
        {/* =================================================================== */}
        <LiveTestBench
          compiledInstruction={compiledInstruction}
          activePresetName={activePreset.name}
          defaultPrompt={activePreset.samplePrompt}
          sampleBadOutput={activePreset.standardAiResponse}
          sampleAce10Output={activePreset.ace10Response}
        />

        {/* =================================================================== */}
        {/* STEP 5: LIVE COMPILED ACE-10 SYSTEM INSTRUCTION OUTPUT              */}
        {/* =================================================================== */}
        <section className="rounded-2xl bg-[#0b1120] border-2 border-amber-400/60 overflow-hidden shadow-2xl">
          <div className="bg-slate-900 px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-extrabold uppercase text-amber-400">
                  LIVE COMPILED SYSTEM INSTRUCTION (SECTIONS III–VI LOCKED VERBATIM)
                </span>
              </div>
              <h3 className="font-display font-bold text-base sm:text-lg text-white mt-0.5">
                Ready for Antigravity (`GEMINI.md`), Claude Code (`CLAUDE.md`), Cursor, or ChatGPT
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleCopyPrompt('compiler')}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                {copiedTarget === 'compiler' ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Full Instruction</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleDownloadFile('CLAUDE.md')}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs inline-flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Download CLAUDE.md</span>
              </button>
            </div>
          </div>

          <pre className="p-5 text-xs font-mono text-slate-200 bg-[#050811] overflow-x-auto leading-relaxed max-h-[540px] overflow-y-auto whitespace-pre-wrap">
            {compiledInstruction}
          </pre>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 text-center text-[11px] text-slate-500">
        ACE-10 is an open-source community contribution by{' '}
        <strong className="text-slate-300">49Caliber Labs</strong> • MIT License
      </footer>

      {/* ===================================================================== */}
      {/* SEAT SWAP & UNRECOGNIZED ARCHITECT BIOGRAPHICAL SYNTHESIS MODAL       */}
      {/* ===================================================================== */}
      {editingSeat && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          onClick={() => setEditingSeat(null)}
        >
          <div
            className="bg-[#0b1120] border-2 border-amber-400 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 sticky top-0 z-10">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-950">
                  CUSTOMIZE {GATE_METADATA[editingSeat.gate].title.split(':')[0].toUpperCase()} • SEAT #{editingSeat.index + 1}
                </span>
                <h3 className="font-display font-bold text-base sm:text-lg text-white mt-1">
                  Select from the Hall of Architects ({HALL_OF_ARCHITECTS.length} Pre-Calibrated Minds) or Enter Any Custom Figure
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSeat(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* Custom / Unrecognized Architect Input Box */}
              <div className="rounded-xl bg-[#111a2e] border border-cyan-500/40 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4" />
                    <span>Want Someone Not Listed Below? Verify &amp; Synthesize Any Historical or Sports Figure</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Queries Biographical Index + Suggests Alternatives if Unrecognized
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={customNameInput}
                    onChange={(e) => setCustomNameInput(e.target.value)}
                    placeholder="e.g., Miyamoto Musashi, Wayne Gretzky, Anthony Bourdain, Rick Rubin, Diogenes..."
                    className="flex-1 h-10 rounded-lg bg-slate-950 border border-slate-700 px-3 text-xs font-bold text-white placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={handleLookupCustomPerson}
                    disabled={isLookingUpCustom || !customNameInput.trim()}
                    className="h-10 px-4 rounded-lg bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-slate-950 font-extrabold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Search className="w-4 h-4" />
                    <span>{isLookingUpCustom ? 'Verifying Figure...' : 'Verify & Synthesize'}</span>
                  </button>
                </div>

                {/* Result of Custom Lookup */}
                {customLookupResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs space-y-3 ${
                      customLookupResult.recognized
                        ? 'bg-emerald-950/40 border-emerald-400/50 text-emerald-100'
                        : 'bg-amber-950/40 border-amber-400/60 text-amber-100'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between gap-2 flex-wrap">
                      <span>{customLookupResult.message}</span>
                    </div>

                    {customLookupResult.recognized && customLookupResult.profile ? (
                      <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="font-display font-bold text-sm text-white">
                              {customLookupResult.profile.name}
                            </span>{' '}
                            <span className="text-slate-400">
                              ({customLookupResult.profile.eraOrTitle})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleAssignArchitectToSeat(
                                editingSeat.gate,
                                editingSeat.index,
                                customLookupResult.profile!
                              )
                            }
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs cursor-pointer"
                          >
                            Seat {customLookupResult.profile.shortName} Now
                          </button>
                        </div>
                        <div className="text-slate-300">
                          <strong className="text-cyan-300">Synthesized ACE-10 Heuristics:</strong>{' '}
                          {customLookupResult.profile.heuristics}
                        </div>
                      </div>
                    ) : (
                      /* Unrecognized Figure Handler: Recommend Pre-Calibrated Alternatives OR Allow Manual Override */
                      <div className="space-y-3">
                        <div className="text-xs font-bold text-amber-300">
                          Recommended Pre-Calibrated Architects for {GATE_METADATA[editingSeat.gate].title.split(':')[0]}:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {customLookupResult.suggestions.map((sug) => (
                            <button
                              key={sug.id}
                              type="button"
                              onClick={() =>
                                handleAssignArchitectToSeat(editingSeat.gate, editingSeat.index, sug)
                              }
                              className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <div>
                                <div className="font-bold text-white">{sug.name}</div>
                                <div className="text-[11px] text-slate-400">{sug.eraOrTitle}</div>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-extrabold text-[10px]">
                                Select
                              </span>
                            </button>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-amber-500/30 space-y-2">
                          <div className="text-[11px] text-slate-300">
                            Still want to use <strong className="text-white">{customNameInput}</strong>? Define their 4 cognitive traits below (or use default) to seat them anyway:
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={customHeuristicsInput}
                              onChange={(e) => setCustomHeuristicsInput(e.target.value)}
                              placeholder="Optional: e.g. Situational awareness, minimalist execution, zero-bluffing..."
                              className="flex-1 h-9 rounded-lg bg-slate-950 border border-slate-700 px-3 text-xs text-white"
                            />
                            <button
                              type="button"
                              onClick={handleForceCustomArchitect}
                              className="h-9 px-3.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs cursor-pointer shrink-0"
                            >
                              Seat &ldquo;{customNameInput.trim()}&rdquo; Anyway
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Filter Bar for the 38 Pre-Calibrated Hall of Architects */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {ALL_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCatalogCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                          catalogCategory === cat
                            ? 'bg-amber-400 text-slate-950 border-amber-300 font-extrabold'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder={`Filter ${HALL_OF_ARCHITECTS.length} pre-calibrated minds...`}
                    className="h-8 rounded-lg bg-slate-900 border border-slate-700 px-3 text-xs text-white"
                  />
                </div>

                {/* Grid of Pre-Calibrated Architects */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredCatalog.map((arch) => {
                    const isRecommendedForGate = arch.recommendedGate === editingSeat.gate;
                    return (
                      <div
                        key={arch.id}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                          isRecommendedForGate
                            ? 'bg-[#111c33] border-amber-400/50'
                            : 'bg-slate-900/70 border-slate-800'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-display font-bold text-sm text-white">
                              {arch.name}
                            </span>
                            <div className="flex items-center gap-1">
                              {isRecommendedForGate && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-400 text-slate-950">
                                  IDEAL FOR GATE {GATE_METADATA[editingSeat.gate].number}
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-sky-300">
                                {arch.category}
                              </span>
                            </div>
                          </div>
                          <div className="text-[11px] text-slate-400">{arch.eraOrTitle}</div>
                          <p className="text-xs text-slate-200 leading-relaxed pt-1">
                            {arch.heuristics}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                          <span className="text-[11px] text-slate-400 truncate">
                            Best Gate: Gate {arch.recommendedGate.replace('gate', '')}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleAssignArchitectToSeat(editingSeat.gate, editingSeat.index, arch)
                            }
                            className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs cursor-pointer shrink-0"
                          >
                            Select {arch.shortName}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
