import type { SampleDocument } from "@/lib/types";

export const sampleDocuments: SampleDocument[] = [
  {
    id: "benefits-notice",
    title: "Sample Benefits Renewal Notice",
    category: "Benefits notice",
    description:
      "A synthetic renewal notice with a submission deadline, required records, and hearing instructions for the demo.",
    text: `County Family Support Office\nRenewal Notice for Food and Cash Assistance\n\nDate mailed: May 20, 2026\nCase number: SYN-1042\n\nWe need more information to complete your annual renewal for food and cash assistance. Your current benefits may end after June 14, 2026 if we do not receive the items listed below.\n\nPlease send all requested items by June 10, 2026 if possible. The final deadline is June 14, 2026.\n\nItems we need:\n1. Copies of your last 30 days of pay stubs for all working adults in the home\n2. A copy of your current lease or rent receipt\n3. A photo ID for the head of household\n\nYou may upload documents online, mail copies, or bring them to the office Monday through Friday, 8:30 AM to 4:30 PM. If you need language help, call 555-0100 and ask for an interpreter.\n\nIf you think this notice is wrong, you may ask for a fair hearing within 30 days of the date mailed on this notice.\n\nThis is a synthetic sample for product demonstration only.`,
  },
  {
    id: "school-notice",
    title: "Sample School Attendance Review Notice",
    category: "School notice",
    description:
      "A synthetic attendance notice asking a family to participate in a school support meeting.",
    text: `River Glen Middle School\nAttendance Support Team Notice\n\nDate sent: May 18, 2026\nStudent: Jordan Lee\n\nThis letter is to inform you that Jordan has 7 unexcused absences this semester. A school attendance support meeting has been scheduled for May 28, 2026 at 3:30 PM in the counseling office.\n\nAt the meeting, we will review barriers to attendance and make a support plan. Please bring any documents that explain recent absences, including doctor notes, transportation records, or court-related paperwork.\n\nIf you need an interpreter or a different meeting time, contact Ms. Alvarez at 555-0131 no later than May 26, 2026.\n\nIf your student cannot attend, a parent or guardian should still attend. Continued unexcused absences may lead to a district attendance referral.\n\nThis is a synthetic sample for product demonstration only.`,
  },
  {
    id: "clinic-follow-up",
    title: "Sample Clinic Follow-up Notice",
    category: "Clinic follow-up notice",
    description:
      "A synthetic non-diagnostic clinic notice with follow-up instructions and interpreter support.",
    text: `East Harbor Community Clinic\nFollow-up Visit Reminder\n\nDate sent: May 16, 2026\nPatient ID: SYN-77\n\nOur records show that you recently completed a screening visit and still need a follow-up appointment to review next steps with a care coordinator. Please schedule or confirm your follow-up visit by June 3, 2026.\n\nBring the following to your appointment:\n- A current medication list\n- Your insurance card, if you have one\n- Any referral forms you received from another clinic\n\nIf you need language assistance, call 555-0199 and tell us your preferred language. If you need transportation help, ask about available community ride support when you call.\n\nThis notice does not provide medical diagnosis or treatment instructions. If you have urgent symptoms, call your local emergency number or go to urgent care.\n\nThis is a synthetic sample for product demonstration only.`,
  },
];

export const sampleDocumentMap = Object.fromEntries(
  sampleDocuments.map((document) => [document.id, document]),
);
