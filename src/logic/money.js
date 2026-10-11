export function parseMoneyToPiastres(value) {
  const text = String(value).trim()
  if (!/^\d+(?:\.\d{0,2})?$/.test(text)) return null

  const [pounds, decimals = ''] = text.split('.')
  return Number(pounds) * 100 + Number(decimals.padEnd(2, '0'))
}

export function formatMoney(piastres) {
  const value = Number(piastres) || 0
  const sign = value < 0 ? '-' : ''
  const absolute = Math.abs(value)
  const pounds = Math.floor(absolute / 100)
  const decimals = String(absolute % 100).padStart(2, '0')
  return `${sign}${pounds.toLocaleString('en-US')}.${decimals} EGP`
}

export function isValidMoneyInput(value) {
  const piastres = parseMoneyToPiastres(value)
  return piastres !== null && piastres > 0
}
