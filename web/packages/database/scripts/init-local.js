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

  // Clean up existing data
  console.log('🧹 Cleaning up existing data...');
  try {
    await prisma.matchParticipation.deleteMany();
    await prisma.matchEvent.deleteMany();
    await prisma.match.deleteMany();
    await prisma.gameSession.deleteMany();
    await prisma.device.deleteMany();
    await prisma.player.deleteMany();
    await prisma.team.deleteMany();
    await prisma.project.deleteMany();
    await prisma.gameMode.deleteMany();
    await prisma.account.deleteMany();
    await prisma.session.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();
  } catch (e) {
    console.log('⚠️  Error cleaning data (might be empty tables):', e.message);
  }

  // Create default admin user
  console.log('👤 Creating default admin user...');
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@localhost',
      name: 'Admin',
      role: 'admin',
      password: 'f2e9651ed38269f9f9f56b4a14f701dc:4d33b0049a930e7917e63761f4c08b126b0605d423b1f33573804e60dc71d0ce56651039122130681f49570735eb7dea3853fc6e5c6fbc1f5011017fd63f5239', // "admin" scrypt hash
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
    },
  });
  console.log(`   ✅ ${deathmatch.name}`);

  const teamDeathmatch = await prisma.gameMode.create({
    data: {
      name: 'Team Deathmatch',
      description: 'Team-based combat. First team to reach target score wins.',
      isSystem: true,
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
    },
  });
  console.log(`   ✅ ${teamDeathmatch.name}`);

  const lastManStanding = await prisma.gameMode.create({
    data: {
      name: 'Last Man Standing',
      description: 'Elimination mode. Last player alive wins.',
      isSystem: true,
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
