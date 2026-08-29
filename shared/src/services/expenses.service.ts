import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type FirestoreError,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirestoreDb } from "../firebase";
import type { Expense } from "../types";

const COLLECTION = "expenses";

export interface CreateExpenseInput {
  name: string;
  amount: number;
  workerId: string;
}

export interface CreateExpenseResult {
  expenseId: string;
  /**
   * Settles when the server acknowledges the write, or rejects if it is
   * refused.
   *
   * Do not await this before telling the worker the expense is saved. Per the
   * Firestore SDK, a write promise "won't resolve while you're offline" — the
   * document is in the local cache and will sync by itself, but awaiting the
   * promise would leave the counter staring at a spinner for the length of a
   * wifi outage. Attach a catch to it instead, to surface a genuine refusal.
   */
  committed: Promise<void>;
}

/**
 * Records money spent from the till. Returns immediately: the id is minted
 * locally, so nothing here needs the network.
 */
export function createExpense(input: CreateExpenseInput): CreateExpenseResult {
  const db = getFirestoreDb();
  const ref = doc(collection(db, COLLECTION));
  const committed = setDoc(ref, {
    ...input,
    syncedAt: null,
    createdAt: serverTimestamp(),
  });
  return { expenseId: ref.id, committed };
}

export async function getExpensesInRange(start: Date, end: Date): Promise<Expense[]> {
  const db = getFirestoreDb();
  const q = query(
    collection(db, COLLECTION),
    where("createdAt", ">=", Timestamp.fromDate(start)),
    where("createdAt", "<", Timestamp.fromDate(end)),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ expenseId: d.id, ...(d.data() as Omit<Expense, "expenseId">) }));
}

/** Realtime subscription, for whatever eventually reports on spend. */
export function subscribeToExpensesInRange(
  start: Date,
  end: Date,
  onChange: (expenses: Expense[]) => void,
  onError?: (error: FirestoreError) => void,
): Unsubscribe {
  const db = getFirestoreDb();
  const q = query(
    collection(db, COLLECTION),
    where("createdAt", ">=", Timestamp.fromDate(start)),
    where("createdAt", "<", Timestamp.fromDate(end)),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snap) => {
      onChange(snap.docs.map((d) => ({ expenseId: d.id, ...(d.data() as Omit<Expense, "expenseId">) })));
    },
    onError,
  );
}

/** Correction path for a mistyped entry. */
export async function deleteExpense(expenseId: string): Promise<void> {
  const db = getFirestoreDb();
  await deleteDoc(doc(db, COLLECTION, expenseId));
}
