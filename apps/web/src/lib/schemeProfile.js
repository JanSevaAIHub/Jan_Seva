// Optional input fields correspond to the backend's documented rule profile.
export const profileNumbers = [
  { key: 'age', label: 'Age', max: 150, integer: true },
  { key: 'monthly_income', label: 'Monthly income (INR)' },
  { key: 'annual_income', label: 'Annual income (INR)' },
  { key: 'disability_percent', label: 'Disability percentage', max: 100 },
]
export const profileConditions = [
  ['participating_account', 'Participating bank or post-office account'], ['auto_debit_consent', 'Auto-debit consent'],
  ['bpl_household', 'Below-poverty-line household'], ['widow', 'Widow status'],
  ['unorganised_worker', 'Unorganised worker'], ['epf_esic_nps', 'EPF, ESIC or NPS coverage'],
  ['income_taxpayer', 'Income taxpayer'], ['other_government_pension', 'Other government pension'],
]
export const fieldName = key => [...profileNumbers.map(f => [f.key, f.label]), ...profileConditions,
  ['state', 'State'], ['occupation', 'Occupation']].find(([name]) => name === key)?.[1] || key.replaceAll('_', ' ')

function number(value, field) {
  const parsed = Number(value)
  if (!String(value).trim() || !Number.isFinite(parsed) || parsed < 0 ||
      (field.max != null && parsed > field.max) || (field.integer && !Number.isInteger(parsed))) {
    throw new Error(`${field.label} must be ${field.integer ? 'a whole number' : 'a number'} from 0${field.max != null ? ` to ${field.max}` : ' or more'}.`)
  }
  return parsed
}

export function parseProfileDraft(draft) {
  const result = {}
  for (const key of ['state', 'occupation']) {
    const value = (draft[key] || '').trim()
    if (value && (value.length < 2 || value.length > 100)) throw new Error(`${fieldName(key)} must contain 2–100 characters.`)
    if (value) result[key] = value
  }
  for (const field of profileNumbers) {
    if (draft[`${field.key}_mode`] === 'range' && field.key !== 'disability_percent') {
      const min = draft[`${field.key}_min`] ?? '', max = draft[`${field.key}_max`] ?? ''
      if (min === '' && max === '') continue
      const range = { min: number(min, field), max: number(max, field) }
      if (range.min > range.max) throw new Error(`${field.label} minimum must not exceed its maximum.`)
      result[`${field.key}_range`] = range
    } else if (draft[field.key] !== '' && draft[field.key] != null) result[field.key] = number(draft[field.key], field)
  }
  for (const [key] of profileConditions) {
    if (draft[key] === 'true' || draft[key] === true) result[key] = true
    else if (draft[key] === 'false' || draft[key] === false) result[key] = false
    else if (draft[key] != null && draft[key] !== '') throw new Error(`Choose Yes, No or Unknown for ${fieldName(key)}.`)
  }
  return result
}

export function profileDraft(profile) {
  const result = Object.fromEntries(Object.entries(profile).filter(([, value]) => value != null).map(([key, value]) => [key, String(value)]))
  for (const { key } of profileNumbers) {
    const range = profile[`${key}_range`]
    if (range) Object.assign(result, { [`${key}_mode`]: 'range', [`${key}_min`]: String(range.min), [`${key}_max`]: String(range.max) })
  }
  return result
}
