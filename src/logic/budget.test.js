import { describe, expect, it } from 'vitest'
import { addDays, getWeekStart } from './dates'
import { applyClosedDayAdjustment, closeDays, getDailyBudget } from './budget'

function makeData(overrides = {}) {
  return {
    settings: {
      weeklyBudgetPiastres: 70000,
      dailyBudgetMode: 'auto',
      manualDailyBudgetPiastres: 0,
    },
    expenses: [],
    dailyBudgets: {},
    lastClosedDate: '2026-10-09',
    savingsBalancePiastres: 0,
    savingsHistory: [],
    ...overrides,
  }
}

describe('daily budget logic', () => {
  it('closes one day with leftover savings', () => {
    const data = makeData({
      dailyBudgets: { '2026-10-10': 10000 },
      expenses: [{ date: '2026-10-10', amountPiastres: 3500 }],
    })
    const result = closeDays(data, '2026-10-11')

    expect(result.savingsBalancePiastres).toBe(10000 - 3500)
    expect(result.lastClosedDate).toBe('2026-10-10')
    expect(result.savingsHistory).toHaveLength(1)
  })

  it('reduces savings when a day is overspent', () => {
    const data = makeData({
      dailyBudgets: { '2026-10-10': 10000 },
      expenses: [{ date: '2026-10-10', amountPiastres: 12500 }],
    })
    const result = closeDays(data, '2026-10-11')

    expect(result.savingsBalancePiastres).toBe(-2500)
    expect(result.savingsHistory[0].amountPiastres).toBe(-2500)
  })

  it('closes skipped days in order', () => {
    const result = closeDays(makeData(), '2026-10-12')

    expect(result.savingsHistory.map((entry) => entry.date)).toEqual([
      '2026-10-10',
      '2026-10-11',
    ])
    expect(result.lastClosedDate).toBe('2026-10-11')
  })

  it('never closes the same day twice', () => {
    const once = closeDays(makeData(), '2026-10-11')
    const twice = closeDays(once, '2026-10-10')

    expect(twice.savingsHistory).toHaveLength(1)
    expect(twice.savingsBalancePiastres).toBe(10000)
  })

  it('supports auto and manual daily budgets', () => {
    expect(getDailyBudget(makeData(), '2026-10-10')).toBe(10000)
    expect(getDailyBudget(makeData({
      settings: {
        weeklyBudgetPiastres: 70000,
        dailyBudgetMode: 'manual',
        manualDailyBudgetPiastres: 12500,
      },
    }), '2026-10-10')).toBe(12500)
  })

  it('adjusts savings when editing or deleting a closed-day expense', () => {
    const data = makeData({ lastClosedDate: '2026-10-10', savingsBalancePiastres: 5000 })
    const edited = applyClosedDayAdjustment(data, {
      date: '2026-10-10',
      oldAmountPiastres: 3000,
      newAmountPiastres: 4500,
    })
    const deleted = applyClosedDayAdjustment(edited, {
      date: '2026-10-10',
      oldAmountPiastres: 4500,
      newAmountPiastres: 0,
    })

    expect(edited.savingsBalancePiastres).toBe(3500)
    expect(deleted.savingsBalancePiastres).toBe(8000)
    expect(deleted.savingsHistory.filter((entry) => entry.type === 'adjustment')).toHaveLength(2)
  })

  it('starts weeks on Saturday', () => {
    expect(getWeekStart('2026-10-12')).toBe('2026-10-10')
    expect(getWeekStart('2026-10-16')).toBe('2026-10-10')
    expect(getWeekStart('2026-10-17')).toBe('2026-10-17')
  })

  it('adds calendar days without using the browser timezone', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
  })
})
