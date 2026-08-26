// One-time admin script (Engineering Plan Phase 6) — seeds the menu.
// Requires a service account key (same as seed-users.mjs).
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

// Pure local cafe menu — hot drinks, juice, and snacks only (no tiffin/meals).
// `name` is the canonical English/Tanglish name — used for orders, receipts,
// and ESC/POS printing (most thermal printers can't render Tamil glyphs).
// `nameTa` is the Tamil-script name shown on-screen when the app language
// is switched to Tamil. Icons are single emoji — closest available match.
const items = [
  // Hot Drinks
  { name: "Filter Coffee", nameTa: "பில்டர் காபி", price: 20, category: "Hot Drinks", icon: "☕" },
  { name: "Masala Chai", nameTa: "மசாலா தேநீர்", price: 15, category: "Hot Drinks", icon: "🍵" },
  { name: "Plain Tea", nameTa: "தேநீர்", price: 15, category: "Hot Drinks", icon: "🍵" },
  { name: "Ginger Tea", nameTa: "இஞ்சி தேநீர்", price: 15, category: "Hot Drinks", icon: "🍵" },
  { name: "Black Coffee", nameTa: "கருப்பு காபி", price: 15, category: "Hot Drinks", icon: "☕" },
  { name: "Green Tea", nameTa: "பச்சை தேநீர்", price: 20, category: "Hot Drinks", icon: "🍵" },
  { name: "Badam Milk", nameTa: "பாதாம் பால்", price: 40, category: "Hot Drinks", icon: "🥛" },
  { name: "Horlicks", nameTa: "ஹார்லிக்ஸ்", price: 30, category: "Hot Drinks", icon: "🥛" },

  // Juice
  { name: "Lemon Juice", nameTa: "எலுமிச்சை ஜூஸ்", price: 20, category: "Juice", icon: "🍋" },
  { name: "Rose Milk", nameTa: "ரோஜா பால்", price: 30, category: "Juice", icon: "🥛" },
  { name: "Buttermilk", nameTa: "மோர்", price: 15, category: "Juice", icon: "🥛" },
  { name: "Sweet Lassi", nameTa: "இனிப்பு லஸ்ஸி", price: 30, category: "Juice", icon: "🥤" },
  { name: "Orange Juice", nameTa: "ஆரஞ்சு ஜூஸ்", price: 30, category: "Juice", icon: "🍊" },
  { name: "Grape Juice", nameTa: "திராட்சை ஜூஸ்", price: 30, category: "Juice", icon: "🍇" },
  { name: "Watermelon Juice", nameTa: "தர்பூசணி ஜூஸ்", price: 25, category: "Juice", icon: "🍉" },
  { name: "Mango Juice", nameTa: "மாம்பழ ஜூஸ்", price: 35, category: "Juice", icon: "🥭" },
  { name: "Sugarcane Juice", nameTa: "கரும்பு சாறு", price: 25, category: "Juice", icon: "🧃" },

  // Snacks
  { name: "Veg Sandwich", nameTa: "வெஜ் சாண்ட்விச்", price: 60, category: "Snacks", icon: "🥪" },
  { name: "Bread Omelette", nameTa: "பிரட் ஆம்லெட்", price: 50, category: "Snacks", icon: "🍳" },
  { name: "Samosa (2 pcs)", nameTa: "சமோசா (2)", price: 30, category: "Snacks", icon: "🥟" },
  { name: "Bonda (2 pcs)", nameTa: "போண்டா (2)", price: 30, category: "Snacks", icon: "🍡" },
  { name: "Mysore Bonda (2 pcs)", nameTa: "மைசூர் போண்டா (2)", price: 35, category: "Snacks", icon: "🍡" },
  { name: "Vegetable Cutlet (2 pcs)", nameTa: "வெஜிடபிள் கட்லெட் (2)", price: 45, category: "Snacks", icon: "🥔" },
  { name: "Masala Vada (2 pcs)", nameTa: "மசாலா வடை (2)", price: 35, category: "Snacks", icon: "🍩" },
  { name: "Murukku", nameTa: "முறுக்கு", price: 20, category: "Snacks", icon: "🌀" },
  { name: "Banana Chips", nameTa: "வாழைக்காய் சிப்ஸ்", price: 20, category: "Snacks", icon: "🍌" },
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
  console.log(`Created ${item.icon} ${item.name} / ${item.nameTa} (${item.category}, ₹${item.price}) -> ${ref.id}`);
}

console.log(`Done. Seeded ${items.length} items.`);
process.exit(0);
