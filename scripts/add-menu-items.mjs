// One-off / reusable admin script: adds menu items WITHOUT touching any
// existing ones (unlike seed-menu.mjs, which clears the whole collection
// first — do not use that one for incremental additions to a live menu).
//
// Uses the regular client SDK + anonymous auth, the same write path the
// Owner app's "Add item" form uses (createMenuItem in menu.service.ts) —
// no service account key needed, since Firestore rules allow any signed-in
// session to write to `menu` (see firestore.rules).
//
// Usage: node scripts/add-menu-items.mjs
// Edit the `items` list below before running.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { addDoc, collection, getFirestore, serverTimestamp } from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Reads worker-app/.env directly rather than depending on Vite's import.meta.env,
// since this runs under plain Node.
function loadEnv(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const env = loadEnv(join(__dirname, "..", "worker-app", ".env"));

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);

// Requested 2026-08-31. Categories per the owner's own call: Idiyappam 1
// under Breakfast (next to the existing Idiyappam 1 Set); Kali, Mochai and
// Paasi Payiru under Vadai (the "snacks" tab); the parcel drinks under Tea.
const items = [
  { name: "Idiyappam 1", nameTa: "இடியாப்பம் (1)", price: 15, category: "Breakfast" },
  { name: "Kali", nameTa: "களி", price: 20, category: "Vadai" },
  { name: "Mochai", nameTa: "மொச்சை", price: 20, category: "Vadai" },
  { name: "Paasi Payiru", nameTa: "பாசிப்பயறு", price: 20, category: "Vadai" },
  { name: "Milk 1/2 Parcel", nameTa: "பால் 1/2 பார்சல்", price: 35, category: "Tea" },
  { name: "Naatu Sakarai 1 Parcel", nameTa: "நாட்டு சர்க்கரை 1 பார்சல்", price: 45, category: "Tea" },
  { name: "Naatu Sakarai 1/2 Parcel", nameTa: "நாட்டு சர்க்கரை 1/2 பார்சல்", price: 40, category: "Tea" },
  { name: "Black Tea 1 Parcel", nameTa: "கருப்பு தேநீர் 1 பார்சல்", price: 30, category: "Tea" },
  { name: "Black Tea 1/2 Parcel", nameTa: "கருப்பு தேநீர் 1/2 பார்சல்", price: 25, category: "Tea" },
];

async function run() {
  await signInAnonymously(auth);
  const menuRef = collection(db, "menu");
  for (const item of items) {
    const ref = await addDoc(menuRef, {
      ...item,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log(`Added "${item.name}" (${ref.id})`);
  }
  console.log("Done.");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
