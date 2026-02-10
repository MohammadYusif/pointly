#!/usr/bin/env node
/**
 * Pointly Seed Script
 * Seeds DynamoDB tables with realistic test data for the staging environment.
 *
 * Usage:
 *   node scripts/seed-data.mjs              # Seeds dev environment
 *   node scripts/seed-data.mjs --env prod   # Seeds prod environment
 *   node scripts/seed-data.mjs --clean      # Deletes seeded data first
 *
 * Prerequisites:
 *   - AWS CLI configured (or AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars)
 *   - Infrastructure deployed (DynamoDB tables must exist)
 */

import { randomUUID } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

// --- Config ---
const args = process.argv.slice(2);
const env = args.includes('--env') ? args[args.indexOf('--env') + 1] : 'dev';
const clean = args.includes('--clean');
const region = 'me-south-1';

const TABLES = {
  userLedger: `Pointly-UserLedger-${env}`,
  transactionAudit: `Pointly-TransactionAudit-${env}`,
  idempotency: `Pointly-Idempotency-${env}`,
};

const client = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

// --- Deterministic IDs for seed data ---
const MERCHANT_IDS = {
  albaik: 'merchant_albaik_seed',
  jarir: 'merchant_jarir_seed',
  extra: 'merchant_extra_seed',
};

const CUSTOMER_IDS = {
  ahmed: 'customer_ahmed_seed',
  fatimah: 'customer_fatimah_seed',
  mohammed: 'customer_mohammed_seed',
  noura: 'customer_noura_seed',
  khalid: 'customer_khalid_seed',
  sara: 'customer_sara_seed',
  omar: 'customer_omar_seed',
  layla: 'customer_layla_seed',
};

// --- Helpers ---
const now = new Date().toISOString();
const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString();
const hoursAgo = (hours) => new Date(Date.now() - hours * 3600000).toISOString();

function txnId() {
  return `txn_${randomUUID().slice(0, 12)}`;
}

