'use client';

import { Logo } from '@/components/Logo';
import { useSignupStatus } from '@/hooks/api/use-signup-status';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function SignupCompletePage() {
  const searchParams = useSearchParams();
  // Moyasar appends ?id=<invoiceId> to the callback URL
  const paymentId = searchParams.get('id') ?? searchParams.get('paymentId');

  const { data, isError } = useSignupStatus(paymentId);
  const status = data?.status ?? 'pending';

  return (
    <div className="login-wrapper min-h-screen flex items-center justify-center px-4">
      <div className="login-orb login-orb-1" aria-hidden="true" />
      <div className="login-orb login-orb-2" aria-hidden="true" />
      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <Logo width={130} />
        </div>

        {isError ? (
          <StatusCard
            icon="⚠️"
            title="Something went wrong"
            body="We couldn't check your payment status. Please contact support if this persists."
            action={<ExternalLink href="https://pointly.sa">Back to Pointly</ExternalLink>}
          />
        ) : status === 'active' ? (
          <StatusCard
            icon="✅"
            title="You're all set!"
            body="Your merchant account is ready. Check your email for your temporary password, then sign in to get started."
            action={
              <Link href="/login" className="sc-btn sc-btn-primary">
                Sign in to dashboard
              </Link>
            }
          />
        ) : status === 'failed' ? (
          <StatusCard
            icon="❌"
            title="Payment not completed"
            body="Your payment was not confirmed. Please try signing up again."
            action={<ExternalLink href="https://pointly.sa/#pricing">Back to plans</ExternalLink>}
          />
        ) : (
          <StatusCard
            icon={<Spinner />}
            title="Setting up your account…"
            body="We're confirming your payment and creating your merchant account. This usually takes a few seconds."
            action={null}
          />
        )}
      </div>

      <style>{`
        .sc-card {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          padding: 40px;
          text-align: center;
          border: 1.5px solid rgba(255,255,255,0.6);
          box-shadow: 0 8px 40px rgba(0,0,0,0.08);
        }
        .sc-icon { font-size: 3rem; margin-bottom: 16px; }
        .sc-title { font-size: 1.35rem; font-weight: 800; color: #1e2d4a; margin-bottom: 10px; }
        .sc-body { font-size: 0.9rem; color: #5a6882; line-height: 1.6; margin-bottom: 28px; }
        .sc-btn { display: inline-block; padding: 12px 28px; border-radius: 10px; font-size: 0.9rem; font-weight: 700; cursor: pointer; text-decoration: none; transition: background 0.15s, box-shadow 0.15s; }
        .sc-btn-primary { background: #08b0a2; color: #fff; }
        .sc-btn-primary:hover { background: #07a093; box-shadow: 0 4px 20px rgba(8,176,162,0.35); }
        .sc-btn-ghost { background: transparent; border: 1.5px solid #e2e8f0; color: #5a6882; }
        .sc-btn-ghost:hover { border-color: #08b0a2; color: #08b0a2; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .sc-spinner { width: 40px; height: 40px; border: 3px solid rgba(8,176,162,0.2); border-top-color: #08b0a2; border-radius: 50%; animation: spin 0.9s linear infinite; margin: 0 auto 16px; }
      `}</style>
    </div>
  );
}

function StatusCard({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="sc-card">
      <div className="sc-icon">{icon}</div>
      <h1 className="sc-title">{title}</h1>
      <p className="sc-body">{body}</p>
      {action}
    </div>
  );
}

function Spinner() {
  return <div className="sc-spinner" aria-label="Loading" />;
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="sc-btn sc-btn-ghost">
      {children}
    </a>
  );
}
