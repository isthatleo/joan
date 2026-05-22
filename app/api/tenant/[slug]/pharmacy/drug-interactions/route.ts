import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const slug = (await params).slug;
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get("severity") || "all";

    // Mock drug interactions
    const interactions = [
      {
        id: "inter-001",
        drug1: "Warfarin",
        drug2: "Aspirin",
        severity: "critical",
        type: "Anticoagulant Interaction",
        description:
          "Concurrent use may significantly increase bleeding risk due to inhibition of platelet aggregation and prolonged prothrombin time.",
        recommendation:
          "Avoid concurrent use if possible. If necessary, monitor INR closely and adjust warfarin dose accordingly.",
        evidenceLevel: "A - Established",
        prescriptionId: "rx-2024-045",
        patientName: "Mary Johnson",
      },
      {
        id: "inter-002",
        drug1: "Metformin",
        drug2: "Contrast Dye",
        severity: "high",
        type: "Renal Impairment Risk",
        description:
          "Radiographic contrast media can impair renal function, increasing the risk of lactic acidosis with metformin.",
        recommendation:
          "Hold metformin for 48 hours before and after contrast administration. Check renal function before restarting.",
        evidenceLevel: "B - Probable",
      },
      {
        id: "inter-003",
        drug1: "ACE Inhibitors",
        drug2: "NSAIDs",
        severity: "high",
        type: "Renal Function Impairment",
        description:
          "NSAIDs can reduce the effectiveness of ACE inhibitors and increase the risk of renal impairment and hyperkalemia.",
        recommendation:
          "Use NSAIDs cautiously. Monitor renal function and potassium levels. Consider alternatives to NSAIDs.",
        evidenceLevel: "B - Probable",
      },
      {
        id: "inter-004",
        drug1: "Simvastatin",
        drug2: "Clarithromycin",
        severity: "moderate",
        type: "Increased Statin Levels",
        description:
          "Clarithromycin inhibits CYP3A4, increasing simvastatin levels and risk of myopathy and rhabdomyolysis.",
        recommendation: "Temporarily discontinue simvastatin during clarithromycin therapy or choose alternative antibiotic.",
        evidenceLevel: "B - Probable",
      },
      {
        id: "inter-005",
        drug1: "Lisinopril",
        drug2: "Potassium Supplements",
        severity: "moderate",
        type: "Hyperkalemia Risk",
        description:
          "ACE inhibitors reduce aldosterone secretion, promoting potassium retention. Combined use increases hyperkalemia risk.",
        recommendation:
          "Monitor serum potassium regularly. May need dose adjustment of either agent. Use potassium supplements cautiously.",
        evidenceLevel: "B - Probable",
      },
    ];

    const filtered = severity === "all" ? interactions : interactions.filter(i => i.severity === severity);
    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Error fetching drug interactions:", error);
    return NextResponse.json({ error: "Failed to fetch interactions" }, { status: 500 });
  }
}

