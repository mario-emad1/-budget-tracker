const THEME_KEY = 'budget-tracker-theme'

export function loadTheme() {
  return localStorage.getItem(THEME_KEY) || 'system'
}

export function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme)
}
