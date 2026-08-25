import { useCallback, useEffect, useRef, useState } from "react";
import { createOrder, watchOrderSyncStatus, type OrderItem } from "@kumbakonam/shared";
import type { UseCartResult } from "./useCart";
import type { BillInput } from "../printing/escpos";

export interface UseOrderSubmitResult {
  submit: () => Promise<void>;
  submitting: boolean;
  error: string | null;
  successMessage: string | null;
  /** Order ids written locally but not yet confirmed by the server — drives the sync badge. */
  pendingCount: number;
}

const SUCCESS_MESSAGE_MS = 3000;

export function useOrderSubmit(
  cart: UseCartResult,
  workerId: string,
  workerName: string,
  onSaved: (bill: BillInput) => void,
): UseOrderSubmitResult {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingOrderIds, setPendingOrderIds] = useState<string[]>([]);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
  }, []);

  const submit = useCallback(async () => {
    if (cart.isEmpty) {
      setError("Add at least one item first.");
      return;
    }
    if (!cart.paymentMethod) {
      setError("Select a payment method.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const items: OrderItem[] = cart.lines.map((l) => ({
        itemId: l.itemId,
        name: l.name,
        price: l.price,
        qty: l.qty,
        ...(l.note.trim() ? { note: l.note.trim() } : {}),
      }));

      const { orderId } = await createOrder({
        items,
        subtotal: cart.subtotal,
        discount: cart.discountAmount,
        total: cart.total,
        paymentMethod: cart.paymentMethod,
        workerId,
      });

      setPendingOrderIds((ids) => [...ids, orderId]);
      const unsubscribe = watchOrderSyncStatus(orderId, (isPending) => {
        if (!isPending) {
          setPendingOrderIds((ids) => ids.filter((id) => id !== orderId));
          unsubscribe();
        }
      });

      onSaved({
        orderId,
        cafeName: "Kumbakonam Cafe",
        items: cart.lines.map((l) => ({ name: l.name, qty: l.qty, price: l.price, note: l.note.trim() || undefined })),
        subtotal: cart.subtotal,
        discount: cart.discountAmount,
        total: cart.total,
        paymentMethod: cart.paymentMethod,
        workerName,
        createdAt: new Date(),
      });

      cart.clearCart();
      setSuccessMessage("Order saved.");
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccessMessage(null), SUCCESS_MESSAGE_MS);
    } catch (err) {
      console.error("Order submission failed", err);
      setError("Could not save the order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [cart, workerId, workerName, onSaved]);

  return { submit, submitting, error, successMessage, pendingCount: pendingOrderIds.length };
}
