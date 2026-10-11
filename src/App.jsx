import { useEffect, useState } from 'react'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import './index.css'
import { compareDates, getCairoDate, getCairoTime, getWeekStart } from './logic/dates'
import { closeDays, getDailyBudget, getSpentForDate, getWeeklyBudgetSummary } from './logic/budget'
import { createExpense, deleteExpense, archiveCategory, updateExpense } from './logic/expenses'
import { formatMoney, isValidMoneyInput, parseMoneyToPiastres } from './logic/money'
import { clearData, exportData, loadData, parseImportedData, saveData } from './storage/dataStorage'
import { loadTheme, saveTheme } from './storage/themeStorage'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '⌂' },
  { to: '/history', label: 'History', icon: '↺' },
  { to: '/categories', label: 'Categories', icon: '◈' },
  { to: '/savings', label: 'Savings', icon: '▣' },
  { to: '/reports', label: 'Reports', icon: '▥' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

function useFinanceData() {
  const [data, setData] = useState(loadData)
  const updateData = (nextData) => { setData(nextData); saveData(nextData) }
  useEffect(() => {
    const closePassedDays = () => {
      const current = loadData()
      const closed = closeDays(current, getCairoDate())
      updateData(closed)
    }
    closePassedDays()
    const intervalId = window.setInterval(closePassedDays, 60_000)
    const handleVisibility = () => { if (document.visibilityState === 'visible') closePassedDays() }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])
  return [data, updateData]
}

function ExpenseForm({ data, expense, onClose, onSave }) {
  const activeCategories = data.categories.filter((category) => !category.archived)
  const [amount, setAmount] = useState(expense ? String(expense.amountPiastres / 100) : '')
  const [categoryId, setCategoryId] = useState(expense?.categoryId || activeCategories[0]?.id || '')
  const [date, setDate] = useState(expense?.date || getCairoDate())
  const [time, setTime] = useState(expense?.time || getCairoTime())
  const [note, setNote] = useState(expense?.note || '')
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    if (!isValidMoneyInput(amount)) {
      setError('Enter an amount greater than 0 with up to 2 decimals.')
      return
    }
    const nextExpense = {
      id: expense?.id || `expense-${Date.now()}`,
      amountPiastres: parseMoneyToPiastres(amount),
      categoryId,
      date,
      time,
      note: note.trim(),
    }
    onSave(nextExpense)
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal-card" onSubmit={submit}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Expense</p>
            <h2>{expense ? 'Edit expense' : 'Add expense'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <label className="field-label" htmlFor="amount">Amount</label>
        <div className="amount-input">
          <input id="amount" inputMode="decimal" autoFocus value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" />
          <span>EGP</span>
        </div>
        <label className="field-label">Category</label>
        <div className="chip-list">
          {activeCategories.map((category) => (
            <button key={category.id} type="button" className={categoryId === category.id ? 'category-chip selected' : 'category-chip'} onClick={() => setCategoryId(category.id)}>
              <span>{category.icon}</span> {category.name}
            </button>
          ))}
        </div>
        <div className="form-row">
          <div><label className="field-label" htmlFor="date">Date</label><input id="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
          <div><label className="field-label" htmlFor="time">Time</label><input id="time" type="time" value={time} onChange={(event) => setTime(event.target.value)} /></div>
        </div>
        <label className="field-label" htmlFor="note">Note <span className="optional">(optional)</span></label>
        <input id="note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="What was this for?" />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button full-button" type="submit">{expense ? 'Save changes' : 'Save expense'}</button>
      </form>
    </div>
  )
}

function ExpenseRow({ expense, category, onEdit, onDelete }) {
  return (
    <div className="expense-row">
      <span className="category-dot" style={{ backgroundColor: category?.color }}>{category?.icon || '✦'}</span>
      <div className="expense-details">
        <strong>{category?.name || 'Archived category'}</strong>
        {expense.note && <span>{expense.note}</span>}
      </div>
      <div className="expense-actions">
        <strong>{formatMoney(expense.amountPiastres)}</strong>
        <span>{expense.time}</span>
        <button type="button" onClick={() => onEdit(expense)}>Edit</button>
        <button type="button" onClick={() => onDelete(expense)}>Delete</button>
      </div>
    </div>
  )
}

function Dashboard({ data, updateData, onAddExpense }) {
  const today = getCairoDate()
  const expenses = data.expenses.filter((expense) => expense.date === today).sort((a, b) => b.time.localeCompare(a.time))
  const categoryMap = new Map(data.categories.map((category) => [category.id, category]))
  const dailyBudget = getDailyBudget(data, today)
  const spentToday = getSpentForDate(data, today)
  const weekly = getWeeklyBudgetSummary(data, today)
  const dailyRemaining = dailyBudget - spentToday
  const weeklyRemaining = weekly.budgetPiastres - weekly.spentPiastres
  const dailyProgress = dailyBudget > 0 ? Math.min((spentToday / dailyBudget) * 100, 100) : 0
  const weeklyProgress = weekly.budgetPiastres > 0 ? Math.min((weekly.spentPiastres / weekly.budgetPiastres) * 100, 100) : 0
  const budgetTone = (remaining, budget) => budget === 0 ? 'status-neutral' : remaining < 0 ? 'status-over' : remaining <= budget * 0.2 ? 'status-close' : 'status-good'
  return (
    <section className="page-shell">
      <div className="page-heading"><div><p className="eyebrow">{today}</p><h1>Good morning</h1></div></div>
      <div className="hero-card"><div><p className="card-label">Today&apos;s budget</p><strong>{formatMoney(dailyBudget)}</strong><p className="card-muted">{dailyBudget ? `${formatMoney(dailyRemaining)} remaining today` : 'Set a weekly budget in Settings'}</p></div><span className="hero-mark">EGP</span></div>
      <div className="budget-grid">
        <div className="budget-card"><div className="budget-card-heading"><p className="card-label">Today</p><strong className={budgetTone(dailyRemaining, dailyBudget)}>{formatMoney(spentToday)}</strong></div><p className={budgetTone(dailyRemaining, dailyBudget)}>{dailyBudget ? `${formatMoney(dailyRemaining)} remaining` : 'No daily budget set'}</p><div className="progress-track"><span className={budgetTone(dailyRemaining, dailyBudget)} style={{ width: `${dailyProgress}%` }} /></div></div>
        <div className="budget-card"><div className="budget-card-heading"><p className="card-label">This week</p><strong className={budgetTone(weeklyRemaining, weekly.budgetPiastres)}>{formatMoney(weekly.spentPiastres)}</strong></div><p className={budgetTone(weeklyRemaining, weekly.budgetPiastres)}>{weekly.budgetPiastres ? `${formatMoney(weeklyRemaining)} remaining` : 'No weekly budget set'}</p><div className="progress-track"><span className={budgetTone(weeklyRemaining, weekly.budgetPiastres)} style={{ width: `${weeklyProgress}%` }} /></div></div>
      </div>
      <div className="stat-card savings-card"><p className="card-label">Saved budget</p><strong className={data.savingsBalancePiastres < 0 ? 'status-over' : 'status-good'}>{formatMoney(data.savingsBalancePiastres)}</strong>{data.savingsBalancePiastres < 0 && <span className="status-over">Savings are below zero</span>}</div>
      <div className="section-heading"><h2>Today&apos;s expenses</h2><span>{expenses.length} items</span></div>
      {expenses.length ? <div className="expense-list">{expenses.map((expense) => <ExpenseRow key={expense.id} expense={expense} category={categoryMap.get(expense.categoryId)} onEdit={onAddExpense} onDelete={(item) => updateData(deleteExpense(data, item.id))} />)}</div> : <div className="empty-card"><span className="empty-icon">+</span><h2>No expenses yet today</h2><p>Add your first expense to start understanding your spending.</p></div>}
      <button className="primary-button floating-action" type="button" onClick={() => onAddExpense(null)}><span>+</span> Add expense</button>
    </section>
  )
}

function CategoriesPage({ data, updateData }) {
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#237a4b')
  const [icon, setIcon] = useState('✦')
  const visible = data.categories.filter((category) => !category.archived)
  function saveCategory(event) {
    event.preventDefault()
    if (!name.trim()) return
    const category = { id: editing?.id || `category-${Date.now()}`, name: name.trim(), color, icon, archived: false }
    const categories = editing ? data.categories.map((item) => item.id === editing.id ? category : item) : [...data.categories, category]
    updateData({ ...data, categories })
    setEditing(null); setName(''); setColor('#237a4b'); setIcon('✦')
  }
  function editCategory(category) { setEditing(category); setName(category.name); setColor(category.color); setIcon(category.icon) }
  return <section className="page-shell"><p className="eyebrow">Budget Tracker</p><h1>Categories</h1><form className="inline-form" onSubmit={saveCategory}><input aria-label="Category name" value={name} onChange={(event) => setName(event.target.value)} placeholder="New category name" /><input aria-label="Category icon" className="icon-input" value={icon} onChange={(event) => setIcon(event.target.value)} maxLength="2" /><input aria-label="Category color" type="color" value={color} onChange={(event) => setColor(event.target.value)} /><button className="primary-button" type="submit">{editing ? 'Save' : 'Add'}</button>{editing && <button className="text-button" type="button" onClick={() => { setEditing(null); setName('') }}>Cancel</button>}</form><div className="category-grid">{visible.map((category) => <div className="category-card" key={category.id}><span className="category-dot large" style={{ backgroundColor: category.color }}>{category.icon}</span><strong>{category.name}</strong><div><button className="text-button" type="button" onClick={() => editCategory(category)}>Edit</button><button className="text-button danger" type="button" onClick={() => updateData(archiveCategory(data, category.id))}>Delete</button></div></div>)}</div></section>
}

function HistoryPage({ data, updateData, onEdit }) {
  const [categoryId, setCategoryId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [search, setSearch] = useState('')
  const categoryMap = new Map(data.categories.map((category) => [category.id, category]))
  const expenses = data.expenses
    .filter((expense) => !categoryId || expense.categoryId === categoryId)
    .filter((expense) => !startDate || compareDates(expense.date, startDate) >= 0)
    .filter((expense) => !endDate || compareDates(expense.date, endDate) <= 0)
    .filter((expense) => !search || (expense.note || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))
  const groups = Object.entries(expenses.reduce((result, expense) => {
    result[expense.date] ??= []
    result[expense.date].push(expense)
    return result
  }, {}))

  return <section className="page-shell">
    <p className="eyebrow">Budget Tracker</p><h1>History</h1>
    <div className="filter-grid">
      <select aria-label="Filter by category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
        <option value="">All categories</option>
        {data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.archived ? ' (archived)' : ''}</option>)}
      </select>
      <input aria-label="Search notes" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes" />
      <input aria-label="Start date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
      <input aria-label="End date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
    </div>
    {groups.length ? <div className="history-groups">{groups.map(([date, items]) => <div className="history-group" key={date}><div className="section-heading"><h2>{date}</h2><span>{formatMoney(items.reduce((sum, expense) => sum + expense.amountPiastres, 0))}</span></div><div className="expense-list">{items.map((expense) => <ExpenseRow key={expense.id} expense={expense} category={categoryMap.get(expense.categoryId)} onEdit={onEdit} onDelete={(item) => updateData(deleteExpense(data, item.id))} />)}</div></div>)}</div> : <div className="empty-card"><span className="empty-icon">↺</span><h2>No matching expenses</h2><p>Try changing your filters or add a new expense.</p></div>}
  </section>
}

