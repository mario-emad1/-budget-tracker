import { applyClosedDayAdjustment } from './budget'
import { compareDates } from './dates'

export function createExpense(data, expense) {
  const nextData = structuredClone(data)
  nextData.expenses.push(expense)
  return applyClosedDayAdjustment(nextData, {
    date: expense.date,
    newAmountPiastres: expense.amountPiastres,
  })
}

export function updateExpense(data, updatedExpense) {
  const existing = data.expenses.find((expense) => expense.id === updatedExpense.id)
  if (!existing) return data

  const nextData = structuredClone(data)
  nextData.expenses = nextData.expenses.map((expense) => (
    expense.id === updatedExpense.id ? updatedExpense : expense
  ))
  let adjusted = applyClosedDayAdjustment(nextData, {
    date: existing.date,
    oldAmountPiastres: existing.amountPiastres,
    newAmountPiastres: existing.date === updatedExpense.date ? updatedExpense.amountPiastres : 0,
  })
  if (existing.date !== updatedExpense.date && compareDates(updatedExpense.date, data.lastClosedDate) <= 0) {
    adjusted = applyClosedDayAdjustment(adjusted, {
      date: updatedExpense.date,
      newAmountPiastres: updatedExpense.amountPiastres,
    })
  }
  return adjusted
}

export function deleteExpense(data, expenseId) {
  const expense = data.expenses.find((item) => item.id === expenseId)
  if (!expense) return data
  const nextData = structuredClone(data)
  nextData.expenses = nextData.expenses.filter((item) => item.id !== expenseId)
  return applyClosedDayAdjustment(nextData, {
    date: expense.date,
    oldAmountPiastres: expense.amountPiastres,
  })
}

export function archiveCategory(data, categoryId) {
  const nextData = structuredClone(data)
  nextData.categories = nextData.categories.map((category) => (
    category.id === categoryId ? { ...category, archived: true } : category
  ))
  return nextData
}
