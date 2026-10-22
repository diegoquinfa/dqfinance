/**
 * Whether a bill's due date may be marked as announced. Only a bill every active hook received is
 * marked: with no active hook, with every call failed, or with some call failed, marking it would
 * exclude that due date from the check forever and the reminder would never reach the hook that
 * failed. With no hook nothing is marked, so the bill fires once a hook exists.
 *
 * The next check retries the whole bill, including the hooks that did succeed. That repeats the
 * delivery, not the event: `X-DQFinance-Delivery` carries the same id (`billDeliveryId`), so a
 * receiver that dedups drops the second copy.
 */
export const isAnnounced = (received: number, hooks: number): boolean => hooks > 0 && received === hooks
