export type PhoneCountry = {
  name: string
  iso2: string
  dial: string
  groups: number[]
  min: number
  max: number
  placeholder: string
}

const GENERIC: Pick<PhoneCountry, "groups" | "min" | "max" | "placeholder"> = {
  groups: [3, 3, 4],
  min: 7,
  max: 15,
  placeholder: "555 123 4567",
}

function country(
  name: string,
  iso2: string,
  dial: string,
  extra?: Partial<Pick<PhoneCountry, "groups" | "min" | "max" | "placeholder">>
): PhoneCountry {
  return { name, iso2, dial, ...GENERIC, ...extra }
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  country("Afghanistan", "AF", "93", { groups: [2, 3, 4], min: 9, max: 9, placeholder: "70 123 4567" }),
  country("Algeria", "DZ", "213", { groups: [3, 2, 2, 2], min: 9, max: 9, placeholder: "551 23 45 67" }),
  country("Argentina", "AR", "54", { groups: [2, 4, 4], min: 10, max: 10, placeholder: "11 2345 6789" }),
  country("Australia", "AU", "61", { groups: [3, 3, 3], min: 9, max: 9, placeholder: "412 345 678" }),
  country("Austria", "AT", "43", { groups: [3, 3, 4], min: 10, max: 11, placeholder: "664 123 4567" }),
  country("Bahrain", "BH", "973", { groups: [4, 4], min: 8, max: 8, placeholder: "3600 1234" }),
  country("Bangladesh", "BD", "880", { groups: [4, 6], min: 10, max: 10, placeholder: "1711 234567" }),
  country("Belgium", "BE", "32", { groups: [3, 2, 2, 2], min: 9, max: 9, placeholder: "470 12 34 56" }),
  country("Brazil", "BR", "55", { groups: [2, 5, 4], min: 10, max: 11, placeholder: "11 91234 5678" }),
  country("Canada", "CA", "1", { groups: [3, 3, 4], min: 10, max: 10, placeholder: "416 555 1234" }),
  country("China", "CN", "86", { groups: [3, 4, 4], min: 11, max: 11, placeholder: "131 2345 6789" }),
  country("Denmark", "DK", "45", { groups: [2, 2, 2, 2], min: 8, max: 8, placeholder: "20 12 34 56" }),
  country("Egypt", "EG", "20", { groups: [3, 3, 4], min: 10, max: 10, placeholder: "100 123 4567" }),
  country("Finland", "FI", "358", { groups: [2, 3, 4], min: 9, max: 10, placeholder: "40 123 4567" }),
  country("France", "FR", "33", { groups: [1, 2, 2, 2, 2], min: 9, max: 9, placeholder: "6 12 34 56 78" }),
  country("Germany", "DE", "49", { groups: [3, 4, 4], min: 10, max: 11, placeholder: "151 234 5678" }),
  country("Ghana", "GH", "233", { groups: [2, 3, 4], min: 9, max: 9, placeholder: "24 123 4567" }),
  country("India", "IN", "91", { groups: [5, 5], min: 10, max: 10, placeholder: "98765 43210" }),
  country("Indonesia", "ID", "62", { groups: [3, 4, 4], min: 10, max: 12, placeholder: "812 3456 7890" }),
  country("Ireland", "IE", "353", { groups: [2, 3, 4], min: 9, max: 9, placeholder: "85 123 4567" }),
  country("Italy", "IT", "39", { groups: [3, 3, 4], min: 9, max: 10, placeholder: "312 345 6789" }),
  country("Japan", "JP", "81", { groups: [2, 4, 4], min: 10, max: 10, placeholder: "90 1234 5678" }),
  country("Jordan", "JO", "962", { groups: [2, 3, 4], min: 9, max: 9, placeholder: "79 123 4567" }),
  country("Kenya", "KE", "254", { groups: [3, 3, 3], min: 9, max: 9, placeholder: "712 123 456" }),
  country("Kuwait", "KW", "965", { groups: [4, 4], min: 8, max: 8, placeholder: "5000 1234" }),
  country("Lebanon", "LB", "961", { groups: [2, 3, 3], min: 8, max: 8, placeholder: "71 123 456" }),
  country("Malaysia", "MY", "60", { groups: [2, 3, 4], min: 9, max: 10, placeholder: "12 345 6789" }),
  country("Mexico", "MX", "52", { groups: [2, 4, 4], min: 10, max: 10, placeholder: "55 1234 5678" }),
  country("Morocco", "MA", "212", { groups: [3, 2, 2, 2], min: 9, max: 9, placeholder: "612 34 56 78" }),
  country("Netherlands", "NL", "31", { groups: [1, 4, 4], min: 9, max: 9, placeholder: "6 1234 5678" }),
  country("New Zealand", "NZ", "64", { groups: [2, 3, 4], min: 8, max: 10, placeholder: "21 123 4567" }),
  country("Nigeria", "NG", "234", { groups: [3, 3, 4], min: 10, max: 10, placeholder: "802 123 4567" }),
  country("Norway", "NO", "47", { groups: [3, 2, 3], min: 8, max: 8, placeholder: "406 12 345" }),
  country("Oman", "OM", "968", { groups: [4, 4], min: 8, max: 8, placeholder: "9212 3456" }),
  country("Pakistan", "PK", "92", { groups: [3, 7], min: 10, max: 10, placeholder: "300 1234567" }),
  country("Philippines", "PH", "63", { groups: [3, 3, 4], min: 10, max: 10, placeholder: "917 123 4567" }),
  country("Poland", "PL", "48", { groups: [3, 3, 3], min: 9, max: 9, placeholder: "512 345 678" }),
  country("Portugal", "PT", "351", { groups: [3, 3, 3], min: 9, max: 9, placeholder: "912 345 678" }),
  country("Qatar", "QA", "974", { groups: [4, 4], min: 8, max: 8, placeholder: "3312 3456" }),
  country("Saudi Arabia", "SA", "966", { groups: [2, 3, 4], min: 9, max: 9, placeholder: "50 123 4567" }),
  country("Singapore", "SG", "65", { groups: [4, 4], min: 8, max: 8, placeholder: "8123 4567" }),
  country("South Africa", "ZA", "27", { groups: [2, 3, 4], min: 9, max: 9, placeholder: "82 123 4567" }),
  country("South Korea", "KR", "82", { groups: [2, 4, 4], min: 9, max: 10, placeholder: "10 1234 5678" }),
  country("Spain", "ES", "34", { groups: [3, 3, 3], min: 9, max: 9, placeholder: "612 345 678" }),
  country("Sri Lanka", "LK", "94", { groups: [2, 3, 4], min: 9, max: 9, placeholder: "71 123 4567" }),
  country("Sweden", "SE", "46", { groups: [2, 3, 4], min: 9, max: 9, placeholder: "70 123 4567" }),
  country("Switzerland", "CH", "41", { groups: [2, 3, 2, 2], min: 9, max: 9, placeholder: "78 123 45 67" }),
  country("Thailand", "TH", "66", { groups: [2, 3, 4], min: 9, max: 9, placeholder: "81 234 5678" }),
  country("Turkey", "TR", "90", { groups: [3, 3, 4], min: 10, max: 10, placeholder: "532 123 4567" }),
  country("United Arab Emirates", "AE", "971", { groups: [2, 3, 4], min: 9, max: 9, placeholder: "50 123 4567" }),
  country("United Kingdom", "GB", "44", { groups: [4, 6], min: 10, max: 10, placeholder: "7700 900123" }),
  country("United States", "US", "1", { groups: [3, 3, 4], min: 10, max: 10, placeholder: "415 555 1234" }),
  country("Vietnam", "VN", "84", { groups: [2, 3, 4], min: 9, max: 10, placeholder: "91 234 5678" }),
]

