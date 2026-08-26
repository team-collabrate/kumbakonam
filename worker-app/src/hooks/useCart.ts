import { useCallback, useMemo, useState } from "react";
import type { MenuItem, PaymentMethod } from "@kumbakonam/shared";

export interface CartLine {
  itemId: string;
  name: string;
  nameTa?: string;
  price: number;
  qty: number;
  note: string;
}

export type DiscountMode = "flat" | "percent";

export interface UseCartResult {
  lines: CartLine[];
  isEmpty: boolean;
  addItem: (item: MenuItem) => void;
  incrementQty: (itemId: string) => void;
  decrementQty: (itemId: string) => void;
  removeLine: (itemId: string) => void;
  setNote: (itemId: string, note: string) => void;
  discountMode: DiscountMode;
  setDiscountMode: (mode: DiscountMode) => void;
  discountInput: number;
  setDiscountInput: (value: number) => void;
  paymentMethod: PaymentMethod | null;
  setPaymentMethod: (method: PaymentMethod) => void;
  subtotal: number;
  discountAmount: number;
  total: number;
  clearCart: () => void;
}

/** Cart state for the order-in-progress — PRD §5.1 (qty/note/remove/discount). */
export function useCart(): UseCartResult {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [discountMode, setDiscountMode] = useState<DiscountMode>("flat");
  const [discountInput, setDiscountInputState] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

  const addItem = useCallback((item: MenuItem) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.itemId === item.itemId);
      if (existing) {
        return prev.map((l) => (l.itemId === item.itemId ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { itemId: item.itemId, name: item.name, nameTa: item.nameTa, price: item.price, qty: 1, note: "" }];
    });
  }, []);

  const incrementQty = useCallback((itemId: string) => {
    setLines((prev) => prev.map((l) => (l.itemId === itemId ? { ...l, qty: l.qty + 1 } : l)));
  }, []);

  const decrementQty = useCallback((itemId: string) => {
    setLines((prev) =>
      prev
        .map((l) => (l.itemId === itemId ? { ...l, qty: l.qty - 1 } : l))
        .filter((l) => l.qty > 0),
    );
  }, []);

  const removeLine = useCallback((itemId: string) => {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
  }, []);

  const setNote = useCallback((itemId: string, note: string) => {
    setLines((prev) => prev.map((l) => (l.itemId === itemId ? { ...l, note } : l)));
  }, []);

  const setDiscountInput = useCallback((value: number) => {
    setDiscountInputState(Number.isFinite(value) && value >= 0 ? value : 0);
  }, []);

  const clearCart = useCallback(() => {
    setLines([]);
    setDiscountMode("flat");
    setDiscountInputState(0);
    setPaymentMethod(null);
  }, []);

  const subtotal = useMemo(() => lines.reduce((sum, l) => sum + l.price * l.qty, 0), [lines]);

  const discountAmount = useMemo(() => {
    const raw = discountMode === "flat" ? discountInput : Math.round((subtotal * discountInput) / 100);
    return Math.min(Math.max(raw, 0), subtotal);
  }, [discountMode, discountInput, subtotal]);

  const total = subtotal - discountAmount;

  return {
    lines,
    isEmpty: lines.length === 0,
    addItem,
    incrementQty,
    decrementQty,
    removeLine,
    setNote,
    discountMode,
    setDiscountMode,
    discountInput,
    setDiscountInput,
    paymentMethod,
    setPaymentMethod,
    subtotal,
    discountAmount,
    total,
    clearCart,
  };
}