// --- Merchant Data ---
function createMerchants() {
  return [
    {
      PK: `MERCHANT#${MERCHANT_IDS.albaik}`,
      SK: 'PROFILE',
      EntityType: 'MERCHANT',
      merchantId: MERCHANT_IDS.albaik,
      businessName: 'Al Baik Restaurant',
      email: 'manager@albaik.com',
      phone: '966501234567',
      contactName: 'Abdullah Al-Rashid',
      tier: 'PROFESSIONAL',
      status: 'ACTIVE',
      loyaltyConfig: {
        pointsPerSAR: 1,
        globalPointsPerSAR: 1,
        minimumPurchase: 10,
        redemptionRate: 0.01,
        allowPartialRedemption: true,
        minimumRedemption: 50,
        welcomeBonus: 100,
        enableMultiLocation: true,
      },
      smsQuota: { monthlyLimit: 5000, currentUsage: 342, resetDate: now },
      locations: [
        {
          locationId: 'loc_riyadh_01',
          name: 'Al Baik - Olaya',
          address: 'Olaya Street, Al Olaya District',
          city: 'Riyadh',
          isActive: true,
          createdAt: daysAgo(180),
        },
        {
          locationId: 'loc_riyadh_02',
          name: 'Al Baik - Exit 15',
          address: 'King Fahd Road, Exit 15',
          city: 'Riyadh',
          isActive: true,
          createdAt: daysAgo(90),
        },
      ],
      maxLocations: 10,
      totalCustomers: 6,
      activeCustomers: 5,
      totalTransactions: 80,
      createdAt: daysAgo(180),
      updatedAt: hoursAgo(2),
      verifiedAt: daysAgo(179),
      GSI1PK: 'EMAIL#manager@albaik.com',
      GSI1SK: 'MERCHANT',
      GSI2PK: 'PHONE#966501234567',
      GSI2SK: 'MERCHANT',
      GSI3PK: 'STATUS#ACTIVE',
      GSI3SK: `MERCHANT#${MERCHANT_IDS.albaik}`,
    },
    {
      PK: `MERCHANT#${MERCHANT_IDS.jarir}`,
      SK: 'PROFILE',
      EntityType: 'MERCHANT',
      merchantId: MERCHANT_IDS.jarir,
      businessName: 'Jarir Bookstore',
      email: 'loyalty@jarir.com',
      phone: '966559876543',
      contactName: 'Saad Al-Jarir',
      tier: 'ENTERPRISE',
      status: 'ACTIVE',
      loyaltyConfig: {
        pointsPerSAR: 2,
        globalPointsPerSAR: 1,
        minimumPurchase: 5,
        redemptionRate: 0.01,
        allowPartialRedemption: true,
        minimumRedemption: 100,
        welcomeBonus: 200,
        enableMultiLocation: true,
      },
      smsQuota: { monthlyLimit: 10000, currentUsage: 1205, resetDate: now },
      locations: [
        {
          locationId: 'loc_jarir_01',
          name: 'Jarir - Tahlia',
          address: 'Tahlia Street',
          city: 'Riyadh',
          isActive: true,
          createdAt: daysAgo(365),
        },
      ],
      maxLocations: 50,
      totalCustomers: 4,
      activeCustomers: 4,
      totalTransactions: 45,
      createdAt: daysAgo(365),
      updatedAt: hoursAgo(6),
      verifiedAt: daysAgo(364),
      GSI1PK: 'EMAIL#loyalty@jarir.com',
      GSI1SK: 'MERCHANT',
      GSI2PK: 'PHONE#966559876543',
      GSI2SK: 'MERCHANT',
      GSI3PK: 'STATUS#ACTIVE',
      GSI3SK: `MERCHANT#${MERCHANT_IDS.jarir}`,
    },
    {
      PK: `MERCHANT#${MERCHANT_IDS.extra}`,
      SK: 'PROFILE',
      EntityType: 'MERCHANT',
      merchantId: MERCHANT_IDS.extra,
      businessName: 'eXtra Electronics',
      email: 'admin@extra.com',
      phone: '966541112233',
      contactName: 'Fahad Al-Otaibi',
      tier: 'BASIC',
      status: 'PENDING_VERIFICATION',
      loyaltyConfig: {
        pointsPerSAR: 1,
        globalPointsPerSAR: 1,
        minimumPurchase: 20,
        redemptionRate: 0.01,
        allowPartialRedemption: false,
        minimumRedemption: 100,
        welcomeBonus: 50,
        enableMultiLocation: false,
      },
      smsQuota: { monthlyLimit: 1000, currentUsage: 0, resetDate: now },
      locations: [
        {
          locationId: 'loc_extra_01',
          name: 'eXtra - Panorama Mall',
          address: 'Panorama Mall, Takhasusi St',
          city: 'Riyadh',
          isActive: true,
          createdAt: daysAgo(7),
        },
      ],
      maxLocations: 1,
      totalCustomers: 0,
      activeCustomers: 0,
      totalTransactions: 0,
      createdAt: daysAgo(7),
      updatedAt: daysAgo(7),
      GSI1PK: 'EMAIL#admin@extra.com',
      GSI1SK: 'MERCHANT',
      GSI2PK: 'PHONE#966541112233',
      GSI2SK: 'MERCHANT',
      GSI3PK: 'STATUS#PENDING_VERIFICATION',
      GSI3SK: `MERCHANT#${MERCHANT_IDS.extra}`,
    },
  ];
}

