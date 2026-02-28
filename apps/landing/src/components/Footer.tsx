import type { TranslationKeys } from '@/i18n/translations';

interface FooterProps {
  t: TranslationKeys;
}

export function Footer({ t }: FooterProps) {
  return (
    <footer className="footer">
      <div className="container">
        {/* 4-column grid */}
        <div className="footer-grid">
          {/* Brand column */}
          <div className="footer-brand">
            <img src="/logo.svg" alt="Pointly" height={32} />
            <p className="footer-tagline">{t.footer.tagline}</p>
          </div>

          {/* Link columns */}
          {t.footer.columns.map((col) => (
            <div key={col.title}>
              <div className="footer-col-title">{col.title}</div>
              <ul className="footer-col-links">
                {col.links.map((link) => (
                  <li key={link}>
                    <span className="footer-col-link">{link}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <p className="footer-copy">{t.footer.copy}</p>
          <ul className="footer-links">
            {t.footer.legal.map((link) => (
              <li key={link}>
                <span className="footer-link">{link}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
