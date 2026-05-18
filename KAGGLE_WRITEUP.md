# CivicRelay — Confusing paperwork in. Clear action plan out.

CivicRelay is a local-first Gemma 4 demo that turns public-service notices into clear, multilingual action plans while keeping evidence and uncertainty visible.

The United States is diverse, but public-service paperwork is still often written in dense, formal language.

For many people, the hard part is not only translation. It is action.

A notice may include a deadline, required documents, eligibility-related wording, and agency instructions. A person may understand some of the words and still not know what to do next.

CivicRelay is built for that moment.

## What I built

CivicRelay is a focused web prototype for turning confusing public-service notices into structured next steps.

A user can paste a notice, choose an output language, and generate an action plan. The app currently supports English, Spanish, Chinese (Simplified), Chinese (Traditional), Arabic, Tagalog, Vietnamese, and Korean.

The output is organized into practical sections:

- what the notice says
- what the user may need to do next
- important deadlines
- documents to prepare
- questions to ask the office
- source evidence from the notice
- uncertainty flags
- safety boundaries

The goal is not to replace official guidance. The goal is to make the next step clearer.

## Why this matters

Government and public-service notices often carry real consequences. A missed deadline, missing document, or unclear instruction can delay support and create more stress.

Translation alone does not always solve the problem. A user may still need to understand:

- What date matters most?
- What documents should I prepare?
- What should I ask the office?
- Which parts of the notice support this action plan?
- What is still unclear?

CivicRelay is designed around that practical gap. It helps turn formal notice language into a clear plan that a person can review, verify, and act on.

## Why Gemma 4

Gemma 4 is the document-understanding and structured reasoning engine inside CivicRelay.

This is not an open-ended chatbot. The app uses a constrained workflow that asks Gemma 4 to return structured output. That structure allows the interface to separate action steps, deadlines, documents, questions, evidence, uncertainty, and safety boundaries.

The workflow uses:

- Gemma 4 via Ollama
- structured output
- evidence snippets
- uncertainty flags
- multilingual action planning
- visible safety boundaries

Gemma 4 is central to the experience. It reads the notice, identifies the practical next steps, supports the selected output language, and returns the result in a format the app can turn into an action plan.

## How it works

The live demo uses a Vercel frontend connected to a Google Cloud Run backend running Ollama with `gemma4:e2b`.

The flow is:

1. The user enters public-service notice text.
2. The user selects an output language.
3. The backend sends the notice into a constrained Gemma 4 workflow through Ollama.
4. Gemma 4 returns structured output.
5. The app renders the result as an action plan with evidence and uncertainty visible.

For judging access, the hosted demo does not require local setup. Judges can use the live Vercel app directly.

For reproducibility, the GitHub repository also includes local Ollama setup instructions.

## Demo scenario

The demo uses a synthetic benefits renewal notice.

The notice includes a deadline and required documents. The user needs to understand what to prepare, what date matters, and what questions to ask before support could be delayed.

In the demo video, I select Chinese (Traditional) as the output language to show how the same notice can become easier to act on across language barriers.

## Responsible AI and safety boundaries

CivicRelay works in a sensitive domain, so the product is designed with restraint.

CivicRelay does not:

- determine eligibility
- replace official guidance
- provide legal advice
- provide medical advice
- provide school compliance advice
- provide benefits advice

Instead, it helps clarify the notice and keeps important information visible.

The app includes source evidence, uncertainty flags, and a trust note reminding users to verify important deadlines and requirements against the original notice.

This is important because a civic AI tool should not hide uncertainty. It should help the user understand the next step while making the limits of the system clear.

## What makes it different from a chatbot

CivicRelay is intentionally narrow.

It is not a general assistant. It is a paperwork-to-action workflow.

The app is designed around one transformation:

**notice in → Gemma 4 analysis → action plan out**

The most important product choice is that action, evidence, uncertainty, and safety boundaries stay visible together.

That makes the experience more inspectable than a normal AI answer. The user can see what the system suggests, what evidence supports it, and what still needs to be verified.

## Limitations

This is a hackathon prototype.

Current limitations:

- The demo uses synthetic public-service notices.
- The app currently focuses on text-based notice input.
- PDF and OCR support are not implemented yet.
- Evidence grounding is prototype-level and should still be checked against the original notice.
- The app does not make official decisions or eligibility determinations.
- Output quality depends on the clarity and completeness of the notice text.

These limitations are intentional. CivicRelay is focused on showing one clear workflow safely, rather than claiming to be a full production civic-service platform.

## Future work

Future work includes:

- PDF/OCR support for scanned notices and image-based paperwork
- stronger source quote verification
- broader multilingual testing
- accessibility improvements
- agency-specific templates
- community organization review workflows
- a more complete local deployment package

## Links

Live demo:  
https://civicrelay.vercel.app

GitHub:  
https://github.com/SY227/civicrelay

Demo video:  
https://www.youtube.com/watch?v=VoF4cBxI0GI

## Closing

CivicRelay is built around one simple idea:

**Confusing paperwork in. Clear action plan out.**
