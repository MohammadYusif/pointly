import { ulid } from 'ulid';
import type { PlanType } from '../config/PlanPrices';

export type PendingSignupStatus = 'PENDING_PAYMENT' | 'COMPLETED' | 'FAILED';

export interface PendingMerchantSignupProps {
  signupId: string;
  businessName: string;
  email: string;
  phone: string; // E.164
  contactName: string;
  hashedPassword: string;
  plan: PlanType;
  paymentId?: string | undefined;
  status: PendingSignupStatus;
  ttl: number; // epoch seconds
  createdAt: Date;
}

export class PendingMerchantSignup {
  private constructor(private props: PendingMerchantSignupProps) {}

  static create(params: {
    businessName: string;
    email: string;
    phone: string;
    contactName: string;
    hashedPassword: string;
    plan: PlanType;
  }): PendingMerchantSignup {
    const now = new Date();
    return new PendingMerchantSignup({
      signupId: ulid(),
      businessName: params.businessName,
      email: params.email,
      phone: params.phone,
      contactName: params.contactName,
      hashedPassword: params.hashedPassword,
      plan: params.plan,
      status: 'PENDING_PAYMENT',
      ttl: Math.floor(now.getTime() / 1000) + 86400, // 24 hours
      createdAt: now,
    });
  }

  static reconstitute(props: PendingMerchantSignupProps): PendingMerchantSignup {
    return new PendingMerchantSignup(props);
  }

  getSignupId(): string {
    return this.props.signupId;
  }

  getBusinessName(): string {
    return this.props.businessName;
  }

  getEmail(): string {
    return this.props.email;
  }

  getPhone(): string {
    return this.props.phone;
  }

  getContactName(): string {
    return this.props.contactName;
  }

  getHashedPassword(): string {
    return this.props.hashedPassword;
  }

  getPlan(): PlanType {
    return this.props.plan;
  }

  getPaymentId(): string | undefined {
    return this.props.paymentId;
  }

  getStatus(): PendingSignupStatus {
    return this.props.status;
  }

  getTtl(): number {
    return this.props.ttl;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  setPaymentId(paymentId: string): void {
    this.props.paymentId = paymentId;
  }

  markCompleted(): void {
    this.props.status = 'COMPLETED';
  }

  markFailed(): void {
    this.props.status = 'FAILED';
  }

  toJSON(): PendingMerchantSignupProps {
    return { ...this.props };
  }
}
