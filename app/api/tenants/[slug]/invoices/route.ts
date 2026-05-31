import { NextRequest, NextResponse } from "next/server";
import { TenantService } from "@/lib/services/tenant.service";
import { db } from "@/lib/db";
import { invoices, invoiceItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const tenantService = new TenantService();

const createInvoiceSchema = z.object({
  totalAmount: z.string(),
  patientId: z.string().uuid().optional(),
  description: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Get tenant by slug
    const tenant = await tenantService.getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Fetch invoices
    let query: any = db.select().from(invoices);
    const conditions: any[] = [eq(invoices.tenantId, tenant.id)];

    if (status) {
      conditions.push(eq(invoices.status, status));
    }

    if (search) {
      // Search by invoice ID (not fully implemented, would need to search invoice fields)
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(invoices.createdAt);
    const tenantInvoices = await query;

    return NextResponse.json({
      success: true,
      invoices: tenantInvoices,
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const data = await request.json();
    const validated = createInvoiceSchema.parse(data);

    // Get tenant by slug
    const tenant = await tenantService.getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Create invoice
    const result = await db
      .insert(invoices)
      .values({
        tenantId: tenant.id,
        patientId: validated.patientId,
        totalAmount: validated.totalAmount,
        status: "pending",
      })
      .returning();

    // If there's a description, create an invoice item
    if (validated.description) {
      await db.insert(invoiceItems).values({
        invoiceId: result[0].id,
        description: validated.description,
        amount: validated.totalAmount,
      });
    }

    return NextResponse.json({
      success: true,
      invoice: result[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}

