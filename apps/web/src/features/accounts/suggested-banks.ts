/**
 * Bank suggestions per country, so the user does not have to type the name.
 * Only catalogs we are sure about; anywhere else the user types any name (design: extras for Colombia,
 * never a requirement).
 */
const banksByCountry: Record<string, string[]> = {
  CO: [
    'Bancolombia',
    'Davivienda',
    'Banco de Bogotá',
    'BBVA Colombia',
    'Banco de Occidente',
    'Banco Popular',
    'Scotiabank Colpatria',
    'Itaú Colombia',
    'Banco Caja Social',
    'Banco AV Villas',
    'Banco Agrario',
    'Banco Falabella',
    'Banco Pichincha',
    'Banco W',
    'Bancoomeva',
    'Banco Finandina',
    'Mibanco',
    'Nequi',
    'Daviplata',
    'Nu',
    'Lulo Bank',
    'Rappipay',
  ],
}

export const suggestedBanks = (country: string | null | undefined): string[] =>
  country ? (banksByCountry[country.toUpperCase()] ?? []) : []