const BY_NAME = new Map(PHONE_COUNTRIES.map((item) => [item.name, item]))

const FALLBACK: PhoneCountry = {
  name: "Other",
  iso2: "",
  dial: "",
  ...GENERIC,
}

export function phoneCountryOption(name: string): PhoneCountry {
  return BY_NAME.get(name) ?? FALLBACK
}

export function isPhoneCountry(name: string): boolean {
  return BY_NAME.has(name)
}

export function phoneProfile(country: string) {
  return phoneCountryOption(country)
}

export function flagEmoji(iso2: string) {
  if (!iso2 || iso2.length !== 2) return ""
  return iso2
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

export function dialPrefix(country: string) {
  const dial = phoneCountryOption(country).dial
  return dial ? `+${dial}` : "+"
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "")
}

function applyGroups(digits: string, groups: number[]) {
  const parts: string[] = []
  let offset = 0
  for (const size of groups) {
    if (offset >= digits.length) break
    parts.push(digits.slice(offset, offset + size))
    offset += size
  }
  if (offset < digits.length) parts.push(digits.slice(offset))
  return parts.filter(Boolean).join(" ")
}

export function nationalDigits(country: string, raw: string) {
  const profile = phoneCountryOption(country)
  let digits = onlyDigits(raw)
  if (profile.dial && digits.startsWith(profile.dial)) {
    digits = digits.slice(profile.dial.length)
  }
  if (digits.startsWith("0")) digits = digits.slice(1)
  return digits.slice(0, profile.max)
}

export function formatNationalNumber(country: string, raw: string) {
  const profile = phoneCountryOption(country)
  return applyGroups(nationalDigits(country, raw), profile.groups)
}

export function formatInternationalNumber(country: string, raw: string) {
  const national = formatNationalNumber(country, raw)
  const prefix = dialPrefix(country)
  if (!national) return prefix
  return prefix === "+" ? `+${national.replace(/\s/g, "")}` : `${prefix} ${national}`
}

export function validateSignupPhone(country: string, raw: string): "required" | "invalid" | null {
  if (!country) return "required"
  const profile = phoneCountryOption(country)
  const digits = nationalDigits(country, raw)
  if (!digits) return "required"
  if (digits.length < profile.min) return "invalid"
  return null
}
