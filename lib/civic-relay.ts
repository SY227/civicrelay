import { GoogleAuth } from "google-auth-library";
import type { CivicRelayResult, Priority } from "@/lib/types";

const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
const DEFAULT_OLLAMA_MODEL = "gemma4:e2b";

export function getOllamaConfig() {
  return {
    baseUrl: (process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL).replace(/\/$/, ""),
    model: process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL,
  };
}

export const civicRelayJsonSchema = {
  type: "object",
  required: [
    "language",
    "what_this_says",
    "what_you_need_to_do",
    "deadlines",
    "documents_to_prepare",
    "questions_to_ask",
    "source_snippets",
    "uncertainty_flags",
    "safety_note",
  ],
  properties: {
    language: { type: "string" },
    what_this_says: { type: "string" },
    what_you_need_to_do: {
      type: "array",
      items: {
        type: "object",
        required: ["step", "why", "priority"],
        properties: {
          step: { type: "string" },
          why: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
        },
      },
    },
    deadlines: {
      type: "array",
      items: {
        type: "object",
        required: ["date", "label", "consequence_if_missed"],
        properties: {
          date: { type: "string" },
          label: { type: "string" },
          consequence_if_missed: { type: "string" },
        },
      },
    },
    documents_to_prepare: {
      type: "array",
      items: { type: "string" },
    },
    questions_to_ask: {
      type: "array",
      items: { type: "string" },
    },
    source_snippets: {
      type: "array",
      items: {
        type: "object",
        required: ["quote", "reason"],
        properties: {
          quote: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
    uncertainty_flags: {
      type: "array",
      items: { type: "string" },
    },
    safety_note: { type: "string" },
  },
} as const;

export function buildCivicRelayPrompt(documentText: string, outputLanguage: string) {
  const trimmedDocument = documentText.trim().slice(0, 12000);

  return `You are CivicRelay, a careful public-service document explainer.

Task:
Read the public-service document below and produce a strict JSON action plan in ${outputLanguage}.

Rules:
- Return valid JSON only.
- Follow the provided schema exactly.
- Keep every field grounded in the document text.
- Do not invent policies, benefits, diagnoses, eligibility, deadlines, or legal conclusions.
- Do not claim that the user is eligible, approved, denied, safe, compliant, or required unless the document explicitly says so.
- Do not provide legal advice, medical advice, school compliance advice, or benefits advice.
- If a date, deadline, consequence, or requirement is not fully clear, say so in uncertainty_flags instead of guessing.
- Important dates must come directly from the document text or be marked unclear.
- source_snippets.quote must be an exact short quote copied from the original document language. Do not translate or paraphrase the quote.
- source_snippets.reason must explain in ${outputLanguage} why that quote matters.
- safety_note must remind the user to verify important deadlines and instructions with the original source.
- what_this_says should be plain-language, short, and clear.
- what_you_need_to_do should be a practical checklist.
- questions_to_ask should help the user clarify missing or confusing details.
- If the document mentions an interpreter, translation, or language assistance, keep that visible.
- If the document is administrative rather than medical, legal, or educational, do not reframe it into those categories.

Document text:
"""
${trimmedDocument}
"""`;
}


async function getOllamaAuthHeaders(baseUrl: string): Promise<Record<string, string>> {
  const serviceAccountJson =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64
      ? Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, "base64").toString("utf8")
      : "");

  if (!serviceAccountJson) {
    return {};
  }

  const audience = process.env.CLOUD_RUN_AUDIENCE || baseUrl;
  const parsedCredentials = JSON.parse(serviceAccountJson);
  const credentials =
    typeof parsedCredentials === "string" ? JSON.parse(parsedCredentials) : parsedCredentials;
  const auth = new GoogleAuth({ credentials });
  const client = await auth.getIdTokenClient(audience);
  const requestHeaders = await client.getRequestHeaders();

  let authorization: string | null | undefined;

  if (typeof (requestHeaders as Headers).get === "function") {
    authorization =
      (requestHeaders as Headers).get("authorization") ||
      (requestHeaders as Headers).get("Authorization");
  } else {
    const headerRecord = requestHeaders as unknown as Record<string, string>;
    authorization = headerRecord.Authorization || headerRecord.authorization;
  }

  if (!authorization) {
    throw new Error("Could not generate Cloud Run identity token.");
  }

  return {
    Authorization: authorization,
  };
}

export async function analyzeWithOllama({
  documentText,
  outputLanguage,
}: {
  documentText: string;
  outputLanguage: string;
}): Promise<CivicRelayResult> {
  const { baseUrl, model } = getOllamaConfig();
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await getOllamaAuthHeaders(baseUrl)),
    },
    body: JSON.stringify({
      model,
      prompt: buildCivicRelayPrompt(documentText, outputLanguage),
      stream: false,
      format: civicRelayJsonSchema,
      options: {
        temperature: 0.2,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Ollama request failed (${response.status}). ${errorBody || "No additional details returned."}`,
    );
  }

  const payload = (await response.json()) as { response?: string };
  const parsed = parseModelJson(payload.response);
  return normalizeResult(parsed, outputLanguage, documentText);
}

function parseModelJson(text: string | undefined) {
  if (!text) {
    throw new Error("Ollama returned an empty response.");
  }

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Ollama returned text that was not valid JSON.");
    }

    return JSON.parse(match[0]);
  }
}

function normalizeResult(raw: unknown, requestedLanguage: string, documentText: string): CivicRelayResult {
  if (!isRecord(raw)) {
    throw new Error("Model output was not an object.");
  }

  const normalizedSourceSnippets = normalizeSourceSnippets(raw.source_snippets, documentText);
  const uncertaintyFlags = normalizeStringArray(raw.uncertainty_flags, [
    "This summary may miss context if the document is incomplete or partially pasted.",
  ]);

  if (normalizedSourceSnippets.hasUnverifiedQuote) {
    uncertaintyFlags.push("Some source snippets could not be matched exactly to the notice text.");
  }

  return {
    language: normalizeLanguage(raw.language, requestedLanguage),
    what_this_says: asNonEmptyString(
      raw.what_this_says,
      "This document explains a next step, but the summary was incomplete.",
    ),
    what_you_need_to_do: normalizeActionItems(raw.what_you_need_to_do),
    deadlines: normalizeDeadlines(raw.deadlines),
    documents_to_prepare: normalizeStringArray(raw.documents_to_prepare, [
      "No specific documents were clearly listed. Verify with the original notice.",
    ]),
    questions_to_ask: normalizeStringArray(raw.questions_to_ask, [
      "Can you confirm the exact next step and deadline on this notice?",
    ]),
    source_snippets: normalizedSourceSnippets.items,
    uncertainty_flags: Array.from(new Set(uncertaintyFlags)).slice(0, 8),
    safety_note: asNonEmptyString(
      raw.safety_note,
      "Verify deadlines, required documents, and contact details against the original notice before acting.",
    ),
  };
}

function normalizeActionItems(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    return [
      {
        step: "Review the original document carefully.",
        why: "The model did not return a complete action checklist.",
        priority: "high" as Priority,
      },
    ];
  }

  return value
    .filter(isRecord)
    .map((item) => ({
      step: asNonEmptyString(item.step, "Review the original document carefully."),
      why: asNonEmptyString(item.why, "The document appears to require a next step."),
      priority: normalizePriority(item.priority),
    }))
    .slice(0, 6);
}

function normalizeDeadlines(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    return [
      {
        date: "Not clearly stated",
        label: "Confirm the key deadline",
        consequence_if_missed: "Missing a deadline could delay support or next steps.",
      },
    ];
  }

  return value
    .filter(isRecord)
    .map((item) => ({
      date: asNonEmptyString(item.date, "Not clearly stated"),
      label: asNonEmptyString(item.label, "Important deadline"),
      consequence_if_missed: asNonEmptyString(
        item.consequence_if_missed,
        "The document does not clearly state the consequence.",
      ),
    }))
    .slice(0, 5);
}

function normalizeSourceSnippets(value: unknown, documentText: string) {
  if (!Array.isArray(value) || value.length === 0) {
    return {
      items: [
        {
          quote: "No exact source snippet returned.",
          reason: "Check the original document for the exact wording.",
        },
      ],
      hasUnverifiedQuote: false,
    };
  }

  let hasUnverifiedQuote = false;

  const items = value
    .filter(isRecord)
    .map((item) => {
      const proposedQuote = asNonEmptyString(item.quote, "No exact source snippet returned.");
      const verifiedQuote = findExactDocumentQuote(documentText, proposedQuote);

      if (!verifiedQuote) {
        hasUnverifiedQuote = true;
        return {
          quote: "Quote could not be verified against the notice.",
          reason:
            "The model returned a source snippet that could not be matched exactly to the input notice. Verify this point against the original text.",
        };
      }

      return {
        quote: verifiedQuote,
        reason: asNonEmptyString(item.reason, "This snippet supports part of the summary."),
      };
    })
    .slice(0, 6);

  return {
    items,
    hasUnverifiedQuote,
  };
}

function normalizeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const cleaned = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);

  return cleaned.length > 0 ? cleaned : fallback;
}

function normalizeLanguage(value: unknown, requestedLanguage: string) {
  if (typeof value !== "string") {
    return requestedLanguage;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return requestedLanguage;
  }

  const normalized = trimmed.toLowerCase();
  const languageMap: Record<string, string> = {
    english: "English",
    en: "English",
    spanish: "Spanish",
    es: "Spanish",
    "chinese (simplified)": "Chinese (Simplified)",
    chinese: "Chinese (Simplified)",
    zh: "Chinese (Simplified)",
    "traditional chinese": "Traditional Chinese",
    "zh-tw": "Traditional Chinese",
    "zh-hant": "Traditional Chinese",
    arabic: "Arabic",
    ar: "Arabic",
    tagalog: "Tagalog",
    tl: "Tagalog",
    vietnamese: "Vietnamese",
    vi: "Vietnamese",
    korean: "Korean",
    ko: "Korean",
  };

  if (languageMap[normalized]) {
    return languageMap[normalized];
  }

  return trimmed.length <= 5 ? requestedLanguage : trimmed;
}

function findExactDocumentQuote(documentText: string, proposedQuote: string) {
  const exactQuote = proposedQuote.trim();
  if (!exactQuote) {
    return null;
  }

  if (documentText.includes(exactQuote)) {
    return exactQuote;
  }

  const normalizedDocument = normalizeWhitespaceWithMap(documentText);
  const normalizedQuote = normalizeWhitespace(proposedQuote);

  if (!normalizedQuote) {
    return null;
  }

  const start = normalizedDocument.text.indexOf(normalizedQuote);
  if (start === -1) {
    return null;
  }

  const end = start + normalizedQuote.length - 1;
  const originalStart = normalizedDocument.map[start];
  const originalEnd = normalizedDocument.map[end];

  if (originalStart === undefined || originalEnd === undefined) {
    return null;
  }

  return documentText.slice(originalStart, originalEnd + 1).trim();
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeWhitespaceWithMap(text: string) {
  let normalized = "";
  const map: number[] = [];
  let lastWasWhitespace = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const isWhitespace = /\s/.test(character);

    if (isWhitespace) {
      if (!normalized || lastWasWhitespace) {
        continue;
      }

      normalized += " ";
      map.push(index);
      lastWasWhitespace = true;
      continue;
    }

    normalized += character;
    map.push(index);
    lastWasWhitespace = false;
  }

  if (normalized.endsWith(" ")) {
    normalized = normalized.slice(0, -1);
    map.pop();
  }

  return {
    text: normalized,
    map,
  };
}

function normalizePriority(value: unknown): Priority {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return "medium";
}

function asNonEmptyString(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
