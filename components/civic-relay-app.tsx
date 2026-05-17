"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sampleDocuments } from "@/lib/sample-documents";
import type { CivicRelayResult } from "@/lib/types";

const languageOptions = [
  "English",
  "Spanish",
  "Chinese (Simplified)",
  "Arabic",
  "Tagalog",
  "Vietnamese",
  "Korean",
];

const displayModelName = "gemma4:e2b";
const maxAnalyzeAttempts = 3;
const retryDelayMs = [900, 1300] as const;
const finalAnalyzeErrorMessage =
  "CivicRelay couldn’t finish the action plan just now. Please try again.";

const sampleStakes: Record<string, string> = {
  "benefits-notice": "Submission deadline + required records",
  "school-notice": "Scheduled meeting + attendance support",
  "clinic-follow-up": "Follow-up deadline + language support",
};

const stagedLoadingSteps = [
  { target: 10, label: "Reading notice...", durationMs: 800 },
  { target: 30, label: "Finding deadlines and documents...", durationMs: 1200 },
  { target: 55, label: "Building action plan...", durationMs: 1600 },
  { target: 75, label: "Checking evidence and uncertainty...", durationMs: 1600 },
  { target: 90, label: "Preparing final result...", durationMs: 1400 },
] as const;

const finishedLoadingStep = { target: 100, label: "Done" };

const totalStagedLoadingDuration = stagedLoadingSteps.reduce(
  (total, stage) => total + stage.durationMs,
  0,
);

type AnalyzeResponse = {
  result?: CivicRelayResult;
  error?: string;
  meta?: {
    runtime: string;
    baseUrl: string;
    model: string;
  };
};

type LoadingPhase = "idle" | "running" | "finishing";

class AnalyzeRequestError extends Error {
  retriable: boolean;
  userMessage: string;
  status?: number;

  constructor({
    technicalMessage,
    userMessage,
    retriable,
    status,
  }: {
    technicalMessage: string;
    userMessage: string;
    retriable: boolean;
    status?: number;
  }) {
    super(technicalMessage);
    this.name = "AnalyzeRequestError";
    this.retriable = retriable;
    this.userMessage = userMessage;
    this.status = status;
  }
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isRetriableStatus(status: number) {
  return status === 429 || status >= 500;
}

async function parseAnalyzePayload(response: Response) {
  try {
    return (await response.json()) as AnalyzeResponse;
  } catch {
    return null;
  }
}

async function requestActionPlan(documentText: string, outputLanguage: string) {
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        documentText,
        outputLanguage,
      }),
    });

    const payload = await parseAnalyzePayload(response);

    if (!response.ok || !payload?.result) {
      const responseMessage = payload?.error?.trim();

      if (isRetriableStatus(response.status)) {
        throw new AnalyzeRequestError({
          technicalMessage: responseMessage || `Analyze request failed with status ${response.status}.`,
          userMessage: finalAnalyzeErrorMessage,
          retriable: true,
          status: response.status,
        });
      }

      throw new AnalyzeRequestError({
        technicalMessage: responseMessage || `Analyze request failed with status ${response.status}.`,
        userMessage:
          responseMessage ||
          "Please check the notice text and try again.",
        retriable: false,
        status: response.status,
      });
    }

    return payload;
  } catch (error) {
    if (error instanceof AnalyzeRequestError) {
      throw error;
    }

    throw new AnalyzeRequestError({
      technicalMessage:
        error instanceof Error ? error.message : "Analyze request failed before a response was returned.",
      userMessage: finalAnalyzeErrorMessage,
      retriable: true,
    });
  }
}

