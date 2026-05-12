'use client';

import { useDirection } from '@pointly/i18n';
import { Menu } from 'lucide-react';
import * as React from 'react';
import { cn } from '../../utils/cn';
import { Button } from '../Button/Button';
import { LanguageToggle } from '../LanguageToggle/LanguageToggle';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '../Sheet/Sheet';

export interface NavItem {
  /** Unique key for the nav item */
  key: string;
  /** Display label */
  label: string;
  /** Optional href for link navigation */
  href?: string;
  /** Optional click handler */
  onClick?: () => void;
  /** Whether this item is currently active */
  active?: boolean;
  /** If true, renders a thin vertical divider before this item in the desktop nav */
  separator?: boolean;
}

export interface NavbarProps {
  /** Navigation items to display */
  items: NavItem[];
  /** Logo component to render */
  logo?: React.ReactNode;
  /** Whether to show the language toggle */
  showLanguageToggle?: boolean;
  /**
   * Whether the language toggle should follow RTL/LTR positioning.
   * If false (default), the toggle stays on the right side regardless of direction.
   * If true, it will move with the direction.
   */
  languageToggleFollowsDirection?: boolean;
  /** Additional content to render in the right section (desktop) */
  rightContent?: React.ReactNode;
  /** Additional content to render in the mobile menu */
  mobileMenuContent?: React.ReactNode;
  /** Callback when a nav item is clicked */
  onNavItemClick?: (item: NavItem) => void;
  /** Custom class name for the navbar container */
  className?: string;
  /** Whether the navbar should be sticky */
  sticky?: boolean;
}

export function Navbar({
  items,
  logo,
  showLanguageToggle = true,
  languageToggleFollowsDirection: _languageToggleFollowsDirection = false,
  rightContent,
  mobileMenuContent,
  onNavItemClick,
  className,
  sticky = true,
}: NavbarProps) {
  const { isRTL } = useDirection();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleNavItemClick = (item: NavItem) => {
    if (item.onClick) {
      item.onClick();
    }
    onNavItemClick?.(item);
    setMobileMenuOpen(false);
  };

  // Render navigation items for desktop
  const renderDesktopNav = () => (
    <nav className="hidden md:flex md:items-center md:gap-1">
      {items.map((item) => (
        <React.Fragment key={item.key}>
          {item.separator && (
            <div className="w-px h-5 bg-border mx-1 shrink-0" aria-hidden="true" />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleNavItemClick(item)}
            className={cn(item.active && 'bg-muted')}
          >
            {item.label}
          </Button>
        </React.Fragment>
      ))}
    </nav>
  );

  // Render navigation items for mobile
  const renderMobileNav = () => (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <Button
          key={item.key}
          variant="ghost"
          className={cn('justify-start', item.active && 'bg-muted')}
          onClick={() => handleNavItemClick(item)}
        >
          {item.label}
        </Button>
      ))}
    </nav>
  );

  // Language toggle component
  const languageToggleElement = showLanguageToggle ? <LanguageToggle /> : null;

  return (
    <header className={cn('bg-card border-b z-30', sticky && 'sticky top-0', className)}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Start section: Hamburger + Logo */}
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden p-2">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side={isRTL ? 'right' : 'left'} className="w-72 p-0">
                {/* Visually hidden title for accessibility */}
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                {/* Mobile menu logo */}
                {logo && <div className="p-4 border-b">{logo}</div>}
                {/* Mobile navigation */}
                <div className="p-4">{renderMobileNav()}</div>
                {/* Additional mobile content */}
                {mobileMenuContent && <div className="p-4 border-t">{mobileMenuContent}</div>}
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <div className="flex items-center">{logo}</div>
          </div>

          {/* End section: Nav + Language Toggle + Custom content */}
          <div className="flex items-center gap-2">
            {/* Desktop navigation */}
            {renderDesktopNav()}

            {/* Custom right content */}
            {rightContent}

            {/* Language toggle */}
            {languageToggleElement}
          </div>
        </div>
      </div>
    </header>
  );
}

Navbar.displayName = 'Navbar';
