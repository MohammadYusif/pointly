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
                <a href="#" className="footer-link">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
