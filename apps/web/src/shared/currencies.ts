import { currentLocale, type Locale } from './i18n'

/** ISO 3166-1 alpha-2: the 249 officially assigned country codes. Names come from Intl at display time. */
const countryCodes =
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(
    ' ',
  )

const countryLabel = (code: string, locale: Locale = currentLocale()) =>
  new Intl.DisplayNames([locale], { type: 'region' }).of(code.toUpperCase()) ?? code

export const countriesByLabel = (locale: Locale = currentLocale()) =>
  countryCodes
    .map((code) => ({ code, label: countryLabel(code, locale) }))
    .sort((a, b) => a.label.localeCompare(b.label, locale))

/**
 * The browser's country, or null when its language tag carries no real country.
 * `es-419` (Latin America) exposes the region group "419", which is not a country.
 */
export function browserCountry(): string | null {
  try {
    const region = new Intl.Locale(navigator.language).region
    return region && /^[A-Za-z]{2}$/.test(region) ? region.toUpperCase() : null
  } catch {
    return null
  }
}

const currencyCodes = () => Intl.supportedValuesOf('currency')

export const currencyLabel = (code: string, locale: Locale = currentLocale()) =>
  `${code} · ${new Intl.DisplayNames([locale], { type: 'currency' }).of(code) ?? code}`

export const currenciesByLabel = (locale: Locale = currentLocale()) =>
  currencyCodes()
    .map((code) => ({ code, label: currencyLabel(code, locale) }))
    .sort((a, b) => a.label.localeCompare(b.label, locale))
