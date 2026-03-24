import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Customer, Email, Merchant, MerchantTier, NotFoundError, PhoneNumber } from '../../domain';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';
import type { ITransactionRepository } from '../repositories/ITransactionRepository';
import { ProcessReferralBonusUseCase } from '../use-cases/ProcessReferralBonusUseCase';

// Stub persistence item so items.length > 0 and atomicWrite is actually invoked
const STUB_ITEM = { tableName: 'test', item: { PK: 'stub' } };

function makeMockCustomerRepo(): ICustomerRepository {
  return {
    findById: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
    findByPhone: vi.fn(),
    findByMerchant: vi.fn(),
    findAll: vi.fn(),
    isEnrolled: vi.fn(),
    findByReferralCode: vi.fn(),
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    toPersistenceItem: vi.fn().mockReturnValue([STUB_ITEM]) as any,
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    toEnrollmentItems: vi.fn().mockReturnValue([STUB_ITEM]) as any,
  };
}

function makeMockMerchantRepo(): IMerchantRepository {
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
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    toPersistenceItem: vi.fn().mockReturnValue([STUB_ITEM]) as any,
  };
}

function makeMockTransactionRepo(): ITransactionRepository {
  return {
    findById: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
    findByIdempotencyKey: vi.fn(),
    findByCustomer: vi.fn(),
    findByMerchant: vi.fn(),
    findByCustomerAndMerchant: vi.fn().mockResolvedValue({ items: [], count: 0 }),
    getMerchantStats: vi.fn(),
    getCustomerStats: vi.fn(),
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    toPersistenceItem: vi.fn().mockReturnValue([STUB_ITEM]) as any,
  };
}

function makeMerchant(referrerBonus = 100, refereeBonus = 50) {
  const merchant = Merchant.create(
    'Test Store',
    new Email('store@example.com'),
    new PhoneNumber('0509876543'),
    'Owner',
    MerchantTier.PROFESSIONAL,
  );
  merchant.verify();
  // Patch loyalty config via updateLoyaltyConfig if available, else set directly via a helper
  const config = merchant.getLoyaltyConfig();
  merchant.updateLoyaltyConfig({
    ...config,
    referralBonusForReferrer: referrerBonus,
    referralBonusForReferee: refereeBonus,
  });
  return merchant;
}

