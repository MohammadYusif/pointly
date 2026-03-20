import { sign } from 'jsonwebtoken';
import { PKPass } from 'passkit-generator';
import { ulid } from 'ulid';
import { NotFoundError } from '../../domain/errors/DomainError';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';

interface WalletEnvConfig {
  APPLE_PASS_CERT_PEM?: string | undefined;
  APPLE_PASS_KEY_PEM?: string | undefined;
  APPLE_PASS_KEY_PASSPHRASE?: string | undefined;
  APPLE_TEAM_ID?: string | undefined;
  APPLE_PASS_TYPE_ID?: string | undefined;
  APPLE_WWDR_PEM?: string | undefined;
  GOOGLE_WALLET_ISSUER_ID?: string | undefined;
  GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL?: string | undefined;
  GOOGLE_WALLET_PRIVATE_KEY?: string | undefined;
}

type ApplePassResult = { buffer: Buffer } | { status: 501 };
type GoogleLinkResult = { url: string } | { status: 501 };

export class ManageWalletPassUseCase {
  constructor(
    private customerRepository: ICustomerRepository,
    private merchantRepository: IMerchantRepository,
    private env: WalletEnvConfig,
  ) {}

  async generateApplePass(customerId: string, merchantId: string): Promise<ApplePassResult> {
    const {
      APPLE_PASS_CERT_PEM,
      APPLE_PASS_KEY_PEM,
      APPLE_TEAM_ID,
      APPLE_PASS_TYPE_ID,
      APPLE_WWDR_PEM,
    } = this.env;

    if (
      !APPLE_PASS_CERT_PEM ||
      !APPLE_PASS_KEY_PEM ||
      !APPLE_TEAM_ID ||
      !APPLE_PASS_TYPE_ID ||
      !APPLE_WWDR_PEM
    ) {
      return { status: 501 };
    }

    const [customer, merchant] = await Promise.all([
      this.customerRepository.findById(customerId),
      this.merchantRepository.findById(merchantId),
    ]);

    if (!customer) throw new NotFoundError('Customer', customerId);
    if (!merchant) throw new NotFoundError('Merchant', merchantId);

    const enrollment = customer.getEnrollment(merchantId);
    if (!enrollment) throw new NotFoundError('Enrollment', `${customerId}/${merchantId}`);

    const walletConfig = merchant.getWalletConfig();
    const backgroundColor = walletConfig?.backgroundColor ?? '#ffffff';
    const foregroundColor = walletConfig?.primaryColor ?? '#0d9488';

    const pass = new PKPass(
      {},
      {
        wwdr: APPLE_WWDR_PEM,
        signerCert: APPLE_PASS_CERT_PEM,
        signerKey: APPLE_PASS_KEY_PEM,
        ...(this.env.APPLE_PASS_KEY_PASSPHRASE && {
          signerKeyPassphrase: this.env.APPLE_PASS_KEY_PASSPHRASE,
        }),
      },
      {
        passTypeIdentifier: APPLE_PASS_TYPE_ID,
        teamIdentifier: APPLE_TEAM_ID,
        serialNumber: ulid(),
        organizationName: merchant.getBusinessName(),
        description: `${merchant.getBusinessName()} Loyalty Card`,
        backgroundColor,
        foregroundColor,
      },
    );

    pass.type = 'storeCard';

    pass.primaryFields.push({
      key: 'points',
      label: 'Store Points',
      value: enrollment.merchantPointsBalance.toNumber().toString(),
    });

    pass.secondaryFields.push({
      key: 'tier',
      label: 'Tier',
      value: customer.getCurrentTier().getDisplayName(),
    });

    pass.backFields.push({
      key: 'member',
      label: 'Member since',
      value: enrollment.enrolledAt.toISOString().substring(0, 10),
    });

    const buffer = pass.getAsBuffer();
    return { buffer };
  }

  async generateGoogleLink(customerId: string, merchantId: string): Promise<GoogleLinkResult> {
    const {
      GOOGLE_WALLET_ISSUER_ID,
      GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_WALLET_PRIVATE_KEY,
    } = this.env;

    if (
      !GOOGLE_WALLET_ISSUER_ID ||
      !GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL ||
      !GOOGLE_WALLET_PRIVATE_KEY
    ) {
      return { status: 501 };
    }

    const [customer, merchant] = await Promise.all([
      this.customerRepository.findById(customerId),
      this.merchantRepository.findById(merchantId),
    ]);

    if (!customer) throw new NotFoundError('Customer', customerId);
    if (!merchant) throw new NotFoundError('Merchant', merchantId);

    const enrollment = customer.getEnrollment(merchantId);
    if (!enrollment) throw new NotFoundError('Enrollment', `${customerId}/${merchantId}`);

    const payload = {
      iss: GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
      aud: 'google',
      typ: 'savetowallet',
      iat: Math.floor(Date.now() / 1000),
      payload: {
        loyaltyObjects: [
          {
            id: `${GOOGLE_WALLET_ISSUER_ID}.${merchantId}_${customerId}`,
            classId: `${GOOGLE_WALLET_ISSUER_ID}.${merchantId}`,
            state: 'ACTIVE',
            loyaltyPoints: {
              balance: { int: enrollment.merchantPointsBalance.toNumber() },
              label: 'Points',
            },
            tierPoints: 0,
          },
        ],
      },
    };

    const jwt = sign(payload, GOOGLE_WALLET_PRIVATE_KEY, { algorithm: 'RS256' });
    return { url: `https://pay.google.com/gp/v/save/${jwt}` };
  }
}
