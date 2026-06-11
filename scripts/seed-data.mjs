#!/usr/bin/env node
/**
 * Pointly Seed Script
 * Seeds DynamoDB tables with realistic test data for the staging environment.
 *
 * Usage:
 *   node scripts/seed-data.mjs                               # Seeds dev environment
 *   node scripts/seed-data.mjs --env prod                    # Seeds prod environment
 *   node scripts/seed-data.mjs --clean                       # Deletes seeded data first
 *   node scripts/seed-data.mjs --pool-id <id>                # Also creates Cognito users
 *
 * Prerequisites:
 *   - AWS CLI configured (or AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars)
 *   - Infrastructure deployed (DynamoDB tables must exist)
 */

import { randomUUID } from 'node:crypto';
import {
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

// --- Config ---
const args = process.argv.slice(2);
const env = args.includes('--env') ? args[args.indexOf('--env') + 1] : 'dev';
const clean = args.includes('--clean');
const merchantPoolId = args.includes('--pool-id') ? args[args.indexOf('--pool-id') + 1] : null;
const customerPoolId = args.includes('--customer-pool-id')
  ? args[args.indexOf('--customer-pool-id') + 1]
  : null;
const region = 'eu-west-1';

const TABLES = {
  userLedger: `Pointly-UserLedger-${env}`,
  transactionAudit: `Pointly-TransactionAudit-${env}`,
  idempotency: `Pointly-Idempotency-${env}`,
};

const client = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});
const cognitoClient =
  merchantPoolId || customerPoolId ? new CognitoIdentityProviderClient({ region }) : null;

// --- Deterministic IDs for seed data ---
const MERCHANT_IDS = {
  shawarma: 'merchant_shawarma_seed',
  dose: 'merchant_dose_seed',
  nayomi: 'merchant_nayomi_seed',
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
  reem: 'customer_reem_seed',
  tariq: 'customer_tariq_seed',
};

// --- Helpers ---
const now = new Date().toISOString();
const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString();
const hoursAgo = (hours) => new Date(Date.now() - hours * 3600000).toISOString();

function txnId() {
  return `txn_${randomUUID().slice(0, 12)}`;
}

// --- Shawarma House Locations (3 branches) ---
const SHAWARMA_LOCATIONS = [
  {
    locationId: 'loc_shawarma_olaya',
    name: 'Shawarma House - Olaya',
    address: 'Olaya Street, Al Olaya District',
    city: 'Riyadh',
    isActive: true,
    createdAt: daysAgo(180),
  },
  {
    locationId: 'loc_shawarma_malaz',
    name: 'Shawarma House - Malaz',
    address: 'Malaz District, Prince Turki Road',
    city: 'Riyadh',
    isActive: true,
    createdAt: daysAgo(150),
  },
  {
    locationId: 'loc_shawarma_exit5',
    name: 'Shawarma House - Exit 5',
    address: 'Eastern Ring Road, Exit 5',
    city: 'Riyadh',
    isActive: true,
    createdAt: daysAgo(90),
  },
];

const DOSE_LOCATION = {
  locationId: 'loc_dose_main',
  name: 'Dose Cafe - Boulevard',
  address: 'Boulevard City, Hittin District',
  city: 'Riyadh',
  isActive: true,
  createdAt: daysAgo(60),
};

const NAYOMI_LOCATIONS = [
  {
    locationId: 'loc_nayomi_panorama',
    name: 'Nayomi - Panorama Mall',
    address: 'Panorama Mall, Tahlia Street',
    city: 'Jeddah',
    isActive: true,
    createdAt: daysAgo(120),
  },
  {
    locationId: 'loc_nayomi_redsea',
    name: 'Nayomi - Red Sea Mall',
    address: 'Red Sea Mall, King Abdullah Road',
    city: 'Jeddah',
    isActive: true,
    createdAt: daysAgo(100),
  },
];

