import { generateKeyPairSync } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Customer, Merchant, MerchantTier } from '../../domain';
import { Email } from '../../domain/value-objects/Email';
import { PhoneNumber } from '../../domain/value-objects/PhoneNumber';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';
import { ManageWalletPassUseCase } from '../use-cases/ManageWalletPassUseCase';

function makeCustomerRepo(): ICustomerRepository {
  return {
    findById: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
    findByPhone: vi.fn(),
    findByMerchant: vi.fn(),
    findAll: vi.fn(),
    isEnrolled: vi.fn(),
    toPersistenceItem: vi.fn(),
    toEnrollmentItems: vi.fn(),
  };
}

function makeMerchantRepo(): IMerchantRepository {
  return {
    findById: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
    findByEmail: vi.fn(),
    findByPhone: vi.fn(),
    findVerified: vi.fn(),
    findPendingVerification: vi.fn(),
    findByTier: vi.fn(),
    toPersistenceItem: vi.fn(),
  };
}

describe('ManageWalletPassUseCase', () => {
  let customerRepo: ICustomerRepository;
  let merchantRepo: IMerchantRepository;
  let customer: Customer;
  let merchant: Merchant;

  beforeEach(() => {
    customerRepo = makeCustomerRepo();
    merchantRepo = makeMerchantRepo();

    customer = Customer.create(new PhoneNumber('0501234567'), 'Test User');
    merchant = Merchant.create(
      'Test Store',
      new Email('store@example.com'),
      new PhoneNumber('0509876543'),
      'Owner',
      MerchantTier.BASIC,
    );
    merchant.verify();

    customer.enrollWithMerchant(merchant.getMerchantId());
  });

  describe('generateApplePass', () => {
    it('returns { status: 501 } when Apple certs are not configured', async () => {
      const useCase = new ManageWalletPassUseCase(customerRepo, merchantRepo, {});

      const result = await useCase.generateApplePass('cust1', 'merch1');

      expect(result).toEqual({ status: 501 });
    });

    it('returns { status: 501 } when only some Apple certs are provided', async () => {
      const useCase = new ManageWalletPassUseCase(customerRepo, merchantRepo, {
        APPLE_PASS_CERT_PEM: 'cert',
        APPLE_PASS_KEY_PEM: 'key',
      });

      const result = await useCase.generateApplePass('cust1', 'merch1');

      expect(result).toEqual({ status: 501 });
    });

    it('throws NotFoundError when customer is not enrolled with merchant', async () => {
      vi.mocked(customerRepo.findById).mockResolvedValue(customer);
      vi.mocked(merchantRepo.findById).mockResolvedValue(merchant);

      const useCase = new ManageWalletPassUseCase(customerRepo, merchantRepo, {
        APPLE_PASS_CERT_PEM: 'cert',
        APPLE_PASS_KEY_PEM: 'key',
        APPLE_TEAM_ID: 'TEAM1',
        APPLE_PASS_TYPE_ID: 'pass.sa.pointly.loyalty',
        APPLE_WWDR_PEM: 'wwdr',
      });

      await expect(
        useCase.generateApplePass(customer.getCustomerId(), 'other-merchant-id'),
      ).rejects.toThrow('Enrollment not found');
    });
  });

  describe('generateGoogleLink', () => {
    it('returns { status: 501 } when Google credentials are not configured', async () => {
      const useCase = new ManageWalletPassUseCase(customerRepo, merchantRepo, {});

      const result = await useCase.generateGoogleLink('cust1', 'merch1');

      expect(result).toEqual({ status: 501 });
    });

    it('returns { status: 501 } when only some Google credentials are provided', async () => {
      const useCase = new ManageWalletPassUseCase(customerRepo, merchantRepo, {
        GOOGLE_WALLET_ISSUER_ID: 'issuer',
        GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL: 'sa@project.iam.gserviceaccount.com',
      });

      const result = await useCase.generateGoogleLink('cust1', 'merch1');

      expect(result).toEqual({ status: 501 });
    });

    it('returns a Google Wallet save URL when credentials are configured', async () => {
      vi.mocked(customerRepo.findById).mockResolvedValue(customer);
      vi.mocked(merchantRepo.findById).mockResolvedValue(merchant);

      const { privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      const useCase = new ManageWalletPassUseCase(customerRepo, merchantRepo, {
        GOOGLE_WALLET_ISSUER_ID: '1234567890',
        GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL: 'sa@project.iam.gserviceaccount.com',
        GOOGLE_WALLET_PRIVATE_KEY: privateKey,
      });

      const result = await useCase.generateGoogleLink(
        customer.getCustomerId(),
        merchant.getMerchantId(),
      );

      expect('url' in result).toBe(true);
      if ('url' in result) {
        expect(result.url).toMatch(/^https:\/\/pay\.google\.com\/gp\/v\/save\//);
      }
    });
  });
});
