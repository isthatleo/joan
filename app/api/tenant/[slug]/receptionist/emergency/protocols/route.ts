import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = resolvedParams;

    // Mock data - replace with actual database queries
    const emergencyProtocols = [
      {
        id: "protocol_1",
        name: "Cardiac Arrest Response",
        type: "cardiac",
        steps: [
          "Call Code Blue immediately",
          "Start CPR if patient is unresponsive",
          "Attach AED and follow voice prompts",
          "Administer oxygen if available",
          "Prepare for defibrillation",
          "Transfer to ICU when stabilized"
        ],
        estimatedTime: "10-15 minutes",
        requiredPersonnel: ["Cardiologist", "ICU Nurse", "Respiratory Therapist", "Pharmacist"]
      },
      {
        id: "protocol_2",
        name: "Severe Trauma Response",
        type: "trauma",
        steps: [
          "Assess ABCs (Airway, Breathing, Circulation)",
          "Control any active bleeding",
          "Immobilize spine if head/neck injury suspected",
          "Start IV fluids and pain management",
          "Order immediate imaging (CT/X-ray)",
          "Prepare for surgery if needed"
        ],
        estimatedTime: "30-45 minutes",
        requiredPersonnel: ["Trauma Surgeon", "ER Nurse", "Radiologist", "Anesthesiologist"]
      },
      {
        id: "protocol_3",
        name: "Acute Stroke Protocol",
        type: "neurological",
        steps: [
          "Perform NIH Stroke Scale assessment",
          "Order immediate CT scan",
          "Administer tPA if within time window",
          "Monitor blood pressure closely",
          "Transfer to stroke unit",
          "Begin rehabilitation assessment"
        ],
        estimatedTime: "60 minutes",
        requiredPersonnel: ["Neurologist", "ER Physician", "Radiology Tech", "Stroke Nurse"]
      },
      {
        id: "protocol_4",
        name: "Severe Allergic Reaction",
        type: "medical",
        steps: [
          "Administer epinephrine immediately",
          "Position patient comfortably",
          "Start IV antihistamines",
          "Monitor vital signs continuously",
          "Prepare for intubation if needed",
          "Observe for biphasic reaction"
        ],
        estimatedTime: "2-4 hours",
        requiredPersonnel: ["Allergist", "ER Nurse", "Respiratory Therapist", "Pharmacist"]
      }
    ];

    return NextResponse.json(emergencyProtocols);
  } catch (error) {
    console.error("Failed to fetch emergency protocols:", error);
    return NextResponse.json(
      { error: "Failed to fetch emergency protocols" },
      { status: 500 }
    );
  }
}
