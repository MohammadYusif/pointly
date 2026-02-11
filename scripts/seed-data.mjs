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
  brew92: 'merchant_brew92_seed',
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
  youssef: 'customer_youssef_seed',
  hana: 'customer_hana_seed',
};

// --- Helpers ---
const now = new Date().toISOString();
const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString();
const hoursAgo = (hours) => new Date(Date.now() - hours * 3600000).toISOString();

function txnId() {
  return `txn_${randomUUID().slice(0, 12)}`;
}

// --- Al Baik Locations (4 branches) ---
const ALBAIK_LOCATIONS = [
  {
    locationId: 'loc_riyadh_olaya',
    name: 'Al Baik - Olaya',
    address: 'Olaya Street, Al Olaya District',
    city: 'Riyadh',
    isActive: true,
    createdAt: daysAgo(200),
  },
  {
    locationId: 'loc_riyadh_exit15',
    name: 'Al Baik - Exit 15',
    address: 'King Fahd Road, Exit 15',
    city: 'Riyadh',
    isActive: true,
    createdAt: daysAgo(180),
  },
  {
    locationId: 'loc_jeddah_corniche',
    name: 'Al Baik - Corniche',
    address: 'Corniche Road, Al Hamra District',
    city: 'Jeddah',
    isActive: true,
    createdAt: daysAgo(150),
  },
  {
    locationId: 'loc_jeddah_tahlia',
    name: 'Al Baik - Tahlia',
    address: 'Tahlia Street, Al Khalidiyah',
    city: 'Jeddah',
    isActive: true,
    createdAt: daysAgo(120),
  },
];

const BREW92_LOCATION = {
  locationId: 'loc_brew92_main',
  name: 'Brew92 - Al Nakheel',
  address: 'Al Nakheel Mall, King Fahd Road',
  city: 'Riyadh',
  isActive: true,
  createdAt: daysAgo(30),
};

// --- Merchant Data ---
function createMerchants() {
  return [
    // Al Baik: 4 branches, rich analytics data
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
      smsQuota: { monthlyLimit: 5000, currentUsage: 420, resetDate: now },
      locations: ALBAIK_LOCATIONS,
      maxLocations: 10,
      totalCustomers: 8,
      activeCustomers: 7,
      totalTransactions: 200,
      createdAt: daysAgo(200),
      updatedAt: hoursAgo(1),
      verifiedAt: daysAgo(199),
      GSI1PK: 'EMAIL#manager@albaik.com',
      GSI1SK: 'MERCHANT',
      GSI2PK: 'PHONE#966501234567',
      GSI2SK: 'MERCHANT',
      GSI3PK: 'STATUS#ACTIVE',
      GSI3SK: `MERCHANT#${MERCHANT_IDS.albaik}`,
    },
    // Brew92: single location, basic manual transactions
    {
      PK: `MERCHANT#${MERCHANT_IDS.brew92}`,
      SK: 'PROFILE',
      EntityType: 'MERCHANT',
      merchantId: MERCHANT_IDS.brew92,
      businessName: 'Brew92 Coffee',
      email: 'hello@brew92.com',
      phone: '966559991234',
      contactName: 'Faisal Al-Otaibi',
      tier: 'BASIC',
      status: 'ACTIVE',
      loyaltyConfig: {
        pointsPerSAR: 1,
        globalPointsPerSAR: 1,
        minimumPurchase: 5,
        redemptionRate: 0.01,
        allowPartialRedemption: true,
        minimumRedemption: 20,
        welcomeBonus: 50,
        enableMultiLocation: false,
      },
      smsQuota: { monthlyLimit: 1000, currentUsage: 18, resetDate: now },
      locations: [BREW92_LOCATION],
      maxLocations: 1,
      totalCustomers: 3,
      activeCustomers: 3,
      totalTransactions: 15,
      createdAt: daysAgo(30),
      updatedAt: hoursAgo(3),
      verifiedAt: daysAgo(29),
      GSI1PK: 'EMAIL#hello@brew92.com',
      GSI1SK: 'MERCHANT',
      GSI2PK: 'PHONE#966559991234',
      GSI2SK: 'MERCHANT',
      GSI3PK: 'STATUS#ACTIVE',
      GSI3SK: `MERCHANT#${MERCHANT_IDS.brew92}`,
    },
  ];
}

