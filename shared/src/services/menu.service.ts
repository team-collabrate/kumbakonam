import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type FirestoreError,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirestoreDb } from "../firebase";
import type { MenuItem } from "../types";

const COLLECTION = "menu";

export interface ListMenuOptions {
  /** Defaults to true — most callers (Worker menu grid) only want sellable items. */
  activeOnly?: boolean;
}

export async function listMenuItems(options: ListMenuOptions = {}): Promise<MenuItem[]> {
  const { activeOnly = true } = options;
  const db = getFirestoreDb();
  const constraints = activeOnly ? [where("active", "==", true)] : [];
  const snap = await getDocs(query(collection(db, COLLECTION), ...constraints, orderBy("name")));
  return snap.docs.map((d) => ({ itemId: d.id, ...(d.data() as Omit<MenuItem, "itemId">) }));
}

/** Realtime subscription so Worker menu screen reflects Owner edits instantly (TDD §7). */
export function subscribeToMenu(
  onChange: (items: MenuItem[]) => void,
  options: ListMenuOptions = {},
  onError?: (error: FirestoreError) => void,
): Unsubscribe {
  const { activeOnly = true } = options;
  const db = getFirestoreDb();
  const constraints = activeOnly ? [where("active", "==", true)] : [];
  const q = query(collection(db, COLLECTION), ...constraints, orderBy("name"));
  return onSnapshot(
    q,
    (snap) => {
      onChange(snap.docs.map((d) => ({ itemId: d.id, ...(d.data() as Omit<MenuItem, "itemId">) })));
    },
    onError,
  );
}

export async function getMenuItem(itemId: string): Promise<MenuItem | null> {
  const db = getFirestoreDb();
  const snap = await getDoc(doc(db, COLLECTION, itemId));
  if (!snap.exists()) return null;
  return { itemId: snap.id, ...(snap.data() as Omit<MenuItem, "itemId">) };
}

export interface CreateMenuItemInput {
  name: string;
  nameTa?: string;
  price: number;
  category?: string;
  icon?: string;
}

export async function createMenuItem(input: CreateMenuItemInput): Promise<string> {
  const db = getFirestoreDb();
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export type UpdateMenuItemInput = Partial<Pick<MenuItem, "name" | "nameTa" | "price" | "category" | "icon" | "active">>;

export async function updateMenuItem(itemId: string, input: UpdateMenuItemInput): Promise<void> {
  const db = getFirestoreDb();
  await updateDoc(doc(db, COLLECTION, itemId), { ...input, updatedAt: serverTimestamp() });
}

export async function setMenuItemActive(itemId: string, active: boolean): Promise<void> {
  await updateMenuItem(itemId, { active });
}

export async function deleteMenuItem(itemId: string): Promise<void> {
  const db = getFirestoreDb();
  await deleteDoc(doc(db, COLLECTION, itemId));
}
