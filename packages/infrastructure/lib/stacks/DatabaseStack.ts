import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

interface DatabaseStackProps extends cdk.StackProps {
  environment: string;
}

export class DatabaseStack extends cdk.Stack {
  public readonly userLedgerTable: dynamodb.Table;
  public readonly transactionAuditTable: dynamodb.Table;
  public readonly idempotencyTable: dynamodb.Table;
  public readonly qrNonceTable: dynamodb.Table;
  public readonly pendingConsentsTable: dynamodb.Table;
  public readonly smsQuotaTable: dynamodb.Table;
  public readonly walletPassesTable: dynamodb.Table; // NEW for NFC
  public readonly tables: dynamodb.Table[];

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { environment } = props;
    const removalPolicy =
      environment === "prod"
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY;

    // User Ledger Table
    this.userLedgerTable = new dynamodb.Table(this, "UserLedger", {
      tableName: `Pointly-UserLedger-${environment}`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: environment === "prod",
      removalPolicy,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // GSI for looking up users by phone across merchants
    this.userLedgerTable.addGlobalSecondaryIndex({
      indexName: "PhoneIndex",
      partitionKey: { name: "phone", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Transaction Audit Table
    this.transactionAuditTable = new dynamodb.Table(this, "TransactionAudit", {
      tableName: `Pointly-TransactionAudit-${environment}`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: "ttl",
      removalPolicy,
    });

    // GSI for querying transactions by date
    this.transactionAuditTable.addGlobalSecondaryIndex({
      indexName: "DateIndex",
      partitionKey: { name: "merchantId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "createdAt", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Idempotency Table
    this.idempotencyTable = new dynamodb.Table(this, "IdempotencyStore", {
      tableName: `Pointly-Idempotency-${environment}`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",
      removalPolicy,
    });

    // QR Nonce Tracker
    this.qrNonceTable = new dynamodb.Table(this, "QRNonceTracker", {
      tableName: `Pointly-QRNonce-${environment}`,
      partitionKey: { name: "jti", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",
      removalPolicy,
    });

    // Pending Consents (Ghost Profiles)
    this.pendingConsentsTable = new dynamodb.Table(this, "PendingConsents", {
      tableName: `Pointly-PendingConsents-${environment}`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",
      removalPolicy,
    });

    // SMS Quota Tracker
    this.smsQuotaTable = new dynamodb.Table(this, "SMSQuotaTracker", {
      tableName: `Pointly-SMSQuota-${environment}`,
      partitionKey: { name: "merchantId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "month", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
    });

    // Wallet Passes Table (NEW for NFC)
    this.walletPassesTable = new dynamodb.Table(this, "WalletPasses", {
      tableName: `Pointly-WalletPasses-${environment}`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy,
    });

    // GSI for looking up passes by serial number (for Apple Wallet updates)
    this.walletPassesTable.addGlobalSecondaryIndex({
      indexName: "SerialIndex",
      partitionKey: { name: "passSerial", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI for looking up passes by customer ID (for NFC scans)
    this.walletPassesTable.addGlobalSecondaryIndex({
      indexName: "CustomerIndex",
      partitionKey: { name: "customerId", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Array of all tables for monitoring
    this.tables = [
      this.userLedgerTable,
      this.transactionAuditTable,
      this.idempotencyTable,
      this.qrNonceTable,
      this.pendingConsentsTable,
      this.smsQuotaTable,
      this.walletPassesTable,
    ];

    // Output table names
    new cdk.CfnOutput(this, "UserLedgerTableName", {
      value: this.userLedgerTable.tableName,
      exportName: `${environment}-UserLedgerTable`,
    });

    new cdk.CfnOutput(this, "TransactionAuditTableName", {
      value: this.transactionAuditTable.tableName,
      exportName: `${environment}-TransactionAuditTable`,
    });

    new cdk.CfnOutput(this, "WalletPassesTableName", {
      value: this.walletPassesTable.tableName,
      exportName: `${environment}-WalletPassesTable`,
    });
  }
}
