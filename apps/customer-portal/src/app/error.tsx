'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        textAlign: 'center',
        padding: '24px',
      }}
    >
      <p style={{ fontSize: '3rem', lineHeight: 1 }}>⚠️</p>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Something went wrong</h1>
      <p style={{ color: '#6b7280', maxWidth: '320px' }}>
        An unexpected error occurred. Try refreshing the page.
      </p>
      <button
        type="button"
        onClick={reset}
        style={{
          marginTop: '8px',
          padding: '10px 24px',
          background: '#0d9488',
          color: '#fff',
          borderRadius: '12px',
          fontWeight: 600,
          fontSize: '0.9rem',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}
