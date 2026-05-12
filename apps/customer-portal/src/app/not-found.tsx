import Link from 'next/link';

export default function NotFound() {
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
      <p style={{ fontSize: '4rem', fontWeight: 800, color: '#0d9488', lineHeight: 1 }}>404</p>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Page not found</h1>
      <p style={{ color: '#6b7280', maxWidth: '320px' }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        style={{
          marginTop: '8px',
          padding: '10px 24px',
          background: '#0d9488',
          color: '#fff',
          borderRadius: '12px',
          fontWeight: 600,
          fontSize: '0.9rem',
          textDecoration: 'none',
        }}
      >
        Go to login
      </Link>
    </div>
  );
}
