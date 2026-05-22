import { NextRequest, NextResponse } from "next/server";
import { PharmacyService } from "@/lib/services/pharmacy.service";
import { z } from "zod";

const pharmacyService = new PharmacyService();

// GET /api/tenant/[slug]/prescriptions - Get prescriptions for a tenant
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const resolvedParams = await params;
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = resolvedParams.slug;
    const status = searchParams.get("status") || undefined;
    const patientId = searchParams.get("patientId") || undefined;
    const doctorId = searchParams.get("doctorId") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined;

    const prescriptions = await pharmacyService.getPrescriptions(tenantId, {
      status,
      patientId,
      doctorId,
      limit,
      offset,
    });

    return NextResponse.json({
      prescriptions,
    });
  } catch (error) {
    console.error("Error fetching prescriptions:", error);
    return NextResponse.json({ error: "Failed to fetch prescriptions" }, { status: 500 });
  }
}

// POST /api/tenant/[slug]/prescriptions - Create a new prescription
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const resolvedParams = await params;
  try {
    const tenantId = resolvedParams.slug;
    const data = await request.json();

    const prescriptionData = z.object({
      visitId: z.string().optional(),
      patientId: z.string().uuid(),
      doctorId: z.string().uuid(),
      diagnosis: z.string().optional(),
      notes: z.string().optional(),
      isEmergency: z.boolean().optional(),
      priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
      validUntil: z.string().datetime().optional(),
      items: z.array(z.object({
        medicationId: z.string().uuid().optional(),
        drugName: z.string(),
        genericName: z.string().optional(),
        dosage: z.string(),
        frequency: z.string(),
        duration: z.string(),
        quantity: z.number().positive(),
        instructions: z.string().optional(),
        refills: z.number().min(0).optional(),
        isPrn: z.boolean().optional(),
        route: z.string().optional(),
        strength: z.string().optional(),
      })).min(1),
    }).parse(data);

    // Create prescription
    const prescription = await pharmacyService.createPrescription(tenantId, {
      visitId: prescriptionData.visitId,
      patientId: prescriptionData.patientId,
      doctorId: prescriptionData.doctorId,
      diagnosis: prescriptionData.diagnosis,
      notes: prescriptionData.notes,
      isEmergency: prescriptionData.isEmergency,
      priority: prescriptionData.priority,
      validUntil: prescriptionData.validUntil ? new Date(prescriptionData.validUntil) : undefined,
    });

    // Add prescription items
    const items = await Promise.all(
      prescriptionData.items.map(item =>
        pharmacyService.addPrescriptionItem(tenantId, {
          prescriptionId: prescription[0].id,
          ...item,
        })
      )
    );

    // Get the complete prescription with stock status
    const completePrescription = await pharmacyService.getPrescriptionWithStockStatus(prescription[0].id);

    return NextResponse.json({
      prescription: completePrescription,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating prescription:", error);
    return NextResponse.json({ error: "Failed to create prescription" }, { status: 500 });
  }
}
