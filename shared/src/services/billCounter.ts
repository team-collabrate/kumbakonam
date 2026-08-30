import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { getFirestoreDb } from "../firebase";

/**
 * Sequential bill numbers, starting at 1 — continuous for the life of the
 * shop, never resetting per day. This exists specifically because a bill
 * number derived from the Firestore order id (the old approach) is unique
 * but not sequential, and this cafe needs a real running count for
 * reconciling against a physical bill book / GST later.
 *
 * The hard part: the worker app has to keep taking orders with no
 * connection (see useOrderSubmit.ts / createOrder's offline-first design),
 * and a real global counter that's safe against two devices incrementing
 * it at once needs a Firestore transaction — which needs a connection.
 * Those two requirements don't fully reconcile without new infrastructure
 * (a Cloud Function claiming numbers server-side), so this takes the
 * pragmatic middle path for a *single-tablet* counter (per the PRD, there
 * is one Worker App/tablet):
 *
 *  - The counter that actually assigns numbers lives in this device's own
 *    localStorage. Reading and incrementing it is synchronous and works
 *    with zero connectivity, which is what offline order submission
 *    requires.
 *  - `seedBillCounterFromServer()` is called once at app startup: if
 *    Firestore has a higher high-water-mark than this device's local
 *    counter (e.g. the browser storage was cleared, or the app was
 *    reinstalled), it catches the local counter up first, so a fresh
 *    install can't hand out a bill number that already exists.
 *  - Every issued number is reported to Firestore in the background
 *    (best-effort, never blocks issuing the number) so the server
 *    high-water-mark stays current for that recovery case.
 *
 * What this does NOT protect against: two tablets simultaneously taking
 * orders while both offline could hand out the same number — there is no
 * way to prevent that without a server round-trip at the moment of
 * issuing, which would break offline submission. Fine for one till; flag
 * this comment again before ever adding a second one.
 */
const STORAGE_KEY = "kumbakonam.billCounter";

function readLocal(): number {
  const raw = localStorage.getItem(STORAGE_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function writeLocal(n: number): void {
  localStorage.setItem(STORAGE_KEY, String(n));
}

/**
 * Hands out the next bill number. Synchronous and offline-safe — this is
 * called from the same order-submission path that must never wait on the
 * network (see createOrder in orders.service.ts).
 */
export function getNextBillNo(): number {
  const next = readLocal() + 1;
  writeLocal(next);
  reportIssued(next);
  return next;
}

/** Fire-and-forget: keeps the server high-water-mark caught up. Never awaited by a caller. */
function reportIssued(billNo: number): void {
  const db = getFirestoreDb();
  const ref = doc(db, "counters", "billNo");
  runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = (snap.data()?.value as number | undefined) ?? 0;
    if (billNo > current) {
      tx.set(ref, { value: billNo, updatedAt: serverTimestamp() }, { merge: true });
    }
  }).catch((err) => {
    // Fine to lose this — it only matters for the fresh-install recovery
    // path, and it'll be retried on every subsequent order anyway.
    console.error("Bill counter reconciliation failed (non-fatal)", err);
  });
}

/**
 * Called once at worker app startup. Catches the local counter up to
 * Firestore's high-water-mark if the server is ahead — the recovery path
 * for a cleared/reinstalled device. Best-effort: if this can't reach the
 * server (offline at startup), the local counter is used as-is and this
 * silently does nothing, which is correct — there's nothing more accurate
 * to fall back to offline.
 */
export async function seedBillCounterFromServer(): Promise<void> {
  try {
    const db = getFirestoreDb();
    const snap = await getDoc(doc(db, "counters", "billNo"));
    const serverValue = (snap.data()?.value as number | undefined) ?? 0;
    if (serverValue > readLocal()) writeLocal(serverValue);
  } catch (err) {
    console.error("Bill counter seed from server failed (non-fatal, using local)", err);
  }
}
