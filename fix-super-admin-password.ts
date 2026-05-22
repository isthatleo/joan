import { config } from 'dotenv';
config();

import { db } from './lib/db/index';
import { user as authUser, account as authAccount } from './lib/auth-schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function fixSuperAdminPassword() {
  try {
    console.log('Fixing super admin account...');

    // Find the auth user
    const authUserRecord = await db.select().from(authUser).where(eq(authUser.email, 'leonardlomude@icloud.com')).limit(1);

    if (!authUserRecord[0]) {
      console.error('Auth user not found');
      process.exit(1);
    }

    console.log('Found auth user:', authUserRecord[0].email);

    // Hash password with same method as test users (12 rounds)
    const bcryptHash = await bcrypt.hash('Myname@78', 12);
    console.log('New password hash created');

    // Update or create account
    const existingAccount = await db.select().from(authAccount).where(eq(authAccount.userId, authUserRecord[0].id)).limit(1);

    if (existingAccount[0]) {
      console.log('Updating existing account...');
      await db.update(authAccount).set({
        password: bcryptHash,
        updatedAt: new Date(),
      }).where(eq(authAccount.userId, authUserRecord[0].id));
    } else {
      console.log('Creating new account...');
      await db.insert(authAccount).values({
        id: crypto.randomUUID(),
        accountId: authUserRecord[0].email,
        providerId: 'credential',
        userId: authUserRecord[0].id,
        password: bcryptHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log('✅ Super admin password fixed!');
    console.log('Email: leonardlomude@icloud.com');
    console.log('Password: Myname@78');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

fixSuperAdminPassword();

