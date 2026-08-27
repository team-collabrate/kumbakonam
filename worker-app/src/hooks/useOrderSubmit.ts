import { useCallback, useEffect, useRef, useState } from "react";
import { createOrder, useLanguage, watchOrderSyncStatus, type OrderItem } from "@kumbakonam/shared";
import type { UseCartResult } from "./useCart";
import { billNoFromOrderId, paymentLabelForReceipt, type BillInput } from "../printing/receipt";

export interface UseOrderSubmitResult {
  submit: () => Promise<void>;
  submitting: boolean;
  error: string | null;
  successMessage: string | null;
  /** Order ids written locally but not yet confirmed by the server — drives the sync badge. */
  pendingCount: number;
}

const SUCCESS_MESSAGE_MS = 3000;

const MESSAGES = {
  needItem: { en: "Add at least one item first.", ta: "முதலில் ஒரு பொருளையாவது சேர்க்கவும்." },
  needPayment: { en: "Select a payment method.", ta: "பணம் செலுத்தும் முறையைத் தேர்ந்தெடுக்கவும்." },
  saveFailed: { en: "Could not save the order. Please try again.", ta: "ஆர்டரை சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்." },
  saved: { en: "Order saved.", ta: "ஆர்டர் சேமிக்கப்பட்டது." },
};

export function useOrderSubmit(
  cart: UseCartResult,
  workerId: string,
  workerName: string,
  onSaved: (bill: BillInput) => void,
): UseOrderSubmitResult {
  const { language } = useLanguage();
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
      setError(MESSAGES.needItem[language]);
      return;
    }
    if (!cart.paymentMethod) {
      setError(MESSAGES.needPayment[language]);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const items: OrderItem[] = cart.lines.map((l) => ({
        itemId: l.itemId,
        name: l.name,
        ...(l.nameTa ? { nameTa: l.nameTa } : {}),
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
      const unsubscribe = watchOrderSyncStatus(
        orderId,
        (isPending) => {
          if (!isPending) {
            setPendingOrderIds((ids) => ids.filter((id) => id !== orderId));
            unsubscribe();
          }
        },
        (err) => {
          // Can't confirm sync state for this order anymore — stop tracking
          // it as pending rather than leaving the badge stuck forever.
          console.error("Order sync watch failed", err);
          setPendingOrderIds((ids) => ids.filter((id) => id !== orderId));
        },
      );

      onSaved({
        orderId,
        billNo: billNoFromOrderId(orderId),
        // The receipt prints in Tamil regardless of the app's language, so it
        // takes nameTa when the item has one.
        items: cart.lines.map((l) => ({
          name: l.nameTa || l.name,
          qty: l.qty,
          price: l.price,
          note: l.note.trim() || undefined,
        })),
        subtotal: cart.subtotal,
        discount: cart.discountAmount,
        total: cart.total,
        paymentMethod: cart.paymentMethod,
        paymentLabel: paymentLabelForReceipt(cart.paymentMethod),
        workerName,
        createdAt: new Date(),
      });

      cart.clearCart();
      setSuccessMessage(MESSAGES.saved[language]);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccessMessage(null), SUCCESS_MESSAGE_MS);
    } catch (err) {
      console.error("Order submission failed", err);
      setError(MESSAGES.saveFailed[language]);
    } finally {
      setSubmitting(false);
    }
  }, [cart, workerId, workerName, onSaved, language]);

  return { submit, submitting, error, successMessage, pendingCount: pendingOrderIds.length };
}
