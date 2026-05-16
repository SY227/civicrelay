import { NextResponse } from "next/server";
import { analyzeWithOllama, getOllamaConfig } from "@/lib/civic-relay";

export const runtime = "nodejs";

type AnalyzeRequest = {
  documentText?: string;
  outputLanguage?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRequest;
    const documentText = body.documentText?.trim();
    const outputLanguage = body.outputLanguage?.trim() || "English";

    if (!documentText || documentText.length < 80) {
      return NextResponse.json(
        {
          error:
            "Please paste or load a longer notice. CivicRelay performs best when the document contains enough detail for a reliable action plan.",
        },
        { status: 400 },
      );
    }

    const result = await analyzeWithOllama({
      documentText,
      outputLanguage,
    });

    const { model, baseUrl } = getOllamaConfig();

    return NextResponse.json({
      result,
      meta: {
        runtime: "local-ollama",
        baseUrl,
        model,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "CivicRelay could not complete the local Ollama request.";

    return NextResponse.json(
      {
        error: `${message} Confirm that Ollama is running locally and that the model is available: ollama pull gemma4:e4b`,
      },
      { status: 500 },
    );
  }
}
