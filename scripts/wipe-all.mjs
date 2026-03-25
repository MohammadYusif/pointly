#!/usr/bin/env node
/**
 * Pointly Full Wipe Script
 * Deletes ALL items from all DynamoDB tables and all users from both
 * active Cognito user pools (dev environment).
 *
 * Usage:
 *   node scripts/wipe-all.mjs
 */

import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const region = 'me-south-1';
const ddbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});
const cognitoClient = new CognitoIdentityProviderClient({ region });

// Table name → primary key attribute names (hash [, range])
const TABLES = [
  { name: 'Pointly-UserLedger-dev', keys: ['PK', 'SK'] },
  { name: 'Pointly-TransactionAudit-dev', keys: ['PK', 'SK'] },
  { name: 'Pointly-Idempotency-dev', keys: ['PK'] },
  { name: 'Pointly-QRNonce-dev', keys: ['jti'] },
  { name: 'Pointly-PendingConsents-dev', keys: ['PK', 'SK'] },
  { name: 'Pointly-SMSQuota-dev', keys: ['merchantId', 'month'] },
  { name: 'Pointly-WalletPasses-dev', keys: ['PK', 'SK'] },
];

// Active Cognito pools wired to the app (Terraform workspace: dev)
const COGNITO_POOLS = [
  { id: 'me-south-1_IRBbSfSnf', name: 'Pointly-Merchants-dev' },
  { id: 'me-south-1_RBHlAqpmn', name: 'Pointly-Customers-dev' },
];

async function wipeTable({ name, keys }) {
  process.stdout.write(`  ${name} ... `);
  let lastEvaluatedKey;
  let total = 0;

  do {
    const result = await docClient.send(
      new ScanCommand({ TableName: name, ExclusiveStartKey: lastEvaluatedKey }),
    );
    const items = result.Items ?? [];
    lastEvaluatedKey = result.LastEvaluatedKey;

    if (items.length === 0) continue;

    const deleteRequests = items.map((item) => ({
      DeleteRequest: {
        Key: Object.fromEntries(keys.map((k) => [k, item[k]])),
      },
    }));

    for (let i = 0; i < deleteRequests.length; i += 25) {
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: { [name]: deleteRequests.slice(i, i + 25) },
        }),
      );
    }
    total += items.length;
  } while (lastEvaluatedKey);

  console.log(`${total} items deleted`);
  return total;
}

async function wipeCognitoPool({ id, name }) {
  process.stdout.write(`  ${name} (${id}) ... `);
  let paginationToken;
  let total = 0;

  do {
    const params = { UserPoolId: id, Limit: 60 };
    if (paginationToken) params.PaginationToken = paginationToken;

    const result = await cognitoClient.send(new ListUsersCommand(params));
    const users = result.Users ?? [];
    paginationToken = result.PaginationToken;

    for (const user of users) {
      await cognitoClient.send(
        new AdminDeleteUserCommand({ UserPoolId: id, Username: user.Username }),
      );
      total++;
    }
  } while (paginationToken);

  console.log(`${total} users deleted`);
  return total;
}

async function main() {
  console.log('=== Pointly Full Wipe (dev) ===\n');

  console.log('DynamoDB:');
  for (const table of TABLES) {
    await wipeTable(table);
  }

  console.log('\nCognito:');
  for (const pool of COGNITO_POOLS) {
    await wipeCognitoPool(pool);
  }

  console.log('\n=== Wipe complete ===');
}

main().catch((err) => {
  console.error('Wipe failed:', err.message);
  process.exit(1);
});
