import { NextRequest, NextResponse } from "next/server";
import { FeedbackService } from "@/lib/services/feedback.service";

const service = new FeedbackService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const assignedTo = searchParams.get("assignedTo");
    const tenantId = searchParams.get("tenantId");
    const userId = searchParams.get("userId");
    const patientFeedbackOnly = searchParams.get("patientFeedbackOnly") === "true";

    let feedback;

    // If patientFeedbackOnly flag is set, use the special method for patient feedback
    if (patientFeedbackOnly && tenantId) {
      feedback = await service.getPatientFeedbacksByTenant(tenantId, {
        status: status || undefined,
        type: type || undefined,
      });
    } else {
      // Standard feedback fetch
      feedback = await service.getFeedback({
        status: status || undefined,
        type: type || undefined,
        assignedTo: assignedTo || undefined,
        tenantId: tenantId || undefined,
        userId: userId || undefined,
      });
    }

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { userId, tenantId, userName, userEmail, type, title, description, priority, patientFeedback } = data;

    if (!type || !title) {
      return NextResponse.json({ error: "Type and title are required" }, { status: 400 });
    }

    const feedback = await service.createFeedback({
      userId,
      tenantId,
      userName,
      userEmail,
      type,
      title,
      description,
      priority,
      forcePatientFeedback: patientFeedback,
    });

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Error creating feedback:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create feedback" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { feedbackId, status, assignedTo, resolution } = data;

    if (!feedbackId) {
      return NextResponse.json({ error: "Feedback ID required" }, { status: 400 });
    }

    const updatedFeedback = await service.updateFeedbackStatus(
      feedbackId,
      status,
      assignedTo,
      resolution
    );

    return NextResponse.json({ feedback: updatedFeedback });
  } catch (error) {
    console.error("Error updating feedback:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update feedback" }, { status: 500 });
  }
}
