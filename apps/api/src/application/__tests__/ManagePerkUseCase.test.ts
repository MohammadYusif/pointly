import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Email, Merchant, MerchantTier, NotFoundError, PhoneNumber } from '../../domain';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';
import { ManagePerkUseCase } from '../use-cases/ManagePerkUseCase';

describe('ManagePerkUseCase', () => {
  let useCase: ManagePerkUseCase;
  let mockMerchantRepo: IMerchantRepository;
  let mockAtomicWrite: ReturnType<typeof vi.fn>;

  let testMerchant: Merchant;
  const merchantId = 'merchant_abc';

  beforeEach(() => {
    const email = new Email('store@example.com');
    const phone = new PhoneNumber('0509876543');
    testMerchant = Merchant.create('Test Store', email, phone, 'Owner', MerchantTier.PROFESSIONAL);
    testMerchant.verify();

    mockAtomicWrite = vi.fn().mockResolvedValue(undefined);

    mockMerchantRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      findByEmail: vi.fn(),
      findByPhone: vi.fn(),
      findVerified: vi.fn(),
      findPendingVerification: vi.fn(),
      findByTier: vi.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: test mock returns empty persistence items
      toPersistenceItem: vi.fn().mockReturnValue([{ tableName: 'test', item: {} }]) as any,
    };

    useCase = new ManagePerkUseCase(mockMerchantRepo, mockAtomicWrite);
  });

  describe('createPerk', () => {
    it('should return a perk with an auto-generated id', async () => {
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);

      const perk = await useCase.createPerk(merchantId, {
        type: 'EARLY_ACCESS',
        title: 'VIP Pre-sale',
        description: 'Access to pre-sale events before general public.',
        requiredTier: 'GOLD',
      });

      expect(perk.id).toBeTruthy();
      expect(perk.title).toBe('VIP Pre-sale');
      expect(perk.isActive).toBe(true);
    });

    it('should persist via atomicWrite', async () => {
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);

      await useCase.createPerk(merchantId, {
        type: 'EVENT',
        title: 'Annual Gala',
        description: 'Exclusive annual customer gala.',
        requiredTier: 'PLATINUM',
      });

      expect(mockAtomicWrite).toHaveBeenCalledTimes(1);
      expect(mockMerchantRepo.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when merchant does not exist', async () => {
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(null);

      await expect(
        useCase.createPerk('ghost', {
          type: 'EXCLUSIVE_PRODUCT',
          title: 'Premium Widget',
          description: 'Widget exclusive for loyal customers.',
          requiredTier: 'DIAMOND',
        }),
      ).rejects.toThrow(NotFoundError);

      expect(mockAtomicWrite).not.toHaveBeenCalled();
    });
  });

  describe('updatePerk', () => {
    it('should return the updated perk with modified fields', async () => {
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);
      // Add a perk to the merchant first
      const created = testMerchant.addPerk({
        type: 'EVENT',
        title: 'Old Title',
        description: 'Old description.',
        requiredTier: 'BRONZE',
      });

      const updated = await useCase.updatePerk(merchantId, created.id, { title: 'New Title' });

      expect(updated.id).toBe(created.id);
      expect(updated.title).toBe('New Title');
    });

    it('should persist via atomicWrite', async () => {
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);
      const created = testMerchant.addPerk({
        type: 'EVENT',
        title: 'Perk',
        description: 'Desc.',
        requiredTier: 'GOLD',
      });

      await useCase.updatePerk(merchantId, created.id, { isActive: false });

      expect(mockAtomicWrite).toHaveBeenCalledTimes(1);
      expect(mockMerchantRepo.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when merchant does not exist', async () => {
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(null);

      await expect(useCase.updatePerk('ghost', 'perk_1', { title: 'X' })).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('deletePerk', () => {
    it('should soft-delete the perk (isActive becomes false)', async () => {
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);
      const created = testMerchant.addPerk({
        type: 'EARLY_ACCESS',
        title: 'To Delete',
        description: 'Will be soft-deleted.',
        requiredTier: 'BRONZE',
      });

      await useCase.deletePerk(merchantId, created.id);

      // The perk should now be inactive on the merchant aggregate
      const perk = testMerchant.getPerks().find((p) => p.id === created.id);
      expect(perk?.isActive).toBe(false);
    });

    it('should persist via atomicWrite', async () => {
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);
      const created = testMerchant.addPerk({
        type: 'EVENT',
        title: 'Delete Me',
        description: 'Desc.',
        requiredTier: 'GOLD',
      });

      await useCase.deletePerk(merchantId, created.id);

      expect(mockAtomicWrite).toHaveBeenCalledTimes(1);
      expect(mockMerchantRepo.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when merchant does not exist', async () => {
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(null);

      await expect(useCase.deletePerk('ghost', 'perk_1')).rejects.toThrow(NotFoundError);

      expect(mockAtomicWrite).not.toHaveBeenCalled();
    });
  });
});
