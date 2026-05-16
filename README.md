# CivicRelay

CivicRelay is a local-first Gemma 4 demo for public-service notices, powered by Ollama and designed to keep action, evidence, and uncertainty visible.

**Confusing paperwork in. Clear action plan out.**

In your language, locally powered by Gemma 4.

## Positioning

**Confusing paperwork in. Clear action plan out.**

In your language, locally powered by Gemma 4.

CivicRelay is designed as an evidence-first civic workbench, not a generic chatbot. One notice goes in. A structured action plan comes out.

## What the app shows

The desktop UI is organized as a 3-zone workbench:

1. **Public-service notice**
   - paste notice text
   - upload a text file
   - try synthetic sample notices
   - choose the action plan language

2. **Action plan**
   - what this means
   - your next steps
   - key deadlines
   - documents to prepare
   - questions for the agency

3. **Evidence and trust**
   - quoted evidence from the notice
   - where CivicRelay is unsure
   - important boundary / safety note

Below the workbench, a compact proof strip makes the runtime explicit:
- Runtime: local Ollama
- Model: `gemma4:e4b`
- Output: strict JSON schema
- Grounding: quoted source snippets
- Demo data: synthetic notices only
- Boundary: not legal, medical, school, or benefits advice

## Why local Ollama + Gemma 4

CivicRelay keeps the core runtime local:

- **Ollama base URL**: `http://localhost:11434`
- **Default model**: `gemma4:e4b`
- **No cloud LLM key required**
- **No Gemini API required**

The goal is privacy-sensitive, inspectable document understanding for public-good workflows.

## Structured output

CivicRelay requests a strict JSON object from Gemma 4 with these top-level fields:

- `language`
- `what_this_says`
- `what_you_need_to_do`
- `deadlines`
- `documents_to_prepare`
- `questions_to_ask`
- `source_snippets`
- `uncertainty_flags`
- `safety_note`

This keeps the output consistent and easier to evaluate during a demo.

## Evidence and uncertainty

Trust features are first-class in the interface:

- **Quoted evidence** shows exact text from the notice
- **Uncertainty flags** call out missing or unclear details
- **Important boundary** reminds the user this is support, not professional advice

The app is designed to avoid overclaiming. If the notice is unclear, CivicRelay should flag uncertainty instead of guessing.

## Synthetic demo notices

This repo includes synthetic sample notices only:

- benefits notice
- school notice
- clinic follow-up notice

Do not add real personal data to the demo.

## Local setup

### 1. Install dependencies

```bash
cd ~/Desktop/civicrelay
npm install
```

### 2. Install and start Ollama

If you do not already have Ollama:

```bash
brew install ollama
```

Then start Ollama and pull the model:

```bash
ollama serve
ollama pull gemma4:e4b
```

If Ollama is already running elsewhere on your machine, keep using `http://localhost:11434`.

### 3. Optional environment file

```bash
cp .env.example .env.local
```

`.env.example` contains:

```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma4:e4b
```

Defaults are already set in code to those same values.

### 4. Run the app

```bash
npm run dev
```

Open:

```bash
http://localhost:3000
```

## How the runtime works

1. The user provides notice text
2. Next.js sends that text to the local Ollama server
3. Ollama runs `gemma4:e4b`
4. CivicRelay requests strict JSON
5. The UI renders the result as an action plan plus trust evidence

Key files:
- `components/civic-relay-app.tsx`
- `app/api/analyze/route.ts`
- `lib/civic-relay.ts`

## Competition demo flow

A short Kaggle-ready demo flow:

1. Open CivicRelay and pause on the transformation strip
2. Choose the synthetic benefits notice
3. Switch the action plan language to Spanish
4. Click **Generate action plan**
5. Show the centered deadline and next steps
6. Show quoted evidence, uncertainty flags, and the boundary panel
7. Point to the proof strip confirming local Ollama + `gemma4:e4b`

## Safety boundaries

CivicRelay is a plain-language support tool.

It does **not** provide:
- legal advice
- medical advice
- school compliance advice
- benefits advice

Users should verify deadlines, requirements, and instructions against the original notice.

## Scripts

```bash
npm run dev
npm run typecheck
npm run build
```

## Kaggle writeup

See `KAGGLE_WRITEUP.md` for a competition-ready narrative covering the problem, target user, workflow, guardrails, limitations, and future work.
