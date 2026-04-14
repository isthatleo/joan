import OpenAI from "openai";
import { db } from "@/lib/db";
import { aiLogs } from "@/lib/db/schema";
import { PatientService } from "./patient.service";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildPatientContext(patient: any) {
  return {
    demographics: {
      age: patient.age,
      gender: patient.gender,
    },
    vitals: patient.vitals,
    conditions: patient.conditions,
    allergies: patient.allergies,
    medications: patient.medications,
    recentVisits: patient.visits?.slice(-5),
    labResults: patient.labResults?.slice(-5),
  };
}

function summaryPrompt(context: any) {
  return `
You are a clinical assistant.

Summarize this patient in a concise medical format.

Focus:
- Key conditions
- Recent visits
- Abnormal findings
- Current medications

Return JSON:
{
  "summary": "...",
  "alerts": ["..."]
}

Data:
${JSON.stringify(context)}
`;
}

function diagnosisPrompt(context: any, symptoms: string) {
  return `
You are a medical AI assistant.

Given patient data and symptoms, suggest possible diagnoses.

Return JSON:
{
  "diagnoses": [
    {
      "name": "...",
      "probability": "...",
      "reasoning": "..."
    }
  ]
}

Patient Data:
${JSON.stringify(context)}

Symptoms:
${symptoms}
`;
}

// Placeholder for AI service
export class AIService {
  private patientService = new PatientService();

  async summary(patientId: string) {
    const patient = await this.patientService.getPatientFullContext(patientId);
    if (!patient) throw new Error("Patient not found");

    const context = buildPatientContext(patient);

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: summaryPrompt(context) }],
    });

    const output = JSON.parse(response.choices[0].message.content);

    await db.insert(aiLogs).values({
      patientId,
      type: "summary",
      input: context,
      output,
    });

    return output;
  }

  async diagnose(patientId: string, symptoms: string) {
    const patient = await this.patientService.getPatientFullContext(patientId);
    if (!patient) throw new Error("Patient not found");

    const context = buildPatientContext(patient);

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: diagnosisPrompt(context, symptoms) }],
    });

    const output = JSON.parse(response.choices[0].message.content);

    await db.insert(aiLogs).values({
      patientId,
      type: "diagnosis",
      input: { context, symptoms },
      output,
    });

    return output;
  }
}