// --- Customer Data ---
function createCustomers() {
  const albaik = MERCHANT_IDS.albaik;
  const jarir = MERCHANT_IDS.jarir;

  return [
    // Diamond tier - power user, enrolled in both merchants
    makeCustomer({
      id: CUSTOMER_IDS.ahmed,
      phone: '966501111111',
      name: 'Ahmed Al-Dosari',
      globalBalance: 18500,
      globalLifetime: 42000,
      tier: 'Diamond',
      monthlyProgress: 16000,
      enrollments: [
        makeEnrollment(albaik, 120, 'granted', 8500, 25000, 22),
        makeEnrollment(jarir, 60, 'granted', 4200, 12000, 8),
      ],
    }),
    // Platinum tier
    makeCustomer({
      id: CUSTOMER_IDS.fatimah,
      phone: '966502222222',
      name: 'Fatimah Al-Harbi',
      globalBalance: 7200,
      globalLifetime: 15000,
      tier: 'Platinum',
      monthlyProgress: 8500,
      enrollments: [makeEnrollment(albaik, 90, 'granted', 3100, 8000, 12)],
    }),
    // Bronze with good activity
    makeCustomer({
      id: CUSTOMER_IDS.mohammed,
      phone: '966503333333',
      name: 'Mohammed Al-Qahtani',
      globalBalance: 2800,
      globalLifetime: 4500,
      tier: 'Bronze',
      monthlyProgress: 2800,
      enrollments: [
        makeEnrollment(albaik, 45, 'granted', 1200, 2500, 6),
        makeEnrollment(jarir, 30, 'granted', 800, 1200, 3),
      ],
    }),
    // New customer, just enrolled
    makeCustomer({
      id: CUSTOMER_IDS.noura,
      phone: '966504444444',
      name: 'Noura Al-Shammari',
      globalBalance: 100,
      globalLifetime: 100,
      tier: 'Bronze',
      monthlyProgress: 100,
      enrollments: [makeEnrollment(albaik, 3, 'granted', 100, 100, 1)],
    }),
    // Pending consent customer
    makeCustomer({
      id: CUSTOMER_IDS.khalid,
      phone: '966505555555',
      name: 'Khalid Al-Mutairi',
      globalBalance: 0,
      globalLifetime: 0,
      tier: 'Bronze',
      monthlyProgress: 0,
      enrollments: [makeEnrollment(albaik, 1, 'pending', 0, 0, 0)],
      gsi3pk: `MERCHANT#${albaik}#PENDING_CONSENT`,
    }),
    // Inactive customer (potential decay)
    makeCustomer({
      id: CUSTOMER_IDS.sara,
      phone: '966506666666',
      name: 'Sara Al-Tamimi',
      globalBalance: 3500,
      globalLifetime: 8000,
      tier: 'Bronze',
      monthlyProgress: 0,
      lastActivity: daysAgo(120),
      decayPhase: 1,
      decayStartDate: daysAgo(90),
      enrollments: [makeEnrollment(albaik, 150, 'granted', 500, 4000, 8)],
    }),
    // Jarir-only customer
    makeCustomer({
      id: CUSTOMER_IDS.omar,
      phone: '966507777777',
      name: 'Omar Al-Ghamdi',
      globalBalance: 5200,
      globalLifetime: 9800,
      tier: 'Platinum',
      monthlyProgress: 5200,
      enrollments: [makeEnrollment(jarir, 60, 'granted', 6400, 9800, 12)],
    }),
    // Minimal customer - no name
    makeCustomer({
      id: CUSTOMER_IDS.layla,
      phone: '966508888888',
      globalBalance: 450,
      globalLifetime: 450,
      tier: 'Bronze',
      monthlyProgress: 450,
      enrollments: [makeEnrollment(jarir, 14, 'granted', 450, 450, 2)],
    }),
  ];
}

function makeCustomer({
  id,
  phone,
  name,
  globalBalance,
  globalLifetime,
  tier,
  monthlyProgress,
  enrollments,
  lastActivity,
  decayPhase,
  decayStartDate,
  gsi3pk,
}) {
  const item = {
    PK: `CUSTOMER#${id}`,
    SK: 'PROFILE',
    EntityType: 'CUSTOMER',
    customerId: id,
    phone,
    name: name || undefined,
    status: 'ACTIVE',
    globalPointsBalance: globalBalance,
    globalLifetimePoints: globalLifetime,
    currentTier: tier,
    monthlyProgress,
    tierLastUpdatedAt: daysAgo(1),
    monthlyProgressResetAt: daysAgo(15),
    lastNetworkActivity: lastActivity || hoursAgo(4),
    globalPointsDecayPhase: decayPhase || 0,
    decayStartDate: decayStartDate || undefined,
    lastDecayAppliedAt: undefined,
    enrollments,
    createdAt: daysAgo(enrollments[0]?.daysAgo || 30),
    updatedAt: hoursAgo(4),
    GSI1PK: `PHONE#${phone}`,
    GSI1SK: 'CUSTOMER',
  };

  // GSI2PK for merchant customer lookup (first enrolled merchant with granted consent)
  const grantedEnrollment = enrollments.find((e) => e.consentStatus === 'granted');
  if (grantedEnrollment) {
    item.GSI2PK = `MERCHANT#${grantedEnrollment.merchantId}#CUSTOMERS`;
  }
  if (gsi3pk) {
    item.GSI3PK = gsi3pk;
  }

  return item;
}

