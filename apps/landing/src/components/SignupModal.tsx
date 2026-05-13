'use client';

import type { TranslationKeys } from '@/i18n/translations';
import { useState } from 'react';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  planKey: string;
  apiUrl: string;
  dashboardUrl: string;
  t: TranslationKeys;
}

interface FormState {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
}

const EMPTY_FORM: FormState = {
  businessName: '',
  contactName: '',
  email: '',
  phone: '',
};

export function SignupModal({
  isOpen,
  onClose,
  planName,
  planKey,
  apiUrl,
  dashboardUrl,
  t,
}: SignupModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const s = t.signup;

  function handleClose() {
    setStep(1);
    setForm(EMPTY_FORM);
    setError(null);
    onClose();
  }

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }

  function validateStep1() {
    if (!form.businessName.trim() || form.businessName.trim().length < 2) {
      setError(s.errorBusinessName);
      return false;
    }
    if (!form.contactName.trim()) {
      setError(s.errorContactName);
      return false;
    }
    return true;
  }

  function validateStep2() {
    if (!form.email.trim() || !form.email.includes('@')) {
      setError(s.errorEmail);
      return false;
    }
    if (!form.phone.trim()) {
      setError(s.errorPhone);
      return false;
    }
    return true;
  }

  function handleNext() {
    if (!validateStep1()) return;
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep2()) return;

    setIsLoading(true);
    setError(null);

    try {
      const callbackUrl = `${dashboardUrl}/signup-complete`;
      const res = await fetch(`${apiUrl}/v1/merchants/initiate-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: form.businessName.trim(),
          contactName: form.contactName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          plan: planKey,
          callbackUrl,
        }),
      });

      const json = (await res.json()) as {
        success: boolean;
        data?: { paymentUrl: string };
        error?: string;
      };

      if (!res.ok || !json.success || !json.data?.paymentUrl) {
        setError(json.error ?? s.errorGeneric);
        return;
      }

      window.location.href = json.data.paymentUrl;
    } catch {
      setError(s.errorGeneric);
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: overlay click closes modal
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: dialog element lacks wide enough browser support for CSS-based modal pattern */}
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button type="button" className="modal-close" onClick={handleClose} aria-label={s.close}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <title>Close</title>
            <path
              d="M2 2l14 14M16 2L2 16"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="modal-plan-badge">{planName}</div>
        <h2 className="modal-title" id="modal-title">
          {s.title}
        </h2>
        <p className="modal-subtitle">{s.subtitle}</p>

        <div className="modal-step-dots">
          <div className={`modal-step-dot${step === 1 ? ' active' : ''}`} />
          <div className={`modal-step-dot${step === 2 ? ' active' : ''}`} />
        </div>

        {error && <div className="modal-error">{error}</div>}

        {step === 1 ? (
          <div className="modal-form">
            <div>
              <label className="modal-label" htmlFor="sm-business">
                {s.businessName}
              </label>
              <input
                id="sm-business"
                className="modal-input"
                type="text"
                value={form.businessName}
                onChange={(e) => update('businessName', e.target.value)}
                placeholder={s.businessNamePlaceholder}
              />
            </div>
            <div>
              <label className="modal-label" htmlFor="sm-contact">
                {s.contactName}
              </label>
              <input
                id="sm-contact"
                className="modal-input"
                type="text"
                value={form.contactName}
                onChange={(e) => update('contactName', e.target.value)}
                placeholder={s.contactNamePlaceholder}
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="modal-btn-primary" onClick={handleNext}>
                {s.next}
              </button>
            </div>
            <p className="modal-note">{s.note}</p>
          </div>
        ) : (
          <form className="modal-form" onSubmit={handleSubmit}>
            <div>
              <label className="modal-label" htmlFor="sm-email">
                {s.email}
              </label>
              <input
                id="sm-email"
                className="modal-input"
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder={s.emailPlaceholder}
              />
            </div>
            <div>
              <label className="modal-label" htmlFor="sm-phone">
                {s.phone}
              </label>
              <input
                id="sm-phone"
                className="modal-input"
                type="tel"
                dir="ltr"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="+966 5X XXX XXXX"
              />
            </div>
            <div className="modal-renew-notice">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <title>Notice</title>
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M8 5v3.5M8 11v.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              {s.autoRenewNote}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn-back"
                onClick={() => {
                  setStep(1);
                  setError(null);
                }}
              >
                {s.back}
              </button>
              <button type="submit" className="modal-btn-primary" disabled={isLoading}>
                {isLoading ? s.loading : s.submit}
              </button>
            </div>
            <p className="modal-note">
              {s.privacyNote}{' '}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="modal-privacy-link"
              >
                {s.privacyLinkText}
              </a>
              {'. '}
              {s.note}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