function SavingsPage({ data, updateData }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  function changeSavings(direction) {
    const amountPiastres = parseMoneyToPiastres(amount)
    if (!amountPiastres || amountPiastres <= 0) {
      setError('Enter an amount greater than 0 with up to 2 decimals.')
      return
    }
    const signedAmount = direction === 'add' ? amountPiastres : -amountPiastres
    const entry = { id: `manual-${Date.now()}`, date: getCairoDate(), amountPiastres: signedAmount, type: 'manual', note: note.trim() }
    updateData({ ...data, savingsBalancePiastres: data.savingsBalancePiastres + signedAmount, savingsHistory: [...data.savingsHistory, entry] })
    setAmount(''); setNote(''); setError('')
  }
  return <section className="page-shell">
    <p className="eyebrow">Budget Tracker</p><h1>Savings</h1>
    <div className="savings-total-card"><p className="card-label">Saved budget</p><strong className={data.savingsBalancePiastres < 0 ? 'status-over' : ''}>{formatMoney(data.savingsBalancePiastres)}</strong>{data.savingsBalancePiastres < 0 && <p className="status-over">Your savings are below zero. Reduce spending or add funds.</p>}</div>
    <div className="manual-savings-card"><h2>Manual adjustment</h2><p className="card-muted">Add money to savings or withdraw from it.</p><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount in EGP" aria-label="Savings amount" /><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note (optional)" aria-label="Savings note" /><div className="button-row"><button className="primary-button" type="button" onClick={() => changeSavings('add')}>Add money</button><button className="secondary-button" type="button" onClick={() => changeSavings('withdraw')}>Withdraw</button></div>{error && <p className="form-error" role="alert">{error}</p>}</div>
    <div className="section-heading"><h2>Savings history</h2><span>{data.savingsHistory.length} entries</span></div>
    {data.savingsHistory.length ? <div className="history-list">{[...data.savingsHistory].reverse().map((entry) => <div className="history-item" key={entry.id}><div><strong>{entry.type}</strong><span>{entry.date}{entry.note ? ` · ${entry.note}` : ''}</span></div><strong className={entry.amountPiastres < 0 ? 'status-over' : 'status-good'}>{entry.amountPiastres > 0 ? '+' : ''}{formatMoney(entry.amountPiastres)}</strong></div>)}</div> : <div className="empty-card"><span className="empty-icon">▣</span><h2>No savings history yet</h2><p>Daily leftovers and manual adjustments will appear here.</p></div>}
  </section>
}

