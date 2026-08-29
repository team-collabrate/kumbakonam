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
  updateDoc,
  where,
  type DocumentReference,
  type FirestoreError,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirestoreDb } from "../firebase";
import type { Order, OrderItem, PaymentMethod } from "../types";

const COLLECTION = "orders";

export interface CreateOrderInput {
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  /** Both set together, and only when paymentMethod is "split". */
  cashAmount?: number;
  upiAmount?: number;
  workerId: string;
}

export interface CreateOrderResult {
  orderId: string;
  ref: DocumentReference;
}

/**
 * Writes the order via Firestore's local cache first (optimistic — works
 * offline per TDD §4/§8). `syncedAt` starts null; call `markOrderSynced`
 * once the write is confirmed (e.g. from a `hasPendingWrites` listener).
 */
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const db = getFirestoreDb();
  const ref = doc(collection(db, COLLECTION));
  await setDoc(ref, {
    ...input,
    status: "completed",
    syncedAt: null,
    createdAt: serverTimestamp(),
  });
  return { orderId: ref.id, ref };
}

/** Marks the order confirmed-written; called once Firestore reports the write left the local queue. */
export async function markOrderSynced(orderId: string): Promise<void> {
  const db = getFirestoreDb();
  await updateDoc(doc(db, COLLECTION, orderId), { syncedAt: serverTimestamp() });
}

/** Watches a single just-created order and calls back once it's no longer pending a local write. */
export function watchOrderSyncStatus(
  orderId: string,
  onSyncStateChange: (isPending: boolean) => void,
  onError?: (error: FirestoreError) => void,
): Unsubscribe {
  const db = getFirestoreDb();
  return onSnapshot(
    doc(db, COLLECTION, orderId),
    { includeMetadataChanges: true },
    (snap) => {
      onSyncStateChange(snap.metadata.hasPendingWrites);
    },
    onError,
  );
}

export async function getOrdersInRange(start: Date, end: Date): Promise<Order[]> {
  const db = getFirestoreDb();
  const q = query(
    collection(db, COLLECTION),
    where("createdAt", ">=", Timestamp.fromDate(start)),
    where("createdAt", "<", Timestamp.fromDate(end)),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ orderId: d.id, ...(d.data() as Omit<Order, "orderId">) }));
}

/** Realtime subscription for the Owner dashboard/reports (TDD §7). */
export function subscribeToOrdersInRange(
  start: Date,
  end: Date,
  onChange: (orders: Order[]) => void,
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
      onChange(snap.docs.map((d) => ({ orderId: d.id, ...(d.data() as Omit<Order, "orderId">) })));
    },
    onError,
  );
}

/** Owner-only correction path (e.g. fixing a mis-entered discount) — see Data Model §7. */
export type UpdateOrderInput = Partial<
  Pick<Order, "items" | "subtotal" | "discount" | "total" | "paymentMethod" | "status">
>;

export async function updateOrder(orderId: string, input: UpdateOrderInput): Promise<void> {
  const db = getFirestoreDb();
  await updateDoc(doc(db, COLLECTION, orderId), input);
}

export async function deleteOrder(orderId: string): Promise<void> {
  const db = getFirestoreDb();
  await deleteDoc(doc(db, COLLECTION, orderId));
}
