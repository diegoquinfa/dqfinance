/**
 * Whether a bill's due date may be marked as announced. Only a bill at least one hook received is
 * marked: with no active hook, or with every call failed, marking it would exclude that due date
 * from the check forever and the reminder would be lost.
 */
export const isAnnounced = (received: number): boolean => received > 0
