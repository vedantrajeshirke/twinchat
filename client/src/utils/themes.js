/**
 * Theme registry. v1 ships Ocean (PROJECT_PLAN §7.3). Adding a theme means
 * one entry here plus one CSS variable block in styles/global.css.
 * `swatch` values are only for the settings preview, never used by components.
 */
export const THEMES = [
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Cool blue and teal. The TwinChat default.',
    swatch: { light: ['#F3F8FC', '#378ADD', '#1D9E75'], dark: ['#0E1420', '#5AA0E6', '#5DCAA5'] },
  },
];

export const DEFAULT_THEME = 'ocean';
export const isKnownTheme = (id) => THEMES.some((t) => t.id === id);