function makeEnrollment(merchantId, daysAgoEnrolled, consent, balance, lifetime, txnCount) {
  const enrollment = {
    merchantId,
    enrolledAt: daysAgo(daysAgoEnrolled),
    consentStatus: consent,
    merchantPointsBalance: balance,
    merchantLifetimePoints: lifetime,
    transactionCount: txnCount,
    daysAgo: daysAgoEnrolled,
  };
  if (consent === 'granted') {
    enrollment.consentGrantedAt = daysAgo(daysAgoEnrolled);
    enrollment.lastTransactionAt = hoursAgo(Math.floor(Math.random() * 48) + 1);
  }
  return enrollment;
}

// --- Transaction Data ---
// Al Baik locations for distributing transactions
const ALBAIK_LOCATIONS = ['loc_riyadh_01', 'loc_riyadh_02'];
const JARIR_LOCATION = 'loc_jarir_01';

function pickAlbaikLocation() {
  return ALBAIK_LOCATIONS[Math.floor(Math.random() * ALBAIK_LOCATIONS.length)];
}

function createTransactions() {
  const transactions = [];
  const albaik = MERCHANT_IDS.albaik;
  const jarir = MERCHANT_IDS.jarir;

  // ---- Generate 45 days of Al Baik transaction history ----
  // This creates realistic daily transaction patterns across both locations

  // Ahmed - frequent Al Baik customer (Diamond tier)
  const ahmedAlbaikTxns = [];
  for (let day = 0; day < 45; day++) {
    // Ahmed eats 3-5 times per week at Al Baik
    if (Math.random() < 0.6) {
      const amount = Math.floor(40 + Math.random() * 160); // 40-200 SAR meals
      ahmedAlbaikTxns.push({
        days: day + Math.random() * 0.8,
        amount,
        type: 'earn',
        loc: pickAlbaikLocation(),
      });
    }
    // Occasional redemption every ~2 weeks
    if (day % 14 === 7 && day > 0) {
      ahmedAlbaikTxns.push({
        days: day + 0.5,
        amount: 300,
        points: 300,
        type: 'redeem',
        loc: pickAlbaikLocation(),
      });
    }
  }
  let ahmedBal = 18500;
  for (const t of ahmedAlbaikTxns) {
    const pts = t.points || t.amount;
    const before = t.type === 'earn' ? ahmedBal - pts : ahmedBal + pts;
    transactions.push(
      makeTxn(albaik, CUSTOMER_IDS.ahmed, t.type, pts, t.amount, before, ahmedBal, t.days, t.loc),
    );
  }

  // Ahmed at Jarir - occasional electronics purchases
  const ahmedJarirTxns = [
    { days: 2, amount: 350, type: 'earn' },
    { days: 10, amount: 89, type: 'earn' },
    { days: 18, amount: 1200, type: 'earn' },
    { days: 25, amount: 45, type: 'earn' },
    { days: 32, amount: 200, type: 'earn' },
    { days: 38, amount: 500, points: 500, type: 'redeem' },
  ];
  for (const t of ahmedJarirTxns) {
    const pts = t.points || t.amount;
    const before = t.type === 'earn' ? ahmedBal - pts : ahmedBal + pts;
    transactions.push(
      makeTxn(
        jarir,
        CUSTOMER_IDS.ahmed,
        t.type,
        pts,
        t.amount,
        before,
        ahmedBal,
        t.days,
        JARIR_LOCATION,
      ),
    );
  }

  // Fatimah - regular Al Baik customer (Platinum)
  for (let day = 0; day < 40; day++) {
    if (Math.random() < 0.4) {
      const amount = Math.floor(30 + Math.random() * 120);
      const loc = pickAlbaikLocation();
      const fatBal = 7200;
      const before = fatBal - amount;
      transactions.push(
        makeTxn(albaik, CUSTOMER_IDS.fatimah, 'earn', amount, amount, before, fatBal, day + Math.random() * 0.8, loc),
      );
    }
  }
  // Fatimah redemptions
  transactions.push(
    makeTxn(albaik, CUSTOMER_IDS.fatimah, 'redeem', 300, 300, 7500, 7200, 6, 'loc_riyadh_01'),
  );
  transactions.push(
    makeTxn(albaik, CUSTOMER_IDS.fatimah, 'redeem', 200, 200, 7400, 7200, 20, 'loc_riyadh_02'),
  );

  // Mohammed - moderate at both merchants
  const mohammedAlbaikTxns = [
    { days: 1, amount: 75, loc: 'loc_riyadh_01' },
    { days: 5, amount: 120, loc: 'loc_riyadh_02' },
    { days: 12, amount: 55, loc: 'loc_riyadh_01' },
    { days: 19, amount: 90, loc: 'loc_riyadh_02' },
    { days: 28, amount: 65, loc: 'loc_riyadh_01' },
    { days: 35, amount: 110, loc: 'loc_riyadh_01' },
  ];
  const mohammedBal = 2800;
  for (const t of mohammedAlbaikTxns) {
    transactions.push(
      makeTxn(albaik, CUSTOMER_IDS.mohammed, 'earn', t.amount, t.amount, mohammedBal - t.amount, mohammedBal, t.days, t.loc),
    );
  }
  const mohammedJarirTxns = [
    { days: 1, amount: 250 },
    { days: 3, amount: 89 },
    { days: 8, amount: 150 },
    { days: 22, amount: 320 },
    { days: 30, amount: 175 },
  ];
  for (const t of mohammedJarirTxns) {
    transactions.push(
      makeTxn(jarir, CUSTOMER_IDS.mohammed, 'earn', t.amount, t.amount, mohammedBal - t.amount, mohammedBal, t.days, JARIR_LOCATION),
    );
  }

  // Omar at Jarir (Platinum - heavy spender)
  for (let day = 0; day < 35; day++) {
    if (Math.random() < 0.45) {
      const amount = Math.floor(100 + Math.random() * 500);
      const omarBal = 5200;
      transactions.push(
        makeTxn(jarir, CUSTOMER_IDS.omar, 'earn', amount, amount, omarBal - amount, omarBal, day + Math.random() * 0.8, JARIR_LOCATION),
      );
    }
  }
  // Omar redemptions
  transactions.push(
    makeTxn(jarir, CUSTOMER_IDS.omar, 'redeem', 1000, 1000, 6200, 5200, 3, JARIR_LOCATION),
  );
  transactions.push(
    makeTxn(jarir, CUSTOMER_IDS.omar, 'redeem', 500, 500, 5700, 5200, 15, JARIR_LOCATION),
  );

  // Noura - new customer, single purchase at Al Baik Olaya
  transactions.push(
    makeTxn(albaik, CUSTOMER_IDS.noura, 'earn', 100, 100, 0, 100, 3, 'loc_riyadh_01'),
  );

  // Layla at Jarir
  transactions.push(
    makeTxn(jarir, CUSTOMER_IDS.layla, 'earn', 200, 200, 0, 200, 14, JARIR_LOCATION),
  );
  transactions.push(
    makeTxn(jarir, CUSTOMER_IDS.layla, 'earn', 250, 250, 200, 450, 7, JARIR_LOCATION),
  );

  // Sara - inactive but has historical transactions at Al Baik (120+ days ago)
  for (let day = 120; day < 160; day += 5) {
    const amount = Math.floor(40 + Math.random() * 80);
    transactions.push(
      makeTxn(albaik, CUSTOMER_IDS.sara, 'earn', amount, amount, 3500 - amount, 3500, day, pickAlbaikLocation()),
    );
  }

  return transactions;
}

