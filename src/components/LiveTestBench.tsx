import React, { useState, useEffect } from 'react';
import {
  auditAiOutputAgainstAce10,
  ComplianceAuditResult,
  executePromptWithTelemetry,
  LiveExecutionConfig,
  LiveProviderType,
  probeLocalOllama,
  sanitizeLiveExecutionConfig,
  SingleRunTelemetry,
} from '../utils/complianceAuditor';
import {
  Play,
  ShieldAlert,
  CheckCircle2,
  Cpu,
  Clock,
  FileCode2,
  Zap,
  KeyRound,
  Server,
  AlertTriangle,
} from 'lucide-react';

interface LiveTestBenchProps {
  compiledInstruction: string;
  activePresetName: string;
  defaultPrompt: string;
  sampleBadOutput: string;
  sampleAce10Output: string;
}

const SAMPLE_NON_COMPLIANT_AI_CODE = `Sure, I'd be happy to help you build that telemetry backend! That is a great question.

As Nikola Tesla, I believe we should harness the flow of data like alternating current!

\`\`\`typescript
export async function saveWaterwayTelemetry(stationId: string, payload: any) {
  // TODO: implement actual database connection later
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ mock: true, status: "persisted" });
    }, 500);
  });
  // ... rest of code
}
\`\`\`

In conclusion: This fully integrated backend persists your station data cleanly. Let me know if you have any other questions!`;

