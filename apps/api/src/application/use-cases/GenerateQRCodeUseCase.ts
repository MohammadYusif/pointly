import { NotFoundError, ValidationError } from '../../domain';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type { IQRNonceRepository } from '../repositories/IQRNonceRepository';

export interface GenerateQRCodeRequest {
  customerId: string;
}

export interface GenerateQRCodeResponse {
  qrPayload: string;
  expiresAt: number;
}

export interface VerifyQRCodeRequest {
  nonce: string;
  merchantId: string;
}

export interface VerifyQRCodeResponse {
  customerId: string;
  customerName: string | undefined;
  customerPhone: string;
  isEnrolled: boolean;
  merchantPointsBalance: number;
  globalPointsBalance: number;
}

const QR_TTL_SECONDS = 300; // 5 minutes

export class GenerateQRCodeUseCase {
  constructor(
    private customerRepository: ICustomerRepository,
    private qrNonceRepository: IQRNonceRepository,
  ) {}

  async generate(request: GenerateQRCodeRequest): Promise<GenerateQRCodeResponse> {
    const customer = await this.customerRepository.findById(request.customerId);
    if (!customer) {
      throw new NotFoundError('Customer', request.customerId);
    }

    const nonce = crypto.randomUUID();
    const expiresAt = Math.floor(Date.now() / 1000) + QR_TTL_SECONDS;

    await this.qrNonceRepository.save({
      nonce,
      customerId: request.customerId,
      expiresAt,
      used: false,
    });

    // QR payload contains just the nonce — merchant scans and verifies via API
    const qrPayload = JSON.stringify({ nonce, v: 1 });

    return { qrPayload, expiresAt };
  }

  async verify(request: VerifyQRCodeRequest): Promise<VerifyQRCodeResponse> {
    const qrNonce = await this.qrNonceRepository.findByNonce(request.nonce);

    if (!qrNonce) {
      throw new ValidationError('Invalid QR code');
    }

    if (qrNonce.used) {
      throw new ValidationError('QR code has already been used');
    }

    const now = Math.floor(Date.now() / 1000);
    if (now > qrNonce.expiresAt) {
      throw new ValidationError('QR code has expired');
    }

    // Mark nonce as used
    await this.qrNonceRepository.markUsed(request.nonce);

    // Load customer
    const customer = await this.customerRepository.findById(qrNonce.customerId);
    if (!customer) {
      throw new NotFoundError('Customer', qrNonce.customerId);
    }

    const json = customer.toJSON();
    const enrollment = json.enrollments?.find((e) => e.merchantId === request.merchantId);

    return {
      customerId: json.customerId,
      customerName: json.name,
      customerPhone: json.phone,
      isEnrolled: !!enrollment,
      merchantPointsBalance: enrollment?.merchantPointsBalance ?? 0,
      globalPointsBalance: json.globalPointsBalance,
    };
  }
}
