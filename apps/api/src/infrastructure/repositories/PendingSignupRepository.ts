import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { IPendingSignupRepository } from '../../application/repositories/IPendingSignupRepository';
import type { PlanType } from '../../domain/config/PlanPrices';
import {
  PendingMerchantSignup,
  type PendingSignupStatus,
} from '../../domain/entities/PendingMerchantSignup';

interface PendingSignupItem {
  PK: string;
  SK: string;
  EntityType: 'PENDING_SIGNUP';
  signupId: string;
  businessName: string;
  email: string;
  phone: string;
  contactName: string;
  hashedPassword: string;
  plan: PlanType;
  paymentId?: string;
  status: PendingSignupStatus;
  ttl: number;
  createdAt: string;
}

/**
 * Stores PendingMerchantSignup entities in USER_LEDGER_TABLE.
 * PK: PENDING_SIGNUP#<signupId>, SK: METADATA
 *
 * For reverse lookup by paymentId, a second record is written:
 * PK: PAYMENT_INDEX#<paymentId>, SK: SIGNUP_REF, value: signupId
 */
export class PendingSignupRepository implements IPendingSignupRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async save(signup: PendingMerchantSignup): Promise<void> {
    const json = signup.toJSON();
    const item: PendingSignupItem = {
      PK: `PENDING_SIGNUP#${json.signupId}`,
      SK: 'METADATA',
      EntityType: 'PENDING_SIGNUP',
      signupId: json.signupId,
      businessName: json.businessName,
      email: json.email,
      phone: json.phone,
      contactName: json.contactName,
      hashedPassword: json.tempPassword,
      plan: json.plan,
      status: json.status,
      ttl: json.ttl,
      createdAt: json.createdAt.toISOString(),
    };

    if (json.paymentId) {
      item.paymentId = json.paymentId;
    }

    await this.client.send(new PutCommand({ TableName: this.tableName, Item: item }));

    // Write payment index if paymentId is set
    if (json.paymentId) {
      await this.writePaymentIndex(json.paymentId, json.signupId, json.ttl);
    }
  }

  async findBySignupId(signupId: string): Promise<PendingMerchantSignup | null> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: `PENDING_SIGNUP#${signupId}`, SK: 'METADATA' },
      }),
    );

    if (!result.Item) return null;
    return this.toDomain(result.Item as PendingSignupItem);
  }

  async findByPaymentId(paymentId: string): Promise<PendingMerchantSignup | null> {
    // Look up the signupId via the payment index record
    const indexResult = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: `PAYMENT_INDEX#${paymentId}`, SK: 'SIGNUP_REF' },
      }),
    );

    if (!indexResult.Item) return null;
    const signupId = (indexResult.Item as { signupId: string }).signupId;
    return this.findBySignupId(signupId);
  }

  async updateStatus(
    signupId: string,
    status: 'COMPLETED' | 'FAILED',
    paymentId?: string | undefined,
  ): Promise<void> {
    const updateExpr = paymentId
      ? 'SET #status = :status, paymentId = :paymentId'
      : 'SET #status = :status';

    const exprValues: Record<string, string> = { ':status': status };
    if (paymentId) {
      exprValues[':paymentId'] = paymentId;
    }

    await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: `PENDING_SIGNUP#${signupId}`, SK: 'METADATA' },
        UpdateExpression: updateExpr,
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: exprValues,
      }),
    );

    // Write payment index if paymentId was just set
    if (paymentId) {
      const signup = await this.findBySignupId(signupId);
      if (signup) {
        await this.writePaymentIndex(paymentId, signupId, signup.getTtl());
      }
    }
  }

  private async writePaymentIndex(paymentId: string, signupId: string, ttl: number): Promise<void> {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `PAYMENT_INDEX#${paymentId}`,
          SK: 'SIGNUP_REF',
          signupId,
          ttl,
        },
      }),
    );
  }

  private toDomain(item: PendingSignupItem): PendingMerchantSignup {
    return PendingMerchantSignup.reconstitute({
      signupId: item.signupId,
      businessName: item.businessName,
      email: item.email,
      phone: item.phone,
      contactName: item.contactName,
      tempPassword: item.hashedPassword,
      plan: item.plan,
      paymentId: item.paymentId,
      status: item.status,
      ttl: item.ttl,
      createdAt: new Date(item.createdAt),
    });
  }
}
