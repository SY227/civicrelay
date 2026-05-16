export type Priority = "high" | "medium" | "low";

export interface ActionItem {
  step: string;
  why: string;
  priority: Priority;
}

export interface DeadlineItem {
  date: string;
  label: string;
  consequence_if_missed: string;
}

export interface SourceSnippet {
  quote: string;
  reason: string;
}

export interface CivicRelayResult {
  language: string;
  what_this_says: string;
  what_you_need_to_do: ActionItem[];
  deadlines: DeadlineItem[];
  documents_to_prepare: string[];
  questions_to_ask: string[];
  source_snippets: SourceSnippet[];
  uncertainty_flags: string[];
  safety_note: string;
}

export interface SampleDocument {
  id: string;
  title: string;
  category: string;
  description: string;
  text: string;
}
