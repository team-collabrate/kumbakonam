// One-time admin script (Engineering Plan Phase 6) — seeds the initial
// ~30-item menu. Requires a service account key (same as seed-users.mjs).
// Never commit the key file.
//
// Re-runnable: clears the existing `menu` collection first, so running
// this again after an edit to the list below replaces it cleanly instead
// of creating duplicates.
//
// Usage: node scripts/seed-menu.mjs <path-to-service-account.json>

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";

const serviceAccountPath = process.argv[2];
if (!serviceAccountPath) {
  console.error("Usage: node scripts/seed-menu.mjs <path-to-service-account.json>");
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// Placeholder beta menu — a South Indian tiffin/coffee-house lineup fitting
// the "Kumbakonam" name (renowned for its filter coffee). Edit freely via
// the Owner App's Menu Management screen; this is just a starting point.
// Icons are single emoji — closest available match, not literal (Unicode
// has no idli/dosa/vada glyphs).
const items = [
  // Beverages
  { name: "Filter Coffee", price: 40, category: "Beverages", icon: "☕" },
  { name: "Masala Chai", price: 30, category: "Beverages", icon: "🍵" },
  { name: "Plain Tea", price: 20, category: "Beverages", icon: "🍵" },
  { name: "Badam Milk", price: 50, category: "Beverages", icon: "🥛" },
  { name: "Rose Milk", price: 40, category: "Beverages", icon: "🥛" },
  { name: "Buttermilk", price: 25, category: "Beverages", icon: "🥛" },
  { name: "Lemon Juice", price: 35, category: "Beverages", icon: "🍋" },

  // Breakfast / Tiffin
  { name: "Idli (2 pcs)", price: 50, category: "Breakfast", icon: "🍥" },
  { name: "Masala Dosa", price: 80, category: "Breakfast", icon: "🌯" },
  { name: "Plain Dosa", price: 60, category: "Breakfast", icon: "🌯" },
  { name: "Rava Dosa", price: 90, category: "Breakfast", icon: "🌯" },
  { name: "Onion Uttapam", price: 80, category: "Breakfast", icon: "🥞" },
  { name: "Vada (2 pcs)", price: 40, category: "Breakfast", icon: "🍩" },
  { name: "Pongal", price: 60, category: "Breakfast", icon: "🍚" },
  { name: "Upma", price: 50, category: "Breakfast", icon: "🍚" },
  { name: "Idiyappam", price: 60, category: "Breakfast", icon: "🍜" },
  { name: "Appam (2 pcs)", price: 70, category: "Breakfast", icon: "🥞" },

  // Meals
  { name: "Sambar Rice", price: 70, category: "Meals", icon: "🍛" },
  { name: "Curd Rice", price: 60, category: "Meals", icon: "🍚" },
  { name: "Lemon Rice", price: 60, category: "Meals", icon: "🍋" },
  { name: "Tomato Rice", price: 65, category: "Meals", icon: "🍅" },
  { name: "Bisi Bele Bath", price: 80, category: "Meals", icon: "🍛" },
  { name: "Full Meals (Thali)", price: 120, category: "Meals", icon: "🍽️" },

  // Snacks
  { name: "Veg Sandwich", price: 60, category: "Snacks", icon: "🥪" },
  { name: "Bread Omelette", price: 50, category: "Snacks", icon: "🍳" },
  { name: "Samosa (2 pcs)", price: 30, category: "Snacks", icon: "🥟" },
  { name: "Bonda (2 pcs)", price: 30, category: "Snacks", icon: "🍡" },
  { name: "Mysore Bonda (2 pcs)", price: 35, category: "Snacks", icon: "🍡" },
  { name: "Vegetable Cutlet (2 pcs)", price: 45, category: "Snacks", icon: "🥔" },
  { name: "Masala Vada (2 pcs)", price: 35, category: "Snacks", icon: "🍩" },

  // Desserts
  { name: "Kesari", price: 40, category: "Desserts", icon: "🍮" },
  { name: "Payasam", price: 50, category: "Desserts", icon: "🍮" },
  { name: "Rava Laddu (2 pcs)", price: 30, category: "Desserts", icon: "🍬" },
];

const existing = await db.collection("menu").get();
if (!existing.empty) {
  const batch = db.batch();
  existing.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  console.log(`Cleared ${existing.size} existing menu item(s).`);
}

for (const item of items) {
  const now = Timestamp.now();
  const ref = await db.collection("menu").add({
    ...item,
    active: true,
    createdAt: now,
    updatedAt: now,
  });
  console.log(`Created ${item.icon} ${item.name} (${item.category}, ₹${item.price}) -> ${ref.id}`);
}

console.log(`Done. Seeded ${items.length} items.`);
process.exit(0);
