export const THEME_STORAGE_KEY = 'stockpilot-theme'
export const themePreference = value => ['system', 'dark', 'light'].includes(value) ? value : 'system'
export const resolvedTheme = (preference, systemDark = false) => themePreference(preference) === 'system' ? (systemDark ? 'dark' : 'light') : themePreference(preference)
export function applyTheme(preference, target = document.documentElement, systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
  const normalized = themePreference(preference)
  target.dataset.themePreference = normalized
  target.dataset.theme = resolvedTheme(normalized, systemDark)
  target.style.colorScheme = target.dataset.theme
  return target.dataset.theme
}