// --- Merchant Data ---
function createMerchants() {
  return [
    // Shawarma House: restaurant chain, 3 branches, high volume
    {
      PK: `MERCHANT#${MERCHANT_IDS.shawarma}`,
      SK: 'PROFILE',
      EntityType: 'MERCHANT',
      merchantId: MERCHANT_IDS.shawarma,
      businessName: 'Shawarma House',
      email: 'admin@shawarmahouse.sa',
      phone: '966501234567',
      contactName: 'Abdullah Al-Rashid',
      tier: 'PROFESSIONAL',
      status: 'ACTIVE',
      loyaltyConfig: {
        pointsPerSAR: 1,
        globalPointsPerSAR: 1,
        minimumPurchase: 0,
        redemptionRate: 0.1,
        allowPartialRedemption: true,
        minimumRedemption: 50,
        welcomeBonus: 0,
        enableMultiLocation: true,
      },
      smsQuota: { monthlyLimit: 5000, currentUsage: 320, resetDate: now },
      locations: SHAWARMA_LOCATIONS,
      maxLocations: 10,
      totalCustomers: 8,
      activeCustomers: 7,
      totalTransactions: 180,
      createdAt: daysAgo(180),
      updatedAt: hoursAgo(1),
      verifiedAt: daysAgo(179),
      GSI1PK: 'EMAIL#admin@shawarmahouse.sa',
      GSI1SK: 'MERCHANT',
      GSI2PK: 'PHONE#966501234567',
      GSI2SK: 'MERCHANT',
      GSI3PK: 'STATUS#ACTIVE',
      GSI3SK: `MERCHANT#${MERCHANT_IDS.shawarma}`,
    },
    // Dose Cafe: single location, coffee shop
    {
      PK: `MERCHANT#${MERCHANT_IDS.dose}`,
      SK: 'PROFILE',
      EntityType: 'MERCHANT',
      merchantId: MERCHANT_IDS.dose,
      businessName: 'Dose Cafe',
      email: 'hello@dosecafe.sa',
      phone: '966559998877',
      contactName: 'Faisal Al-Otaibi',
      tier: 'BASIC',
      status: 'ACTIVE',
      loyaltyConfig: {
        pointsPerSAR: 1,
        globalPointsPerSAR: 1,
        minimumPurchase: 0,
        redemptionRate: 0.1,
        allowPartialRedemption: true,
        minimumRedemption: 20,
        welcomeBonus: 0,
        enableMultiLocation: false,
      },
      smsQuota: { monthlyLimit: 1000, currentUsage: 25, resetDate: now },
      locations: [DOSE_LOCATION],
      maxLocations: 1,
      totalCustomers: 4,
      activeCustomers: 4,
      totalTransactions: 30,
      createdAt: daysAgo(60),
      updatedAt: hoursAgo(2),
      verifiedAt: daysAgo(59),
      GSI1PK: 'EMAIL#hello@dosecafe.sa',
      GSI1SK: 'MERCHANT',
      GSI2PK: 'PHONE#966559998877',
      GSI2SK: 'MERCHANT',
      GSI3PK: 'STATUS#ACTIVE',
      GSI3SK: `MERCHANT#${MERCHANT_IDS.dose}`,
    },
    // Nayomi Fashion: retail store, 2 locations, high-value transactions
    {
      PK: `MERCHANT#${MERCHANT_IDS.nayomi}`,
      SK: 'PROFILE',
      EntityType: 'MERCHANT',
      merchantId: MERCHANT_IDS.nayomi,
      businessName: 'Nayomi Fashion',
      email: 'manager@nayomi.sa',
      phone: '966512345678',
      contactName: 'Maha Al-Ghamdi',
      tier: 'PLATINUM',
      status: 'ACTIVE',
      loyaltyConfig: {
        pointsPerSAR: 1,
        globalPointsPerSAR: 1,
        minimumPurchase: 0,
        redemptionRate: 0.1,
        allowPartialRedemption: true,
        minimumRedemption: 100,
        welcomeBonus: 0,
        enableMultiLocation: true,
      },
      smsQuota: { monthlyLimit: 3000, currentUsage: 85, resetDate: now },
      locations: NAYOMI_LOCATIONS,
      maxLocations: 5,
      totalCustomers: 5,
      activeCustomers: 4,
      totalTransactions: 60,
      createdAt: daysAgo(120),
      updatedAt: hoursAgo(3),
      verifiedAt: daysAgo(119),
      GSI1PK: 'EMAIL#manager@nayomi.sa',
      GSI1SK: 'MERCHANT',
      GSI2PK: 'PHONE#966512345678',
      GSI2SK: 'MERCHANT',
      GSI3PK: 'STATUS#ACTIVE',
      GSI3SK: `MERCHANT#${MERCHANT_IDS.nayomi}`,
    },
  ];
}

