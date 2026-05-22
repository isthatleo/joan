import { TenantService } from "@/lib/services/tenant.service";

async function testTenantDeletion() {
  const service = new TenantService();

  try {
    console.log("Testing tenant deletion...");

    // First, let's see what tenants exist
    const tenants = await service.getAllTenants();
    console.log("Available tenants:", tenants.map(t => ({ id: t.id, name: t.name, slug: t.slug })));

    if (tenants.length === 0) {
      console.log("No tenants found to delete");
      return;
    }

    // Try to delete the first tenant
    const tenantToDelete = tenants[0];
    console.log(`Attempting to delete tenant: ${tenantToDelete.name} (${tenantToDelete.id})`);

    const result = await service.deleteTenant(tenantToDelete.id);
    console.log("Deletion result:", result);

  } catch (error) {
    console.error("Error during tenant deletion test:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  }
}

// Run the test
testTenantDeletion().then(() => {
  console.log("Test completed");
  process.exit(0);
}).catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
