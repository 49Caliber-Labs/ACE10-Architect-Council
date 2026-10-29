import { HALL_OF_ARCHITECTS } from '../data/architectCatalog';

export interface ComplianceViolation {
  section: 'Section III' | 'Section IV' | 'Section V';
  rule: string;
  excerpt: string;
  lineNumber?: number;
}

export interface ComplianceAuditResult {
  complianceScore: number;
  passedAllGates: boolean;
  metrics: {
    wordCount: number;
    charCount: number;
    sentence1WordCount: number;
    codeBlockCount: number;
    stubViolationCount: number;
    throatClearingCount: number;
    closingLabelCount: number;
    roleplayViolationCount: number;
  };
  violations: ComplianceViolation[];
}

export type LiveProviderType = 'pollinations' | 'gemini' | 'openai' | 'ollama';

export interface LiveExecutionConfig {
  provider: LiveProviderType;
  apiKey: string;
  modelName: string;
  ollamaBaseUrl: string;
}

export interface SingleRunTelemetry {
  outputText: string;
  ttfbMs: number;
  totalLatencyMs: number;
  estimatedTokens: number;
  audit: ComplianceAuditResult;
  error?: string;
}

const VALID_PROVIDERS: ReadonlySet<LiveProviderType> = new Set([
  'pollinations',
  'gemini',
  'openai',
  'ollama',
]);

/**
 * Sanitizes and repairs any potentially corrupted or partial LiveExecutionConfig
 * (e.g. after power loss, storage truncation, or schema migration).
 */
export function sanitizeLiveExecutionConfig(raw: unknown): LiveExecutionConfig {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const provider: LiveProviderType =
    typeof obj.provider === 'string' && VALID_PROVIDERS.has(obj.provider as LiveProviderType)
      ? (obj.provider as LiveProviderType)
      : 'pollinations';

  const defaultModel =
    provider === 'pollinations'
      ? 'openai'
      : provider === 'gemini'
      ? 'gemini-2.5-flash'
      : provider === 'ollama'
      ? 'llama3.2'
      : 'gpt-4o-mini';

  return {
    provider,
    apiKey: typeof obj.apiKey === 'string' ? obj.apiKey : '',
    modelName:
      typeof obj.modelName === 'string' && obj.modelName.trim().length > 0
        ? obj.modelName.trim()
        : defaultModel,
    ollamaBaseUrl:
      typeof obj.ollamaBaseUrl === 'string' && obj.ollamaBaseUrl.trim().length > 0
        ? obj.ollamaBaseUrl.trim()
        : 'http://localhost:11434',
  };
}

