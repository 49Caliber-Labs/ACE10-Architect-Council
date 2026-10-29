# ACE-10 • The Architect Council Engine Studio

**ACE-10 (Architect Council Engine)** is an open-source cognitive system instruction compiler, live LLM benchmark harness, and deterministic anti-stub code linter for AI coding assistants (`GEMINI.md`, `CLAUDE.md`, `.cursorrules`, ChatGPT, and local Ollama models).

Unlike conventional persona prompts that induce shallow theatrical roleplay, **ACE-10** maps **10 historical, scientific, technical, and sports archetypes** into functional heuristic filters across a **4-Gate Cognitive Pipeline**, while locking in strict anti-simulation, zero-stub, and Sentence-1 verdict execution mandates.

---

## System Architecture & Engineering Modules

```
ACE10-Architect-Council/
├── bin/
│   └── ace10.mjs                 # Zero-dependency Unix CLI compiler & CI anti-stub linter
├── src/
│   ├── components/
│   │   └── LiveTestBench.tsx     # Parallel LLM execution runner (Gemini/Ollama/OpenAI) + Static Linter UI
│   ├── data/
│   │   └── architectCatalog.ts   # 47 pre-calibrated 6D-scored architects & 8 curated council presets
│   ├── types/
│   │   └── council.ts            # Strict TypeScript interfaces for 6D vectors, gates, and telemetry
│   ├── utils/
│   │   ├── complianceAuditor.ts  # Deterministic Section III-V regex/line AST compliance & stub auditor
│   │   └── councilCompiler.ts    # Dynamic Section I & II AST compiler, 6D chemistry engine & Wiki API synthesizer
│   └── App.tsx                   # Studio interface: Matchmaker, 4-Gate Deck, Chemistry Audit & Exporter
```

### 1. Deterministic 6-Vector & 4-Gate Chemistry Rubric (`src/utils/councilCompiler.ts`)
Every architect profile carries a calibrated 6-dimensional cognitive vector $\mathbf{v} \in [0, 100]^6$:
* $v_1$: **First-Principles Rigor** (Empirical signal isolation & axiomatic verification)
* $v_2$: **Systemic & Spatial Synthesis** (Multi-domain mental simulation & modular architecture)
* $v_3$: **Pragmatic Minimalism** (Unix simplicity, bloat pruning & foundational mechanics)
* $v_4$: **Adversarial & Satirical BS Audit** (Red-teaming, fallacy destruction & buzzword hostility)
* $v_5$: **Operational & Clutch Stability** (Regression defense, fault recovery & pressure execution)
* $v_6$: **Strategic Delivery Momentum** (Sentence-1 authority, stoic composure & alignment)

When seats are modified across Gates 1–4, `evaluateCouncilChemistry()` computes:
$$\text{Overall Score} = 0.25 \cdot G_1 + 0.25 \cdot G_2 + 0.30 \cdot G_3 + 0.20 \cdot G_4 - 4 \cdot N_{\text{duplicates}}$$
All blind-spot warnings are **100% non-blocking advisories**—users retain complete sovereignty to seat any combination of architects.

### 2. Live Parallel Execution Harness & Section III–V Compliance Linter (`src/utils/complianceAuditor.ts`)
* **Parallel Side-by-Side Execution Runner:** Fires any user prompt simultaneously against an **Unconfigured Base Model** (no system prompt) and the **Active 10-Architect ACE-10 Council** via Google Gemini API (`gemini-2.5-flash`), local **Ollama** (`http://localhost:11434`), or OpenAI-compatible endpoints, measuring real `TTFB (ms)`, total latency, token count, and compliance pass rates.
* **Deterministic Section III–V Static Linter:** Audits any AI response or code file for:
  * **Section III Violations:** Conversational throat-clearing in Sentence 1 (*"Sure, I can help..."*, *"Great question!"*) and labeled retrospective closings (*"In conclusion,"*, *"Summary:"*).
  * **Section IV Violations:** Theatrical character cosplay (*"As Nikola Tesla, I believe..."*).
  * **Section V Violations:** Lazy code elisions (`// ... rest of code`, `// ... existing logic`), unfinished `// TODO: implement` placeholders, and `setTimeout` / `Promise.resolve` mock bluffs.

### 3. Command-Line Interface (`bin/ace10.mjs`)
Generate compiled instruction files or audit source files for Section V stub violations directly from the terminal or CI/CD pipelines:

```bash
# List available curated presets
node bin/ace10.mjs --list

# Compile Championship Game-Plan Council directly to GEMINI.md or .cursorrules
node bin/ace10.mjs --preset championship-gameplan --out GEMINI.md

# Audit any file or AI output for Section V code elision / TODO stub violations (exits non-zero on failure)
node bin/ace10.mjs --audit src/App.tsx
```

---

## Included Curated Council Presets

1. **ACE-10 Flagship (The Original)** — *Curie, Hypatia, Tesla, Da Vinci, Lovelace, Ritchie, Torvalds, Tosh, Aurelius, JFK*
2. **Championship Game-Plan & Peak Execution (Sports & Tactical Legends)** — *Billy Beane, Curie, Bill Walsh, Tesla, Ayrton Senna, John Wooden, Kobe Bryant, Bill Belichick, Aurelius, Muhammad Ali*
3. **The Silicon & Kernel Foundry** — *Claude Shannon, Richard Hamming, Lovelace, Margaret Hamilton, John von Neumann, Ritchie, Torvalds, John Carmack, Aurelius, Grace Hopper*
4. **The Executive War Room** — *Thucydides, Charlie Munger, Sun Tzu, Von Neumann, Bill Walsh, Andrew Grove, Admiral Rickover, Tosh, Aurelius, JFK*
5. **The Sovereign Chief of Staff** — *Munger, Hypatia, Benjamin Franklin, Dwight D. Eisenhower, Bill Walsh, Wooden, Rickover, Fran Lebowitz, Aurelius, Seneca*
6. **The Red-Team & Legal Razor** — *Socrates, Ida B. Wells, Shannon, Von Neumann, Lovelace, Oliver Wendell Holmes Jr., Belichick, Christopher Hitchens, Aurelius, Ruth Bader Ginsburg*
7. **The Quantitative & Research Lab** — *Curie, Richard Feynman, Tesla, Emmy Noether, Shannon, Karl Popper, Ritchie, Hitchens, Aurelius, Carl Sagan*
8. **The Polymath Creative Studio** — *Hypatia, Socrates, Da Vinci, Stanley Kubrick, Ursula K. Le Guin, Ernest Hemingway, George Carlin, Tosh, Aurelius, Muhammad Ali*

---

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3200` in your browser.

## Open-Source Attribution & License

**ACE-10** is engineered and released as a free, open-source community contribution by **49Caliber Labs**—an independent software development and systems invention laboratory dedicated to technical proficiency, architectural integrity, and the relentless proliferation of boundary-pushing software across commercial utilities, data systems, and interactive discovery.

MIT License — Copyright (c) 2026 **49Caliber Labs**. Free and open-source for all personal and commercial use.
