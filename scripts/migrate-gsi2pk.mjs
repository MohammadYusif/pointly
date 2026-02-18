#!/usr/bin/env node
/**
 * Migration: Create per-merchant index items (adjacency list pattern)
 * and remove GSI2PK/GSI2SK from main customer items.
 *
 * For each customer with granted enrollments:
 * 1. Create MERCHANT_INDEX items: PK=CUSTOMER#id, SK=MERCHANT_INDEX#merchantId
 *    with GSI2PK=MERCHANT#merchantId#CUSTOMERS, GSI2SK=CUSTOMER#id
 * 2. Remove GSI2PK/GSI2SK from the main PROFILE item (no longer needed)
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const REGION = 'me-south-1';
const TABLE = 'Pointly-UserLedger-dev';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
  marshallOptions: { removeUndefinedValues: true },
});

async function migrate() {
  let customersProcessed = 0;
  let indexItemsCreated = 0;
  let mainItemsCleaned = 0;
  let nextKey;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: 'EntityType = :et',
        ExpressionAttributeValues: { ':et': 'CUSTOMER' },
        ...(nextKey ? { ExclusiveStartKey: nextKey } : {}),
      }),
    );

    for (const item of result.Items || []) {
      customersProcessed++;

      // Find granted merchant IDs from enrollments
      const enrollments = item.enrollments || [];
      const grantedMerchantIds = enrollments
        .filter((e) => e.consentStatus === 'GRANTED' || e.consentStatus === 'granted')
        .map((e) => e.merchantId);

      // Create index items for each granted merchant
      for (const merchantId of grantedMerchantIds) {
        await client.send(
          new PutCommand({
            TableName: TABLE,
            Item: {
              PK: `CUSTOMER#${item.customerId}`,
              SK: `MERCHANT_INDEX#${merchantId}`,
              EntityType: 'MERCHANT_CUSTOMER_INDEX',
              GSI2PK: `MERCHANT#${merchantId}#CUSTOMERS`,
              GSI2SK: `CUSTOMER#${item.customerId}`,
              customerId: item.customerId,
            },
          }),
        );
        indexItemsCreated++;
        console.log(`  Index: ${item.customerId} → ${merchantId}`);
      }

      // Remove GSI2PK/GSI2SK from main item (if present)
      if (item.GSI2PK) {
        await client.send(
          new UpdateCommand({
            TableName: TABLE,
            Key: { PK: item.PK, SK: item.SK },
            UpdateExpression: 'REMOVE GSI2PK, GSI2SK, grantedMerchantIds',
          }),
        );
        mainItemsCleaned++;
        console.log(`  Cleaned main item: ${item.customerId} (removed GSI2PK=${item.GSI2PK})`);
      }
    }

    nextKey = result.LastEvaluatedKey;
  } while (nextKey);

  console.log('\nDone!');
  console.log(`  Customers processed: ${customersProcessed}`);
  console.log(`  Index items created: ${indexItemsCreated}`);
  console.log(`  Main items cleaned: ${mainItemsCleaned}`);
}

migrate().catch(console.error);