const chartColors = ['#237a4b', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6']

function ReportsPage({ data }) {
  const [period, setPeriod] = useState('week')
  const today = getCairoDate()
  const startDate = period === 'week' ? getWeekStart(today) : `${today.slice(0, 7)}-01`
  const expenses = data.expenses.filter((expense) => compareDates(expense.date, startDate) >= 0 && compareDates(expense.date, today) <= 0)
  const categoryMap = new Map(data.categories.map((category) => [category.id, category]))
  const byCategory = Object.values(expenses.reduce((result, expense) => {
    const category = categoryMap.get(expense.categoryId)
    const key = category?.name || 'Archived category'
    result[key] ??= { name: key, amount: 0 }
    result[key].amount += expense.amountPiastres
    return result
  }, {}))
  const byDay = Object.values(expenses.reduce((result, expense) => {
    result[expense.date] ??= { date: expense.date.slice(5), amount: 0 }
    result[expense.date].amount += expense.amountPiastres
    return result
  }, {})).sort((a, b) => a.date.localeCompare(b.date))
  return <section className="page-shell">
    <p className="eyebrow">Budget Tracker</p><h1>Reports</h1>
    <div className="period-tabs"><button className={period === 'week' ? 'active' : ''} onClick={() => setPeriod('week')} type="button">This week</button><button className={period === 'month' ? 'active' : ''} onClick={() => setPeriod('month')} type="button">This month</button></div>
    <div className="report-grid"><div className="report-card"><h2>Spending by category</h2>{byCategory.length ? <ResponsiveContainer width="100%" height={280}><PieChart><Pie data={byCategory} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={95} label={({ name }) => name}>{byCategory.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip formatter={(value) => formatMoney(value)} /></PieChart></ResponsiveContainer> : <div className="chart-empty">No spending in this period.</div>}</div><div className="report-card"><h2>Spending per day</h2>{byDay.length ? <ResponsiveContainer width="100%" height={280}><BarChart data={byDay}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="date" /><YAxis tickFormatter={(value) => `${value / 100}`} /><Tooltip formatter={(value) => formatMoney(value)} /><Bar dataKey="amount" fill="#237a4b" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="chart-empty">No spending in this period.</div>}</div></div>
  </section>
}

function SettingsPage({ data, updateData, theme, onThemeChange }) {
  const [weeklyBudget, setWeeklyBudget] = useState(data.settings.weeklyBudgetPiastres ? String(data.settings.weeklyBudgetPiastres / 100) : '')
  const [manualDailyBudget, setManualDailyBudget] = useState(data.settings.manualDailyBudgetPiastres ? String(data.settings.manualDailyBudgetPiastres / 100) : '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function saveBudgetSettings(event) {
    event.preventDefault()
    const weekly = weeklyBudget === '' ? 0 : parseMoneyToPiastres(weeklyBudget)
    const manual = manualDailyBudget === '' ? 0 : parseMoneyToPiastres(manualDailyBudget)
    if (weekly === null || weekly < 0 || manual === null || manual < 0) {
      setError('Use valid EGP amounts with up to 2 decimals.')
      return
    }
    updateData({
      ...data,
      settings: {
        ...data.settings,
        weeklyBudgetPiastres: weekly,
        manualDailyBudgetPiastres: manual,
      },
    })
    setError('')
    setMessage('Budget settings saved.')
  }

  function downloadBackup() {
    const blob = new Blob([exportData(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `budget-tracker-${getCairoDate()}.json`
    link.click()
    URL.revokeObjectURL(url)
    setMessage('Data exported successfully.')
  }

  function importBackup(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        updateData(parseImportedData(String(reader.result)))
        setMessage('Data imported successfully.')
        setError('')
      } catch (importError) {
        setError(importError.message || 'Could not import this file.')
      }
      event.target.value = ''
    }
    reader.onerror = () => setError('Could not read this file.')
    reader.readAsText(file)
  }

  function resetAllData() {
    if (!window.confirm('Reset all Budget Tracker data? This cannot be undone.')) return
    clearData()
    updateData(loadData())
    setWeeklyBudget('')
    setManualDailyBudget('')
    setMessage('All data has been reset.')
    setError('')
  }

  return <section className="page-shell">
    <p className="eyebrow">Budget Tracker</p><h1>Settings</h1>
    <form className="settings-stack" onSubmit={saveBudgetSettings}>
      <div className="settings-card"><div className="settings-heading"><div><h2>Budget</h2><p>Set the weekly amount used by your dashboard.</p></div><span>EGP</span></div><label className="field-label" htmlFor="weekly-budget">Weekly budget</label><input id="weekly-budget" inputMode="decimal" value={weeklyBudget} onChange={(event) => setWeeklyBudget(event.target.value)} placeholder="0.00" /><label className="field-label" htmlFor="daily-mode">Daily budget mode</label><select id="daily-mode" value={data.settings.dailyBudgetMode} onChange={(event) => updateData({ ...data, settings: { ...data.settings, dailyBudgetMode: event.target.value } })}><option value="auto">Auto — weekly budget divided by 7</option><option value="manual">Manual daily amount</option></select>{data.settings.dailyBudgetMode === 'manual' && <><label className="field-label" htmlFor="manual-daily-budget">Manual daily budget</label><input id="manual-daily-budget" inputMode="decimal" value={manualDailyBudget} onChange={(event) => setManualDailyBudget(event.target.value)} placeholder="0.00" /></>}<button className="primary-button full-button" type="submit">Save budget settings</button></div>
      <div className="settings-card"><div className="settings-heading"><div><h2>Appearance</h2><p>Choose how Budget Tracker looks on this device.</p></div><span>◐</span></div><div className="theme-options">{['light', 'dark', 'system'].map((option) => <button key={option} type="button" className={theme === option ? 'theme-option selected' : 'theme-option'} onClick={() => onThemeChange(option)}><strong>{option[0].toUpperCase() + option.slice(1)}</strong><span>{option === 'system' ? 'Follow device' : `Use ${option} mode`}</span></button>)}</div></div>
      <div className="settings-card"><div className="settings-heading"><div><h2>Data</h2><p>Your data stays in this browser unless you export it.</p></div><span>⇅</span></div><div className="settings-actions"><button className="secondary-button" type="button" onClick={downloadBackup}>Export JSON</button><label className="secondary-button file-button">Import JSON<input type="file" accept="application/json,.json" onChange={importBackup} /></label><button className="danger-button" type="button" onClick={resetAllData}>Reset all data</button></div></div>
    </form>
    {message && <p className="success-message" role="status">{message}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>
}

function App() {
  const [theme, setTheme] = useState(loadTheme)
  const [data, updateData] = useFinanceData()
  const [editingExpense, setEditingExpense] = useState(undefined)
  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => { root.dataset.theme = theme === 'dark' || (theme === 'system' && media.matches) ? 'dark' : 'light' }
    applyTheme()
    saveTheme(theme)
    const handleSystemTheme = () => { if (theme === 'system') applyTheme() }
    media.addEventListener?.('change', handleSystemTheme)
    return () => media.removeEventListener?.('change', handleSystemTheme)
  }, [theme])
  function saveExpense(expense) { updateData(expense.id && data.expenses.some((item) => item.id === expense.id) ? updateExpense(data, expense) : createExpense(data, expense)); setEditingExpense(undefined) }
  function openExpense(expense) { setEditingExpense(expense || null) }

  return <div className="app-layout"><header className="topbar"><NavLink to="/" className="brand"><span className="brand-mark">₿</span><span>Budget Tracker</span></NavLink><button className="icon-button" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle light and dark theme">{theme === 'dark' ? '☀' : '☾'}</button></header><main><Routes><Route path="/" element={<Dashboard data={data} updateData={updateData} onAddExpense={openExpense} />} /><Route path="/categories" element={<CategoriesPage data={data} updateData={updateData} />} /><Route path="/history" element={<HistoryPage data={data} updateData={updateData} onEdit={openExpense} />} /><Route path="/savings" element={<SavingsPage data={data} updateData={updateData} />} /><Route path="/reports" element={<ReportsPage data={data} />} /><Route path="/settings" element={<SettingsPage data={data} updateData={updateData} theme={theme} onThemeChange={setTheme} />} /></Routes></main><nav className="bottom-nav" aria-label="Main navigation">{navItems.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}><span>{item.icon}</span><small>{item.label}</small></NavLink>)}</nav>{editingExpense !== undefined && <ExpenseForm data={data} expense={editingExpense} onClose={() => setEditingExpense(undefined)} onSave={saveExpense} />}</div>
}

export default function RoutedApp() {
  return <BrowserRouter><App /></BrowserRouter>
}
