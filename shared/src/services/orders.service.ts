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
  /** Both set together, and only when paymentMethod is "credit". */
  customerId?: string;
  customerName?: string;
  workerId: string;
}

export interface CreateOrderResult {
  orderId: string;
  ref: DocumentReference;
  /**
   * Resolves once Firestore confirms the write reached the server —
   * useful for logging/telemetry, but do NOT await this to decide whether
   * to proceed with the UI (print the bill, clear the cart). Per the
   * Firestore Web SDK's own documented behaviour, this promise does not
   * resolve at all while the device is offline, so awaiting it here would
   * silently undo the "works offline" design this function's doc comment
   * promises: `orderId`/`ref` are already final and usable the moment this
   * function returns, because the local write lands in Firestore's cache
   * (and the UI reflects it) synchronously with the `setDoc()` call below,
   * not when the network round-trip finishes.
   */
  synced: Promise<void>;
}

/**
 * Writes the order via Firestore's local cache first (optimistic — works
 * offline per TDD §4/§8). `syncedAt` starts null; call `markOrderSynced`
 * once the write is confirmed (e.g. from a `hasPendingWrites` listener).
 *
 * Deliberately NOT an `async function` returning a single write-completion
 * promise — see `synced` above for why. `orderId`/`ref` come back the
 * instant the local doc ref and optimistic cache write exist, not once the
 * server has acknowledged them.
 */
export function createOrder(input: CreateOrderInput): CreateOrderResult {
  const db = getFirestoreDb();
  const ref = doc(collection(db, COLLECTION));
  const synced = setDoc(ref, {
    ...input,
    status: "completed",
    syncedAt: null,
    createdAt: serverTimestamp(),
  }).then(() => undefined);
  return { orderId: ref.id, ref, synced };
}

/** Marks the order confirmed-written; called once Firestore reports the write left the local queue. */
export async function markOrderSynced(orderId: string): Promise<void> {
  const db = getFirestoreDb();
  await updateDoc(doc(db, COLLECTION, orderId), { syncedAt: serverTimestamp() });
}

export interface OrderSyncState {
  isPending: boolean;
  /**
   * True when the local write has cleared the queue but the document
   * doesn't exist server-side — i.e. it was rejected once it actually
   * reached the server (most likely by the `orders create` security rule,
   * e.g. a worker deactivated while an order sat queued offline). A
   * genuinely-synced order can never hit this, since it exists precisely
   * because the write it came from succeeded. Callers must not treat
   * `!isPending` alone as "synced" — a rejected write also stops being
   * pending, just not by succeeding.
   */
  rejected: boolean;
}

/** Watches a single just-created order and calls back once it's no longer pending a local write. */
export function watchOrderSyncStatus(
  orderId: string,
  onSyncStateChange: (state: OrderSyncState) => void,
  onError?: (error: FirestoreError) => void,
): Unsubscribe {
  const db = getFirestoreDb();
  return onSnapshot(
    doc(db, COLLECTION, orderId),
    { includeMetadataChanges: true },
    (snap) => {
      onSyncStateChange({
        isPending: snap.metadata.hasPendingWrites,
        rejected: !snap.metadata.hasPendingWrites && !snap.exists(),
      });
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
