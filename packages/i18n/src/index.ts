// Context and Provider
export {
  DirectionProvider,
  useDirection,
  type Direction,
  type Language,
} from './context/DirectionContext';

// Hooks
export { useTranslation } from './hooks/useTranslation';

// Locales (for direct access if needed)
export { default as enLocale } from './locales/en.json';
export { default as arLocale } from './locales/ar.json';
