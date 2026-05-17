# CivicRelay - Kaggle Writeup

## Positioning

**Confusing paperwork in. Clear action plan out.**

In your language, locally powered by Gemma 4.

CivicRelay is a local-first Gemma 4 demo for public-service notices, powered by Ollama and designed to keep action, evidence, and uncertainty visible.

It is an evidence-first civic workbench built around one transformation:

**public-service notice in → local Gemma 4 analysis → clear action plan out**

The output is paired with quoted source evidence, uncertainty flags, and an explicit safety boundary.

## Problem

Public-service paperwork is often dense, stressful, and hard to act on quickly. A person may receive a notice about benefits renewal, school attendance support, or clinic follow-up and still not know:

- what the notice actually means
- what they need to do first
- what deadline matters most
- what documents to prepare
- what questions to ask if something is unclear

This confusion can lead to missed deadlines, missed appointments, and avoidable loss of support.

## Target user

CivicRelay is aimed at people who need plain-language help understanding civic or public-service notices, especially when:

- English is not their preferred language
- the notice is bureaucratic or intimidating
- they need a quick action plan, not a long explanation
- privacy and local processing matter

It is also useful as a demonstration artifact for community-serving AI workflows where trust and boundaries matter.

## Why Gemma 4

This project needs a model that can:

- read messy administrative text
- summarize it clearly
- produce structured output instead of loose prose
- support multilingual explanations
- work inside a constrained, inspectable workflow

Gemma 4 fits because CivicRelay is not using the model as a generic chatbot. It is using Gemma 4 as a local document-understanding engine inside a fixed civic task.

## Why local-first

Local-first matters for this category because public-service notices can contain sensitive personal information.

A local runtime helps with:

1. **Privacy**: the text can stay on the user’s device
2. **Trust**: the system is easier to explain when no cloud API key is required
3. **Practicality**: community-serving workflows may need lower-connectivity or lower-infrastructure setups

For this demo, CivicRelay runs through:
- **Runtime**: local Ollama
- **Model**: `gemma4:e2b`
- **Default base URL**: `http://localhost:11434`

## Workflow

1. The user pastes a public-service notice or selects a synthetic sample
2. The user chooses an action plan language
3. The app sends the notice text to local Ollama
4. Ollama runs `gemma4:e2b`
5. CivicRelay requests a strict JSON response
6. The UI renders a three-zone workbench:
   - **Notice input**
   - **Action plan**
   - **Evidence and trust**

The action plan includes:
- what this means
- your next steps
- key deadlines
- documents to prepare
- questions for the agency

The trust panel includes:
- quoted evidence
- where CivicRelay is unsure
- important boundary

## Safety guardrails

CivicRelay is designed to reduce confusion, not act as an authority.

Guardrails include:
- synthetic sample notices only for the public demo
- no real personal data required
- quoted evidence pulled directly from the notice
- uncertainty flags when the notice is incomplete or unclear
- important dates must come from the notice text or be marked unclear
- no claims of eligibility or entitlement unless the notice explicitly says so
- no legal, medical, school compliance, or benefits advice
- visible safety language reminding the user to verify the original notice

## Demo scenario

### Scenario
A person receives a benefits renewal notice with document requirements and a final deadline. They are stressed, want the explanation in Spanish, and need to know the most important next steps immediately.

### Demo flow
1. Open CivicRelay
2. Pause on the transformation strip: notice → local Gemma 4 → action plan
3. Select the synthetic benefits notice
4. Switch the action plan language to Spanish
5. Generate the local analysis
6. Show the centered key deadline and prioritized next steps
7. Show the quoted evidence and uncertainty panel
8. Point to the proof strip confirming local Ollama + `gemma4:e2b`

This works well in a short video because the before/after story is visible within a few seconds.

## Why this is strong for a competition demo

CivicRelay is intentionally narrow and legible.

Instead of presenting AI as a generic assistant, it demonstrates one focused public-good workflow:
- input is concrete
- model use is explicit
- output is structured
- evidence is visible
- uncertainty is surfaced
- safety boundaries are not hidden

That makes the system easier to judge as a product artifact, not just a prompt wrapper.

## Limitations

- It only knows what is present in the supplied notice text
- It may misread incomplete, badly copied, or ambiguous documents
- It does not replace legal, medical, school, or benefits professionals
- It currently assumes text input rather than broader document ingestion workflows
- A real deployment would require deeper accessibility testing, community feedback, multilingual evaluation, and stronger policy review

## Future work

Potential next steps after the competition:

- stronger multilingual evaluation across more notice types
- improved accessibility and mobile testing
- richer notice templates for broader synthetic benchmarking
- better handling of repeated deadlines or multi-step timelines
- offline packaging guidance for community organizations

## Technical summary

- **Frontend**: Next.js + React
- **Runtime**: local Ollama
- **Model**: `gemma4:e2b`
- **Output mode**: strict JSON schema
- **Trust features**: quoted source snippets, uncertainty flags, safety boundary
- **Demo data**: synthetic notices only

## AI-assisted development disclosure

AI-assisted development tools were used to accelerate implementation and documentation. Product direction, runtime selection, testing, and final submission review were directed by the project author.