function makeTxn(
  merchantId,
  customerId,
  type,
  points,
  amount,
  balBefore,
  balAfter,
  daysAgoVal,
  locationId,
) {
  const id = txnId();
  const createdAt = daysAgo(daysAgoVal);
  const cashiers = ['Ali', 'Nasser', 'Youssef', 'Hana', 'Maryam'];
  const terminals = ['T01', 'T02', 'T03', 'POS-1', 'POS-2'];
  const idemKey = `seed_${randomUUID().slice(0, 8)}`;

  const item = {
    PK: `TRANSACTION#${id}`,
    SK: 'DETAILS',
    EntityType: 'TRANSACTION',
    transactionId: id,
    merchantId,
    customerId,
    locationId: locationId || undefined,
    type: type === 'earn' ? 'EARN' : 'REDEEM',
    status: 'COMPLETED',
    points,
    balanceBefore: balBefore,
    balanceAfter: balAfter,
    metadata: {
      receiptNumber: `R${Date.now().toString(36).toUpperCase()}`,
      cashierName: cashiers[Math.floor(Math.random() * cashiers.length)],
      terminalId: terminals[Math.floor(Math.random() * terminals.length)],
    },
    idempotencyKey: idemKey,
    createdAt,
    completedAt: createdAt,
    GSI1PK: `CUSTOMER#${customerId}`,
    GSI1SK: `TXN#${createdAt}#${id}`,
    GSI2PK: `MERCHANT#${merchantId}`,
    GSI2SK: `TXN#${createdAt}#${id}`,
    GSI3PK: `IDEMPOTENCY#${idemKey}`,
    GSI3SK: 'TXN',
    GSI4PK: `CUSTOMER#${customerId}#MERCHANT#${merchantId}`,
  };

  // GSI5 for location-based lookups
  if (locationId) {
    item.GSI5PK = `MERCHANT#${merchantId}#LOCATION#${locationId}`;
    item.GSI5SK = `TXN#${createdAt}#${id}`;
  }

  if (type === 'earn') {
    item.amount = { amount, currency: 'SAR' };
  }

  return item;
}

