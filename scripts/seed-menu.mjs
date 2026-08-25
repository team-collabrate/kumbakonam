// One-time admin script (Engineering Plan Phase 6) — seeds the initial
// ~30-item menu. Requires a service account key (same as seed-users.mjs).
// Never commit the key file.
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
const items = [
  // Beverages
  { name: "Filter Coffee", price: 40, category: "Beverages" },
  { name: "Masala Chai", price: 30, category: "Beverages" },
  { name: "Plain Tea", price: 20, category: "Beverages" },
  { name: "Badam Milk", price: 50, category: "Beverages" },
  { name: "Rose Milk", price: 40, category: "Beverages" },
  { name: "Buttermilk", price: 25, category: "Beverages" },
  { name: "Lemon Juice", price: 35, category: "Beverages" },

  // Breakfast / Tiffin
  { name: "Idli (2 pcs)", price: 50, category: "Breakfast" },
  { name: "Masala Dosa", price: 80, category: "Breakfast" },
  { name: "Plain Dosa", price: 60, category: "Breakfast" },
  { name: "Rava Dosa", price: 90, category: "Breakfast" },
  { name: "Onion Uttapam", price: 80, category: "Breakfast" },
  { name: "Vada (2 pcs)", price: 40, category: "Breakfast" },
  { name: "Pongal", price: 60, category: "Breakfast" },
  { name: "Upma", price: 50, category: "Breakfast" },
  { name: "Idiyappam", price: 60, category: "Breakfast" },
  { name: "Appam (2 pcs)", price: 70, category: "Breakfast" },

  // Meals
  { name: "Sambar Rice", price: 70, category: "Meals" },
  { name: "Curd Rice", price: 60, category: "Meals" },
  { name: "Lemon Rice", price: 60, category: "Meals" },
  { name: "Tomato Rice", price: 65, category: "Meals" },
  { name: "Bisi Bele Bath", price: 80, category: "Meals" },
  { name: "Full Meals (Thali)", price: 120, category: "Meals" },

  // Snacks
  { name: "Veg Sandwich", price: 60, category: "Snacks" },
  { name: "Bread Omelette", price: 50, category: "Snacks" },
  { name: "Samosa (2 pcs)", price: 30, category: "Snacks" },
  { name: "Bonda (2 pcs)", price: 30, category: "Snacks" },
  { name: "Mysore Bonda (2 pcs)", price: 35, category: "Snacks" },
  { name: "Vegetable Cutlet (2 pcs)", price: 45, category: "Snacks" },
  { name: "Masala Vada (2 pcs)", price: 35, category: "Snacks" },

  // Desserts
  { name: "Kesari", price: 40, category: "Desserts" },
  { name: "Payasam", price: 50, category: "Desserts" },
  { name: "Rava Laddu (2 pcs)", price: 30, category: "Desserts" },
];

for (const item of items) {
  const now = Timestamp.now();
  const ref = await db.collection("menu").add({
    ...item,
    active: true,
    createdAt: now,
    updatedAt: now,
  });
  console.log(`Created ${item.name} (${item.category}, ₹${item.price}) -> ${ref.id}`);
}

console.log(`Done. Seeded ${items.length} items.`);
process.exit(0);
