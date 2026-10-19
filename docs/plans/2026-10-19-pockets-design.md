# Pockets (bolsillos)

Date: 2026-10-19. Status: approved.

## Problem

Colombian accounts let people set money aside inside one account ("home services", "transport"). For the bank it is a virtual split of the same account, but each pocket can earn its own effective annual rate (E.A.), and interest is paid daily or monthly. DQFinance had no way to say that.

## Decision (D14)

A **pocket** is a product with `type = 'pocket'` and a `parent_product_id`: the product it sets money aside from.

- Its balance is computed like any product (D1). Money is in the parent or in the pocket, never both, so net worth is unchanged.
- It has its own `annual_rate_bps`, independent of the parent.
- Moving money between a parent and its pocket is a transfer (`own_same_bank`), never income or expense (D3).
- Rules: the parent must be a non-pocket product of the same user, the same bank account and the same currency. One level only. A product with `parent_product_id` must be a pocket and a pocket must have a parent. Cards cannot belong to a pocket. A product that has pockets cannot be turned into a pocket, and a pocket's type cannot change.

Every product also gets `yield_payout` (`daily` | `monthly`, nullable): how often its interest is paid. The E.A. is the same either way; the yield estimate shows the one figure that matches the payout (both when unset). Interest is still recorded by the user (or an agent) as income or an adjustment; nothing is booked automatically.

## API

- `product.parent_product_id` (nullable, references `product`, restrict) and `product.yield_payout` (nullable enum). `PRODUCT_TYPES` gains `pocket`. One migration.
- `create_product` / `POST /api/accounts/products` and `update_product` / `PATCH` accept `parentProductId` (create only) and `yieldPayout`, and enforce the rules above with typed errors.
- `create_card` rejects a pocket.
- `GET /api/accounts` returns `parentProductId` and `yieldPayout` on each product, and nests pockets under their parent as `pockets` (a pocket is not repeated in its bank account's `products`).
- Balances view: products carry `yieldPayout`; the estimate keeps `{ monthly, daily }`.

## Web

- Accounts page: pockets nested with `↳` under their parent, with a `Pocket` tag, and `rate % E.A. · daily/monthly` when rated. A parent with pockets shows "Total with pockets" in mono under its balance. Each product row has one "Add ▾" menu (Card, Pocket) instead of the card link; a pocket row has no actions.
- New pocket page `/accounts/new-pocket?productId=`: "How much do you set aside now?" (large, optional, in the parent's currency, recorded as a transfer parent → pocket), name, annual rate with Daily / Monthly chips shown once a rate is typed. Then the pocket's detail opens.
- Source page of a pocket: a "Move money" block with "Set aside more" (parent → pocket) and "Return to {parent}" (pocket → parent), opening the transfer dialog prefilled. The yield block shows only the estimate that matches `yieldPayout` ("pays every day ≈ X").
- Product edit: Daily / Monthly chips next to the rate.

## Not built

- Booking interest automatically.
- Pockets of cash wallets, nested pockets, savings goals or targets per pocket.
