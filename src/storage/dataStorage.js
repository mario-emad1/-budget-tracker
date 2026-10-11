import { addDays, getCairoDate } from '../logic/dates'

export const DATA_VERSION = 1
export const DATA_KEY = 'budget-tracker-data'

export const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'Food', color: '#f59e0b', icon: '🍽️', archived: false },
  { id: 'transport', name: 'Transport', color: '#3b82f6', icon: '🚗', archived: false },
  { id: 'coffee', name: 'Coffee', color: '#8b5cf6', icon: '☕', archived: false },
  { id: 'shopping', name: 'Shopping', color: '#ec4899', icon: '🛍️', archived: false },
  { id: 'bills', name: 'Bills', color: '#64748b', icon: '🧾', archived: false },
  { id: 'health', name: 'Health', color: '#ef4444', icon: '❤', archived: false },
  { id: 'other', name: 'Other', color: '#14b8a6', icon: '✦', archived: false },
]

export function createDefaultData() {
  return {
    version: DATA_VERSION,
    settings: {
      weeklyBudgetPiastres: 0,
      dailyBudgetMode: 'auto',
      manualDailyBudgetPiastres: 0,
      theme: 'system',
    },
    expenses: [],
    categories: DEFAULT_CATEGORIES,
    dailyBudgets: {},
    lastClosedDate: addDays(getCairoDate(), -1),
    savingsBalancePiastres: 0,
    savingsHistory: [],
  }
}

export function loadData() {
  const saved = localStorage.getItem(DATA_KEY)
  if (!saved) return createDefaultData()

  try {
    const parsed = JSON.parse(saved)
    const defaults = createDefaultData()
    return {
      ...defaults,
      ...parsed,
      settings: { ...defaults.settings, ...parsed.settings },
      dailyBudgets: parsed.dailyBudgets ?? {},
      savingsHistory: parsed.savingsHistory ?? [],
      expenses: parsed.expenses ?? [],
      categories: parsed.categories ?? defaults.categories,
      version: DATA_VERSION,
    }
  } catch {
    return createDefaultData()
  }
}

export function saveData(data) {
  localStorage.setItem(DATA_KEY, JSON.stringify({ ...data, version: DATA_VERSION }))
}

export function clearData() {
  localStorage.removeItem(DATA_KEY)
}

export function exportData(data) {
  return JSON.stringify({ ...data, version: DATA_VERSION }, null, 2)
}

export function parseImportedData(text) {
  const parsed = JSON.parse(text)
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.expenses) || !Array.isArray(parsed.categories)) {
    throw new Error('Invalid Budget Tracker data file.')
  }
  const defaults = createDefaultData()
  return {
    ...defaults,
    ...parsed,
    settings: { ...defaults.settings, ...parsed.settings },
    dailyBudgets: parsed.dailyBudgets ?? {},
    savingsHistory: parsed.savingsHistory ?? [],
    version: DATA_VERSION,
  }
}
