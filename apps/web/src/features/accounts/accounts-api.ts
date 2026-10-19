import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InferRequestType, InferResponseType } from 'hono/client'
import { api, unwrap } from '#/shared/api'

export type AccountsTree = InferResponseType<typeof api.api.accounts.$get, 200>

type Bank = AccountsTree['banks'][number]
type Account = Bank['accounts'][number]
type ProductRow = Account['products'][number]
export type CardRow = ProductRow['cards'][number]

export const accountsQuery = queryOptions({
  queryKey: ['accounts'],
  queryFn: async () => unwrap(api.api.accounts.$get()),
})

export function useAccounts() {
  return useQuery(accountsQuery)
}

/** Every create invalidates both the tree and the balances that are computed from it. */
function useAccountMutation<TVariables, TResult = unknown>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountsQuery.queryKey })
      void queryClient.invalidateQueries({ queryKey: ['balances'] })
    },
  })
}

export type BankInput = InferRequestType<typeof api.api.accounts.banks.$post>['json']
export type BankAccountInput = InferRequestType<typeof api.api.accounts['bank-accounts']['$post']>['json']
export type ProductInput = InferRequestType<typeof api.api.accounts.products.$post>['json']
export type ProductPatch = InferRequestType<(typeof api.api.accounts.products)[':id']['$patch']>['json']
export type CardInput = InferRequestType<typeof api.api.accounts.cards.$post>['json']
export type CardPatch = InferRequestType<(typeof api.api.accounts.cards)[':id']['$patch']>['json']
export type CashWalletInput = InferRequestType<typeof api.api.accounts['cash-wallets']['$post']>['json']
export type AdjustBalanceInput = InferRequestType<typeof api.api['balance-adjustments']['$post']>['json']

export const useCreateBank = () => useAccountMutation((json: BankInput) => unwrap(api.api.accounts.banks.$post({ json })))
export const useCreateBankAccount = () =>
  useAccountMutation((json: BankAccountInput) => unwrap(api.api.accounts['bank-accounts'].$post({ json })))
export const useCreateProduct = () =>
  useAccountMutation((json: ProductInput) => unwrap(api.api.accounts.products.$post({ json })))
export const useCreateCard = () => useAccountMutation((json: CardInput) => unwrap(api.api.accounts.cards.$post({ json })))
export const useCreateCashWallet = () =>
  useAccountMutation((json: CashWalletInput) => unwrap(api.api.accounts['cash-wallets'].$post({ json })))

/** "Edit balance": records the difference, never rewrites movements. */
export const useAdjustBalance = () =>
  useAccountMutation((json: AdjustBalanceInput) => unwrap(api.api['balance-adjustments'].$post({ json })))

/** Renaming a product, changing its type, or setting its annual rate (null clears it). */
export const useUpdateProduct = () =>
  useAccountMutation(({ id, json }: { id: string; json: ProductPatch }) =>
    unwrap(api.api.accounts.products[':id'].$patch({ param: { id }, json })),
  )

/** A card's brand, rate, color and the rest of what it carries. */
export const useUpdateCard = () =>
  useAccountMutation(({ id, json }: { id: string; json: CardPatch }) =>
    unwrap(api.api.accounts.cards[':id'].$patch({ param: { id }, json })),
  )

/** A product with the bank account that owns it: the tree hides that level and a pocket under its parent. */
type ProductInfo = {
  id: string
  type: string
  name: string
  currency: string
  annualRateBps: number | null
  parentProductId: string | null
  yieldPayout: 'daily' | 'monthly' | null
  bankAccountId: string
  last4: string | null
}

const productInfo = (
  product: Omit<ProductInfo, 'bankAccountId' | 'last4'>,
  account: { id: string; last4: string | null },
): ProductInfo => ({ ...product, bankAccountId: account.id, last4: account.last4 })

/** Every product of the user, pockets included: the tree keeps a pocket under its parent (design D14). */
export const listProducts = (tree: AccountsTree | undefined): ProductInfo[] =>
  tree?.banks.flatMap((bank) =>
    bank.accounts.flatMap((account) => [
      ...account.products.map((product) => productInfo(product, account)),
      ...account.products.flatMap((parent) => parent.pockets.map((pocket) => productInfo(pocket, account))),
    ]),
  ) ?? []

/** The product behind a source page: the type and rate the balances view does not carry. */
export const findProduct = (tree: AccountsTree | undefined, id: string) =>
  listProducts(tree).find((product) => product.id === id)

/** The card behind a source page: brand, color and last 4, which balances does not carry. */
export const findCard = (tree: AccountsTree | undefined, id: string) =>
  tree?.banks
    .flatMap((bank) => bank.accounts)
    .flatMap((account) => account.products)
    .flatMap((product) => product.cards)
    .find((card) => card.id === id)
