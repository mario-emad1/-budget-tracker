const CAIRO_TIME_ZONE = 'Africa/Cairo'
const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: CAIRO_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function getCairoDate(date = new Date()) {
  const parts = DATE_FORMATTER.formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function getCairoTime(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: CAIRO_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function dateToDayNumber(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000)
}

function dayNumberToDate(dayNumber) {
  const date = new Date(dayNumber * 86400000)
  return date.toISOString().slice(0, 10)
}

export function addDays(dateString, days) {
  return dayNumberToDate(dateToDayNumber(dateString) + days)
}

export function compareDates(first, second) {
  return dateToDayNumber(first) - dateToDayNumber(second)
}

export function getWeekStart(dateString) {
  const day = new Date(`${dateString}T12:00:00Z`).getUTCDay()
  return addDays(dateString, -(day + 1) % 7)
}

export function getWeekEnd(dateString) {
  return addDays(getWeekStart(dateString), 6)
}