// --- Customer Data ---
function createCustomers() {
  const shawarma = MERCHANT_IDS.shawarma;
  const dose = MERCHANT_IDS.dose;
  const nayomi = MERCHANT_IDS.nayomi;

  return [
    // === Shawarma House Customers ===
    // Diamond tier - power user, visits all branches
    makeCustomer({
      id: CUSTOMER_IDS.ahmed,
      phone: '966501111111',
      name: 'Ahmed Al-Dosari',
      globalBalance: 18500,
      globalLifetime: 42000,
      tier: 'DIAMOND',
      monthlyProgress: 16000,
      enrollments: [
        makeEnrollment(shawarma, 160, 'GRANTED', 11000, 28000, 50),
        makeEnrollment(dose, 30, 'GRANTED', 420, 600, 6),
      ],
    }),
    // Platinum - regular at Olaya branch
    makeCustomer({
      id: CUSTOMER_IDS.fatimah,
      phone: '966502222222',
      name: 'Fatimah Al-Harbi',
      globalBalance: 7200,
      globalLifetime: 15000,
      tier: 'PLATINUM',
      monthlyProgress: 8500,
      enrollments: [makeEnrollment(shawarma, 100, 'GRANTED', 4500, 10000, 22)],
    }),
    // Gold - moderate customer
    makeCustomer({
      id: CUSTOMER_IDS.mohammed,
      phone: '966503333333',
      name: 'Mohammed Al-Qahtani',
      globalBalance: 3800,
      globalLifetime: 6500,
      tier: 'GOLD',
      monthlyProgress: 3800,
      enrollments: [makeEnrollment(shawarma, 50, 'GRANTED', 2200, 4000, 12)],
    }),
    // Bronze - occasional visitor
    makeCustomer({
      id: CUSTOMER_IDS.youssef,
      phone: '966509999999',
      name: 'Youssef Al-Zahrani',
      globalBalance: 900,
      globalLifetime: 1200,
      tier: 'BRONZE',
      monthlyProgress: 900,
      enrollments: [makeEnrollment(shawarma, 20, 'GRANTED', 600, 900, 5)],
    }),
    // Inactive - decay candidate
    makeCustomer({
      id: CUSTOMER_IDS.sara,
      phone: '966506666666',
      name: 'Sara Al-Tamimi',
      globalBalance: 3200,
      globalLifetime: 8000,
      tier: 'BRONZE',
      monthlyProgress: 0,
      lastActivity: daysAgo(95),
      decayPhase: 1,
      decayStartDate: daysAgo(65),
      enrollments: [makeEnrollment(shawarma, 140, 'GRANTED', 1000, 4500, 10)],
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
      enrollments: [makeEnrollment(shawarma, 1, 'PENDING', 0, 0, 0)],
      gsi3pk: `MERCHANT#${shawarma}#PENDING_CONSENT`,
    }),
    // Platinum - Jeddah regular (multi-enrolled: shawarma + nayomi)
    makeCustomer({
      id: CUSTOMER_IDS.omar,
      phone: '966507777777',
      name: 'Omar Al-Ghamdi',
      globalBalance: 8200,
      globalLifetime: 16000,
      tier: 'PLATINUM',
      monthlyProgress: 8200,
      enrollments: [
        makeEnrollment(shawarma, 80, 'GRANTED', 3800, 8000, 18),
        makeEnrollment(nayomi, 60, 'GRANTED', 2800, 5500, 8),
      ],
    }),
    // Hana - new Shawarma House customer
    makeCustomer({
      id: CUSTOMER_IDS.hana,
      phone: '966510001111',
      name: 'Hana Al-Subaie',
      globalBalance: 1800,
      globalLifetime: 2600,
      tier: 'BRONZE',
      monthlyProgress: 1800,
      enrollments: [makeEnrollment(shawarma, 30, 'GRANTED', 1200, 2000, 7)],
    }),

    // === Dose Cafe Customers ===
    // Noura - regular coffee lover
    makeCustomer({
      id: CUSTOMER_IDS.noura,
      phone: '966504444444',
      name: 'Noura Al-Shammari',
      globalBalance: 480,
      globalLifetime: 680,
      tier: 'BRONZE',
      monthlyProgress: 480,
      enrollments: [makeEnrollment(dose, 40, 'GRANTED', 480, 680, 10)],
    }),
    // Layla - occasional visitor
    makeCustomer({
      id: CUSTOMER_IDS.layla,
      phone: '966508888888',
      name: 'Layla Al-Rashidi',
      globalBalance: 180,
      globalLifetime: 180,
      tier: 'BRONZE',
      monthlyProgress: 180,
      enrollments: [makeEnrollment(dose, 14, 'GRANTED', 180, 180, 3)],
    }),

    // === Nayomi Fashion Customers ===
    // Reem - VIP shopper, high-value transactions
    makeCustomer({
      id: CUSTOMER_IDS.reem,
      phone: '966511112222',
      name: 'Reem Al-Otaibi',
      globalBalance: 12000,
      globalLifetime: 22000,
      tier: 'PLATINUM',
      monthlyProgress: 12000,
      enrollments: [makeEnrollment(nayomi, 90, 'GRANTED', 9500, 18000, 15)],
    }),
    // Tariq - occasional shopper
    makeCustomer({
      id: CUSTOMER_IDS.tariq,
      phone: '966513334444',
      name: 'Tariq Al-Harthy',
      globalBalance: 2500,
      globalLifetime: 3800,
      tier: 'BRONZE',
      monthlyProgress: 2500,
      enrollments: [makeEnrollment(nayomi, 45, 'GRANTED', 2500, 3800, 5)],
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

  if (gsi3pk) {
    item.GSI3PK = gsi3pk;
  }

  // Per-merchant index items are created separately (adjacency list pattern)
  // No GSI2PK on the main customer item
  item._grantedMerchantIds = enrollments
    .filter((e) => e.consentStatus === 'GRANTED')
    .map((e) => e.merchantId);

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
  if (consent === 'GRANTED') {
    enrollment.consentGrantedAt = daysAgo(daysAgoEnrolled);
    enrollment.lastTransactionAt = hoursAgo(Math.floor(Math.random() * 48) + 1);
  }
  return enrollment;
}

// --- Transaction helpers ---
function pickWeightedShawarmaLocation() {
  const r = Math.random();
  if (r < 0.45) return 'loc_shawarma_olaya';
  if (r < 0.75) return 'loc_shawarma_malaz';
  return 'loc_shawarma_exit5';
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

// --- Shawarma House Transactions (3 branches, 60 days) ---
function createShawarmaTransactions() {
  const txns = [];
  const m = MERCHANT_IDS.shawarma;

  // Ahmed — Diamond, visits all 3 branches (~4x/week)
  generateDailyTxns(txns, m, CUSTOMER_IDS.ahmed, {
    startDay: 0,
    days: 60,
    chance: 0.6,
    minAmt: 40,
    maxAmt: 200,
    balance: 18500,
    locFn: pickWeightedShawarmaLocation,
  });
  pushTxnList(
    txns,
    m,
    CUSTOMER_IDS.ahmed,
    [
      { days: 8, amount: 500, points: 500, type: 'redeem', loc: 'loc_shawarma_olaya' },
      { days: 22, amount: 400, points: 400, type: 'redeem', loc: 'loc_shawarma_malaz' },
      { days: 40, amount: 600, points: 600, type: 'redeem', loc: 'loc_shawarma_exit5' },
      { days: 55, amount: 350, points: 350, type: 'redeem', loc: 'loc_shawarma_olaya' },
    ],
    18500,
  );

  // Fatimah — Platinum, mostly Olaya (~3x/week)
  generateDailyTxns(txns, m, CUSTOMER_IDS.fatimah, {
    startDay: 0,
    days: 50,
    chance: 0.45,
    minAmt: 30,
    maxAmt: 150,
    balance: 7200,
    locFn: () => (Math.random() < 0.7 ? 'loc_shawarma_olaya' : 'loc_shawarma_malaz'),
  });
  pushTxnList(
    txns,
    m,
    CUSTOMER_IDS.fatimah,
    [
      { days: 12, amount: 300, points: 300, type: 'redeem', loc: 'loc_shawarma_olaya' },
      { days: 35, amount: 250, points: 250, type: 'redeem', loc: 'loc_shawarma_olaya' },
    ],
    7200,
  );

  // Omar — Platinum, visits Malaz and Exit 5 mostly
  generateDailyTxns(txns, m, CUSTOMER_IDS.omar, {
    startDay: 0,
    days: 45,
    chance: 0.4,
    minAmt: 35,
    maxAmt: 160,
    balance: 8200,
    locFn: () => (Math.random() < 0.55 ? 'loc_shawarma_malaz' : 'loc_shawarma_exit5'),
  });
  pushTxnList(
    txns,
    m,
    CUSTOMER_IDS.omar,
    [
      { days: 15, amount: 400, points: 400, type: 'redeem', loc: 'loc_shawarma_malaz' },
      { days: 40, amount: 300, points: 300, type: 'redeem', loc: 'loc_shawarma_exit5' },
    ],
    8200,
  );

  // Mohammed — Gold, occasional
  pushTxnList(
    txns,
    m,
    CUSTOMER_IDS.mohammed,
    [
      { days: 3, amount: 75, type: 'earn', loc: 'loc_shawarma_olaya' },
      { days: 8, amount: 110, type: 'earn', loc: 'loc_shawarma_malaz' },
      { days: 14, amount: 55, type: 'earn', loc: 'loc_shawarma_exit5' },
      { days: 20, amount: 90, type: 'earn', loc: 'loc_shawarma_olaya' },
      { days: 28, amount: 120, type: 'earn', loc: 'loc_shawarma_malaz' },
      { days: 35, amount: 65, type: 'earn', loc: 'loc_shawarma_olaya' },
      { days: 40, amount: 95, type: 'earn', loc: 'loc_shawarma_exit5' },
      { days: 45, amount: 140, type: 'earn', loc: 'loc_shawarma_olaya' },
      { days: 48, amount: 200, points: 200, type: 'redeem', loc: 'loc_shawarma_olaya' },
    ],
    3800,
  );

  // Youssef — Bronze, new customer
  pushTxnList(
    txns,
    m,
    CUSTOMER_IDS.youssef,
    [
      { days: 3, amount: 80, type: 'earn', loc: 'loc_shawarma_exit5' },
      { days: 7, amount: 55, type: 'earn', loc: 'loc_shawarma_exit5' },
      { days: 12, amount: 95, type: 'earn', loc: 'loc_shawarma_olaya' },
      { days: 16, amount: 70, type: 'earn', loc: 'loc_shawarma_exit5' },
      { days: 19, amount: 110, type: 'earn', loc: 'loc_shawarma_malaz' },
    ],
    900,
  );

  // Hana — Bronze, Olaya regular
  pushTxnList(
    txns,
    m,
    CUSTOMER_IDS.hana,
    [
      { days: 2, amount: 45, type: 'earn', loc: 'loc_shawarma_olaya' },
      { days: 6, amount: 80, type: 'earn', loc: 'loc_shawarma_olaya' },
      { days: 11, amount: 60, type: 'earn', loc: 'loc_shawarma_malaz' },
      { days: 17, amount: 100, type: 'earn', loc: 'loc_shawarma_olaya' },
      { days: 22, amount: 75, type: 'earn', loc: 'loc_shawarma_olaya' },
      { days: 27, amount: 90, type: 'earn', loc: 'loc_shawarma_malaz' },
      { days: 29, amount: 120, points: 120, type: 'redeem', loc: 'loc_shawarma_olaya' },
    ],
    1800,
  );

  // Sara — inactive, old transactions (95-140 days ago)
  generateDailyTxns(txns, m, CUSTOMER_IDS.sara, {
    startDay: 95,
    days: 45,
    chance: 0.3,
    minAmt: 35,
    maxAmt: 120,
    balance: 3200,
    locFn: () => (Math.random() < 0.5 ? 'loc_shawarma_olaya' : 'loc_shawarma_malaz'),
  });

  return txns;
}

// --- Dose Cafe Transactions (1 location, 45 days) ---
function createDoseTransactions() {
  const txns = [];
  const m = MERCHANT_IDS.dose;
  const loc = DOSE_LOCATION.locationId;

  // Ahmed — also a Dose customer, occasional coffee
  pushTxnList(
    txns,
    m,
    CUSTOMER_IDS.ahmed,
    [
      { days: 3, amount: 32, type: 'earn' },
      { days: 9, amount: 28, type: 'earn' },
      { days: 16, amount: 45, type: 'earn' },
      { days: 22, amount: 35, type: 'earn' },
      { days: 28, amount: 38, type: 'earn' },
      { days: 35, amount: 42, type: 'earn' },
    ],
    420,
    loc,
  );

  // Noura — regular coffee lover, visits every ~4 days
  pushTxnList(
    txns,
    m,
    CUSTOMER_IDS.noura,
    [
      { days: 1, amount: 28, type: 'earn' },
      { days: 4, amount: 35, type: 'earn' },
      { days: 8, amount: 22, type: 'earn' },
      { days: 12, amount: 40, type: 'earn' },
      { days: 15, amount: 30, type: 'earn' },
      { days: 19, amount: 25, type: 'earn' },
      { days: 23, amount: 38, type: 'earn' },
      { days: 27, amount: 32, type: 'earn' },
      { days: 32, amount: 50, points: 50, type: 'redeem' },
      { days: 36, amount: 28, type: 'earn' },
    ],
    480,
    loc,
  );

  // Layla — occasional visitor
  pushTxnList(
    txns,
    m,
    CUSTOMER_IDS.layla,
    [
      { days: 5, amount: 35, type: 'earn' },
      { days: 14, amount: 48, type: 'earn' },
      { days: 25, amount: 32, type: 'earn' },
    ],
    180,
    loc,
  );

  return txns;
}

// --- Nayomi Fashion Transactions (2 locations, 60 days, higher amounts) ---
function createNayomiTransactions() {
  const txns = [];
  const m = MERCHANT_IDS.nayomi;

  // Reem — VIP shopper, frequent high-value purchases
  pushTxnList(
    txns,
    m,
    CUSTOMER_IDS.reem,
    [
      { days: 3, amount: 850, type: 'earn', loc: 'loc_nayomi_panorama' },
      { days: 8, amount: 1200, type: 'earn', loc: 'loc_nayomi_redsea' },
      { days: 14, amount: 650, type: 'earn', loc: 'loc_nayomi_panorama' },
      { days: 20, amount: 1500, type: 'earn', loc: 'loc_nayomi_redsea' },
      { days: 25, amount: 900, type: 'earn', loc: 'loc_nayomi_panorama' },
      { days: 30, amount: 1100, type: 'earn', loc: 'loc_nayomi_redsea' },
      { days: 35, amount: 750, type: 'earn', loc: 'loc_nayomi_panorama' },
      { days: 40, amount: 1300, type: 'earn', loc: 'loc_nayomi_redsea' },
      { days: 45, amount: 2000, points: 2000, type: 'redeem', loc: 'loc_nayomi_panorama' },
      { days: 48, amount: 1800, type: 'earn', loc: 'loc_nayomi_panorama' },
      { days: 52, amount: 950, type: 'earn', loc: 'loc_nayomi_redsea' },
      { days: 55, amount: 1400, type: 'earn', loc: 'loc_nayomi_panorama' },
      { days: 58, amount: 1600, points: 1600, type: 'redeem', loc: 'loc_nayomi_redsea' },
      { days: 60, amount: 1050, type: 'earn', loc: 'loc_nayomi_panorama' },
      { days: 62, amount: 2200, type: 'earn', loc: 'loc_nayomi_redsea' },
    ],
    12000,
  );

  // Omar — also shops at Nayomi occasionally
  pushTxnList(
    txns,
    m,
    CUSTOMER_IDS.omar,
    [
      { days: 5, amount: 450, type: 'earn', loc: 'loc_nayomi_panorama' },
      { days: 15, amount: 800, type: 'earn', loc: 'loc_nayomi_redsea' },
      { days: 25, amount: 550, type: 'earn', loc: 'loc_nayomi_panorama' },
      { days: 35, amount: 700, type: 'earn', loc: 'loc_nayomi_redsea' },
      { days: 42, amount: 600, type: 'earn', loc: 'loc_nayomi_panorama' },
      { days: 50, amount: 900, type: 'earn', loc: 'loc_nayomi_redsea' },
      { days: 55, amount: 500, points: 500, type: 'redeem', loc: 'loc_nayomi_panorama' },
      { days: 58, amount: 650, type: 'earn', loc: 'loc_nayomi_redsea' },
    ],
    2800,
  );

  // Tariq — occasional shopper
  pushTxnList(
    txns,
    m,
    CUSTOMER_IDS.tariq,
    [
      { days: 10, amount: 380, type: 'earn', loc: 'loc_nayomi_redsea' },
      { days: 22, amount: 950, type: 'earn', loc: 'loc_nayomi_panorama' },
      { days: 35, amount: 620, type: 'earn', loc: 'loc_nayomi_redsea' },
      { days: 48, amount: 1100, type: 'earn', loc: 'loc_nayomi_panorama' },
      { days: 55, amount: 750, type: 'earn', loc: 'loc_nayomi_redsea' },
    ],
    2500,
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
      // Also delete per-merchant index items (adjacency list)
      for (const mid of Object.values(MERCHANT_IDS)) {
        try {
          await deleteItem(TABLES.userLedger, `CUSTOMER#${id}`, `MERCHANT_INDEX#${mid}`);
        } catch {
          // index item may not exist
        }
      }
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
    // Extract merchant IDs before cleaning up the temp field
    const grantedMerchantIds = c._grantedMerchantIds || [];
    c._grantedMerchantIds = undefined;

    await putItem(TABLES.userLedger, c);

    // Create per-merchant index items (adjacency list pattern)
    for (const merchantId of grantedMerchantIds) {
      await putItem(TABLES.userLedger, {
        PK: `CUSTOMER#${c.customerId}`,
        SK: `MERCHANT_INDEX#${merchantId}`,
        EntityType: 'MERCHANT_CUSTOMER_INDEX',
        GSI2PK: `MERCHANT#${merchantId}#CUSTOMERS`,
        GSI2SK: `CUSTOMER#${c.customerId}`,
        customerId: c.customerId,
      });
    }

    const name = c.name || c.phone;
    const enrollCount = c.enrollments.length;
    console.log(
      `  [+] ${name} - ${c.currentTier} tier, ${c.globalPointsBalance} pts, ${enrollCount} enrollment(s), ${grantedMerchantIds.length} index item(s)`,
    );
  }

  // Seed transactions
  const shawarmaTxns = createShawarmaTransactions();
  const doseTxns = createDoseTransactions();
  const nayomiTxns = createNayomiTransactions();
  const allTxns = [...shawarmaTxns, ...doseTxns, ...nayomiTxns];
  console.log(`\nSeeding ${allTxns.length} transactions...`);
  console.log(`  Shawarma House: ${shawarmaTxns.length} transactions (3 branches, 60 days)`);
  console.log(`  Dose Cafe: ${doseTxns.length} transactions (1 branch, 45 days)`);
  console.log(`  Nayomi Fashion: ${nayomiTxns.length} transactions (2 locations, 60 days)`);
  for (const t of allTxns) {
    await putItem(TABLES.transactionAudit, t);
  }
  console.log(`  [+] ${allTxns.length} transactions written`);

  // Seed Cognito users (if --pool-id provided)
  await seedCognitoUsers();

  console.log('\n=== Seed Complete ===');
  console.log(`
Summary:
  Merchants: ${merchants.length}
  Customers: ${customers.length}
  Transactions: ${allTxns.length}

Merchant Accounts:
  Shawarma House   - PROFESSIONAL, ACTIVE, 3 branches (Riyadh)
    -> Olaya, Malaz, Exit 5
    -> Login: admin@shawarmahouse.sa
  Dose Cafe        - BASIC, ACTIVE, 1 location (Riyadh)
    -> Boulevard City
    -> Login: hello@dosecafe.sa
  Nayomi Fashion   - PLATINUM, ACTIVE, 2 locations (Jeddah)
    -> Panorama Mall, Red Sea Mall
    -> Login: manager@nayomi.sa

Customers:
  Ahmed Al-Dosari     - Diamond, 18,500 pts (Shawarma + Dose)
  Omar Al-Ghamdi      - Platinum, 8,200 pts (Shawarma + Nayomi)
  Fatimah Al-Harbi    - Platinum, 7,200 pts (Shawarma)
  Mohammed Al-Qahtani - Gold, 3,800 pts (Shawarma)
  Sara Al-Tamimi      - Bronze, 3,200 pts (Shawarma - INACTIVE, decay)
  Tariq Al-Harthy     - Bronze, 2,500 pts (Nayomi)
  Hana Al-Subaie      - Bronze, 1,800 pts (Shawarma)
  Reem Al-Otaibi      - Platinum, 12,000 pts (Nayomi - VIP)
  Youssef Al-Zahrani  - Bronze, 900 pts (Shawarma - new)
  Noura Al-Shammari   - Bronze, 480 pts (Dose - regular)
  Khalid Al-Mutairi   - Bronze, 0 pts (Shawarma - PENDING consent)
  Layla Al-Rashidi    - Bronze, 180 pts (Dose - occasional)
`);
}

// --- Cognito User Seeding ---
const MERCHANT_PASSWORD = 'Pointly2024!';
const CUSTOMER_PASSWORD = 'Pointly1!';

const COGNITO_MERCHANTS = [
  {
    email: 'admin@shawarmahouse.sa',
    name: 'Abdullah Al-Rashid',
    merchantId: MERCHANT_IDS.shawarma,
    businessName: 'Shawarma House',
  },
  {
    email: 'hello@dosecafe.sa',
    name: 'Faisal Al-Otaibi',
    merchantId: MERCHANT_IDS.dose,
    businessName: 'Dose Cafe',
  },
  {
    email: 'manager@nayomi.sa',
    name: 'Maha Al-Ghamdi',
    merchantId: MERCHANT_IDS.nayomi,
    businessName: 'Nayomi Fashion',
  },
];

const COGNITO_CUSTOMERS = [
  { phone: '+966501111111', name: 'Ahmed Al-Dosari', id: CUSTOMER_IDS.ahmed },
  { phone: '+966502222222', name: 'Fatimah Al-Harbi', id: CUSTOMER_IDS.fatimah },
  { phone: '+966503333333', name: 'Mohammed Al-Qahtani', id: CUSTOMER_IDS.mohammed },
  { phone: '+966504444444', name: 'Noura Al-Shammari', id: CUSTOMER_IDS.noura },
  { phone: '+966505555555', name: 'Khalid Al-Mutairi', id: CUSTOMER_IDS.khalid },
  { phone: '+966506666666', name: 'Sara Al-Tamimi', id: CUSTOMER_IDS.sara },
  { phone: '+966507777777', name: 'Omar Al-Ghamdi', id: CUSTOMER_IDS.omar },
  { phone: '+966508888888', name: 'Layla Al-Rashidi', id: CUSTOMER_IDS.layla },
  { phone: '+966509999999', name: 'Youssef Al-Zahrani', id: CUSTOMER_IDS.youssef },
  { phone: '+966510001111', name: 'Hana Al-Subaie', id: CUSTOMER_IDS.hana },
  { phone: '+966511112222', name: 'Reem Al-Otaibi', id: CUSTOMER_IDS.reem },
  { phone: '+966513334444', name: 'Tariq Al-Harthy', id: CUSTOMER_IDS.tariq },
];

async function seedMerchantCognitoUsers() {
  if (!cognitoClient || !merchantPoolId) return;
  console.log(`\nSeeding ${COGNITO_MERCHANTS.length} merchant users in pool: ${merchantPoolId}`);
  for (const { email, name, merchantId, businessName } of COGNITO_MERCHANTS) {
    try {
      await cognitoClient.send(
        new AdminCreateUserCommand({
          UserPoolId: merchantPoolId,
          Username: email,
          MessageAction: 'SUPPRESS',
          UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'name', Value: name },
            { Name: 'custom:merchantId', Value: merchantId },
            { Name: 'custom:businessName', Value: businessName },
          ],
        }),
      );
      await cognitoClient.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: merchantPoolId,
          Username: email,
          Password: MERCHANT_PASSWORD,
          Permanent: true,
        }),
      );
      console.log(`  [+] ${businessName} (${email})`);
    } catch (err) {
      if (err.name === 'UsernameExistsException') {
        console.log(`  [=] ${businessName} (${email}) — already exists, skipped`);
      } else {
        console.error(`  [!] ${businessName} (${email}) — ${err.message}`);
      }
    }
  }
}

async function seedCustomerCognitoUsers() {
  if (!cognitoClient || !customerPoolId) return;
  console.log(`\nSeeding ${COGNITO_CUSTOMERS.length} customer users in pool: ${customerPoolId}`);
  for (const { phone, name, id } of COGNITO_CUSTOMERS) {
    try {
      await cognitoClient.send(
        new AdminCreateUserCommand({
          UserPoolId: customerPoolId,
          Username: phone,
          MessageAction: 'SUPPRESS',
          UserAttributes: [
            { Name: 'phone_number', Value: phone },
            { Name: 'name', Value: name },
            { Name: 'custom:customerId', Value: id },
          ],
        }),
      );
      await cognitoClient.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: customerPoolId,
          Username: phone,
          Password: CUSTOMER_PASSWORD,
          Permanent: true,
        }),
      );
      console.log(`  [+] ${name} (${phone})`);
    } catch (err) {
      if (err.name === 'UsernameExistsException') {
        console.log(`  [=] ${name} (${phone}) — already exists, skipped`);
      } else {
        console.error(`  [!] ${name} (${phone}) — ${err.message}`);
      }
    }
  }
}

async function seedCognitoUsers() {
  await seedMerchantCognitoUsers();
  await seedCustomerCognitoUsers();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