export function CivicRelayApp() {
  const [selectedSampleId, setSelectedSampleId] = useState(sampleDocuments[0]?.id ?? "");
  const [documentText, setDocumentText] = useState(sampleDocuments[0]?.text ?? "");
  const [documentTitle, setDocumentTitle] = useState(
    sampleDocuments[0]?.title ?? "Sample Benefits Renewal Notice",
  );
  const [outputLanguage, setOutputLanguage] = useState("English");
  const [result, setResult] = useState<CivicRelayResult | null>(null);
  const [runtimeMeta, setRuntimeMeta] = useState<AnalyzeResponse["meta"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>("idle");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStageIndex, setLoadingStageIndex] = useState(0);
  const [loadingDots, setLoadingDots] = useState(1);
  const [isRetryingQuietly, setIsRetryingQuietly] = useState(false);
  const outputPanelRef = useRef<HTMLDivElement | null>(null);
  const loadingPanelRef = useRef<HTMLDivElement | null>(null);

  const activeSample = useMemo(
    () => sampleDocuments.find((document) => document.id === selectedSampleId) ?? null,
    [selectedSampleId],
  );

  const featuredDeadline = result?.deadlines[0] ?? null;
  const isLoading = loadingPhase !== "idle";
  const activeLoadingLabel =
    loadingPhase === "finishing"
      ? finishedLoadingStep.label
      : isRetryingQuietly
        ? "Retrying connection quietly..."
        : stagedLoadingSteps[loadingStageIndex]?.label ??
          stagedLoadingSteps[stagedLoadingSteps.length - 1].label;
  const loadingHeadline =
    loadingPhase === "finishing"
      ? "Done"
      : isRetryingQuietly
        ? "Still working on the action plan..."
        : `Analyzing${".".repeat(loadingDots)}`;
  const loadingSupportCopy = isRetryingQuietly
    ? "The first attempt did not finish cleanly, so CivicRelay is quietly trying again."
    : "CivicRelay is preparing a structured action plan grounded in the notice text.";

  useEffect(() => {
    if (loadingPhase !== "running") {
      setLoadingDots(1);
      return;
    }

    const intervalId = window.setInterval(() => {
      setLoadingDots((current) => (current % 3) + 1);
    }, 450);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadingPhase]);

  useEffect(() => {
    if (loadingPhase !== "running") {
      return;
    }

    const startedAt = performance.now();

    const syncLoadingState = () => {
      const elapsed = performance.now() - startedAt;

      if (elapsed >= totalStagedLoadingDuration) {
        setLoadingProgress(stagedLoadingSteps[stagedLoadingSteps.length - 1].target);
        setLoadingStageIndex(stagedLoadingSteps.length - 1);
        return;
      }

      let elapsedBeforeStage = 0;
      let previousTarget = 0;

      for (let index = 0; index < stagedLoadingSteps.length; index += 1) {
        const stage = stagedLoadingSteps[index];
        const stageEndsAt = elapsedBeforeStage + stage.durationMs;

        if (elapsed < stageEndsAt) {
          const stageElapsed = elapsed - elapsedBeforeStage;
          const stageProgress = stageElapsed / stage.durationMs;
          const nextProgress = previousTarget + (stage.target - previousTarget) * stageProgress;
          setLoadingProgress(nextProgress);
          setLoadingStageIndex(index);
          return;
        }

        elapsedBeforeStage = stageEndsAt;
        previousTarget = stage.target;
      }
    };

    syncLoadingState();
    const intervalId = window.setInterval(syncLoadingState, 120);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadingPhase]);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      loadingPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isLoading]);

  useEffect(() => {
    if (!result) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      outputPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [result]);

  async function handleAnalyze() {
    setLoadingPhase("running");
    setLoadingProgress(0);
    setLoadingStageIndex(0);
    setLoadingDots(1);
    setIsRetryingQuietly(false);
    setError(null);
    setResult(null);
    setRuntimeMeta(null);

    for (let attempt = 1; attempt <= maxAnalyzeAttempts; attempt += 1) {
      try {
        const payload = await requestActionPlan(documentText, outputLanguage);
        setIsRetryingQuietly(false);
        setLoadingPhase("finishing");
        setLoadingProgress(finishedLoadingStep.target);
        setLoadingStageIndex(stagedLoadingSteps.length);
        await wait(320);
        setResult(payload.result ?? null);
        setRuntimeMeta(payload.meta ?? null);
        setLoadingPhase("idle");
        return;
      } catch (requestError) {
        const analyzeError =
          requestError instanceof AnalyzeRequestError
            ? requestError
            : new AnalyzeRequestError({
                technicalMessage:
                  requestError instanceof Error
                    ? requestError.message
                    : "Unknown analyze request error.",
                userMessage: finalAnalyzeErrorMessage,
                retriable: true,
              });

        console.error(`[CivicRelay] Analyze attempt ${attempt} failed.`, {
          status: analyzeError.status,
          message: analyzeError.message,
        });

        if (!analyzeError.retriable || attempt === maxAnalyzeAttempts) {
          setIsRetryingQuietly(false);
          setLoadingPhase("idle");
          setError(analyzeError.userMessage);
          return;
        }

        setIsRetryingQuietly(true);
        await wait(retryDelayMs[attempt - 1] ?? retryDelayMs[retryDelayMs.length - 1]);
      }
    }
  }

  function loadSample(sampleId: string) {
    const sample = sampleDocuments.find((item) => item.id === sampleId);
    if (!sample) return;
    setSelectedSampleId(sample.id);
    setDocumentTitle(sample.title);
    setDocumentText(sample.text);
    setResult(null);
    setError(null);
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setSelectedSampleId("");
    setDocumentTitle(file.name);
    setDocumentText(text);
    setResult(null);
    setError(null);
  }

  function handleClear() {
    setSelectedSampleId("");
    setDocumentTitle("");
    setDocumentText("");
    setResult(null);
    setRuntimeMeta(null);
    setError(null);
    setLoadingPhase("idle");
    setLoadingProgress(0);
    setLoadingStageIndex(0);
    setLoadingDots(1);
    setIsRetryingQuietly(false);
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero__intro">
          <span className="hero__eyebrow">CivicRelay</span>
          <h1>Confusing paperwork in. Clear action plan out.</h1>
          <p className="hero__thesis">In your language, locally powered by Gemma 4.</p>
          <p className="helper hero__support">
            A local-first Gemma 4 demo for public-service notices, powered by Ollama and designed to keep action, evidence, and uncertainty visible.
          </p>
          <div className="badge-row">
            <span className="badge">Local Gemma 4</span>
            <span className="badge">Ollama runtime</span>
            <span className="badge">{displayModelName}</span>
            <span className="badge">No cloud LLM key</span>
            <span className="badge">Evidence-backed output</span>
          </div>
        </div>

        <div className="transformation-strip" aria-label="CivicRelay transformation flow">
          <div className="transformation-step">
            <span className="transformation-step__label">Input</span>
            <strong>Notice</strong>
            <p>Benefits, school, or clinic follow-up notices with real stakes and clear next steps.</p>
          </div>
          <div className="transformation-arrow">→</div>
          <div className="transformation-step transformation-step--accent">
            <span className="transformation-step__label">Local analysis</span>
            <strong>Local Gemma 4</strong>
            <p>Ollama runs strict JSON analysis grounded in quoted evidence from the notice.</p>
          </div>
          <div className="transformation-arrow">→</div>
          <div className="transformation-step">
            <span className="transformation-step__label">Output</span>
            <strong>Action Plan</strong>
            <p>A clear action plan with deadlines, next steps, documents, questions, and boundaries.</p>
          </div>
        </div>
      </section>

      <section className="workbench">
        <div className="panel workbench__panel">
          <div className="panel__header stack-sm">
            <div>
              <h2>Public-service notice</h2>
              <p className="helper">
                Paste a notice, upload a text file, or start with a synthetic sample to walk through the demo.
              </p>
            </div>
          </div>

          <div className="panel__body stack">
            <div className="stack-sm">
              <div className="section-heading">
                <strong>Try a sample notice</strong>
                <span className="helper">Sample notices are synthetic for demo purposes.</span>
              </div>

              <div className="sample-grid">
                {sampleDocuments.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    className={`button--sample sample-card ${selectedSampleId === sample.id ? "is-active" : ""}`}
                    onClick={() => loadSample(sample.id)}
                  >
                    <span className="sample-card__topline">{sample.category}</span>
                    <span className="sample-card__title">{sample.title}</span>
                    <span className="sample-card__stakes">{sampleStakes[sample.id]}</span>
                  </button>
                ))}
              </div>

              {activeSample ? <div className="notice">{activeSample.description}</div> : null}
            </div>

            <label className="label">
              Notice label
              <input
                className="input"
                value={documentTitle}
                onChange={(event) => setDocumentTitle(event.target.value)}
                placeholder="Sample Benefits Renewal Notice"
              />
            </label>

            <div className="summary-grid">
              <label className="label">
                Action plan language
                <select
                  className="select"
                  value={outputLanguage}
                  onChange={(event) => setOutputLanguage(event.target.value)}
                >
                  {languageOptions.map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </label>

              <label className="label">
                Upload text file
                <input className="input" type="file" accept=".txt,.md,.text" onChange={handleFileUpload} />
              </label>
            </div>

            <label className="label">
              Notice text
              <textarea
                className="textarea"
                value={documentText}
                onChange={(event) => setDocumentText(event.target.value)}
                placeholder="Paste the notice text here"
              />
            </label>

            <div className="toolbar">
              <button className="button" type="button" onClick={handleAnalyze} disabled={isLoading}>
                {isLoading ? "Generating action plan..." : "Generate action plan"}
              </button>
              <button className="button--ghost" type="button" onClick={handleClear} disabled={isLoading}>
                Clear
              </button>
            </div>

            <div className="trust-note">
              <strong>Trust note:</strong> CivicRelay helps clarify notices, not replace official guidance. Verify important deadlines and requirements against the original notice.
            </div>
          </div>
        </div>

        <div className="panel workbench__panel workbench__panel--action" ref={outputPanelRef}>
          <div className="panel__header stack-sm">
            <div className="section-heading section-heading--spread">
              <div>
                <h2>Action plan</h2>
                <p className="helper">
                  This is the heart of the demo: what the notice means, what to do next, and what needs attention first.
                </p>
              </div>
              <div className="panel-badges">
                <span className="badge">Local Gemma 4</span>
                <span className="badge badge--plain">{displayModelName}</span>
              </div>
            </div>

            <div className="runtime-strip">
              <span>Runtime: {runtimeMeta?.runtime ?? "local-ollama"}</span>
              <span>Model: {displayModelName}</span>
              <span>Grounding: quoted source evidence</span>
            </div>
          </div>

          <div className="panel__body stack-lg">
            {error ? <div className="notice notice--error">{error}</div> : null}

            {isLoading ? (
              <div
                className="loading-state stack"
                role="status"
                aria-live="polite"
                aria-atomic="true"
                ref={loadingPanelRef}
              >
                <div className="loading-state__lead">
                  <span className="badge">Estimated progress</span>
                  <h3>{loadingHeadline}</h3>
                  <p>{loadingSupportCopy}</p>
                </div>

                <div
                  className="loading-meter"
                  role="progressbar"
                  aria-label="Estimated analysis progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(loadingProgress)}
                >
                  <div className="loading-meter__bar" style={{ width: `${loadingProgress}%` }} />
                </div>

                <div className="loading-state__status">
                  <strong>{activeLoadingLabel}</strong>
                  <span>{Math.round(loadingProgress)}%</span>
                </div>

                <div className="loading-stage-grid" aria-hidden="true">
                  {stagedLoadingSteps.map((stage, index) => {
                    const isComplete = loadingPhase === "finishing" || loadingProgress >= stage.target;
                    const isActive = !isComplete && index === loadingStageIndex;

                    return (
                      <div
                        key={stage.label}
                        className={`loading-stage-card${isComplete ? " is-complete" : ""}${isActive ? " is-active" : ""}`}
                      >
                        <span className="loading-stage-card__label">{stage.label}</span>
                      </div>
                    );
                  })}
                </div>

                <p className="helper loading-state__footnote">
                  Staged feedback only. The backend may finish faster or slower.
                </p>
              </div>
            ) : null}

            {!isLoading && !result && !error ? (
              <div className="empty-state stack">
                <div className="empty-state__lead">
                  <span className="badge">After local analysis, you’ll see</span>
                  <h3>What appears after local analysis</h3>
                  <p>
                    CivicRelay turns one confusing notice into a structured, evidence-backed plan that is easier to understand, easier to follow, and easier to audit.
                  </p>
                </div>

                <div className="preview-grid">
                  <div className="preview-card">
                    <strong>What this means</strong>
                    <span>
                      A plain-language summary of the notice in the selected language, ready for a quick demo walkthrough.
                    </span>
                  </div>
                  <div className="preview-card preview-card--deadline">
                    <strong>Key deadline</strong>
                    <span>
                      The most important date is elevated visually, together with the likely consequence of missing it.
                    </span>
                  </div>
                  <div className="preview-card">
                    <strong>Your next steps</strong>
                    <span>
                      Prioritized actions, with a clear rationale for each step so the next move feels obvious.
                    </span>
                  </div>
                  <div className="preview-card">
                    <strong>Documents to prepare</strong>
                    <span>Specific materials the person may need before responding to the notice.</span>
                  </div>
                  <div className="preview-card">
                    <strong>Questions for the agency</strong>
                    <span>Targeted follow-up questions for anything the notice leaves unclear or unresolved.</span>
                  </div>
                </div>
              </div>
            ) : null}

            {!isLoading && result ? (
              <div className="stack-lg">
                <div className="result-header">
                  <span className="badge">Output language: {result.language}</span>
                  <span className="helper">Document: {documentTitle || "Uploaded notice"}</span>
                </div>

                <div className="meaning-card">
                  <strong>What this means</strong>
                  <p>{result.what_this_says}</p>
                </div>

                {featuredDeadline ? (
                  <div className="deadline-spotlight">
                    <div className="deadline-spotlight__label">Key deadline</div>
                    <div className="deadline-spotlight__date">{featuredDeadline.date}</div>
                    <div className="deadline-spotlight__title">{featuredDeadline.label}</div>
                    <p>{featuredDeadline.consequence_if_missed}</p>
                  </div>
                ) : null}

                <div className="action-card">
                  <div className="section-heading">
                    <strong>Your next steps</strong>
                    <span className="helper">Priority badges make it easy to see which actions should come first.</span>
                  </div>
                  <ol className="clean-list action-list">
                    {result.what_you_need_to_do.map((item, index) => (
                      <li key={`${item.step}-${index}`} className="action-item action-item--featured">
                        <div className="action-item__topline">
                          <span className={`priority priority--${item.priority}`}>{item.priority} priority</span>
                          <span className="action-index">Step {index + 1}</span>
                        </div>
                        <strong>{item.step}</strong>
                        <span className="muted">{item.why}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="results-grid">
                  <div className="list-card">
                    <strong>Documents to prepare</strong>
                    <ul className="list">
                      {result.documents_to_prepare.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="list-card">
                    <strong>Questions for the agency</strong>
                    <ul className="list">
                      {result.questions_to_ask.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="list-card result-span-2">
                    <strong>Key deadlines</strong>
                    <ul className="clean-list deadline-list">
                      {result.deadlines.map((deadline, index) => (
                        <li key={`${deadline.label}-${index}`} className="deadline-item">
                          <div className="deadline-item__row">
                            <span>{deadline.label}</span>
                            <span className="deadline-date">{deadline.date}</span>
                          </div>
                          <span className="muted">{deadline.consequence_if_missed}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="panel workbench__panel">
          <div className="panel__header stack-sm">
            <div>
              <h2>Evidence and trust</h2>
              <p className="helper">
                Quoted evidence, uncertainty, and safety boundaries stay visible beside the action plan throughout the demo.
              </p>
            </div>
          </div>

          <div className="panel__body stack">
            {!result ? (
              <div className="stack">
                <div className="trust-card">
                  <strong>Source evidence</strong>
                  <p>
                    Exact short quotes from the notice appear here so viewers can quickly check the summary against the source text.
                  </p>
                </div>
                <div className="trust-card">
                  <strong>Where CivicRelay is unsure</strong>
                  <p>
                    If a requirement or date is unclear, the app flags the uncertainty instead of pretending to know more than the notice says.
                  </p>
                </div>
                <div className="trust-card">
                  <strong>Important boundary</strong>
                  <p>
                    CivicRelay helps people interpret notices more confidently. It does not replace legal, medical, school, or benefits professionals.
                  </p>
                </div>
              </div>
            ) : null}

            {result ? (
              <div className="stack">
                <div className="trust-card">
                  <div className="section-heading">
                    <strong>Quoted evidence</strong>
                    <span className="helper">
                      Exact snippets remain in the original document language for a stronger, more credible demo.
                    </span>
                  </div>
                  <ul className="clean-list">
                    {result.source_snippets.map((snippet, index) => (
                      <li key={`${snippet.quote}-${index}`} className="snippet-item">
                        <span className="source-quote">“{snippet.quote}”</span>
                        <span className="muted">{snippet.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="trust-card">
                  <strong>Where CivicRelay is unsure</strong>
                  <ul className="list compact-list">
                    {result.uncertainty_flags.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="trust-card trust-card--boundary">
                  <strong>Important boundary</strong>
                  <p>{result.safety_note}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="proof-strip" aria-label="Technical proof strip">
        <span>Runtime: local Ollama</span>
        <span>Model: {displayModelName}</span>
        <span>Output: strict JSON schema</span>
        <span>Grounding: quoted source snippets</span>
        <span>Demo data: synthetic samples</span>
        <span>Boundary: not legal, medical, school, or benefits advice</span>
      </section>
    </main>
  );
}
