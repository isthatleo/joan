import { config } from 'dotenv';
config();

import { db } from './lib/db/index';
import { users, userRoles, roles } from './lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkSuperAdmin() {
  try {
    const user = await db.select().from(users).where(eq(users.email, 'leonardlomude@icloud.com')).limit(1);
    console.log('User found:', user[0] ? 'Yes' : 'No');
    if (user[0]) {
      console.log('User ID:', user[0].id);

      const userRole = await db.select({ roleName: roles.name }).from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(eq(userRoles.userId, user[0].id)).limit(1);
      console.log('Role:', userRole[0]?.roleName || 'No role assigned');
    }
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkSuperAdmin();