export const LiveTestBench: React.FC<LiveTestBenchProps> = ({
  compiledInstruction,
  activePresetName,
  defaultPrompt,
  sampleBadOutput,
  sampleAce10Output,
}) => {
  const [activeTab, setActiveTab] = useState<'runner' | 'linter'>('runner');

  // Live Execution Runner state (hardened against corrupted localStorage / power loss)
  const [config, setConfig] = useState<LiveExecutionConfig>(() => {
    try {
      const saved = localStorage.getItem('ace10_live_runner_config_v3');
      if (saved) return sanitizeLiveExecutionConfig(JSON.parse(saved));
    } catch {
      // Ignore corrupted JSON and fall back cleanly
    }
    return sanitizeLiveExecutionConfig(null);
  });

  const [ollamaStatus, setOllamaStatus] = useState<{
    checking: boolean;
    online: boolean;
    models: string[];
  }>({ checking: false, online: false, models: [] });

  const [testPrompt, setTestPrompt] = useState<string>(defaultPrompt);
  const [isRunningLive, setIsRunningLive] = useState<boolean>(false);
  const [baseRun, setBaseRun] = useState<SingleRunTelemetry | null>(null);
  const [aceRun, setAceRun] = useState<SingleRunTelemetry | null>(null);

  // Static Linter state
  const [linterInput, setLinterInput] = useState<string>(SAMPLE_NON_COMPLIANT_AI_CODE);

  useEffect(() => {
    setTestPrompt(defaultPrompt);
  }, [defaultPrompt]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'ace10_live_runner_config_v3',
        JSON.stringify({ ...config, apiKey: '' })
      );
    } catch {
      // Ignore
    }
  }, [config]);

  useEffect(() => {
    if (config.provider !== 'ollama') return;
    let cancelled = false;
    setOllamaStatus((prev) => ({ ...prev, checking: true }));
    const timer = setTimeout(() => {
      probeLocalOllama(config.ollamaBaseUrl).then((res) => {
        if (!cancelled) {
          setOllamaStatus({ checking: false, online: res.online, models: res.models });
        }
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [config.provider, config.ollamaBaseUrl]);

  const handleProviderChange = (provider: LiveProviderType) => {
    const defaultModel =
      provider === 'pollinations'
        ? 'openai'
        : provider === 'gemini'
        ? 'gemini-2.5-flash'
        : provider === 'ollama'
        ? 'llama3.2'
        : 'gpt-4o-mini';
    setConfig((prev) => ({ ...prev, provider, modelName: defaultModel }));
  };

  const handleExecuteLiveComparison = async () => {
    if (!testPrompt.trim()) return;
    setIsRunningLive(true);
    try {
      const [unconfiguredRes, aceConfiguredRes] = await Promise.all([
        executePromptWithTelemetry(config, testPrompt, undefined),
        executePromptWithTelemetry(config, testPrompt, compiledInstruction),
      ]);
      setBaseRun(unconfiguredRes);
      setAceRun(aceConfiguredRes);
    } finally {
      setIsRunningLive(false);
    }
  };

  const linterAudit: ComplianceAuditResult = auditAiOutputAgainstAce10(linterInput);

  return (
    <section className="rounded-2xl bg-[#0b1120] border-2 border-cyan-400/60 overflow-hidden shadow-2xl">
      {/* Top Header & Mode Switcher */}
      <div className="bg-slate-900 px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-extrabold uppercase text-cyan-400">
              STEP 4 • LIVE EXECUTION HARNESS &amp; SECTION III–V COMPLIANCE LINTER
            </span>
          </div>
          <h3 className="font-display font-bold text-base sm:text-lg text-white mt-0.5">
            Prove the Council Works: Run Live API Benchmarks or Audit Any AI Output for Stubs &amp; Bluffing
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('runner')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border cursor-pointer transition-colors inline-flex items-center gap-1.5 ${
              activeTab === 'runner'
                ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Live Side-by-Side LLM Runner</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('linter')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border cursor-pointer transition-colors inline-flex items-center gap-1.5 ${
              activeTab === 'linter'
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Section V Zero-Stub Code &amp; BS Linter</span>
          </button>
        </div>
      </div>

      {activeTab === 'runner' ? (
        <div className="p-5 space-y-5">
          {/* Provider & Model Config Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
            <div className="md:col-span-4 space-y-1">
              <label className="text-[11px] font-mono uppercase text-slate-400 font-bold block">
                Execution Engine (100% Live Network LLM)
              </label>
              <select
                value={config.provider}
                onChange={(e) => handleProviderChange(e.target.value as LiveProviderType)}
                className="w-full h-9 rounded-lg bg-slate-950 border border-slate-700 px-2.5 text-xs font-bold text-white"
              >
                <option value="pollinations">Live Zero-Key Cloud LLM (OpenAI Relay — Free)</option>
                <option value="gemini">Google Gemini API (Requires Gemini Key)</option>
                <option value="openai">OpenAI API (Requires OpenAI Key)</option>
                <option value="ollama">Local Ollama Server (Requires Ollama Desktop :11434)</option>
              </select>
            </div>

            {config.provider === 'pollinations' ? (
              <div className="md:col-span-8 flex items-center">
                <div className="w-full rounded-lg bg-emerald-950/30 border border-emerald-500/40 px-3.5 py-2 text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>100% Live AI Inference (Zero Canned Text):</strong> Sends your exact custom prompt over HTTPS to a live OpenAI-compatible model twice—once unconfigured, and once injected with your active 10-seat ACE-10 system prompt.
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="md:col-span-3 space-y-1">
                  <label className="text-[11px] font-mono uppercase text-slate-400 font-bold block">
                    Model ID
                  </label>
                  <input
                    type="text"
                    value={config.modelName}
                    onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
                    placeholder="gemini-2.5-flash"
                    className="w-full h-9 rounded-lg bg-slate-950 border border-slate-700 px-3 text-xs font-mono text-white"
                  />
                </div>

                {config.provider === 'ollama' ? (
                  <div className="md:col-span-5 space-y-1">
                    <label className="text-[11px] font-mono uppercase font-bold flex items-center justify-between gap-1">
                      <span className="text-emerald-400 inline-flex items-center gap-1">
                        <Server className="w-3.5 h-3.5" />
                        <span>Ollama Desktop Port (:11434)</span>
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${
                          ollamaStatus.online
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {ollamaStatus.checking
                          ? 'Probing...'
                          : ollamaStatus.online
                          ? '● Ollama Online'
                          : '● Ollama Not Running on PC'}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={config.ollamaBaseUrl}
                      onChange={(e) => setConfig({ ...config, ollamaBaseUrl: e.target.value })}
                      placeholder="http://localhost:11434"
                      className="w-full h-9 rounded-lg bg-slate-950 border border-slate-700 px-3 text-xs font-mono text-white"
                    />
                  </div>
                ) : (
                  <div className="md:col-span-5 space-y-1">
                    <label className="text-[11px] font-mono uppercase text-amber-400 font-bold flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>
                        {config.provider === 'gemini' ? 'Gemini API Key' : 'OpenAI Bearer Key'} (Browser-Only)
                      </span>
                    </label>
                    <input
                      type="password"
                      value={config.apiKey}
                      onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                      placeholder="Paste API key to run live external LLM execution..."
                      className="w-full h-9 rounded-lg bg-slate-950 border border-slate-700 px-3 text-xs font-mono text-white"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Prompt Input & Action Buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">
                Live Prompt (Fires Simultaneously Against Unconfigured Base Model vs. {activePresetName})
              </label>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                className="flex-1 h-10 rounded-xl bg-slate-950 border border-slate-700 px-3.5 text-xs sm:text-sm font-medium text-white"
              />
              <button
                type="button"
                onClick={handleExecuteLiveComparison}
                disabled={isRunningLive}
                className="h-10 px-5 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-slate-950 font-extrabold text-xs inline-flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-md"
              >
                <Zap className="w-4 h-4" />
                <span>{isRunningLive ? 'Executing Parallel Pass...' : 'Run Live Benchmark'}</span>
              </button>
            </div>
          </div>

          {/* Side-by-Side Execution Output & Compliance Telemetry */}
          {(baseRun || aceRun) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              {/* Left Column: Unconfigured Base Model */}
              {baseRun && (
                <div className="rounded-xl bg-slate-950 border border-rose-500/40 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5 flex-wrap">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        UNCONFIGURED BASE MODEL (NO ACE-10)
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        TTFB: {baseRun.ttfbMs}ms • Total: {baseRun.totalLatencyMs}ms
                      </span>
                      <span>~{baseRun.estimatedTokens} tok</span>
                    </div>
                  </div>

                  {baseRun.error ? (
                    <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200 font-mono">
                      {baseRun.error}
                    </div>
                  ) : (
                    <>
                      <pre className="text-xs font-sans text-slate-300 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto bg-slate-900/70 p-3 rounded-lg border border-slate-800">
                        {baseRun.outputText}
                      </pre>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-300">ACE-10 Section III–V Audit Score:</span>
                          <span
                            className={`font-mono font-extrabold ${
                              baseRun.audit.complianceScore >= 90
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {baseRun.audit.complianceScore}/100 ({baseRun.audit.violations.length} violations)
                          </span>
                        </div>
                        {baseRun.audit.violations.map((v, idx) => (
                          <div key={idx} className="text-[11px] text-rose-300 flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                            <span>
                              <strong>[{v.section}]</strong> {v.rule}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Right Column: Active ACE-10 Council */}
              {aceRun && (
                <div className="rounded-xl bg-slate-950 border-2 border-emerald-400/60 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5 flex-wrap">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-400 text-slate-950">
                        ⚡ ACTIVE ACE-10 COUNCIL ({activePresetName.toUpperCase()})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-emerald-300">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        TTFB: {aceRun.ttfbMs}ms • Total: {aceRun.totalLatencyMs}ms
                      </span>
                      <span>~{aceRun.estimatedTokens} tok</span>
                    </div>
                  </div>

                  {aceRun.error ? (
                    <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200 font-mono">
                      {aceRun.error}
                    </div>
                  ) : (
                    <>
                      <pre className="text-xs font-sans text-white whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto bg-slate-900/70 p-3 rounded-lg border border-slate-800">
                        {aceRun.outputText}
                      </pre>
                      <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/40 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-emerald-200">ACE-10 Section III–V Audit Score:</span>
                          <span className="font-mono font-extrabold text-emerald-400">
                            {aceRun.audit.complianceScore}/100 (
                            {aceRun.audit.passedAllGates ? 'PASSED ALL GATES' : `${aceRun.audit.violations.length} flags`})
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-300">
                          Sentence-1 Length: {aceRun.audit.metrics.sentence1WordCount} words • Zero-Stub Violations:{' '}
                          {aceRun.audit.metrics.stubViolationCount} • Sycophancy: {aceRun.audit.metrics.throatClearingCount}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* TAB 2: DETERMINISTIC SECTION III–V ZERO-STUB & ANTI-BLUFFING LINTER */
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs text-slate-300">
              Paste any AI code response or markdown text below to run a deterministic static audit against{' '}
              <strong className="text-white">Section III (Direct Sentence-1 Verdict)</strong>,{' '}
              <strong className="text-white">Section IV (Anti-Roleplay)</strong>, and{' '}
              <strong className="text-white">Section V (Zero-Stub &amp; Anti-Elision Mandate)</strong>.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLinterInput(SAMPLE_NON_COMPLIANT_AI_CODE)}
                className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 text-rose-200 border border-rose-500/40 text-xs font-bold cursor-pointer"
              >
                Load Bad AI Stub Example
              </button>
              <button
                type="button"
                onClick={() => setLinterInput(sampleAce10Output)}
                className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-200 border border-emerald-500/40 text-xs font-bold cursor-pointer"
              >
                Load Compliant ACE-10 Example
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7">
              <textarea
                value={linterInput}
                onChange={(e) => setLinterInput(e.target.value)}
                rows={11}
                placeholder="Paste any LLM response or code block here..."
                className="w-full rounded-xl bg-slate-950 border border-slate-700 p-3.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="lg:col-span-5 rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs font-mono uppercase font-extrabold text-slate-400">
                  Deterministic Linter Verdict
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold ${
                    linterAudit.passedAllGates
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {linterAudit.complianceScore}/100 • {linterAudit.passedAllGates ? 'PASS' : 'FAILED GATE 3/V'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  Throat-Clearing: <strong className="text-white">{linterAudit.metrics.throatClearingCount}</strong>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  Code Stubs / TODOs: <strong className="text-white">{linterAudit.metrics.stubViolationCount}</strong>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  Roleplay Cosplay: <strong className="text-white">{linterAudit.metrics.roleplayViolationCount}</strong>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  Closing Labels: <strong className="text-white">{linterAudit.metrics.closingLabelCount}</strong>
                </div>
              </div>

              {linterAudit.violations.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Zero Section III, IV, or V violations detected. Output opens directly with a substantive verdict and contains zero lazy code elisions.
                  </span>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {linterAudit.violations.map((v, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-xs space-y-1"
                    >
                      <div className="font-bold text-rose-300 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          [{v.section}{v.lineNumber ? ` • Line ${v.lineNumber}` : ''}] {v.rule}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-300 truncate">
                        &ldquo;{v.excerpt}&rdquo;
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
