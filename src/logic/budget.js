import { addDays, compareDates, getWeekStart } from './dates'

export function getDailyBudget(data, date) {
  if (Object.hasOwn(data.dailyBudgets ?? {}, date)) return data.dailyBudgets[date]
  if (data.settings.dailyBudgetMode === 'manual') {
    return data.settings.manualDailyBudgetPiastres
  }
  return Math.round(data.settings.weeklyBudgetPiastres / 7)
}

export function getSpentForDate(data, date) {
  return data.expenses
    .filter((expense) => expense.date === date)
    .reduce((total, expense) => total + expense.amountPiastres, 0)
}

export function getSpentBetween(data, startDate, endDate) {
  return data.expenses
    .filter((expense) => compareDates(expense.date, startDate) >= 0 && compareDates(expense.date, endDate) <= 0)
    .reduce((total, expense) => total + expense.amountPiastres, 0)
}

export function getWeeklyBudgetSummary(data, date) {
  const startDate = getWeekStart(date)
  return {
    budgetPiastres: data.settings.weeklyBudgetPiastres,
    spentPiastres: getSpentBetween(data, startDate, date),
    startDate,
  }
}

export function closeDays(data, todayDate) {
  const nextData = structuredClone(data)
  nextData.dailyBudgets ??= {}
  nextData.savingsHistory ??= []
  if (!nextData.lastClosedDate) {
    nextData.lastClosedDate = addDays(todayDate, -1)
    return nextData
  }

  const lastDateToClose = addDays(todayDate, -1)
  while (compareDates(lastDateToClose, nextData.lastClosedDate) > 0) {
    const date = addDays(nextData.lastClosedDate, 1)
    const budget = getDailyBudget(nextData, date)
    const spent = getSpentForDate(nextData, date)
    const leftover = budget - spent

    nextData.dailyBudgets[date] = budget
    nextData.savingsBalancePiastres += leftover
    nextData.savingsHistory.push({
      id: `daily-leftover-${date}`,
      date,
      amountPiastres: leftover,
      type: 'daily leftover',
    })
    nextData.lastClosedDate = date
  }

  return nextData
}

export function applyClosedDayAdjustment(data, { date, oldAmountPiastres = 0, newAmountPiastres = 0 }) {
  if (compareDates(date, data.lastClosedDate) > 0) return data

  const adjustment = oldAmountPiastres - newAmountPiastres
  if (adjustment === 0) return data

  const nextData = structuredClone(data)
  nextData.savingsBalancePiastres += adjustment
  nextData.savingsHistory ??= []
  nextData.savingsHistory.push({
    id: `adjustment-${date}-${nextData.savingsHistory.length + 1}`,
    date,
    amountPiastres: adjustment,
    type: 'adjustment',
  })
  return nextData
}
