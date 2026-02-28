import type { TranslationKeys } from '@/i18n/translations';

interface FooterProps {
  t: TranslationKeys;
}

export function Footer({ t }: FooterProps) {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-inner">
          <p className="footer-copy">{t.footer.copy}</p>
          <ul className="footer-links">
            {t.footer.links.map((link) => (
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
