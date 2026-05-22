const { config } = require("dotenv");
config();

const { db } = require("./lib/db/index");
const { tenants } = require("./lib/db/schema");
const { eq } = require("drizzle-orm");

async function checkTenants() {
  try {
    console.log("Checking existing tenants...");

    const allTenants = await db.select().from(tenants);
    console.log(`Found ${allTenants.length} tenants:`);

    allTenants.forEach(tenant => {
      console.log(`- ${tenant.name} (${tenant.slug}) - ID: ${tenant.id}`);
    });

    if (allTenants.length > 0) {
      console.log("\nYou can test deletion on any of these tenants.");
      console.log("Example: DELETE /api/tenants/" + allTenants[0].slug);
    }

  } catch (error) {
    console.error("Error checking tenants:", error);
  } finally {
    process.exit(0);
  }
}

checkTenants();
