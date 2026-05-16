"use client";

import { useMemo, useState } from "react";
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

const sampleStakes: Record<string, string> = {
  "benefits-notice": "Submission deadline + required records",
  "school-notice": "Scheduled meeting + attendance support",
  "clinic-follow-up": "Follow-up deadline + language support",
};

type AnalyzeResponse = {
  result?: CivicRelayResult;
  error?: string;
  meta?: {
    runtime: string;
    baseUrl: string;
    model: string;
  };
};

export function CivicRelayApp() {
  const [selectedSampleId, setSelectedSampleId] = useState(sampleDocuments[0]?.id ?? "");
  const [documentText, setDocumentText] = useState(sampleDocuments[0]?.text ?? "");
  const [documentTitle, setDocumentTitle] = useState(sampleDocuments[0]?.title ?? "Sample Benefits Renewal Notice");
  const [outputLanguage, setOutputLanguage] = useState("English");
  const [result, setResult] = useState<CivicRelayResult | null>(null);
  const [runtimeMeta, setRuntimeMeta] = useState<AnalyzeResponse["meta"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const activeSample = useMemo(
    () => sampleDocuments.find((document) => document.id === selectedSampleId) ?? null,
    [selectedSampleId],
  );

  const featuredDeadline = result?.deadlines[0] ?? null;

  async function handleAnalyze() {
    setIsLoading(true);
    setError(null);

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

      const payload = (await response.json()) as AnalyzeResponse;

      if (!response.ok || !payload.result) {
        throw new Error(payload.error || "CivicRelay could not produce a structured result.");
      }

      setResult(payload.result);
      setRuntimeMeta(payload.meta ?? null);
    } catch (requestError) {
      setResult(null);
      setRuntimeMeta(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "CivicRelay could not reach the local Ollama runtime.",
      );
    } finally {
      setIsLoading(false);
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
            <span className="badge">gemma4:e4b</span>
            <span className="badge">Synthetic demo notices</span>
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
                <span className="helper">Synthetic examples only, so you can demo the workflow without using real personal data.</span>
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
                {isLoading ? "Analyzing with local Gemma 4..." : "Generate action plan"}
              </button>
              <button className="button--ghost" type="button" onClick={handleClear}>
                Clear
              </button>
            </div>

            <div className="notice notice--warning">
              Demo guardrails: use synthetic notices only. CivicRelay offers plain-language support, and all
              deadlines and requirements should still be verified against the original notice.
            </div>
          </div>
        </div>

        <div className="panel workbench__panel workbench__panel--action">
          <div className="panel__header stack-sm">
            <div className="section-heading section-heading--spread">
              <div>
                <h2>Action plan</h2>
                <p className="helper">This is the heart of the demo: what the notice means, what to do next, and what needs attention first.</p>
              </div>
              <div className="panel-badges">
                <span className="badge">Local Gemma 4</span>
                <span className="badge badge--plain">{runtimeMeta?.model ?? "gemma4:e4b"}</span>
              </div>
            </div>

            <div className="runtime-strip">
              <span>Runtime: {runtimeMeta?.runtime ?? "local-ollama"}</span>
              <span>Model: {runtimeMeta?.model ?? "gemma4:e4b"}</span>
              <span>Grounding: quoted source evidence</span>
            </div>
          </div>

          <div className="panel__body stack-lg">
            {error ? <div className="notice notice--error">{error}</div> : null}

            {!result && !error ? (
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
                    <span>A plain-language summary of the notice in the selected language, ready for a quick demo walkthrough.</span>
                  </div>
                  <div className="preview-card preview-card--deadline">
                    <strong>Key deadline</strong>
                    <span>The most important date is elevated visually, together with the likely consequence of missing it.</span>
                  </div>
                  <div className="preview-card">
                    <strong>Your next steps</strong>
                    <span>Prioritized actions, with a clear rationale for each step so the next move feels obvious.</span>
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

            {result ? (
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
              <p className="helper">Quoted evidence, uncertainty, and safety boundaries stay visible beside the action plan throughout the demo.</p>
            </div>
          </div>

          <div className="panel__body stack">
            {!result ? (
              <div className="stack">
                <div className="trust-card">
                  <strong>Source evidence</strong>
                  <p>Exact short quotes from the notice appear here so viewers can quickly check the summary against the source text.</p>
                </div>
                <div className="trust-card">
                  <strong>Where CivicRelay is unsure</strong>
                  <p>If a requirement or date is unclear, the app flags the uncertainty instead of pretending to know more than the notice says.</p>
                </div>
                <div className="trust-card">
                  <strong>Important boundary</strong>
                  <p>CivicRelay helps people interpret notices more confidently. It does not replace legal, medical, school, or benefits professionals.</p>
                </div>
              </div>
            ) : null}

            {result ? (
              <div className="stack">
                <div className="trust-card">
                  <div className="section-heading">
                    <strong>Quoted evidence</strong>
                    <span className="helper">Exact snippets remain in the original document language for a stronger, more credible demo.</span>
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
        <span>Model: gemma4:e4b</span>
        <span>Output: strict JSON schema</span>
        <span>Grounding: quoted source snippets</span>
        <span>Demo data: synthetic notices only</span>
        <span>Boundary: not legal, medical, school, or benefits advice</span>
      </section>
    </main>
  );
}
