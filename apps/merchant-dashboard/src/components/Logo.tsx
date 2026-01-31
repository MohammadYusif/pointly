'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

interface LogoProps {
  variant?: 'light' | 'dark' | 'auto';
  /** Width in pixels - will scale proportionally */
  width?: number;
  /** Height in pixels - if not provided, calculated from width (aspect ratio ~3:1) */
  height?: number;
  className?: string;
  /** Priority loading for LCP optimization */
  priority?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'auto',
  width = 140,
  height,
  className = '',
  priority = false,
}) => {
  // Calculate height maintaining aspect ratio (~3:1 for Pointly logo)
  const calculatedHeight = height || Math.round(width / 3);

  // Use state to handle client-side dark mode detection
  // Default to light mode for SSR to avoid hydration mismatch
  const [isDarkMode, setIsDarkMode] = useState(variant === 'dark');

  useEffect(() => {
    if (variant === 'auto') {
      // Check for .dark class on document (website theme), not system preference
      const checkDarkMode = () => {
        const hasDarkClass = document.documentElement.classList.contains('dark');
        setIsDarkMode(hasDarkClass);
      };

      // Initial check
      checkDarkMode();

      // Watch for class changes on html element
      const observer = new MutationObserver(checkDarkMode);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });

      return () => observer.disconnect();
    }
    if (variant === 'dark') {
      setIsDarkMode(true);
    } else {
      setIsDarkMode(false);
    }
  }, [variant]);

  // Light mode: pointlylogo.svg (colored logo)
  // Dark mode: white_logo.svg (white text for dark backgrounds)
  const logoSrc = isDarkMode ? '/logos/white_logo.svg' : '/logos/pointlylogo.svg';
  const altText = 'Pointly';

  return (
    <Image
      src={logoSrc}
      alt={altText}
      width={width}
      height={calculatedHeight}
      className={`shrink-0 object-contain ${className}`}
      priority={priority}
    />
  );
};

export default Logo;
