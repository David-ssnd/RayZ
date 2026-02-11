#!/usr/bin/env node
/**
 * Local Mode Database Initialization Script
 * 
 * This script initializes a fresh SQLite database for local deployment with:
 * - Default admin user (username: admin, password: admin)
 * - System game modes (Deathmatch, Team Deathmatch, Last Man Standing)
 * 
 * Usage: DATABASE_URL=file:./rayz-local.db node scripts/init-local.js
 */

import { PrismaClient } from '../src/generated/client/index.js';
import { PrismaLibSql } from '@prisma/adapter-libsql';

// Ensure DATABASE_URL is set for this script
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./rayz-local.db';
}

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL });

const prisma = new PrismaClient({
  adapter,
  log: ['error'],
});

async function main() {
  console.log('🚀 Initializing local database...\n');

  // Check if already initialized
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log('⚠️  Database already contains data.');
    console.log('   To reset, delete the database file and run this script again.\n');
    return;
  }

  // Create default admin user
  console.log('👤 Creating default admin user...');
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@localhost',
      name: 'Admin',
      role: 'admin',
      password: '$2b$10$bbxhx3r45TL08/SbofA0DOeH1ohUaYXeKqgzsj2XpDg3GkLAqCJsi', // "admin" bcrypt hash
    },
  });
  console.log(`   ✅ Created user: ${adminUser.email}\n`);

  // Create system game modes
  console.log('🎮 Creating system game modes...');

  const deathmatch = await prisma.gameMode.create({
    data: {
      name: 'Deathmatch',
      description: 'Classic free-for-all. First to reach target score wins.',
      isSystem: true,
      config: JSON.stringify({
        winType: 'score',
        targetScore: 100,
        durationMinutes: 10,
        maxHearts: 5,
        spawnHearts: 3,
        respawnTimeSec: 5,
        friendlyFire: false,
        damageIn: 1,
        damageOut: 1,
        enableAmmo: true,
        maxAmmo: 30,
        reloadTimeMs: 2500,
      }),
    },
  });
  console.log(`   ✅ ${deathmatch.name}`);

  const teamDeathmatch = await prisma.gameMode.create({
    data: {
      name: 'Team Deathmatch',
      description: 'Team-based combat. First team to reach target score wins.',
      isSystem: true,
      config: JSON.stringify({
        winType: 'score',
        targetScore: 200,
        durationMinutes: 15,
        maxHearts: 5,
        spawnHearts: 3,
        respawnTimeSec: 5,
        friendlyFire: false,
        damageIn: 1,
        damageOut: 1,
        enableAmmo: true,
        maxAmmo: 30,
        reloadTimeMs: 2500,
      }),
    },
  });
  console.log(`   ✅ ${teamDeathmatch.name}`);

  const lastManStanding = await prisma.gameMode.create({
    data: {
      name: 'Last Man Standing',
      description: 'Elimination mode. Last player alive wins.',
      isSystem: true,
      config: JSON.stringify({
        winType: 'last_man_standing',
        targetScore: 0,
        durationMinutes: 20,
        maxHearts: 5,
        spawnHearts: 5,
        respawnTimeSec: 0,
        friendlyFire: false,
        damageIn: 1,
        damageOut: 1,
        enableAmmo: true,
        maxAmmo: 30,
        reloadTimeMs: 2500,
      }),
    },
  });
  console.log(`   ✅ ${lastManStanding.name}\n`);

  console.log('✅ Local database initialized successfully!\n');
  console.log('📋 Default Credentials:');
  console.log('   Email:    admin@localhost');
  console.log('   Password: admin\n');
  console.log('⚠️  Change the default password after first login!\n');
}

main()
  .catch((error) => {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
