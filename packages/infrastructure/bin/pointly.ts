#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApiStack } from '../lib/stacks/ApiStack';
import { AuthStack } from '../lib/stacks/AuthStack';
import { DatabaseStack } from '../lib/stacks/DatabaseStack';
import { MonitoringStack } from '../lib/stacks/MonitoringStack';

const app = new cdk.App();

// Get environment from context
const environment = app.node.tryGetContext('environment') || 'dev';
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = 'me-south-1'; // Bahrain

const env = { account, region };

// Common tags for all resources
const tags = {
  Project: 'Pointly',
  Environment: environment,
  ManagedBy: 'CDK',
  CostCenter: 'Engineering',
};

// Apply tags
for (const [key, value] of Object.entries(tags)) {
  cdk.Tags.of(app).add(key, value);
}

const stackPrefix = `Pointly-${environment}`;

// Database Stack
const databaseStack = new DatabaseStack(app, `${stackPrefix}-Database`, {
  env,
  environment,
  description: 'DynamoDB tables for Pointly (includes NFC wallet passes)',
});

// Auth Stack
const authStack = new AuthStack(app, `${stackPrefix}-Auth`, {
  env,
  environment,
  description: 'Cognito authentication for merchants and customers',
});

// API Stack
const apiStack = new ApiStack(app, `${stackPrefix}-Api`, {
  env,
  environment,
  description: 'API Gateway and Lambda functions (includes NFC endpoints)',
  userLedgerTable: databaseStack.userLedgerTable,
  transactionAuditTable: databaseStack.transactionAuditTable,
  idempotencyTable: databaseStack.idempotencyTable,
  qrNonceTable: databaseStack.qrNonceTable,
  pendingConsentsTable: databaseStack.pendingConsentsTable,
  smsQuotaTable: databaseStack.smsQuotaTable,
  merchantUserPool: authStack.merchantUserPool,
  customerUserPool: authStack.customerUserPool,
});

// Monitoring Stack
new MonitoringStack(app, `${stackPrefix}-Monitoring`, {
  env,
  environment,
  description: 'CloudWatch alarms and monitoring',
  apiGateway: apiStack.apiGateway,
  lambdaFunctions: apiStack.lambdaFunctions,
  tables: databaseStack.tables,
});

app.synth();