const THROAT_CLEARING_PATTERNS: Array<{ re: RegExp; label: string }> = [
  {
    re: /^\s*(sure|certainly|absolutely|of course)[,!.\s]/i,
    label: 'Conversational throat-clearing opener ("Sure / Certainly / Absolutely")',
  },
  {
    re: /^\s*(that['’]s|that is|what) a (great|fantastic|wonderful|interesting|good|excellent) (question|point|idea)/i,
    label: 'Sycophantic opener ("That is a great/interesting question")',
  },
  {
    re: /^\s*i['’]d be (happy|glad|delighted) to (help|assist|explain)/i,
    label: 'Pleasantry meta-announcement ("I’d be happy to help...")',
  },
  {
    re: /^\s*(here is|here['’]s|let['’]s dive into|let['’]s explore|in this response)/i,
    label: 'Meta-announcement preamble instead of direct Sentence-1 verdict',
  },
];

const RETROSPECTIVE_CLOSING_PATTERNS: Array<{ re: RegExp; label: string }> = [
  {
    re: /(?:^|\n)\s*(?:#+\s*)?(?:in conclusion|to summarize|in summary|summary|key takeaways|takeaway|wrapping up)\s*[:,-]/i,
    label: 'Prohibited labeled retrospective closing ("In conclusion / Summary / Takeaway")',
  },
  {
    re: /\b(?:i hope this helps|feel free to ask|let me know if you have any other questions)[!.]?\s*$/i,
    label: 'Prohibited conversational sign-off ("I hope this helps / Feel free to ask")',
  },
];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const CATALOG_ARCHITECT_ALTERNATION = Array.from(
  new Set(
    HALL_OF_ARCHITECTS.flatMap((a) => [
      escapeRegex(a.name),
      escapeRegex(a.shortName),
      escapeRegex(a.name.replace(/\s*\([^)]*\)\s*/g, '').trim()),
    ]).filter((s) => s.length >= 3)
  )
)
  .sort((a, b) => b.length - a.length)
  .join('|');

const THEATRICAL_ROLEPLAY_PATTERNS: Array<{ re: RegExp; label: string }> = [
  {
    re: new RegExp(
      `\\b(?:as|speaking as|channeling)\\s+(?:${CATALOG_ARCHITECT_ALTERNATION})(?=$|[\\s,.:;!?'"”’)])`,
      'i'
    ),
    label: 'Theatrical character roleplay preface ("As [Architect], I believe...")',
  },
];

const LINE_CODE_ELISION_PATTERNS: Array<{ re: RegExp; label: string }> = [
  {
    re: /(?<![\\'"`])(?:\/\/|#|--)\s*\.{2,}\s*(?:rest of|existing|previous|remaining|other|code|logic|implementation)/i,
    label: 'Lazy code elision comment ("// ... rest of code / existing logic")',
  },
  {
    re: /(?<![\\'"`])(?:\/\/|#|--|\/\*)\s*TODO\b[:\s]*(?:implement|add|wire|connect|replace|fix)/i,
    label: 'Unfinished "// TODO: implement" placeholder in deliverable',
  },
];

const MULTILINE_CODE_ELISION_PATTERNS: Array<{ re: RegExp; label: string }> = [
  {
    re: /(?<![\\'"`])\/\*\s*[\s\S]{0,40}?\.{2,}\s*(?:rest of|existing|previous|remaining|other|code|logic|implementation)?[\s\S]{0,120}?\*\//gi,
    label: 'Lazy block comment elision ("/* ... rest of implementation */")',
  },
  {
    re: /\b(?:setTimeout\s*\(\s*(?:async\s*)?\(\)\s*=>[\s\S]{0,160}?(?:mock|fake|simulate)|Promise\.resolve\s*\(\s*\{[\s\S]{0,120}?(?:mock|fake|dummy))/gi,
    label: 'Phantom simulated backend stub (setTimeout / Promise.resolve mock)',
  },
];

function createEmptyAuditResult(violations: ComplianceViolation[] = []): ComplianceAuditResult {
  return {
    complianceScore: 0,
    passedAllGates: false,
    metrics: {
      wordCount: 0,
      charCount: 0,
      sentence1WordCount: 0,
      codeBlockCount: 0,
      stubViolationCount: 0,
      throatClearingCount: 0,
      closingLabelCount: 0,
      roleplayViolationCount: 0,
    },
    violations,
  };
}

/**
 * Deterministically audits any AI text/code response against ACE-10 Sections III, IV, and V.
 * Hardened against null/undefined, invisible zero-width characters, binary/null-byte corruption,
 * and non-lexical punctuation-only strings.
 */
export function auditAiOutputAgainstAce10(rawText: unknown): ComplianceAuditResult {
  if (typeof rawText !== 'string') {
    return createEmptyAuditResult();
  }

  // Strip zero-width spaces / BOM before evaluating emptiness
  const strippedInvisible = rawText.replace(/[\u200B-\u200D\uFEFF]/g, '');
  const text = strippedInvisible.trim();
  if (!text) {
    return createEmptyAuditResult();
  }

  // Reject unreadable binary payloads (null bytes, raw control characters, or UTF-8 replacement characters)
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFD]/.test(text)) {
    return createEmptyAuditResult([
      {
        section: 'Section III',
        rule: 'Unreadable or corrupted binary input (contains null bytes, control codes, or invalid UTF-8 replacement characters)',
        excerpt: text.slice(0, 80).replace(/[\x00-\x1F]/g, ''),
        lineNumber: 1,
      },
    ]);
  }

  // Reject non-lexical strings (e.g., "..." or "???" with zero alphanumeric content)
  if (!/[a-zA-Z0-9\p{L}\p{N}]/u.test(text)) {
    return createEmptyAuditResult([
      {
        section: 'Section III',
        rule: 'Non-lexical input (contains zero alphanumeric tokens or substantive verdict)',
        excerpt: text.slice(0, 80),
        lineNumber: 1,
      },
    ]);
  }

  const violations: ComplianceViolation[] = [];
  let throatClearingCount = 0;
  let closingLabelCount = 0;
  let roleplayViolationCount = 0;
  let stubViolationCount = 0;

  const firstParagraph = text.split('\n')[0] || text.slice(0, 220);

  // 1. Audit Sentence 1 (Section III Direct Structural Opening)
  for (const pat of THROAT_CLEARING_PATTERNS) {
    const m = firstParagraph.match(pat.re);
    if (m) {
      throatClearingCount++;
      violations.push({
        section: 'Section III',
        rule: pat.label,
        excerpt: firstParagraph.slice(0, 110),
        lineNumber: 1,
      });
    }
  }

  // 2. Audit Prohibited Labeled Closings (Section III Structural Taxonomy)
  for (const pat of RETROSPECTIVE_CLOSING_PATTERNS) {
    const m = text.match(pat.re);
    if (m) {
      closingLabelCount++;
      violations.push({
        section: 'Section III',
        rule: pat.label,
        excerpt: m[0].trim().slice(0, 100),
      });
    }
  }

  // 3. Audit Theatrical Character Roleplay (Section IV Negative Directives)
  for (const pat of THEATRICAL_ROLEPLAY_PATTERNS) {
    const m = text.match(pat.re);
    if (m) {
      roleplayViolationCount++;
      violations.push({
        section: 'Section IV',
        rule: pat.label,
        excerpt: m[0].trim(),
      });
    }
  }

  // 4a. Audit Line-by-Line for Single-Line Code Elision & Unfinished TODOs (Section V Anti-Simulation)
  const lines = text.split('\n');
  lines.forEach((line, idx) => {
    for (const pat of LINE_CODE_ELISION_PATTERNS) {
      if (pat.re.test(line)) {
        stubViolationCount++;
        violations.push({
          section: 'Section V',
          rule: pat.label,
          excerpt: line.trim().slice(0, 110),
          lineNumber: idx + 1,
        });
      }
    }
  });

  // 4b. Audit Multi-Line Patterns (Block Comment Elisions & Multi-Line setTimeout/Promise Mocks)
  for (const pat of MULTILINE_CODE_ELISION_PATTERNS) {
    const matches = text.matchAll(pat.re);
    for (const match of matches) {
      stubViolationCount++;
      const lineNumber =
        typeof match.index === 'number'
          ? text.slice(0, match.index).split('\n').length
          : undefined;
      violations.push({
        section: 'Section V',
        rule: pat.label,
        excerpt: match[0].replace(/\s+/g, ' ').trim().slice(0, 110),
        lineNumber,
      });
    }
  }

  const words = text.split(/\s+/).filter(Boolean);
  const firstSentenceMatch = text.match(/^[^.!?\n]+[.!?]?/);
  const sentence1Words = firstSentenceMatch
    ? firstSentenceMatch[0].trim().split(/\s+/).filter(Boolean).length
    : words.length;
  const codeBlockMatches = text.match(/```[\s\S]*?```/g);
  const codeBlockCount = codeBlockMatches ? codeBlockMatches.length : 0;

  const rawScore =
    100 -
    throatClearingCount * 22 -
    stubViolationCount * 30 -
    closingLabelCount * 15 -
    roleplayViolationCount * 25;

  const complianceScore = Math.max(0, Math.min(100, rawScore));

  return {
    complianceScore,
    passedAllGates: violations.length === 0,
    metrics: {
      wordCount: words.length,
      charCount: text.length,
      sentence1WordCount: sentence1Words,
      codeBlockCount,
      stubViolationCount,
      throatClearingCount,
      closingLabelCount,
      roleplayViolationCount,
    },
    violations,
  };
}

async function fetchWithTimeoutAndSafeJson(
  url: string,
  init: RequestInit,
  providerLabel: string,
  timeoutMs = 25000
): Promise<{ data: Record<string, any>; ttfbMs: number; startMs: number }> {
  const startMs = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      signal: init.signal || controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(
        `${providerLabel} network request timed out after ${Math.round(
          timeoutMs / 1000
        )}s. Verify your network connection or switch Execution Engine.`
      );
    }
    throw err;
  }

  const ttfbMs = Math.round(performance.now() - startMs);

  try {
    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(`${providerLabel} HTTP ${res.status}: ${errTxt.slice(0, 180)}`);
    }

    if (typeof res.text === 'function') {
      const rawBody = await res.text();
      try {
        const data = JSON.parse(rawBody);
        return { data, ttfbMs, startMs };
      } catch {
        throw new Error(
          `${providerLabel} returned a malformed non-JSON gateway response (possible captive portal, proxy interception, or truncated stream): ${rawBody
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 120)}`
        );
      }
    } else {
      try {
        const data = await res.json();
        return { data, ttfbMs, startMs };
      } catch {
        throw new Error(
          `${providerLabel} returned a malformed non-JSON gateway response (possible captive portal, proxy interception, or truncated stream).`
        );
      }
    }
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Executes a single prompt against the chosen LLM provider (Pollinations, Gemini, Local Ollama, or OpenAI)
 * and measures real latency, token count, and ACE-10 Section III-V compliance.
 * Hardened against corrupted config objects, hanging sockets, captive portals, and empty/safety-blocked completions.
 */
export async function executePromptWithTelemetry(
  rawConfig: LiveExecutionConfig,
  userPrompt: string,
  systemInstruction?: string
): Promise<SingleRunTelemetry> {
  const startMs = performance.now();
  const config = sanitizeLiveExecutionConfig(rawConfig);

  try {
    if (typeof userPrompt !== 'string' || !userPrompt.replace(/[\u200B-\u200D\uFEFF]/g, '').trim()) {
      throw new Error('Prompt cannot be blank or unreadable. Enter a valid technical or strategic query.');
    }

    if (config.provider === 'pollinations') {
      const model = config.modelName || 'openai';
      const messages = [];
      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
      }
      messages.push({ role: 'user', content: userPrompt });

      const { data, ttfbMs } = await fetchWithTimeoutAndSafeJson(
        'https://text.pollinations.ai/openai',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages, seed: 42 }),
        },
        'Live LLM Relay'
      );

      const text = String(data?.choices?.[0]?.message?.content || '');
      if (!text.trim()) {
        throw new Error(
          'Live LLM Relay returned an empty response. Try again or switch to your own Gemini/OpenAI API key.'
        );
      }
      const totalLatencyMs = Math.round(performance.now() - startMs);
      const estimatedTokens = data?.usage?.completion_tokens ?? Math.ceil(text.length / 4);

      return {
        outputText: text,
        ttfbMs,
        totalLatencyMs,
        estimatedTokens,
        audit: auditAiOutputAgainstAce10(text),
      };
    }

    if (config.provider === 'gemini') {
      if (!config.apiKey) {
        throw new Error(
          'Missing Gemini API Key: Enter a valid Google AI Studio key (starts with AIza...) or switch Execution Engine to "Live Zero-Key Cloud LLM (OpenAI Relay)".'
        );
      }
      const model = config.modelName || 'gemini-2.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

      const body: Record<string, unknown> = {
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      };
      if (systemInstruction) {
        body.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      const { data, ttfbMs } = await fetchWithTimeoutAndSafeJson(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        'Gemini API'
      );

      const blockReason =
        data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason;
      const text = String(
        data?.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text || '')
          .join('') || ''
      );
      if (!text.trim()) {
        throw new Error(
          `Gemini API returned an empty completion${
            blockReason ? ` (reason: ${blockReason})` : ''
          }. Adjust your prompt or model ID.`
        );
      }
      const totalLatencyMs = Math.round(performance.now() - startMs);
      const estimatedTokens =
        data?.usageMetadata?.candidatesTokenCount ?? Math.ceil(text.length / 4);

      return {
        outputText: text,
        ttfbMs,
        totalLatencyMs,
        estimatedTokens,
        audit: auditAiOutputAgainstAce10(text),
      };
    }

    if (config.provider === 'ollama') {
      const base = (config.ollamaBaseUrl || 'http://localhost:11434').replace(/\/+$/, '');
      const model = config.modelName || 'llama3.2';
      const messages = [];
      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
      }
      messages.push({ role: 'user', content: userPrompt });

      const { data, ttfbMs } = await fetchWithTimeoutAndSafeJson(
        `${base}/api/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages, stream: false }),
        },
        'Ollama'
      );

      const text = String(data?.message?.content || '');
      if (!text.trim()) {
        throw new Error(
          `Ollama returned an empty response for model "${model}". Verify the model is pulled locally (ollama pull ${model}).`
        );
      }
      const totalLatencyMs = Math.round(performance.now() - startMs);
      const estimatedTokens = data?.eval_count ?? Math.ceil(text.length / 4);

      return {
        outputText: text,
        ttfbMs,
        totalLatencyMs,
        estimatedTokens,
        audit: auditAiOutputAgainstAce10(text),
      };
    }

    // OpenAI-compatible Chat Completions
    if (!config.apiKey) {
      throw new Error('Enter an OpenAI API key or switch to Gemini / Local Ollama.');
    }
    const model = config.modelName || 'gpt-4o-mini';
    const messages = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: userPrompt });

    const { data, ttfbMs } = await fetchWithTimeoutAndSafeJson(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({ model, messages }),
      },
      'OpenAI'
    );

    const text = String(data?.choices?.[0]?.message?.content || '');
    if (!text.trim()) {
      throw new Error('OpenAI API returned an empty completion.');
    }
    const totalLatencyMs = Math.round(performance.now() - startMs);
    const estimatedTokens =
      data?.usage?.completion_tokens ?? Math.ceil(text.length / 4);

    return {
      outputText: text,
      ttfbMs,
      totalLatencyMs,
      estimatedTokens,
      audit: auditAiOutputAgainstAce10(text),
    };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const friendlyMsg =
      rawMsg.includes('Failed to fetch') && config.provider === 'ollama'
        ? `Connection refused at ${config.ollamaBaseUrl || 'http://localhost:11434'}. "Local Ollama" requires the standalone Ollama desktop LLM server (ollama.com) running on port 11434 (pointing it at port 3100/3200 hits the Vite web server instead of an LLM). Switch Execution Engine to "Live Zero-Key Cloud LLM (OpenAI Relay)" above, or enter a Gemini/OpenAI API key.`
        : rawMsg;
    return {
      outputText: '',
      ttfbMs: Math.round(performance.now() - startMs),
      totalLatencyMs: Math.round(performance.now() - startMs),
      estimatedTokens: 0,
      audit: auditAiOutputAgainstAce10(''),
      error: friendlyMsg,
    };
  }
}

export async function probeLocalOllama(
  baseUrl: string
): Promise<{ online: boolean; models: string[] }> {
  try {
    const safeUrl = typeof baseUrl === 'string' ? baseUrl.trim() : '';
    const clean = (safeUrl || 'http://localhost:11434').replace(/\/+$/, '');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${clean}/api/tags`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return { online: false, models: [] };
    const data = await res.json();
    const models = Array.isArray(data?.models)
      ? data.models.map((m: { name?: string }) => m.name || '').filter(Boolean)
      : [];
    return { online: true, models };
  } catch {
    return { online: false, models: [] };
  }
}
