'use client';

import type { TranslationKeys } from '@/i18n/translations';
import { fadeUp, smooth, viewportOnce } from '@/lib/motion';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface FooterProps {
  t: TranslationKeys;
}

export function Footer({ t }: FooterProps) {
  return (
    <motion.footer
      className="footer"
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={fadeUp}
      transition={smooth}
    >
      <div className="container">
        {/* 4-column grid */}
        <div className="footer-grid">
          {/* Brand column */}
          <div className="footer-brand">
            <Link href="/">
              <img src="/logo.svg" alt="Pointly" height={32} />
            </Link>
            <p className="footer-tagline">{t.footer.tagline}</p>
          </div>

          {/* Link columns */}
          {t.footer.columns.map((col) => (
            <div key={col.title}>
              <div className="footer-col-title">{col.title}</div>
              <ul className="footer-col-links">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="footer-col-link">
                      {link.label}
                    </Link>
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
              <li key={link.label}>
                <Link href={link.href} className="footer-link">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.footer>
  );
}
