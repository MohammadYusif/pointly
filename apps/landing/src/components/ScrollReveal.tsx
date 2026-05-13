'use client';

import { useEffect, useRef } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export function ScrollReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    el.classList.add('sr-hidden', `sr-${direction}`);
    if (delay > 0) el.style.transitionDelay = `${delay * 0.1}s`;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.remove('sr-hidden');
          el.style.transitionDelay = '';
          observer.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -60px 0px', threshold: 0.05 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, direction]);

  return (
    <div ref={ref} className={`scroll-reveal${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
