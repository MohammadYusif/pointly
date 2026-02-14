export interface QRNonce {
  nonce: string;
  customerId: string;
  expiresAt: number; // Unix timestamp in seconds
  used: boolean;
}

export interface IQRNonceRepository {
  save(nonce: QRNonce): Promise<void>;
  findByNonce(nonce: string): Promise<QRNonce | null>;
  markUsed(nonce: string): Promise<void>;
}
