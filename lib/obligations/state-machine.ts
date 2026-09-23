import type { Cents } from "@/lib/money/cents";
import type { ObligationStatus } from "@/lib/types/domain";

export type ObligationTransition =
  | { type: "payment"; amountCents: Cents }
  | { type: "refund_return"; amountCents: Cents }
  | { type: "cancel" }
  | { type: "waive" };

export interface ObligationState {
  amountCents: Cents;
  remainingOpenCents: Cents;
  status: ObligationStatus;
}

/**
 * Apply a ledger-linked transition to an obligation without double-counting.
 * Payments reduce remaining; refunds reopen remaining up to original amount.
 */
export function applyObligationTransition(
  state: ObligationState,
  transition: ObligationTransition,
): ObligationState {
  if (state.status === "cancelled" || state.status === "waived") {
    return state;
  }

  if (transition.type === "cancel") {
    return { ...state, remainingOpenCents: 0, status: "cancelled" };
  }
  if (transition.type === "waive") {
    return { ...state, remainingOpenCents: 0, status: "waived" };
  }

  const amount = Math.abs(transition.amountCents);

  if (transition.type === "payment") {
    const remaining = Math.max(0, state.remainingOpenCents - amount);
    let status: ObligationStatus;
    if (remaining === 0) status = "settled";
    else if (remaining < state.amountCents) status = "partially_paid";
    else status = state.status === "returned_open" ? "returned_open" : "due";
    return { ...state, remainingOpenCents: remaining, status };
  }

  // refund_return: reopen obligation; does NOT cancel the debt
  const remaining = Math.min(
    state.amountCents,
    state.remainingOpenCents + amount,
  );
  return {
    ...state,
    remainingOpenCents: remaining,
    status: remaining === 0 ? "settled" : "returned_open",
  };
}
