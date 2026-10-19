import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InferRequestType, InferResponseType } from 'hono/client'
import { api, unwrap } from '#/shared/api'

export type AccountsTree = InferResponseType<typeof api.api.accounts.$get, 200>

export const accountsQuery = queryOptions({
  queryKey: ['accounts'],
  queryFn: async () => unwrap(api.api.accounts.$get()),
})

export function useAccounts() {
  return useQuery(accountsQuery)
}

/** Every create invalidates both the tree and the balances that are computed from it. */
function useAccountMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
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
export type CardInput = InferRequestType<typeof api.api.accounts.cards.$post>['json']
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