describe('ProcessReferralBonusUseCase', () => {
  let customerRepo: ICustomerRepository;
  let merchantRepo: IMerchantRepository;
  let transactionRepo: ITransactionRepository;
  let atomicWrite: ReturnType<typeof vi.fn>;
  let useCase: ProcessReferralBonusUseCase;

  let referee: Customer;
  let referrer: Customer;
  let merchant: Merchant;

  beforeEach(() => {
    customerRepo = makeMockCustomerRepo();
    merchantRepo = makeMockMerchantRepo();
    transactionRepo = makeMockTransactionRepo();
    atomicWrite = vi.fn().mockResolvedValue(undefined);

    useCase = new ProcessReferralBonusUseCase(
      customerRepo,
      merchantRepo,
      transactionRepo,
      atomicWrite,
    );

    // Create referrer
    referrer = Customer.create(new PhoneNumber('0501111111'), 'Referrer User');
    referrer.enrollWithMerchant('merchant_1');
    referrer.grantConsent('merchant_1');

    // Create referee who was referred by the referrer
    referee = Customer.create(new PhoneNumber('0502222222'), 'Referee User');
    referee.enrollWithMerchant('merchant_1');
    referee.grantConsent('merchant_1');
    referee.setReferredBy(referrer.getReferralCode());

    merchant = makeMerchant(100, 50);
  });

  it('applies both bonuses when all conditions are met', async () => {
    vi.mocked(customerRepo.findById).mockResolvedValue(referee);
    vi.mocked(merchantRepo.findById).mockResolvedValue(merchant);
    vi.mocked(customerRepo.findByReferralCode).mockResolvedValue(referrer);

    const result = await useCase.execute({
      refereeCustomerId: referee.getCustomerId(),
      merchantId: 'merchant_1',
      idempotencyKey: 'test_key',
    });

    expect(result.applied).toBe(true);
    expect(result.refereeBonus).toBe(50);
    expect(result.referrerBonus).toBe(100);
    expect(result.referrerCustomerId).toBe(referrer.getCustomerId());
    expect(atomicWrite).toHaveBeenCalledOnce();
  });

  it('returns applied=false when referee has no referredBy', async () => {
    const unreferred = Customer.create(new PhoneNumber('0503333333'), 'No Referral');
    vi.mocked(customerRepo.findById).mockResolvedValue(unreferred);

    const result = await useCase.execute({
      refereeCustomerId: unreferred.getCustomerId(),
      merchantId: 'merchant_1',
      idempotencyKey: 'test_key_2',
    });

    expect(result.applied).toBe(false);
    expect(atomicWrite).not.toHaveBeenCalled();
  });

  it('returns applied=false when merchant has no referral bonus configured', async () => {
    const noBonus = makeMerchant(0, 0);
    vi.mocked(customerRepo.findById).mockResolvedValue(referee);
    vi.mocked(merchantRepo.findById).mockResolvedValue(noBonus);

    const result = await useCase.execute({
      refereeCustomerId: referee.getCustomerId(),
      merchantId: 'merchant_1',
      idempotencyKey: 'test_key_3',
    });

    expect(result.applied).toBe(false);
    expect(atomicWrite).not.toHaveBeenCalled();
  });

  it('returns applied=false when referrer is not found', async () => {
    vi.mocked(customerRepo.findById).mockResolvedValue(referee);
    vi.mocked(merchantRepo.findById).mockResolvedValue(merchant);
    vi.mocked(customerRepo.findByReferralCode).mockResolvedValue(null);

    const result = await useCase.execute({
      refereeCustomerId: referee.getCustomerId(),
      merchantId: 'merchant_1',
      idempotencyKey: 'test_key_4',
    });

    expect(result.applied).toBe(false);
    expect(atomicWrite).not.toHaveBeenCalled();
  });

  it('returns applied=false on self-referral', async () => {
    // A customer who referred themselves
    const selfRef = Customer.create(new PhoneNumber('0504444444'), 'Self Ref');
    selfRef.enrollWithMerchant('merchant_1');
    selfRef.grantConsent('merchant_1');
    selfRef.setReferredBy(selfRef.getReferralCode());

    vi.mocked(customerRepo.findById).mockResolvedValue(selfRef);
    vi.mocked(merchantRepo.findById).mockResolvedValue(merchant);
    vi.mocked(customerRepo.findByReferralCode).mockResolvedValue(selfRef);

    const result = await useCase.execute({
      refereeCustomerId: selfRef.getCustomerId(),
      merchantId: 'merchant_1',
      idempotencyKey: 'test_key_5',
    });

    expect(result.applied).toBe(false);
    expect(atomicWrite).not.toHaveBeenCalled();
  });

  it('returns applied=false when referrer is not enrolled with the merchant', async () => {
    // Referrer exists but not enrolled with merchant_1
    const unenrolledReferrer = Customer.create(new PhoneNumber('0505555555'), 'Unenrolled');
    vi.mocked(customerRepo.findById).mockResolvedValue(referee);
    vi.mocked(merchantRepo.findById).mockResolvedValue(merchant);
    vi.mocked(customerRepo.findByReferralCode).mockResolvedValue(unenrolledReferrer);

    const result = await useCase.execute({
      refereeCustomerId: referee.getCustomerId(),
      merchantId: 'merchant_1',
      idempotencyKey: 'test_key_6',
    });

    expect(result.applied).toBe(false);
    expect(atomicWrite).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when referee customer does not exist', async () => {
    vi.mocked(customerRepo.findById).mockResolvedValue(null);

    await expect(
      useCase.execute({
        refereeCustomerId: 'ghost',
        merchantId: 'merchant_1',
        idempotencyKey: 'test_key_7',
      }),
    ).rejects.toThrow(NotFoundError);
  });
});