// --- Write to DynamoDB ---
async function putItem(tableName, item) {
  await docClient.send(new PutCommand({ TableName: tableName, Item: item }));
}

async function deleteItem(tableName, pk, sk) {
  await docClient.send(new DeleteCommand({ TableName: tableName, Key: { PK: pk, SK: sk } }));
}

async function cleanSeedData() {
  console.log('\nCleaning existing seed data...');

  // Delete merchants
  for (const id of Object.values(MERCHANT_IDS)) {
    try {
      await deleteItem(TABLES.userLedger, `MERCHANT#${id}`, 'PROFILE');
      console.log(`  Deleted merchant: ${id}`);
    } catch {
      // ignore
    }
  }

  // Delete customers
  for (const id of Object.values(CUSTOMER_IDS)) {
    try {
      await deleteItem(TABLES.userLedger, `CUSTOMER#${id}`, 'PROFILE');
      console.log(`  Deleted customer: ${id}`);
    } catch {
      // ignore
    }
  }

  // Note: Transactions use random IDs so we can't easily clean them.
  // They'll just accumulate harmlessly.
  console.log("  (Transactions use random IDs - old ones will remain but won't conflict)");
}

async function seed() {
  console.log('\n=== Pointly Data Seeder ===');
  console.log(`Environment: ${env}`);
  console.log(`Region: ${region}`);
  console.log(`Tables: ${Object.values(TABLES).join(', ')}\n`);

  if (clean) {
    await cleanSeedData();
  }

  // Seed merchants
  const merchants = createMerchants();
  console.log(`Seeding ${merchants.length} merchants...`);
  for (const m of merchants) {
    await putItem(TABLES.userLedger, m);
    console.log(`  [+] ${m.businessName} (${m.status}) - ${m.tier}`);
  }

  // Seed customers
  const customers = createCustomers();
  console.log(`\nSeeding ${customers.length} customers...`);
  for (const c of customers) {
    await putItem(TABLES.userLedger, c);
    const name = c.name || c.phone;
    const enrollCount = c.enrollments.length;
    console.log(
      `  [+] ${name} - ${c.currentTier} tier, ${c.globalPointsBalance} pts, ${enrollCount} enrollment(s)`,
    );
  }

  // Seed transactions
  const transactions = createTransactions();
  console.log(`\nSeeding ${transactions.length} transactions...`);
  for (const t of transactions) {
    await putItem(TABLES.transactionAudit, t);
  }
  console.log(`  [+] ${transactions.length} transactions written`);

  // Summary
  console.log('\n=== Seed Complete ===');
  console.log(`
Summary:
  Merchants: ${merchants.length} (2 active, 1 pending verification)
  Customers: ${customers.length} (1 Diamond, 2 Platinum, 5 Bronze)
  Transactions: ${transactions.length} (45 days of history with location data)

Merchant Accounts:
  Al Baik Restaurant  - PROFESSIONAL tier, ACTIVE (2 locations)
  Jarir Bookstore     - ENTERPRISE tier, ACTIVE (1 location)
  eXtra Electronics   - BASIC tier, PENDING_VERIFICATION

Notable Customers:
  Ahmed Al-Dosari     - Diamond, 18,500 pts (enrolled at Al Baik + Jarir)
  Fatimah Al-Harbi    - Platinum, 7,200 pts (Al Baik)
  Omar Al-Ghamdi      - Platinum, 5,200 pts (Jarir)
  Sara Al-Tamimi      - Bronze, 3,500 pts (INACTIVE - decay phase 1)
  Khalid Al-Mutairi   - Bronze, 0 pts (PENDING consent at Al Baik)
`);
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