// --- Customer Data ---
function createCustomers() {
  const albaik = MERCHANT_IDS.albaik;
  const brew = MERCHANT_IDS.brew92;

  return [
    // === Al Baik Customers ===
    // Diamond tier - power user, eats at multiple branches
    makeCustomer({
      id: CUSTOMER_IDS.ahmed,
      phone: '966501111111',
      name: 'Ahmed Al-Dosari',
      globalBalance: 22000,
      globalLifetime: 48000,
      tier: 'DIAMOND',
      monthlyProgress: 18000,
      enrollments: [
        makeEnrollment(albaik, 180, 'granted', 12500, 32000, 45),
        makeEnrollment(brew, 20, 'granted', 350, 500, 4),
      ],
    }),
    // Platinum - regular at Riyadh branches
    makeCustomer({
      id: CUSTOMER_IDS.fatimah,
      phone: '966502222222',
      name: 'Fatimah Al-Harbi',
      globalBalance: 8500,
      globalLifetime: 18000,
      tier: 'PLATINUM',
      monthlyProgress: 9500,
      enrollments: [makeEnrollment(albaik, 120, 'granted', 4800, 12000, 25)],
    }),
    // Bronze - moderate, visits both cities
    makeCustomer({
      id: CUSTOMER_IDS.mohammed,
      phone: '966503333333',
      name: 'Mohammed Al-Qahtani',
      globalBalance: 3200,
      globalLifetime: 5500,
      tier: 'BRONZE',
      monthlyProgress: 3200,
      enrollments: [makeEnrollment(albaik, 60, 'granted', 1800, 3200, 10)],
    }),
    // Platinum - Jeddah regular
    makeCustomer({
      id: CUSTOMER_IDS.omar,
      phone: '966507777777',
      name: 'Omar Al-Ghamdi',
      globalBalance: 6800,
      globalLifetime: 14000,
      tier: 'PLATINUM',
      monthlyProgress: 6800,
      enrollments: [makeEnrollment(albaik, 100, 'granted', 5200, 11000, 30)],
    }),
    // Bronze - new Jeddah customer
    makeCustomer({
      id: CUSTOMER_IDS.youssef,
      phone: '966509999999',
      name: 'Youssef Al-Zahrani',
      globalBalance: 1200,
      globalLifetime: 1600,
      tier: 'BRONZE',
      monthlyProgress: 1200,
      enrollments: [makeEnrollment(albaik, 25, 'granted', 800, 1200, 6)],
    }),
    // Inactive - decay candidate
    makeCustomer({
      id: CUSTOMER_IDS.sara,
      phone: '966506666666',
      name: 'Sara Al-Tamimi',
      globalBalance: 4000,
      globalLifetime: 9500,
      tier: 'BRONZE',
      monthlyProgress: 0,
      lastActivity: daysAgo(95),
      decayPhase: 1,
      decayStartDate: daysAgo(65),
      enrollments: [makeEnrollment(albaik, 160, 'granted', 1200, 5000, 12)],
    }),
    // Pending consent
    makeCustomer({
      id: CUSTOMER_IDS.khalid,
      phone: '966505555555',
      name: 'Khalid Al-Mutairi',
      globalBalance: 0,
      globalLifetime: 0,
      tier: 'BRONZE',
      monthlyProgress: 0,
      enrollments: [makeEnrollment(albaik, 1, 'pending', 0, 0, 0)],
      gsi3pk: `MERCHANT#${albaik}#PENDING_CONSENT`,
    }),
    // Hana - Riyadh regular
    makeCustomer({
      id: CUSTOMER_IDS.hana,
      phone: '966510001111',
      name: 'Hana Al-Subaie',
      globalBalance: 2400,
      globalLifetime: 3600,
      tier: 'BRONZE',
      monthlyProgress: 2400,
      enrollments: [makeEnrollment(albaik, 40, 'granted', 1600, 2800, 8)],
    }),

    // === Brew92 Customers ===
    // Noura - regular coffee customer
    makeCustomer({
      id: CUSTOMER_IDS.noura,
      phone: '966504444444',
      name: 'Noura Al-Shammari',
      globalBalance: 380,
      globalLifetime: 520,
      tier: 'BRONZE',
      monthlyProgress: 380,
      enrollments: [makeEnrollment(brew, 25, 'granted', 380, 520, 8)],
    }),
    // Layla - occasional visitor
    makeCustomer({
      id: CUSTOMER_IDS.layla,
      phone: '966508888888',
      name: 'Layla Al-Rashidi',
      globalBalance: 150,
      globalLifetime: 150,
      tier: 'BRONZE',
      monthlyProgress: 150,
      enrollments: [makeEnrollment(brew, 14, 'granted', 150, 150, 3)],
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

  const grantedEnrollment = enrollments.find((e) => e.consentStatus === 'granted');
  if (grantedEnrollment) {
    item.GSI2PK = `MERCHANT#${grantedEnrollment.merchantId}#CUSTOMERS`;
    item.GSI2SK = `CUSTOMER#${id}`;
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

// --- Transaction helpers ---
/** Weighted random location pick — Olaya busiest, Jeddah Tahlia slowest */
function pickWeightedAlbaikLocation() {
  const r = Math.random();
  if (r < 0.35) return 'loc_riyadh_olaya';
  if (r < 0.6) return 'loc_riyadh_exit15';
  if (r < 0.82) return 'loc_jeddah_corniche';
  return 'loc_jeddah_tahlia';
}

function pushTxnList(out, merchantId, customerId, txns, balance, defaultLoc) {
  for (const t of txns) {
    const pts = t.points || t.amount;
    const before = t.type === 'earn' ? balance - pts : balance + pts;
    out.push(
      makeTxn(
        merchantId,
        customerId,
        t.type,
        pts,
        t.amount,
        before,
        balance,
        t.days,
        t.loc || defaultLoc,
      ),
    );
  }
}

function generateDailyTxns(out, merchantId, customerId, cfg) {
  const { startDay, days, chance, minAmt, maxAmt, balance, locFn } = cfg;
  for (let day = 0; day < days; day++) {
    if (Math.random() < chance) {
      const amount = Math.floor(minAmt + Math.random() * (maxAmt - minAmt));
      const loc = locFn();
      out.push(
        makeTxn(
          merchantId,
          customerId,
          'earn',
          amount,
          amount,
          balance - amount,
          balance,
          (startDay || 0) + day + Math.random() * 0.8,
          loc,
        ),
      );
    }
  }
}

// --- Al Baik Transactions (rich analytics data across 4 branches, 60 days) ---
function createAlbaikTransactions() {
  const txns = [];
  const m = MERCHANT_IDS.albaik;

  // Ahmed — Diamond, visits all 4 branches frequently (~4x/week)
  createAhmedAlbaikTxns(txns, m);

  // Fatimah — Platinum, Riyadh branches mostly (~3x/week)
  createFatimahTxns(txns, m);

  // Omar — Platinum, Jeddah branches mostly (~3x/week)
  createOmarTxns(txns, m);

  // Mohammed — Bronze, occasional across cities
  createMohammedTxns(txns, m);

  // Youssef — Bronze, new Jeddah customer
  createYoussefTxns(txns, m);

  // Hana — Bronze, Riyadh regular
  createHanaTxns(txns, m);

  // Sara — inactive, old transactions (95-140 days ago)
  createSaraTxns(txns, m);

  return txns;
}

function createAhmedAlbaikTxns(txns, m) {
  // 60 days of visits, ~60% chance per day, all 4 branches, some redeems
  generateDailyTxns(txns, m, CUSTOMER_IDS.ahmed, {
    startDay: 0,
    days: 60,
    chance: 0.6,
    minAmt: 45,
    maxAmt: 220,
    balance: 22000,
    locFn: pickWeightedAlbaikLocation,
  });
  // Redemptions every ~2 weeks
  pushTxnList(
    txns,
    m,
    CUSTOMER_IDS.ahmed,
    [
      { days: 7, amount: 500, points: 500, type: 'redeem', loc: 'loc_riyadh_olaya' },
      { days: 21, amount: 400, points: 400, type: 'redeem', loc: 'loc_jeddah_corniche' },
      { days: 35, amount: 600, points: 600, type: 'redeem', loc: 'loc_riyadh_exit15' },
      { days: 49, amount: 350, points: 350, type: 'redeem', loc: 'loc_jeddah_tahlia' },
    ],
    22000,
  );
}

function createFatimahTxns(txns, m) {
  // 55 days, Riyadh branches mostly
  generateDailyTxns(txns, m, CUSTOMER_IDS.fatimah, {
    startDay: 0,
    days: 55,
    chance: 0.45,
    minAmt: 35,
    maxAmt: 160,
    balance: 8500,
    locFn: () => (Math.random() < 0.7 ? 'loc_riyadh_olaya' : 'loc_riyadh_exit15'),
  });
  pushTxnList(
    txns,
    m,
    CUSTOMER_IDS.fatimah,
    [
      { days: 10, amount: 300, points: 300, type: 'redeem', loc: 'loc_riyadh_olaya' },
      { days: 30, amount: 250, points: 250, type: 'redeem', loc: 'loc_riyadh_exit15' },
      { days: 50, amount: 200, points: 200, type: 'redeem', loc: 'loc_riyadh_olaya' },
    ],
    8500,
  );
}

function createOmarTxns(txns, m) {
  // 50 days, Jeddah branches mostly
  generateDailyTxns(txns, m, CUSTOMER_IDS.omar, {
    startDay: 0,
    days: 50,
    chance: 0.45,
    minAmt: 40,
    maxAmt: 180,
    balance: 6800,
    locFn: () => (Math.random() < 0.6 ? 'loc_jeddah_corniche' : 'loc_jeddah_tahlia'),
  });
  pushTxnList(
    txns,
    m,
    CUSTOMER_IDS.omar,
    [
      { days: 12, amount: 400, points: 400, type: 'redeem', loc: 'loc_jeddah_corniche' },
      { days: 38, amount: 500, points: 500, type: 'redeem', loc: 'loc_jeddah_tahlia' },
    ],
    6800,
  );
}

function createMohammedTxns(txns, m) {
  pushTxnList(
    txns,
    m,
    CUSTOMER_IDS.mohammed,
    [
      { days: 3, amount: 85, type: 'earn', loc: 'loc_riyadh_olaya' },
      { days: 8, amount: 120, type: 'earn', loc: 'loc_riyadh_exit15' },
      { days: 15, amount: 65, type: 'earn', loc: 'loc_jeddah_corniche' },
      { days: 22, amount: 95, type: 'earn', loc: 'loc_riyadh_olaya' },
      { days: 30, amount: 110, type: 'earn', loc: 'loc_jeddah_tahlia' },
      { days: 38, amount: 75, type: 'earn', loc: 'loc_riyadh_exit15' },
      { days: 42, amount: 140, type: 'earn', loc: 'loc_jeddah_corniche' },
      { days: 50, amount: 55, type: 'earn', loc: 'loc_riyadh_olaya' },
      { days: 55, amount: 200, points: 200, type: 'redeem', loc: 'loc_riyadh_olaya' },
    ],
    3200,
  );
}

function createYoussefTxns(txns, m) {
  pushTxnList(
    txns,
    m,
    CUSTOMER_IDS.youssef,
    [
      { days: 2, amount: 90, type: 'earn', loc: 'loc_jeddah_corniche' },
      { days: 6, amount: 65, type: 'earn', loc: 'loc_jeddah_tahlia' },
      { days: 11, amount: 110, type: 'earn', loc: 'loc_jeddah_corniche' },
      { days: 16, amount: 80, type: 'earn', loc: 'loc_jeddah_corniche' },
      { days: 20, amount: 130, type: 'earn', loc: 'loc_jeddah_tahlia' },
      { days: 24, amount: 75, type: 'earn', loc: 'loc_jeddah_corniche' },
    ],
    1200,
  );
}

function createHanaTxns(txns, m) {
  pushTxnList(
    txns,
    m,
    CUSTOMER_IDS.hana,
    [
      { days: 2, amount: 55, type: 'earn', loc: 'loc_riyadh_olaya' },
      { days: 7, amount: 90, type: 'earn', loc: 'loc_riyadh_exit15' },
      { days: 12, amount: 70, type: 'earn', loc: 'loc_riyadh_olaya' },
      { days: 18, amount: 120, type: 'earn', loc: 'loc_riyadh_olaya' },
      { days: 23, amount: 85, type: 'earn', loc: 'loc_riyadh_exit15' },
      { days: 28, amount: 100, type: 'earn', loc: 'loc_riyadh_olaya' },
      { days: 33, amount: 60, type: 'earn', loc: 'loc_riyadh_exit15' },
      { days: 38, amount: 150, points: 150, type: 'redeem', loc: 'loc_riyadh_olaya' },
    ],
    2400,
  );
}

function createSaraTxns(txns, m) {
  // Old transactions from 95-140 days ago
  generateDailyTxns(txns, m, CUSTOMER_IDS.sara, {
    startDay: 95,
    days: 45,
    chance: 0.3,
    minAmt: 40,
    maxAmt: 130,
    balance: 4000,
    locFn: () => (Math.random() < 0.5 ? 'loc_riyadh_olaya' : 'loc_riyadh_exit15'),
  });
}

// --- Brew92 Transactions (simple manual transactions, 1 location, 30 days) ---
function createBrew92Transactions() {
  const txns = [];
  const m = MERCHANT_IDS.brew92;
  const loc = BREW92_LOCATION.locationId;

  // Ahmed — also a Brew92 customer, occasional coffee
  pushTxnList(
    txns,
    m,
    CUSTOMER_IDS.ahmed,
    [
      { days: 2, amount: 28, type: 'earn' },
      { days: 8, amount: 35, type: 'earn' },
      { days: 15, amount: 22, type: 'earn' },
      { days: 22, amount: 42, type: 'earn' },
    ],
    350,
    loc,
  );

  // Noura — regular coffee lover
  pushTxnList(
    txns,
    m,
    CUSTOMER_IDS.noura,
    [
      { days: 1, amount: 25, type: 'earn' },
      { days: 4, amount: 30, type: 'earn' },
      { days: 7, amount: 18, type: 'earn' },
      { days: 10, amount: 35, type: 'earn' },
      { days: 14, amount: 28, type: 'earn' },
      { days: 18, amount: 22, type: 'earn' },
      { days: 21, amount: 40, type: 'earn' },
      { days: 25, amount: 50, points: 50, type: 'redeem' },
    ],
    380,
    loc,
  );

  // Layla — occasional visitor
  pushTxnList(
    txns,
    m,
    CUSTOMER_IDS.layla,
    [
      { days: 5, amount: 32, type: 'earn' },
      { days: 14, amount: 45, type: 'earn' },
      { days: 23, amount: 28, type: 'earn' },
    ],
    150,
    loc,
  );

  return txns;
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

  for (const id of Object.values(MERCHANT_IDS)) {
    try {
      await deleteItem(TABLES.userLedger, `MERCHANT#${id}`, 'PROFILE');
      console.log(`  Deleted merchant: ${id}`);
    } catch {
      // ignore
    }
  }

  for (const id of Object.values(CUSTOMER_IDS)) {
    try {
      await deleteItem(TABLES.userLedger, `CUSTOMER#${id}`, 'PROFILE');
      console.log(`  Deleted customer: ${id}`);
    } catch {
      // ignore
    }
  }

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
  const albaikTxns = createAlbaikTransactions();
  const brew92Txns = createBrew92Transactions();
  const allTxns = [...albaikTxns, ...brew92Txns];
  console.log(`\nSeeding ${allTxns.length} transactions...`);
  console.log(`  Al Baik: ${albaikTxns.length} transactions (4 branches, 60 days)`);
  console.log(`  Brew92: ${brew92Txns.length} transactions (1 branch, 30 days)`);
  for (const t of allTxns) {
    await putItem(TABLES.transactionAudit, t);
  }
  console.log(`  [+] ${allTxns.length} transactions written`);

  console.log('\n=== Seed Complete ===');
  console.log(`
Summary:
  Merchants: ${merchants.length}
  Customers: ${customers.length}
  Transactions: ${allTxns.length}

Merchant Accounts:
  Al Baik Restaurant  - PROFESSIONAL, ACTIVE, 4 branches
    -> Olaya (Riyadh), Exit 15 (Riyadh), Corniche (Jeddah), Tahlia (Jeddah)
    -> Login: manager@albaik.com
  Brew92 Coffee       - BASIC, ACTIVE, 1 location
    -> Al Nakheel (Riyadh)
    -> Login: hello@brew92.com

Customers:
  Ahmed Al-Dosari     - Diamond, 22,000 pts (Al Baik + Brew92)
  Fatimah Al-Harbi    - Platinum, 8,500 pts (Al Baik - Riyadh)
  Omar Al-Ghamdi      - Platinum, 6,800 pts (Al Baik - Jeddah)
  Sara Al-Tamimi      - Bronze, 4,000 pts (Al Baik - INACTIVE, decay phase 1)
  Mohammed Al-Qahtani - Bronze, 3,200 pts (Al Baik - occasional)
  Hana Al-Subaie      - Bronze, 2,400 pts (Al Baik - Riyadh)
  Youssef Al-Zahrani  - Bronze, 1,200 pts (Al Baik - Jeddah, new)
  Khalid Al-Mutairi   - Bronze, 0 pts (Al Baik - PENDING consent)
  Noura Al-Shammari   - Bronze, 380 pts (Brew92 - regular)
  Layla Al-Rashidi    - Bronze, 150 pts (Brew92 - occasional)
`);
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
