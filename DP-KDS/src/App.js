import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, doc, onSnapshot,
  addDoc, updateDoc, deleteDoc, getDoc, query, orderBy, serverTimestamp
} from "firebase/firestore";

// ============================================================
// FIREBASE CONFIG — Dona Patys KDS
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyBQmX7bB3Of758lfRdotynqPgwt8b87rj4",
  authDomain: "dona-patys-kds.firebaseapp.com",
  projectId: "dona-patys-kds",
  storageBucket: "dona-patys-kds.firebasestorage.app",
  messagingSenderId: "861821997056",
  appId: "1:861821997056:web:43174af9611ef2be9d08e5",
  measurementId: "G-NZ7F00L6MQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============================================================
// TRANSLATIONS
// ============================================================
const T = {
  es: {
    orderStation: "Estación de Órdenes",
    kitchenDisplay: "Pantalla de Cocina",
    orderHistory: "Historial",
    table: "MESA",
    toGo: "PARA LLEVAR",
    toGoName: "Nombre del cliente",
    orderSummary: "Resumen de Orden",
    tapToAdd: "Toca los artículos para agregarlos",
    specialInstructions: "Instrucciones especiales...",
    sendToKitchen: "Enviar a Cocina",
    updateOrder: "Actualizar Orden",
    sending: "Enviando...",
    sent: "✓ Enviado!",
    updated: "✓ Actualizado!",
    allCaughtUp: "Todo al día",
    allCaughtUpSub: "Sin órdenes pendientes",
    startCooking: "EMPEZAR",
    markDone: "LISTO ✓",
    active: "activas",
    done: "listas",
    new: "NUEVA",
    inProgress: "EN PROCESO",
    completed: "LISTA",
    modified: "MODIFICADA",
    cancelled: "🚫 ORDEN CANCELADA",
    added: "AGREGADO",
    removed: "ELIMINADO",
    decreased: "MENOS",
    noHistory: "No hay órdenes completadas aún",
    historyTitle: "Historial de Órdenes",
    avgTime: "Tiempo Promedio",
    totalOrders: "Total Órdenes",
    totalRevenue: "Ingresos Totales",
    itemAnalysis: "Análisis por Artículo",
    prepTime: "Tiempo de Prep",
    orders: "órdenes",
    minutes: "min",
    seconds: "seg",
    table2: "Mesa",
    duration: "Duración",
    editOrder: "Editar Orden",
    activeOrders: "Órdenes Activas",
    editHistory: "Historial de Cambios",
    original: "Original",
    edit: "Edición",
    cancelEdit: "Cancelar",
    toGoLabel: "PARA LLEVAR",
    checkNo: "ORDEN #",
    guestCheck: "ORDEN DE COCINA",
    inQueue: "en cola",
    note: "NOTA",
    qty: "CANT",
    item: "ARTÍCULO",
    translating: "Traduciendo menú...",
    keyboardMode: "Modo Control",
    shortcutAdvance: "Avanzar",
    shortcutUndo: "Deshacer",
    shortcutNavigate: "Navegar",
    shortcutNext: "Siguiente",
    shortcutPrev: "Anterior",
    shortcutJump: "Saltar a orden",
    shortcutReset: "Primero",
    customizeItem: "Personalizar",
    addToOrder: "Agregar a Orden",
    required: "Requerido",
    optional: "Opcional",
    chooseOne: "Elige 1",
    chooseUp: "Elige hasta",
    loadingMods: "Cargando opciones...",
    noMods: "Sin modificadores",
    selectRequired: "Selecciona las opciones requeridas",
    free: "gratis",
    expoDisplay: "Expo / Entrega",
    readyForPickup: "LISTO PARA ENTREGAR",
    bumpOrder: "BUMP",
    waitingKitchen: "Esperando Cocina...",
    waitingDrinks: "Esperando Bebidas...",
    waitingBoth: "Esperando Cocina y Bebidas",
  },
  en: {
    orderStation: "Order Station",
    kitchenDisplay: "Kitchen Display",
    orderHistory: "History",
    table: "TABLE",
    toGo: "TO GO",
    toGoName: "Customer name",
    orderSummary: "Order Summary",
    tapToAdd: "Tap items to add them",
    specialInstructions: "Special instructions...",
    sendToKitchen: "Send to Kitchen",
    updateOrder: "Update Order",
    sending: "Sending...",
    sent: "✓ Sent!",
    updated: "✓ Updated!",
    allCaughtUp: "All Caught Up",
    allCaughtUpSub: "No pending orders",
    startCooking: "START",
    markDone: "DONE ✓",
    active: "active",
    done: "done",
    new: "NEW",
    inProgress: "IN PROGRESS",
    completed: "DONE",
    modified: "MODIFIED",
    cancelled: "🚫 ORDER CANCELLED",
    added: "ADDED",
    removed: "REMOVED",
    decreased: "LESS",
    noHistory: "No completed orders yet",
    historyTitle: "Order History",
    avgTime: "Avg Time",
    totalOrders: "Total Orders",
    totalRevenue: "Total Revenue",
    itemAnalysis: "Item Analysis",
    prepTime: "Prep Time",
    orders: "orders",
    minutes: "min",
    seconds: "sec",
    table2: "Table",
    duration: "Duration",
    editOrder: "Edit Order",
    activeOrders: "Active Orders",
    editHistory: "Edit History",
    original: "Original",
    edit: "Edit",
    cancelEdit: "Cancel",
    toGoLabel: "TO GO",
    checkNo: "ORDER #",
    guestCheck: "KITCHEN ORDER",
    inQueue: "in queue",
    note: "NOTE",
    qty: "QTY",
    item: "ITEM",
    translating: "Translating menu...",
    keyboardMode: "Control Mode",
    shortcutAdvance: "Advance",
    shortcutUndo: "Undo",
    shortcutNavigate: "Navigate",
    shortcutNext: "Next",
    shortcutPrev: "Prev",
    shortcutJump: "Jump to order",
    shortcutReset: "First",
    customizeItem: "Customize",
    addToOrder: "Add to Order",
    required: "Required",
    optional: "Optional",
    chooseOne: "Choose 1",
    chooseUp: "Choose up to",
    loadingMods: "Loading options...",
    noMods: "No modifiers",
    selectRequired: "Please select required options",
    free: "free",
    expoDisplay: "Expo / Delivery",
    readyForPickup: "READY FOR PICKUP",
    bumpOrder: "BUMP",
    waitingKitchen: "Waiting on Kitchen...",
    waitingDrinks: "Waiting on Drinks...",
    waitingBoth: "Waiting on Kitchen & Drinks",
  },
};

// ============================================================
// CLOVER API HELPER
// ============================================================
async function cloverRequest(endpoint, method = "GET", body = null) {
  const res = await fetch("/api/clover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint, method, body }),
  });
  if (!res.ok) throw new Error(`Clover API error: ${res.status}`);
  return res.json();
}

// ============================================================
// All modifier groups loaded once at startup
let ALL_MODIFIER_GROUPS = [];
async function fetchAllModifierGroups() {
  try {
    const data = await cloverRequest("modifier_groups?expand=modifiers&limit=100");
    ALL_MODIFIER_GROUPS = (data.elements || []).map(group => ({
      id: group.id,
      name: group.name,
      minRequired: group.minRequired ?? 0,
      maxAllowed: group.maxAllowed ?? 99,
      modifiers: (group.modifiers?.elements || []).map(m => ({
        id: m.id,
        name: m.name,
        price: m.price || 0,
      })),
    }));
  } catch (err) {
    console.error("❌ fetchAllModifierGroups FAILED:", err.message, err);
  }
}

function getModifierGroupsForItem(itemName) {
  if (!itemName || ALL_MODIFIER_GROUPS.length === 0) return [];
  const name = itemName.toLowerCase();
  return ALL_MODIFIER_GROUPS.filter(group => {
    const groupPrefix = group.name.split(" - ")[0].toLowerCase().trim();
    const normalizedGroup = groupPrefix.replace(/s$/, "");
    const normalizedName = name.replace(/s$/, "");
    return normalizedName.includes(normalizedGroup) || normalizedGroup.includes(normalizedName.split(" ")[0].replace(/s$/, ""));
  });
}

// ============================================================
// AI MENU TRANSLATION via Anthropic API
// ============================================================
async function translateMenuItemsToSpanish(items) {
  const names = items.map(i => i.name);
  try {
    const response = await fetch("/api/clover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "translate", items: names }),
    });
    const data = await response.json();
    const translated = data.translated;
    if (!Array.isArray(translated) || translated.length !== names.length) return null;
    return translated;
  } catch (err) {
    console.warn("⚠️ Menu translation failed:", err.message);
    return null;
  }
}

// ============================================================
// CATEGORY SORT ORDER  (Drinks → Apps → Mains → Extras → Dessert)
// ============================================================
const CATEGORY_PRIORITY = [
  "beverage", "bebida", "drink", "agua",
  "happy hour",
  "appetizer", "starter", "entrada", "picadita", "sope",
  "sopa", "soup",
  "taco",
  "burrito", "torta", "tostada", "quesadilla", "huarache", "cemita",
  "dinner", "main", "fajita",
  "extra", "side",
  "festival",
  "breakfast", "desayuno",
  "dessert", "postre",
  "kid",
  "beer", "liquor", "cerveza",
];

function sortCategories(cats) {
  return [...cats].sort((a, b) => {
    const aName = (a.name.en || a.name.es || "").toLowerCase();
    const bName = (b.name.en || b.name.es || "").toLowerCase();
    const rank = (name) => {
      const i = CATEGORY_PRIORITY.findIndex(k => name.includes(k));
      return i === -1 ? 999 : i;
    };
    return rank(aName) - rank(bName);
  });
}

// ============================================================
// CLOVER MENU FETCH
// ============================================================
async function fetchMenuFromClover() {
  try {
    const [itemsRes, catsRes] = await Promise.all([
      cloverRequest("items?expand=categories&limit=200"),
      cloverRequest("categories?limit=100"),
    ]);
    const categories = (catsRes.elements || []).map(cat => ({
      id: cat.id,
      name: { es: cat.name, en: cat.name },
    }));
    const items = (itemsRes.elements || [])
      .filter(item => item.available !== false)
      .map(item => ({
        id: item.id,
        categoryId: item.categories?.elements?.[0]?.id || "uncategorized",
        name: item.name,
        nameEs: null,
        price: item.price || 0,
        emoji: "🍽️",
      }));
    if (categories.length === 0) {
      return { categories: [{ id: "uncategorized", name: { es: "Menú", en: "Menu" } }], items };
    }
    const usedCatIds = new Set(items.map(i => i.categoryId));
    return { categories: sortCategories(categories.filter(cat => usedCatIds.has(cat.id))), items };
  } catch (err) {
    console.warn("⚠️ Clover menu fetch failed, using mock menu:", err.message);
    return MOCK_MENU;
  }
}

// ============================================================
// CLOVER ORDER PUSH
// ============================================================
const CLOVER_ORDER_TYPES = {
  dineIn: "HC7A7MP3VH9C0",
  takeOut: "RFE2M1R5QRJWR",
};

async function sendOrderToClover(order) {
  try {
    const orderTypeId = order.isToGo ? CLOVER_ORDER_TYPES.takeOut : CLOVER_ORDER_TYPES.dineIn;
    const orderPayload = {
      orderType: { id: orderTypeId },
      note: order.isToGo
        ? `🥡 PARA LLEVAR: ${order.toGoName}${order.note ? " | " + order.note : ""}`
        : `🪑 MESA ${order.table}${order.note ? " | " + order.note : ""}`,
      state: "open",
    };
    const cloverOrder = await cloverRequest("orders", "POST", orderPayload);
    const cloverOrderId = cloverOrder.id;
    if (!cloverOrderId) throw new Error("No order ID returned from Clover");
    for (const item of order.items) {
      const lineItem = await cloverRequest(`orders/${cloverOrderId}/line_items`, "POST", {
        name: item.name,
        price: item.price,
        unitQty: item.qty * 1000,
      });
      if (item.modifiers && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          await cloverRequest(
            `orders/${cloverOrderId}/line_items/${lineItem.id}/modifications`,
            "POST",
            { modifier: { id: mod.id }, name: mod.name, amount: mod.price }
          );
        }
      }
    }
    return cloverOrderId;
  } catch (err) {
    console.warn("⚠️ Clover order push failed (saved to Firebase only):", err.message);
  }
}

async function updateOrderInClover(order) {
  try {
    if (!order.cloverOrderId) return;
    await cloverRequest(`orders/${order.cloverOrderId}`, "POST", { note: order.note || "" });
  } catch (err) {
    console.warn("⚠️ Clover order update failed:", err.message);
  }
}

// ============================================================
// MOCK MENU
// ============================================================
const MOCK_MENU = {
  categories: [
    { id: "cat1", name: { es: "Entradas", en: "Starters" } },
    { id: "cat2", name: { es: "Platos Principales", en: "Mains" } },
    { id: "cat3", name: { es: "Bebidas", en: "Drinks" } },
    { id: "cat4", name: { es: "Postres", en: "Desserts" } },
  ],
  items: [
    { id: "i1", categoryId: "cat1", name: "Chips & Salsa", nameEs: "Totopos con Salsa", price: 599, emoji: "🌮" },
    { id: "i2", categoryId: "cat1", name: "Sopa del Día", nameEs: "Sopa del Día", price: 699, emoji: "🍲" },
    { id: "i3", categoryId: "cat1", name: "Alitas de Pollo", nameEs: "Alitas de Pollo", price: 1099, emoji: "🍗" },
    { id: "i4", categoryId: "cat2", name: "Hamburguesa", nameEs: "Hamburguesa", price: 1299, emoji: "🍔" },
    { id: "i5", categoryId: "cat2", name: "Grilled Salmon", nameEs: "Salmón a la Parrilla", price: 1899, emoji: "🐟" },
    { id: "i6", categoryId: "cat2", name: "Pasta Primavera", nameEs: "Pasta Primavera", price: 1499, emoji: "🍝" },
    { id: "i7", categoryId: "cat2", name: "BBQ Ribs", nameEs: "Costillas BBQ", price: 2199, emoji: "🥩" },
    { id: "i8", categoryId: "cat3", name: "Lemonade", nameEs: "Limonada", price: 349, emoji: "🍋" },
    { id: "i9", categoryId: "cat3", name: "Iced Tea", nameEs: "Té Helado", price: 299, emoji: "🧋" },
    { id: "i10", categoryId: "cat3", name: "Craft Beer", nameEs: "Cerveza Artesanal", price: 699, emoji: "🍺" },
    { id: "i11", categoryId: "cat3", name: "Margarita", nameEs: "Margarita", price: 999, emoji: "🍹" },
    { id: "i12", categoryId: "cat4", name: "Cheesecake", nameEs: "Pastel de Queso", price: 799, emoji: "🍰" },
    { id: "i13", categoryId: "cat4", name: "Brownie with Ice Cream", nameEs: "Brownie con Helado", price: 849, emoji: "🍫" },
  ],
};

// ============================================================
// DIFF HELPER
// ============================================================
function diffItems(oldItems, newItems) {
  const result = [];
  const oldMap = {};
  oldItems.forEach(i => { oldMap[i.id] = i; });
  const newMap = {};
  newItems.forEach(i => { newMap[i.id] = i; });
  newItems.forEach(item => {
    const old = oldMap[item.id];
    if (!old) result.push({ ...item, changeType: "added" });
    else if (item.qty > old.qty) result.push({ ...item, changeType: "increased" });
    else if (item.qty < old.qty) result.push({ ...item, changeType: "decreased" });
    else result.push({ ...item, changeType: "unchanged" });
  });
  oldItems.forEach(item => {
    if (!newMap[item.id]) result.push({ ...item, changeType: "removed" });
  });
  return result;
}

// ============================================================
// FIREBASE STORE FUNCTIONS
// ============================================================
async function pushOrderToKitchen(order) {
  await addDoc(collection(db, "orders"), {
    ...order,
    kitchenReady: false,
    drinksReady: false,
    allReady: false,
    createdAt: serverTimestamp(),
  });
}

async function editKitchenOrder(orderId, oldItems, newItems, newNote) {
  const diff = diffItems(oldItems, newItems);
  const orderRef = doc(db, "orders", orderId);
  await updateDoc(orderRef, {
    items: newItems,
    note: newNote,
    total: newItems.reduce((s, i) => s + i.price * i.qty, 0),
    modified: true,
    lastModified: Date.now(),
    latestDiff: diff,
    editHistory: [],
  });
}

async function cancelKitchenOrder(orderId) {
  const orderRef = doc(db, "orders", orderId);
  await updateDoc(orderRef, { cancelled: true, modified: false });
  setTimeout(async () => {
    await deleteDoc(orderRef);
  }, 4000);
}

async function updateOrderStatus(orderId, status) {
  const now = Date.now();
  const orderRef = doc(db, "orders", orderId);
  const updates = { status };
  if (status === "in_progress") updates.startedAt = now;
  if (status === "done") {
    updates.completedAt = now;
    updates.duration = now - (updates.startedAt || now);
    setTimeout(async () => {
      const snap = await getDoc(orderRef);
      if (snap.exists()) {
        await addDoc(collection(db, "completedOrders"), snap.data());
        await deleteDoc(orderRef);
      }
    }, 1500);
  }
  await updateDoc(orderRef, updates);
}

async function closeTable(tableOrders) {
  for (const order of tableOrders) {
    const orderRef = doc(db, "orders", order.firestoreId);
    const snap = await getDoc(orderRef);
    if (snap.exists()) {
      await addDoc(collection(db, "completedOrders"), { ...snap.data(), completedAt: Date.now() });
      await deleteDoc(orderRef);
    }
  }
}

// ── PER-STATION COMPLETION ─────────────────────────────────────
async function _completeOrder(orderId, startedAt, timestamp) {
  const ref = doc(db, "orders", orderId);
  const now = Date.now();
  await updateDoc(ref, { allReady: true, allReadyAt: now });
  setTimeout(async () => {
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().allReady) {
      const data = snap.data();
      const completedAt = Date.now();
      await addDoc(collection(db, "completedOrders"), {
        ...data,
        completedAt,
        duration: completedAt - (startedAt || timestamp),
      });
      await deleteDoc(ref);
    }
  }, 8000);
}

async function markKitchenReady(order) {
  const ref = doc(db, "orders", order.firestoreId);
  await updateDoc(ref, { kitchenReady: true });
  const hasDrinks = orderHasDrinksItems(order);
  if (!hasDrinks || order.drinksReady) {
    await _completeOrder(order.firestoreId, order.startedAt, order.timestamp);
  }
}

async function markDrinksReady(order) {
  const ref = doc(db, "orders", order.firestoreId);
  await updateDoc(ref, { drinksReady: true });
  const hasKitchen = orderHasKitchenItems(order);
  if (!hasKitchen || order.kitchenReady) {
    await _completeOrder(order.firestoreId, order.startedAt, order.timestamp);
  }
}

async function bumpOrder(order) {
  const ref = doc(db, "orders", order.firestoreId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    const completedAt = Date.now();
    await addDoc(collection(db, "completedOrders"), {
      ...data,
      completedAt,
      duration: completedAt - (data.startedAt || order.timestamp),
    });
    await deleteDoc(ref);
  }
}

// ============================================================
// UTILS
// ============================================================
const fmt = (cents) => `$${(cents / 100).toFixed(2)}`;
const genId = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const fmtDuration = (ms, lang) => {
  if (!ms) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} ${T[lang].seconds}`;
  return `${Math.floor(s / 60)} ${T[lang].minutes} ${s % 60}s`;
};
const elapsed = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
};
const STATUS_COLORS = { new: "#BE202E", in_progress: "#D97706", done: "#15803D" };

// ============================================================
// DRINKS / SIDES STATION — matching rules
// ============================================================
const DRINKS_RULES = [
  {
    key: "nonalcoholic",
    color: "#7C3AED",
    bg: "#F5F3FF",
    label: "BEBIDA",
    match: (name, catName = "") => {
      const n = name.toLowerCase();
      const c = catName.toLowerCase();
      const hits = ["agua", "limonada", "horchata", "jamaica", "refresco", "soda",
                    "jugo", "atole", "tepache", "bebida", "drink", "té", "te ",
                    "cafe", "café", "chocolate", "leche", "naranjada", "aguas"];
      const alc  = ["cerveza", "beer", "margarita", "mezcal", "tequila", "wine",
                    "vino", "cocktail", "licor", "michelada", "vodka", "rum", "ron"];
      return (hits.some(k => n.includes(k)) || c.includes("bebida") || c.includes("drink"))
        && !alc.some(k => n.includes(k) || c.includes(k));
    },
  },
  {
    key: "caldo",
    color: "#BE202E",
    bg: "#FFF1F2",
    label: "CALDO",
    match: (name) => name.toLowerCase().includes("caldo"),
  },
  {
    key: "guacamole",
    color: "#15803D",
    bg: "#F0FDF4",
    label: "GUACAMOLE",
    match: (name) => {
      const n = name.toLowerCase();
      return n.includes("guacamol") || n.includes("guac");
    },
  },
  {
    key: "sides",
    color: "#D97706",
    bg: "#FFFBEB",
    label: "SIDES",
    match: (name, catName = "") => catName.toLowerCase().includes("extra"),
  },
];

const TOGO_COLOR  = "#92400E";
const TOGO_BG     = "#FEF3C7";

function getDrinksRule(itemName, catName) {
  return DRINKS_RULES.find(r => r.match(itemName, catName)) || null;
}

function orderHasDrinksItems(order) {
  if (order.isToGo) return true;
  return order.items?.some(item => getDrinksRule(item.name, item.catName)) ?? false;
}

// Items the kitchen doesn't cook — greyed out on kitchen tickets
function isKitchenDimmed(itemName, catName = "") {
  const rule = getDrinksRule(itemName, catName);
  return rule?.key === "nonalcoholic" || rule?.key === "sides";
}

function orderHasKitchenItems(order) {
  return order.items?.some(i => !isKitchenDimmed(i.name, i.catName || "")) ?? false;
}

// ============================================================
// SPECIAL NOTE PARSER
// ============================================================
const ADD_TRIGGERS = ["con", "extra", "add", "agregar", "agrega", "adicional", "más", "mas"];
const REMOVE_TRIGGERS = ["sin", "without", "remove", "quitar", "quita", "no"];
const NO_IGNORE_LIST = ["muy", "hay", "sé", "se", "tan", "favor", "más", "mas", "olvidar", "puede"];

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[a.length][b.length];
}

function fuzzyMatchesTrigger(word, triggers) {
  return triggers.some(t => levenshtein(word.toLowerCase(), t) <= 2);
}

function parseSpecialNote(note) {
  if (!note) return [];
  return note.split(",").map(chunk => {
    const trimmed = chunk.trim();
    if (!trimmed) return null;
    const words = trimmed.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const w = words[i].toLowerCase();
      if (fuzzyMatchesTrigger(w, REMOVE_TRIGGERS)) {
        if (w === "no" && words[i + 1] && NO_IGNORE_LIST.includes(words[i + 1].toLowerCase())) continue;
        return { type: "remove", text: trimmed.toUpperCase() };
      }
      if (fuzzyMatchesTrigger(w, ADD_TRIGGERS)) return { type: "add", text: trimmed.toUpperCase() };
    }
    return { type: "neutral", text: trimmed.toUpperCase() };
  }).filter(Boolean);
}

// ============================================================
// MODIFIER MODAL
// ============================================================
function ModifierModal({ item, displayName, lang, onConfirm, onClose }) {
  const t = T[lang];
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState({});
  const [specialNote, setSpecialNote] = useState("");

  useEffect(() => {
    const groups = getModifierGroupsForItem(item.name);
    setGroups(groups);
    const init = {};
    groups.forEach(g => { init[g.id] = new Set(); });
    setSelections(init);
    setLoading(false);
  }, [item.id, item.name]);

  function toggle(group, modId) {
    setSelections(prev => {
      const next = { ...prev };
      const current = new Set(prev[group.id]);
      const isSingle = group.maxAllowed === 1;
      if (isSingle) {
        next[group.id] = current.has(modId) ? new Set() : new Set([modId]);
      } else {
        if (current.has(modId)) {
          current.delete(modId);
          next[group.id] = current;
        } else if (current.size < group.maxAllowed) {
          current.add(modId);
          next[group.id] = current;
        }
      }
      return next;
    });
  }

  const missingGroups = groups.filter(g => g.minRequired > 0 && (selections[g.id]?.size ?? 0) < g.minRequired);
  const canConfirm = missingGroups.length === 0;

  function handleConfirm() {
    const selectedMods = [];
    groups.forEach(group => {
      group.modifiers.forEach(mod => {
        if (selections[group.id]?.has(mod.id)) selectedMods.push(mod);
      });
    });
    onConfirm(selectedMods, specialNote.trim());
  }

  const modTotal = groups.reduce((sum, group) => {
    return sum + group.modifiers.filter(m => selections[group.id]?.has(m.id)).reduce((s, m) => s + m.price, 0);
  }, 0);

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div>
            <div style={S.modalTitle}>{item.emoji} {displayName}</div>
            <div style={S.modalSubtitle}>{t.customizeItem}</div>
          </div>
          <button style={S.modalCloseBtn} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalBody}>
          {loading ? (
            <div style={S.modalLoading}>
              <div style={S.loadingSpinner} />
              <span style={{ color: "#BE202E", fontWeight: 700 }}>{t.loadingMods}</span>
            </div>
          ) : groups.length === 0 ? (
            <div style={S.modalEmpty}>{t.noMods}</div>
          ) : (
            groups.map(group => {
              const isRequired = group.minRequired > 0;
              const isSingle = group.maxAllowed === 1;
              const selected = selections[group.id] ?? new Set();
              const isSatisfied = !isRequired || selected.size >= group.minRequired;
              return (
                <div key={group.id} style={S.modGroup}>
                  <div style={S.modGroupHeader}>
                    <span style={S.modGroupName}>{group.name}</span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ ...S.modGroupBadge, background: isRequired ? (isSatisfied ? "#15803D" : "#BE202E") : "#6B7280" }}>
                        {isRequired ? t.required : t.optional}
                      </span>
                      <span style={S.modGroupHint}>{isSingle ? t.chooseOne : `${t.chooseUp} ${group.maxAllowed}`}</span>
                    </div>
                  </div>
                  <div style={S.modOptions}>
                    {group.modifiers.map(mod => {
                      const isSelected = selected.has(mod.id);
                      return (
                        <button key={mod.id} style={{ ...S.modOption, ...(isSelected ? S.modOptionSelected : {}) }} onClick={() => toggle(group, mod.id)}>
                          <span style={S.modOptionIndicator}>{isSingle ? (isSelected ? "●" : "○") : (isSelected ? "☑" : "☐")}</span>
                          <span style={S.modOptionName}>{mod.name}</span>
                          <span style={S.modOptionPrice}>{mod.price > 0 ? `+${fmt(mod.price)}` : t.free}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1A1A1A", marginBottom: 6 }}>✏️ Nota especial</div>
            <textarea
              style={{ width: "100%", background: "#F5F3F0", border: "2px solid #E5E0D8", borderRadius: 10, color: "#333", fontSize: 14, padding: "10px 12px", resize: "none", outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.15s" }}
              onFocus={e => e.target.style.borderColor = "#BE202E"}
              onBlur={e => e.target.style.borderColor = "#E5E0D8"}
              placeholder="Sin cebolla, extra jalapeños, bien cocido..."
              value={specialNote}
              onChange={e => setSpecialNote(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        {!loading && (
          <div style={S.modalFooter}>
            {!canConfirm && (
              <div style={S.modalValidationMsg}>⚠️ {t.selectRequired}: {missingGroups.map(g => g.name).join(", ")}</div>
            )}
            <div style={S.modalFooterRow}>
              <div style={S.modalPriceBreakdown}>
                <span style={S.modalBasePrice}>{fmt(item.price)}</span>
                {modTotal > 0 && <span style={S.modalModPrice}> + {fmt(modTotal)}</span>}
              </div>
              <button style={{ ...S.modalConfirmBtn, ...(!canConfirm ? S.modalConfirmBtnDisabled : {}) }} onClick={handleConfirm} disabled={!canConfirm}>
                {t.addToOrder} — {fmt(item.price + modTotal)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// GUEST CHECK TICKET COMPONENT
// ============================================================
function GuestCheckTicket({ order, t, isQueue, isFocused, catNameById = {} }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsedSecs = Math.floor((Date.now() - order.timestamp) / 1000);
  const isUrgent = elapsedSecs > 600;
  const isWarning = elapsedSecs > 300;
  const timerColor = isUrgent ? "#BE202E" : isWarning ? "#D97706" : "#15803D";

  const items = order.modified && order.latestDiff
    ? order.latestDiff
    : order.items.map(i => ({ ...i, changeType: "unchanged" }));

  const changeStyle = (changeType) => {
    switch (changeType) {
      case "added":     return { color: "#15803D", bg: "#F0FDF4" };
      case "increased": return { color: "#15803D", bg: "#F0FDF4" };
      case "decreased": return { color: "#D97706", bg: "#FFFBEB" };
      case "removed":   return { color: "#BE202E", bg: "#FFF1F2", tagBg: "#BE202E", label: `✕ ${t.removed}` };
      default:          return { color: "#1A1A1A", bg: "transparent" };
    }
  };

  return (
    <div style={{
      ...S.ticket,
      opacity: isQueue ? 0.55 : 1,
      transform: isQueue ? "scale(0.97)" : "scale(1)",
      // ── KEYBOARD FOCUS HIGHLIGHT ──────────────────────────────
      // When this ticket is focused via keyboard/numpad, show a
      // bright blue ring around it so the cook knows it's selected
      outline: isFocused ? "4px solid #2563EB" : "none",
      outlineOffset: isFocused ? "3px" : "0",
      boxShadow: isFocused
        ? "0 0 0 4px rgba(37,99,235,0.25), 0 2px 10px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)"
        : "0 2px 10px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
    }}>
      {order.cancelled && <div style={S.cancelledBanner}>{t.cancelled}</div>}
      {order.isToGo && <div style={S.toGoBanner}>🥡 {t.toGoLabel} — {order.toGoName}</div>}
      {order.modified && !order.cancelled && <div style={S.modifiedBanner}>⚡ {t.modified}</div>}

      {/* Keyboard shortcut hint — only shown on focused ticket */}
      {isFocused && !isQueue && (
        <div style={S.keyboardHintBar}>
          <span style={S.keyboardHint}>🔢 <strong>ENTER</strong> = {order.status === "new" ? t.startCooking : t.markDone}</span>
          <span style={S.keyboardHint}><strong>+</strong> = {t.shortcutNext}</span>
          <span style={S.keyboardHint}><strong>−</strong> = {t.shortcutPrev}</span>
          <span style={S.keyboardHint}><strong>*</strong> = {t.shortcutUndo}</span>
        </div>
      )}

      <div style={S.ticketTop}>
        <div style={S.ticketTopLeft}>
          <div style={S.guestCheckTitle}>{t.guestCheck}</div>
          <div style={S.ticketMeta}>
            {order.isToGo
              ? <span style={S.toGoNameBig}>{order.toGoName}</span>
              : <span style={S.tableNumberBig}>{t.table2} {order.table}</span>
            }
          </div>
        </div>
        <div style={S.ticketTopRight}>
          <div style={S.checkNoLabel}>{t.checkNo}</div>
          <div style={S.checkNoValue}>{order.id}</div>
          <div style={{ ...S.timerBig, color: timerColor }}>⏱ {elapsed(order.timestamp)}</div>
        </div>
      </div>

      <div style={S.ruledLine} />
      <div style={S.colHeaders}>
        <span style={S.colQty}>{t.qty}</span>
        <span style={S.colItem}>{t.item}</span>
      </div>
      <div style={S.ruledLine} />

      <div style={S.itemsList}>
        {items.map((item, idx) => {
          const cs = changeStyle(item.changeType);
          const isRemoved = item.changeType === "removed";
          const dimmed = item.changeType === "unchanged" && isKitchenDimmed(item.name, item.catName || catNameById[item.categoryId] || "");
          return (
            <div key={idx} style={{ ...S.itemRow, background: order.cancelled ? "#FFF1F2" : cs.bg, borderBottom: idx < items.length - 1 ? "1px solid #E5DFD0" : "none", opacity: dimmed ? 0.35 : 1 }}>
              <span style={{ ...S.itemQty, color: order.cancelled ? "#BE202E" : dimmed ? "#9CA3AF" : cs.color }}>{item.qty}</span>
              <div style={{ flex: 1 }}>
                <span style={{ ...S.itemName, color: order.cancelled ? "#BE202E" : dimmed ? "#9CA3AF" : cs.color, textDecoration: order.cancelled || isRemoved ? "line-through" : "none", fontWeight: item.changeType !== "unchanged" ? 900 : 700 }}>
                  {item.name}
                  {cs.tagBg && !order.cancelled && <span style={{ ...S.changeTag, background: cs.tagBg }}>{cs.label}</span>}
                </span>
                {item.modifiers && item.modifiers.length > 0 && (
                  <div style={S.ticketModifiers}>
                    {item.modifiers.map((mod, mi) => {
                      const isRemoval = REMOVE_TRIGGERS.some(w => mod.name.toLowerCase().includes(w));
                      return (
                        <span key={mi} style={{ ...S.ticketModifierChip, color: isRemoval ? "#BE202E" : "#15803D", fontWeight: 800, textTransform: "uppercase" }}>
                          {isRemoval ? "− " : "+ "}{mod.name.toUpperCase()}
                        </span>
                      );
                    })}
                  </div>
                )}
                {item.specialNote && (
                  <div style={S.ticketSpecialNoteBlock}>
                    {parseSpecialNote(item.specialNote).map((seg, si) => (
                      <div key={si} style={{ ...S.ticketSpecialNoteLine, color: seg.type === "add" ? "#15803D" : seg.type === "remove" ? "#BE202E" : "#1A1A1A" }}>
                        {seg.type === "add" ? "+ " : seg.type === "remove" ? "− " : ""}{seg.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {order.note && (
        <>
          <div style={S.ruledLine} />
          <div style={S.noteRow}>
            <span style={S.noteLabel}>{t.note}:</span>
            <span style={S.noteText}>{order.note}</span>
          </div>
        </>
      )}

      <div style={{ ...S.ruledLine, borderColor: "#B8A88A", borderWidth: 2 }} />

      <div style={S.ticketFooter}>
        <div style={{ ...S.statusStamp, borderColor: order.cancelled ? "#BE202E" : order.modified ? "#7C3AED" : STATUS_COLORS[order.status], color: order.cancelled ? "#BE202E" : order.modified ? "#7C3AED" : STATUS_COLORS[order.status] }}>
          {order.cancelled ? "🚫 CANCELLED" : order.modified ? `⚡ ${t.modified}` : order.status === "new" ? t.new : t.inProgress}
        </div>
        {!isQueue && !order.cancelled && (
          <div style={S.ticketBtns}>
            {order.status === "new" && (
              <button style={S.btnStart} onClick={() => updateOrderStatus(order.firestoreId, "in_progress")}>
                🔥 {t.startCooking}
              </button>
            )}
            {order.status === "in_progress" && (
              <button style={S.btnDone} onClick={() => markKitchenReady(order)}>
                ✓ {t.markDone}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// KITCHEN SCREEN — with keyboard / numpad controller support
// ============================================================
function KitchenScreen({ lang, menu }) {
  const t = T[lang];
  const [orders, setOrders] = useState([]);
  const [focusedIndex, setFocusedIndex] = useState(0); // which ticket is keyboard-focused
  const [actionFlash, setActionFlash] = useState(null); // brief visual feedback on keypress
  const MAX_VISIBLE = 3;

  const catNameById = {};
  if (menu) menu.categories.forEach(c => { catNameById[c.id] = c.name[lang] || c.name.en || ""; });

  // ── Live orders from Firebase ──────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
      setOrders(data);
    });
    return unsub;
  }, []);

  const active = orders.filter(o => !o.kitchenReady);
  const visible = active.slice(0, MAX_VISIBLE);
  const queued = active.slice(MAX_VISIBLE);
  const doneCount = orders.filter(o => o.kitchenReady).length;

  // Keep focused index in bounds when orders change
  useEffect(() => {
    if (focusedIndex >= visible.length && visible.length > 0) {
      setFocusedIndex(visible.length - 1);
    }
  }, [visible.length, focusedIndex]);

  // ── Flash feedback helper ──────────────────────────────────
  function flash(msg, color = "#15803D") {
    setActionFlash({ msg, color });
    setTimeout(() => setActionFlash(null), 1200);
  }

  // ── Keyboard / numpad handler ──────────────────────────────
  // All key logic lives here. The numpad USB dongle plugs into
  // the Pi and the browser sees standard keydown events —
  // identical to pressing keys on a laptop keyboard.
  //
  // NUMPAD MAPPING (what the cook presses):
  //   Enter        → advance focused order (new→in_progress, in_progress→done)
  //   +            → focus next ticket
  //   -            → focus previous ticket
  //   *            → undo focused order one step back (hard to press accidentally)
  //   1–9          → jump directly to ticket by position
  //   0            → reset focus to first ticket
  //
  //   Full keyboard fallbacks: ArrowRight/Left, Backspace, Escape also work.
  //
  const handleKeyDown = useCallback((e) => {
    // Don't steal keys when user is typing in an input/textarea
    if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;

    const order = visible[focusedIndex];

    // Normalize numpad keys — e.code is the physical key, e.key varies by OS/NumLock
    let key = e.key;
    if (e.code === "NumpadEnter")    key = "Enter";
    if (e.code === "NumpadAdd")      key = "+";
    if (e.code === "NumpadSubtract") key = "-";
    if (e.code === "NumpadMultiply") key = "*";

    switch (key) {
      // ── ENTER: advance order status ────────────────────────
      case "Enter": {
        e.preventDefault();
        if (!order || order.cancelled) return;
        if (order.status === "new") {
          updateOrderStatus(order.firestoreId, "in_progress");
          flash("🔥 Empezando...", "#D97706");
        } else if (order.status === "in_progress") {
          markKitchenReady(order);
          flash("✓ Listo!", "#15803D");
        }
        break;
      }

      // ── + (NumpadAdd): next ticket ─────────────────────────
      case "+": {
        e.preventDefault();
        setFocusedIndex(i => Math.min(i + 1, visible.length - 1));
        break;
      }

      // ── - (NumpadSubtract): previous ticket ───────────────
      case "-": {
        e.preventDefault();
        setFocusedIndex(i => Math.max(i - 1, 0));
        break;
      }

      // ── * (NumpadMultiply): undo one step ──────────────────
      case "*": {
        e.preventDefault();
        if (!order || order.cancelled) return;
        if (order.status === "in_progress") {
          updateOrderStatus(order.firestoreId, "new");
          flash("↩ Deshecho", "#D97706");
        }
        break;
      }

      // ── NUMBER KEYS 1–9: jump to ticket by position ────────
      case "1": case "2": case "3": case "4": case "5":
      case "6": case "7": case "8": case "9": {
        e.preventDefault();
        const idx = parseInt(key, 10) - 1;
        if (idx < visible.length) setFocusedIndex(idx);
        break;
      }

      // ── 0: reset focus to first ticket ────────────────────
      case "0": {
        e.preventDefault();
        setFocusedIndex(0);
        break;
      }

      // ── Full-keyboard fallbacks ────────────────────────────
      case "ArrowRight":
      case "Tab":      { e.preventDefault(); setFocusedIndex(i => Math.min(i + 1, visible.length - 1)); break; }
      case "ArrowLeft":{ e.preventDefault(); setFocusedIndex(i => Math.max(i - 1, 0)); break; }
      case "Backspace":
      case "Delete": {
        e.preventDefault();
        if (!order || order.cancelled) return;
        if (order.status === "in_progress") { updateOrderStatus(order.firestoreId, "new"); flash("↩ Deshecho", "#D97706"); }
        break;
      }
      case "Escape":   { e.preventDefault(); setFocusedIndex(0); break; }

      default:
        break;
    }
  }, [focusedIndex, visible]);

  // Attach and clean up the global keydown listener
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div style={S.kitchenRoot}>
      <div style={S.kitchenHeader}>
        <div style={S.kitchenHeaderLeft}>
          <span style={S.kitchenTitle}>👨‍🍳 {t.kitchenDisplay}</span>
          {queued.length > 0 && <span style={S.queuePill}>+{queued.length} {t.inQueue}</span>}
          {/* Keyboard mode indicator */}
          <span style={S.keyboardModePill}>⌨️ {t.keyboardMode}</span>
        </div>
        <div style={S.kitchenStats}>
          <span style={S.statPillRed}>{active.length} {t.active}</span>
          <span style={S.statPillGreen}>{doneCount} {t.done}</span>
        </div>
      </div>

      {/* Action flash feedback — big centered overlay so cooks can see it from far away */}
      {actionFlash && (
        <div style={{ ...S.actionFlash, background: actionFlash.color }}>
          {actionFlash.msg}
        </div>
      )}

      {/* Numpad shortcut legend — always visible at bottom of header */}
      <div style={S.shortcutBar}>
        <span style={S.shortcutItem}><kbd style={S.kbd}>ENTER</kbd> {t.shortcutAdvance}</span>
        <span style={S.shortcutItem}><kbd style={S.kbd}>+</kbd> {t.shortcutNext}</span>
        <span style={S.shortcutItem}><kbd style={S.kbd}>−</kbd> {t.shortcutPrev}</span>
        <span style={S.shortcutItem}><kbd style={S.kbd}>*</kbd> {t.shortcutUndo}</span>
        <span style={S.shortcutItem}><kbd style={S.kbd}>1–9</kbd> {t.shortcutJump}</span>
        <span style={S.shortcutItem}><kbd style={S.kbd}>0</kbd> {t.shortcutReset}</span>
      </div>

      {active.length === 0 ? (
        <div style={S.kitchenEmpty}>
          <div style={S.emptyCheck}>
            <div style={S.emptyCheckInner}>
              <div style={S.emptyCheckTitle}>{t.guestCheck}</div>
              <div style={S.emptyCheckmark}>✓</div>
              <div style={S.emptyCheckSub}>{t.allCaughtUp}</div>
              <div style={S.emptyCheckSubSmall}>{t.allCaughtUpSub}</div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ ...S.ticketGrid, gridTemplateColumns: `repeat(${Math.min(visible.length, MAX_VISIBLE)}, minmax(0, 1fr))` }}>
          {visible.map((order, idx) => (
            <div key={order.firestoreId} onClick={() => setFocusedIndex(idx)} style={{ cursor: "pointer" }}>
              <GuestCheckTicket
                order={order}
                t={t}
                isQueue={false}
                isFocused={idx === focusedIndex}
                catNameById={catNameById}
              />
            </div>
          ))}
        </div>
      )}

      {queued.length > 0 && (
        <div style={S.queueStrip}>
          <div style={S.queueLabel}>COLA / QUEUE</div>
          {queued.map(order => (
            <div key={order.firestoreId} style={S.queueItem}>
              <span style={S.queueOrderId}>#{order.id}</span>
              <span style={S.queueOrderTable}>{order.isToGo ? `🥡 ${order.toGoName}` : `${t.table2} ${order.table}`}</span>
              <span style={S.queueOrderItems}>{order.items.map(i => `${i.qty}× ${i.name}`).join(", ")}</span>
              <span style={S.queueOrderTime}>{elapsed(order.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// DRINKS / SIDES STATION TICKET
// ============================================================
function DrinksTicket({ order, t, catNameById, isFocused }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsedSecs = Math.floor((Date.now() - order.timestamp) / 1000);
  const isUrgent  = elapsedSecs > 600;
  const isWarning = elapsedSecs > 300;
  const timerColor = isUrgent ? "#BE202E" : isWarning ? "#D97706" : "#15803D";

  return (
    <div style={{
      ...S.ticket,
      borderTop: order.isToGo ? `5px solid ${TOGO_COLOR}` : undefined,
      outline: isFocused ? "4px solid #2563EB" : "none",
      outlineOffset: isFocused ? "3px" : "0",
      boxShadow: isFocused
        ? "0 0 0 4px rgba(37,99,235,0.25), 0 2px 10px rgba(0,0,0,0.08)"
        : "0 2px 10px rgba(0,0,0,0.08)",
    }}>
      {order.isToGo && (
        <div style={{ ...S.toGoBanner, background: TOGO_COLOR }}>
          🥡 PARA LLEVAR — {order.toGoName}
        </div>
      )}
      {order.modified && !order.cancelled && <div style={S.modifiedBanner}>⚡ {t.modified}</div>}

      <div style={S.ticketTop}>
        <div style={S.ticketTopLeft}>
          <div style={S.guestCheckTitle}>BEBIDAS / SIDES</div>
          <div style={S.ticketMeta}>
            {order.isToGo
              ? <span style={{ ...S.toGoNameBig, color: TOGO_COLOR }}>{order.toGoName}</span>
              : <span style={S.tableNumberBig}>{t.table2} {order.table}</span>}
          </div>
        </div>
        <div style={S.ticketTopRight}>
          <div style={S.checkNoLabel}>{t.checkNo}</div>
          <div style={S.checkNoValue}>{order.id}</div>
          <div style={{ ...S.timerBig, color: timerColor }}>⏱ {elapsed(order.timestamp)}</div>
        </div>
      </div>

      <div style={S.ruledLine} />
      <div style={S.colHeaders}>
        <span style={S.colQty}>{t.qty}</span>
        <span style={S.colItem}>{t.item}</span>
      </div>
      <div style={S.ruledLine} />

      <div style={S.itemsList}>
        {order.items?.map((item, idx) => {
          const rule = getDrinksRule(item.name, item.catName || catNameById?.[item.categoryId] || "");
          const color = rule ? rule.color : order.isToGo ? TOGO_COLOR : "#C0B8AC";
          const bg    = rule ? rule.bg    : order.isToGo ? TOGO_BG    : "transparent";
          const label = rule ? rule.label : null;
          const dimmed = !rule && !order.isToGo;
          return (
            <div key={idx} style={{
              ...S.itemRow,
              background: bg,
              opacity: dimmed ? 0.3 : 1,
              borderBottom: idx < order.items.length - 1 ? "1px solid #E5DFD0" : "none",
            }}>
              <span style={{ ...S.itemQty, color }}>{item.qty}</span>
              <div style={{ flex: 1 }}>
                <span style={{ ...S.itemName, color, fontWeight: rule || order.isToGo ? 900 : 700 }}>
                  {item.name}
                  {label && (
                    <span style={{ ...S.changeTag, background: color, color: "#fff", marginLeft: 6 }}>
                      {label}
                    </span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ ...S.ruledLine, borderColor: "#B8A88A", borderWidth: 2 }} />
      <div style={S.ticketFooter}>
        <div style={{ ...S.statusStamp, borderColor: STATUS_COLORS[order.status], color: STATUS_COLORS[order.status] }}>
          {order.status === "new" ? t.new : t.inProgress}
        </div>
        {!order.cancelled && (
          <div style={S.ticketBtns}>
            {order.status === "new" && (
              <button style={S.btnStart} onClick={() => updateOrderStatus(order.firestoreId, "in_progress")}>
                🔥 {t.startCooking}
              </button>
            )}
            {order.status === "in_progress" && (
              <button style={S.btnDone} onClick={() => markDrinksReady(order)}>
                ✓ {t.markDone}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// DRINKS / SIDES STATION SCREEN
// ============================================================
function DrinksStationScreen({ lang, menu }) {
  const t = T[lang];
  const [orders, setOrders]       = useState([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [actionFlash, setActionFlash]   = useState(null);
  const MAX_VISIBLE = 3;

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() })));
    });
    return unsub;
  }, []);

  const catNameById = {};
  if (menu) menu.categories.forEach(c => { catNameById[c.id] = c.name[lang] || c.name.en || ""; });

  const active  = orders.filter(o => !o.drinksReady && orderHasDrinksItems(o));
  const visible = active.slice(0, MAX_VISIBLE);
  const queued  = active.slice(MAX_VISIBLE);

  useEffect(() => {
    if (focusedIndex >= visible.length && visible.length > 0) setFocusedIndex(visible.length - 1);
  }, [visible.length, focusedIndex]);

  function flash(msg, color = "#15803D") {
    setActionFlash({ msg, color });
    setTimeout(() => setActionFlash(null), 1200);
  }

  const handleKeyDown = useCallback((e) => {
    if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
    const order = visible[focusedIndex];
    let key = e.key;
    if (e.code === "NumpadEnter")    key = "Enter";
    if (e.code === "NumpadAdd")      key = "+";
    if (e.code === "NumpadSubtract") key = "-";
    if (e.code === "NumpadMultiply") key = "*";
    switch (key) {
      case "Enter": {
        e.preventDefault();
        if (!order || order.cancelled) return;
        if (order.status === "new") { updateOrderStatus(order.firestoreId, "in_progress"); flash("🔥 Empezando...", "#D97706"); }
        else if (order.status === "in_progress") { markDrinksReady(order); flash("✓ Listo!", "#15803D"); }
        break;
      }
      case "+": { e.preventDefault(); setFocusedIndex(i => Math.min(i + 1, visible.length - 1)); break; }
      case "-": { e.preventDefault(); setFocusedIndex(i => Math.max(i - 1, 0)); break; }
      case "*": {
        e.preventDefault();
        if (!order || order.cancelled) return;
        if (order.status === "in_progress") { updateOrderStatus(order.firestoreId, "new"); flash("↩ Deshecho", "#D97706"); }
        break;
      }
      default: break;
    }
  }, [focusedIndex, visible]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div style={S.kitchenRoot}>
      <div style={S.kitchenHeader}>
        <div style={S.kitchenHeaderLeft}>
          <span style={S.kitchenTitle}>🥤 Bebidas / Sides</span>
          {queued.length > 0 && <span style={S.queuePill}>+{queued.length} {t.inQueue}</span>}
        </div>
        <div style={S.kitchenStats}>
          <span style={S.statPillRed}>{active.length} {t.active}</span>
        </div>
      </div>

      {/* Color legend */}
      <div style={{ display: "flex", gap: 16, padding: "6px 16px", background: "#1E293B", flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "#C4B5FD", fontWeight: 800 }}>🟣 BEBIDA NO ALC.</span>
        <span style={{ fontSize: 11, color: "#FCA5A5", fontWeight: 800 }}>🔴 CALDO</span>
        <span style={{ fontSize: 11, color: "#FCD34D", fontWeight: 800 }}>🟤 PARA LLEVAR</span>
        <span style={{ fontSize: 11, color: "#86EFAC", fontWeight: 800 }}>🟢 GUACAMOLE</span>
      </div>

      {actionFlash && (
        <div style={{ ...S.actionFlash, background: actionFlash.color }}>{actionFlash.msg}</div>
      )}

      {active.length === 0 ? (
        <div style={S.kitchenEmpty}>
          <div style={S.emptyCheck}>
            <div style={S.emptyCheckInner}>
              <div style={S.emptyCheckTitle}>BEBIDAS / SIDES</div>
              <div style={S.emptyCheckmark}>✓</div>
              <div style={S.emptyCheckSub}>{t.allCaughtUp}</div>
              <div style={S.emptyCheckSubSmall}>{t.allCaughtUpSub}</div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ ...S.ticketGrid, gridTemplateColumns: `repeat(${Math.min(visible.length, MAX_VISIBLE)}, minmax(0, 1fr))` }}>
          {visible.map((order, idx) => (
            <div key={order.firestoreId} onClick={() => setFocusedIndex(idx)} style={{ cursor: "pointer" }}>
              <DrinksTicket order={order} t={t} catNameById={catNameById} isFocused={idx === focusedIndex} />
            </div>
          ))}
        </div>
      )}

      {queued.length > 0 && (
        <div style={S.queueStrip}>
          <div style={S.queueLabel}>COLA / QUEUE</div>
          {queued.map(order => (
            <div key={order.firestoreId} style={S.queueItem}>
              <span style={S.queueOrderId}>#{order.id}</span>
              <span style={S.queueOrderTable}>{order.isToGo ? `🥡 ${order.toGoName}` : `${t.table2} ${order.table}`}</span>
              <span style={S.queueOrderItems}>
                {order.items?.filter(i => getDrinksRule(i.name) || order.isToGo).map(i => `${i.qty}× ${i.name}`).join(", ")}
              </span>
              <span style={S.queueOrderTime}>{elapsed(order.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// EXPO TICKET
// ============================================================
function ExpoTicket({ order, catNameById }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const getCat = (item) => item.catName || catNameById?.[item.categoryId] || "";
  const kitchenItems = order.items?.filter(i => !isKitchenDimmed(i.name, getCat(i))) || [];
  const drinksItems  = order.items?.filter(i => getDrinksRule(i.name, getCat(i))) || [];
  const hasKitchen = kitchenItems.length > 0;
  const hasDrinks  = drinksItems.length > 0;
  const kitchenDone = !hasKitchen || !!order.kitchenReady;
  const drinksDone  = !hasDrinks  || !!order.drinksReady;
  const allDone = kitchenDone && drinksDone;

  const elapsedSecs = Math.floor((Date.now() - order.timestamp) / 1000);
  const isUrgent  = elapsedSecs > 600;
  const isWarning = elapsedSecs > 300;
  const timerColor = isUrgent ? "#BE202E" : isWarning ? "#D97706" : "#15803D";

  return (
    <div
      className={allDone ? "expo-ticket-ready" : ""}
      style={{
        background: "#FFFFFF",
        border: allDone ? "3px solid #15803D" : "1.5px solid #E0D8C4",
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "border-color 0.3s, box-shadow 0.3s",
        boxShadow: allDone ? "0 4px 20px rgba(21,128,61,0.3)" : "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div style={{ background: allDone ? "#DCFCE7" : "#F5EFE0", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 800, color: "#9B8B72", letterSpacing: "0.18em", textTransform: "uppercase" }}>
            {order.isToGo ? "Para Llevar" : "Mesa"}
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.02em", color: allDone ? "#15803D" : "#1A1A1A" }}>
            {order.isToGo ? order.toGoName : order.table}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#BE202E", letterSpacing: "0.05em" }}>#{order.id}</div>
          <div style={{ fontSize: 14, fontWeight: 900, color: timerColor, marginTop: 2 }}>⏱ {elapsed(order.timestamp)}</div>
        </div>
      </div>

      {order.modified && <div style={{ background: "#7C3AED", color: "#fff", fontSize: 10, fontWeight: 900, padding: "3px 10px", textAlign: "center", letterSpacing: "0.06em" }}>⚡ MODIFICADA</div>}

      {/* Station columns */}
      <div style={{ display: "flex", flex: 1, minHeight: 100 }}>
        {hasKitchen && (
          <div style={{ flex: 1, padding: "10px 12px", background: order.kitchenReady ? "#F0FDF4" : "#FFFBEB", borderRight: hasDrinks ? "1px solid #E0D8C4" : "none" }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", color: order.kitchenReady ? "#15803D" : "#D97706", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              🍳 COCINA
              {order.kitchenReady && <span>✅</span>}
            </div>
            {kitchenItems.map((item, i) => (
              <div key={i} style={{ fontSize: 13, fontWeight: 700, color: order.kitchenReady ? "#9CA3AF" : "#1A1A1A", textDecoration: order.kitchenReady ? "line-through" : "none", marginBottom: 3, lineHeight: 1.3 }}>
                <span style={{ fontWeight: 900 }}>{item.qty}×</span> {item.name}
              </div>
            ))}
            <div style={{ marginTop: 8, background: order.kitchenReady ? "#DCFCE7" : order.status === "in_progress" ? "#FEF3C7" : "#F5F3F0", color: order.kitchenReady ? "#15803D" : order.status === "in_progress" ? "#D97706" : "#9CA3AF", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 800, textAlign: "center", letterSpacing: "0.05em" }}>
              {order.kitchenReady ? "✅ LISTO" : order.status === "in_progress" ? "🔥 COCINANDO" : "⏳ EN COLA"}
            </div>
          </div>
        )}

        {hasDrinks && (
          <div style={{ flex: 1, padding: "10px 12px", background: order.drinksReady ? "#F0FDF4" : "#F5F3FF" }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", color: order.drinksReady ? "#15803D" : "#7C3AED", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              🥤 BEBIDAS
              {order.drinksReady && <span>✅</span>}
            </div>
            {drinksItems.map((item, i) => (
              <div key={i} style={{ fontSize: 13, fontWeight: 700, color: order.drinksReady ? "#9CA3AF" : "#1A1A1A", textDecoration: order.drinksReady ? "line-through" : "none", marginBottom: 3, lineHeight: 1.3 }}>
                <span style={{ fontWeight: 900 }}>{item.qty}×</span> {item.name}
              </div>
            ))}
            <div style={{ marginTop: 8, background: order.drinksReady ? "#DCFCE7" : "#EDE9FE", color: order.drinksReady ? "#15803D" : "#7C3AED", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 800, textAlign: "center", letterSpacing: "0.05em" }}>
              {order.drinksReady ? "✅ LISTO" : "⏳ PREPARANDO"}
            </div>
          </div>
        )}

        {!hasKitchen && !hasDrinks && (
          <div style={{ flex: 1, padding: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {order.items?.map((item, i) => (
              <div key={i} style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A", marginBottom: 3 }}>
                {item.qty}× {item.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      {order.note && (
        <div style={{ padding: "5px 12px", background: "#FFFBEB", borderTop: "1px solid #E0D8C4", fontSize: 11, color: "#666", fontStyle: "italic" }}>
          📝 {order.note}
        </div>
      )}

      {/* Footer: status / bump */}
      <div style={{ padding: "10px 14px", background: allDone ? "#15803D" : "#F5F3F0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, borderTop: allDone ? "none" : "1px solid #E0D8C4" }}>
        {allDone ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#FFFFFF", letterSpacing: "0.04em" }}>
              🚀 LISTO PARA ENTREGAR
            </div>
            <button
              onClick={() => bumpOrder(order)}
              style={{ background: "#FFFFFF", color: "#15803D", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 900, cursor: "pointer", letterSpacing: "0.06em", whiteSpace: "nowrap", flexShrink: 0 }}
            >
              BUMP ✓
            </button>
          </>
        ) : (
          <div style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", width: "100%", textAlign: "center" }}>
            {!kitchenDone && !drinksDone
              ? "Esperando Cocina y Bebidas"
              : !kitchenDone
              ? "Esperando Cocina..."
              : "Esperando Bebidas..."}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// EXPO SCREEN
// ============================================================
function ExpoScreen({ menu }) {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("timestamp", "asc"));
    return onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })));
    });
  }, []);

  // Auto-complete orders that have been allReady for >90s but weren't bumped
  useEffect(() => {
    const stale = orders.filter(o => o.allReady && o.allReadyAt && Date.now() - o.allReadyAt > 90000);
    stale.forEach(o => bumpOrder(o));
  }, [orders]);

  const catNameById = {};
  if (menu) menu.categories.forEach(c => { catNameById[c.id] = c.name.es || c.name.en || ""; });

  const isOrderReady = (o) => {
    const hasK = orderHasKitchenItems(o);
    const hasD = orderHasDrinksItems(o);
    return (!hasK || !!o.kitchenReady) && (!hasD || !!o.drinksReady);
  };

  const readyOrders  = orders.filter(isOrderReady);
  const activeOrders = orders.filter(o => !isOrderReady(o));
  const cols = Math.min(Math.max(orders.length, 1), 4);

  return (
    <div style={S.kitchenRoot}>
      <div style={S.kitchenHeader}>
        <div style={S.kitchenHeaderLeft}>
          <span style={S.kitchenTitle}>🎯 Expo / Entrega</span>
          {readyOrders.length > 0 && (
            <span className="expo-badge-pulse" style={{ ...S.queuePill, background: "#15803D" }}>
              {readyOrders.length} LISTA{readyOrders.length > 1 ? "S" : ""}
            </span>
          )}
        </div>
        <div style={S.kitchenStats}>
          <span style={S.statPillRed}>{activeOrders.length} en proceso</span>
          <span style={S.statPillGreen}>{readyOrders.length} lista{readyOrders.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {orders.length === 0 ? (
        <div style={S.kitchenEmpty}>
          <div style={S.emptyCheck}>
            <div style={S.emptyCheckInner}>
              <div style={S.emptyCheckTitle}>EXPO</div>
              <div style={S.emptyCheckmark}>✓</div>
              <div style={S.emptyCheckSub}>Todo al día</div>
              <div style={S.emptyCheckSubSmall}>Sin órdenes pendientes</div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 14, padding: 16, alignItems: "start", overflowY: "auto" }}>
          {/* Ready orders first (at top) */}
          {readyOrders.map(order => (
            <ExpoTicket key={order.firestoreId} order={order} catNameById={catNameById} />
          ))}
          {activeOrders.map(order => (
            <ExpoTicket key={order.firestoreId} order={order} catNameById={catNameById} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// TABLE SELECT SCREEN
// ============================================================
const TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function TableSelectScreen({ lang: _lang, onSelectTable, onSelectToGo }) {
  const [orders, setOrders] = useState([]);
  const [closing, setClosing] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const activeByTable = {};
  orders.filter(o => o.status !== "done" && !o.isToGo).forEach(o => {
    if (!activeByTable[o.table]) activeByTable[o.table] = [];
    activeByTable[o.table].push(o);
  });
  const toGoOrders = orders.filter(o => o.status !== "done" && o.isToGo);

  async function handleClose(tableNum, e) {
    e.stopPropagation();
    setClosing(tableNum);
    await closeTable(activeByTable[tableNum] || []);
    setClosing(null);
  }

  return (
    <div style={S.tableSelectRoot}>
      <div style={S.tableSelectHeader}>
        <span style={S.tableSelectTitle}>🍽️ Dona Paty's</span>
        <span style={S.tableSelectSub}>Selecciona una mesa para ordenar</span>
      </div>

      <div style={S.tableGrid}>
        {TABLES.map(num => {
          const key = num.toString();
          const tableOrders = activeByTable[key] || [];
          const occupied = tableOrders.length > 0;
          const itemCount = tableOrders.reduce((s, o) => s + (o.items?.length || 0), 0);
          const earliest = occupied ? Math.min(...tableOrders.map(o => o.timestamp)) : null;
          const isClosing = closing === key;

          return (
            <div
              key={num}
              style={{ ...S.tableCard, ...(occupied ? S.tableCardOccupied : S.tableCardFree) }}
              onClick={() => onSelectTable(key, tableOrders)}
            >
              <div style={S.tableCardNum}>{num}</div>
              <div style={{ ...S.tableCardLabel, color: occupied ? "#92400E" : "#15803D" }}>
                {occupied ? "OCUPADA" : "LIBRE"}
              </div>
              {occupied && (
                <>
                  <div style={S.tableCardItems}>{itemCount} artículo{itemCount !== 1 ? "s" : ""}</div>
                  <div style={S.tableCardTimer}>⏱ {elapsed(earliest)}</div>
                  <button
                    style={{ ...S.tableCardCloseBtn, opacity: isClosing ? 0.5 : 1 }}
                    onClick={(e) => handleClose(key, e)}
                    disabled={isClosing}
                  >
                    {isClosing ? "..." : "✓ Cerrar Mesa"}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div style={S.toGoRow}>
        <button style={S.toGoCardBtn} onClick={onSelectToGo}>
          🥡 Para Llevar
          {toGoOrders.length > 0 && (
            <span style={S.toGoBadgeCount}>{toGoOrders.length} activa{toGoOrders.length !== 1 ? "s" : ""}</span>
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// WAITER SCREEN
// ============================================================
function WaiterScreen({ menu, onOrderSent, lang, initialTable, initialOrderType, onBack }) {
  const t = T[lang];
  const [activeCategory, setActiveCategory] = useState(menu.categories[0]?.id);
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState(initialOrderType || "table");
  const [tableNum, setTableNum] = useState(initialTable || "");
  const [toGoName, setToGoName] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [note, setNote] = useState("");
  const [editingOrder, setEditingOrder] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const [showActiveOrders, setShowActiveOrders] = useState(false);
  const [modModalItem, setModModalItem] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
      setActiveOrders(data.filter(o => o.status !== "done"));
    });
    return unsub;
  }, []);

  const filteredItems = menu.items.filter(i => i.categoryId === activeCategory);
  const cartTotal = cart.reduce((sum, i) => sum + (i.price + (i.modifiers?.reduce((ms, m) => ms + m.price, 0) ?? 0)) * i.qty, 0);
  const isEditing = !!editingOrder;
  const identifier = orderType === "togo" ? toGoName : tableNum;
  const canSend = identifier.trim() && (cart.length > 0 || isEditing);
  const isCancellingOrder = isEditing && cart.every(i => i.qty === 0);

  function getItemDisplayName(item) {
    if (lang === "es" && item.nameEs) return item.nameEs;
    return item.name;
  }

  function handleItemTap(item) { setModModalItem(item); }

  function handleModifierConfirm(selectedMods, specialNote) {
    const item = modModalItem;
    setModModalItem(null);
    const cat = menu.categories.find(c => c.id === item.categoryId);
    const catName = cat ? (cat.name.en || cat.name.es || "") : "";
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, catName, displayName: getItemDisplayName(item), qty: 1, modifiers: selectedMods, specialNote: specialNote || null }];
    });
  }

  function removeFromCart(id) {
    setCart(prev => {
      const existing = prev.find(c => c.id === id);
      if (existing?.qty === 1) {
        if (isEditing) return prev.map(c => c.id === id ? { ...c, qty: 0 } : c);
        return prev.filter(c => c.id !== id);
      }
      return prev.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c);
    });
  }

  function loadOrderForEdit(order) {
    setEditingOrder(order);
    setCart([...order.items.map(i => ({ ...i }))]);
    setNote(order.note || "");
    setOrderType(order.isToGo ? "togo" : "table");
    if (order.isToGo) setToGoName(order.toGoName || "");
    else setTableNum(order.table || "");
    setShowActiveOrders(false);
  }

  function cancelEdit() {
    setEditingOrder(null); setCart([]); setNote(""); setTableNum(""); setToGoName("");
  }

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    if (isEditing) {
      const isCancelled = cart.every(i => i.qty === 0);
      if (isCancelled) {
        await cancelKitchenOrder(editingOrder.firestoreId);
      } else {
        await editKitchenOrder(editingOrder.firestoreId, editingOrder.items, cart, note);
        await updateOrderInClover({ ...editingOrder, items: cart, note });
      }
      setSending(false); setSent(true);
      setTimeout(() => { setSent(false); cancelEdit(); }, 2000);
    } else {
      const order = {
        id: genId(), table: orderType === "table" ? tableNum : null,
        isToGo: orderType === "togo", toGoName: orderType === "togo" ? toGoName : null,
        items: cart.map(i => ({ ...i, name: i.name })), note, total: cartTotal,
        timestamp: Date.now(), status: "new", editHistory: [],
      };
      const cloverOrderId = await sendOrderToClover(order);
      await pushOrderToKitchen({ ...order, cloverOrderId: cloverOrderId || null });
      setSending(false); setSent(true);
      onOrderSent?.(order);
      setTimeout(() => {
        setCart([]); setNote(""); setSent(false);
        if (!initialTable && orderType !== "togo") { setTableNum(""); }
        if (orderType === "togo") setToGoName("");
      }, 2000);
    }
  }

  return (
    <div style={S.waiterRoot}>
      {modModalItem && (
        <ModifierModal item={modModalItem} displayName={getItemDisplayName(modModalItem)} lang={lang} onConfirm={handleModifierConfirm} onClose={() => setModModalItem(null)} />
      )}
      <div style={S.waiterHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {onBack && (
            <button style={S.backBtn} onClick={onBack}>← Mesas</button>
          )}
          {initialTable ? (
            <span style={S.waiterTableBig}>🪑 Mesa {initialTable}</span>
          ) : initialOrderType === "togo" ? (
            <span style={S.waiterTableBig}>🥡 Para Llevar</span>
          ) : (
            <span style={S.waiterLogo}>🍽️ {t.orderStation}</span>
          )}
          {isEditing && <span style={S.editingBadge}>✏️ {t.editOrder}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {activeOrders.length > 0 && (
            <button style={S.activeOrdersBtn} onClick={() => setShowActiveOrders(v => !v)}>
              {t.activeOrders} <span style={S.activeOrdersBadge}>{activeOrders.length}</span>
            </button>
          )}
          {!initialTable && initialOrderType !== "togo" && (
            <div style={S.orderTypeToggle}>
              <button style={{ ...S.typeBtn, ...(orderType === "table" ? S.typeBtnActive : {}) }} onClick={() => setOrderType("table")}>🪑 {t.table}</button>
              <button style={{ ...S.typeBtn, ...(orderType === "togo" ? S.typeBtnToGo : {}) }} onClick={() => setOrderType("togo")}>🥡 {t.toGo}</button>
            </div>
          )}
          {initialOrderType === "togo" && (
            <div style={{ ...S.tableInput, ...S.tableInputToGo }}>
              <span style={{ ...S.tableLabel, color: "#0369A1" }}>🥡</span>
              <input
                style={{ ...S.tableField, width: 130 }}
                value={toGoName}
                onChange={e => setToGoName(e.target.value)}
                placeholder={t.toGoName}
                maxLength={30}
              />
            </div>
          )}
          {!initialTable && !initialOrderType && (
            <div style={{ ...S.tableInput, ...(orderType === "togo" ? S.tableInputToGo : {}) }}>
              <span style={{ ...S.tableLabel, ...(orderType === "togo" ? { color: "#0369A1" } : {}) }}>{orderType === "togo" ? "🥡" : t.table}</span>
              <input
                style={{ ...S.tableField, width: orderType === "togo" ? 130 : 48 }}
                value={orderType === "togo" ? toGoName : tableNum}
                onChange={e => orderType === "togo" ? setToGoName(e.target.value) : setTableNum(e.target.value)}
                placeholder={orderType === "togo" ? t.toGoName : "#"}
                maxLength={orderType === "togo" ? 30 : 3}
              />
            </div>
          )}
        </div>
      </div>
      {showActiveOrders && (
        <div style={S.activeOrdersDropdown}>
          <div style={S.dropdownTitle}>{t.activeOrders} — {t.editOrder}</div>
          {activeOrders.map(order => (
            <button key={order.firestoreId} style={S.activeOrderRow} onClick={() => loadOrderForEdit(order)}>
              <span style={order.isToGo ? S.toGoChipSmall : S.tableChipSmall}>{order.isToGo ? `🥡 ${order.toGoName}` : `${t.table2} ${order.table}`}</span>
              <span style={S.activeOrderItems}>{order.items.map(i => `${i.emoji}×${i.qty}`).join(" ")}</span>
              <span style={S.activeOrderEdit}>✏️ {t.editOrder}</span>
            </button>
          ))}
        </div>
      )}
      <div style={S.waiterBody}>
        <div style={S.catRow}>
          {menu.categories.map(cat => (
            <button key={cat.id} style={{ ...S.catBtn, ...(activeCategory === cat.id ? S.catBtnActive : {}) }} onClick={() => setActiveCategory(cat.id)}>
              {cat.name[lang] || cat.name.en}
            </button>
          ))}
        </div>
        <div style={S.menuGrid}>
          {filteredItems.map(item => {
            const inCart = cart.find(c => c.id === item.id);
            const displayName = getItemDisplayName(item);
            return (
              <button key={item.id} style={{ ...S.menuItem, ...(inCart ? S.menuItemActive : {}) }} onClick={() => handleItemTap(item)}>
                <span style={S.menuEmoji}>{item.emoji}</span>
                <span style={S.menuName}>{displayName}</span>
                <span style={S.menuPrice}>{fmt(item.price)}</span>
                {inCart && <span style={S.menuBadge}>×{inCart.qty}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div style={S.cartPanel}>
        <div style={S.cartTitle}>{t.orderSummary}</div>
        {cart.filter(i => i.qty > 0).length === 0 && isEditing ? (
          <div style={S.cartCancelWarning}>🚫 All items removed — this will cancel the order</div>
        ) : cart.length === 0 ? (
          <div style={S.cartEmpty}>{t.tapToAdd}</div>
        ) : (
          <div style={S.cartItems}>
            {cart.map(item => (
              <div key={item.id} style={{ ...S.cartRow, opacity: item.qty === 0 ? 0.4 : 1, textDecoration: item.qty === 0 ? "line-through" : "none" }}>
                <div style={{ flex: 1 }}>
                  <span style={S.cartName}>{item.emoji} {item.displayName || item.name}</span>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div style={S.cartModifiers}>
                      {item.modifiers.map((mod, mi) => {
                        const isRemoval = REMOVE_TRIGGERS.some(w => mod.name.toLowerCase().includes(w));
                        return (
                          <span key={mi} style={{ ...S.cartModChip, color: isRemoval ? "#BE202E" : "#15803D", fontWeight: 800 }}>
                            {isRemoval ? "− " : "+ "}{mod.name.toUpperCase()}{mod.price > 0 ? ` (${fmt(mod.price)})` : ""}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {item.specialNote && (
                    <div style={S.cartSpecialNoteBlock}>
                      {parseSpecialNote(item.specialNote).map((seg, si) => (
                        <div key={si} style={{ ...S.cartSpecialNoteLine, color: seg.type === "add" ? "#15803D" : seg.type === "remove" ? "#BE202E" : "#1A1A1A" }}>
                          {seg.type === "add" ? "+ " : seg.type === "remove" ? "− " : ""}{seg.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={S.cartQtyRow}>
                  <button style={S.qtyBtn} onClick={() => removeFromCart(item.id)}>−</button>
                  <span style={S.cartQty}>{item.qty}</span>
                  <button style={S.qtyBtn} onClick={() => handleItemTap(item)}>+</button>
                  <span style={S.cartItemTotal}>{fmt((item.price + (item.modifiers?.reduce((s, m) => s + m.price, 0) ?? 0)) * item.qty)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <textarea style={S.noteField} placeholder={t.specialInstructions} value={note} onChange={e => setNote(e.target.value)} rows={2} />
        <div style={S.cartFooter}>
          <span style={S.cartTotal}>{fmt(cartTotal)}</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {isEditing && <button style={S.cancelBtn} onClick={cancelEdit}>{t.cancelEdit}</button>}
            {isEditing && <button style={S.cancelOrderBtn} onClick={() => setCart(cart.map(i => ({ ...i, qty: 0 })))}>🚫 Cancel Order</button>}
            <button
              style={{ ...S.sendBtn, ...(isCancellingOrder ? S.sendBtnCancel : isEditing ? S.sendBtnEdit : {}), ...(sent ? S.sendBtnSent : {}), ...(!canSend ? S.sendBtnDisabled : {}) }}
              onClick={handleSend} disabled={sending || !canSend}
            >
              {sent ? (isEditing ? t.updated : t.sent) : sending ? t.sending : isCancellingOrder ? "🚫 Confirm Cancel" : isEditing ? t.updateOrder : t.sendToKitchen}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// HISTORY SCREEN
// ============================================================
function HistoryScreen({ lang }) {
  const t = T[lang];
  const [history, setHistory] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "completedOrders"), orderBy("completedAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() })));
    });
    return unsub;
  }, []);

  const totalRevenue = history.reduce((sum, o) => sum + o.total, 0);
  const avgDuration = history.length ? history.reduce((sum, o) => sum + (o.duration || 0), 0) / history.length : 0;
  const itemStats = {};
  history.forEach(order => {
    order.items?.forEach(item => {
      if (!itemStats[item.name]) itemStats[item.name] = { count: 0, totalTime: 0, emoji: item.emoji };
      itemStats[item.name].count += item.qty;
      itemStats[item.name].totalTime += order.duration || 0;
    });
  });
  const itemList = Object.entries(itemStats).map(([name, s]) => ({ name, ...s, avgTime: s.totalTime / s.count })).sort((a, b) => b.count - a.count);

  return (
    <div style={S.historyRoot}>
      <div style={S.statsRow}>
        <div style={S.statCard}><div style={S.statValue}>{history.length}</div><div style={S.statLabel}>{t.totalOrders}</div></div>
        <div style={S.statCard}><div style={S.statValue}>{fmt(totalRevenue)}</div><div style={S.statLabel}>{t.totalRevenue}</div></div>
        <div style={S.statCard}><div style={S.statValue}>{fmtDuration(avgDuration, lang)}</div><div style={S.statLabel}>{t.avgTime}</div></div>
      </div>
      <div style={S.historyColumns}>
        <div style={S.historyPanel}>
          <div style={S.panelTitle}>{t.historyTitle}</div>
          {history.length === 0 ? <div style={S.historyEmpty}>{t.noHistory}</div> : history.map(order => (
            <div key={order.firestoreId} style={S.historyCard}>
              <button style={S.historyCardHeader} onClick={() => setExpandedId(expandedId === order.firestoreId ? null : order.firestoreId)}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {order.isToGo ? <span style={S.toGoChipSmall}>🥡 {order.toGoName}</span> : <span style={S.historyTable}>{t.table2} {order.table}</span>}
                  {order.modified && <span style={S.modifiedChip}>⚡ {t.modified}</span>}
                  <span style={S.historyId}>#{order.id}</span>
                </div>
                <span style={S.historyTotal}>{fmt(order.total)}</span>
              </button>
              <div style={S.historyItems}>{order.items?.map((item, i) => <span key={i} style={S.historyItem}>{item.emoji} {item.name} ×{item.qty}</span>)}</div>
              <div style={S.historyMeta}>
                <span>⏱ {t.duration}: {fmtDuration(order.duration, lang)}</span>
                {order.note && <span>📝 {order.note}</span>}
              </div>
            </div>
          ))}
        </div>
        <div style={S.historyPanel}>
          <div style={S.panelTitle}>{t.itemAnalysis}</div>
          {itemList.length === 0 ? <div style={S.historyEmpty}>{t.noHistory}</div> : itemList.map(item => (
            <div key={item.name} style={S.itemStatCard}>
              <span style={S.itemStatEmoji}>{item.emoji}</span>
              <div style={S.itemStatInfo}>
                <div style={S.itemStatName}>{item.name}</div>
                <div style={S.itemStatMeta}>{item.count} {t.orders} · {t.prepTime}: {fmtDuration(item.avgTime, lang)}</div>
              </div>
              <div style={S.itemStatCount}>{item.count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// HISTORY PIN MODAL
// ============================================================
const HISTORY_PIN = "1234";

function PinModal({ onSuccess, onClose }) {
  const [pin, setPin] = useState("");
  const [shaking, setShaking] = useState(false);

  function handleDigit(d) {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      if (next === HISTORY_PIN) {
        setTimeout(onSuccess, 200);
      } else {
        setShaking(true);
        setTimeout(() => { setPin(""); setShaking(false); }, 700);
      }
    }
  }

  function handleBack() { setPin(p => p.slice(0, -1)); }

  const KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "⌫"];

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={{ background: "#1E293B", borderRadius: 20, padding: "32px 28px", width: 280, textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 11, fontWeight: 900, color: "#64748B", letterSpacing: "0.2em", marginBottom: 24 }}>🔒 HISTORIAL — ACCESO RESTRINGIDO</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 28, ...(shaking ? { animation: "shake 0.5s ease" } : {}) }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ width: 16, height: 16, borderRadius: "50%", background: shaking ? "#BE202E" : pin.length > i ? "#FFFFFF" : "#334155", transition: "background 0.15s" }} />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {KEYS.map((k, i) => (
            <button
              key={i}
              disabled={k === null}
              onClick={() => k === "⌫" ? handleBack() : k !== null && handleDigit(String(k))}
              style={{
                background: k === null ? "transparent" : k === "⌫" ? "#1E293B" : "#334155",
                border: k === "⌫" ? "1px solid #475569" : "none",
                borderRadius: 12,
                color: "#FFFFFF",
                fontSize: k === "⌫" ? 18 : 22,
                fontWeight: 700,
                padding: "15px 0",
                cursor: k === null ? "default" : "pointer",
                transition: "background 0.1s",
              }}
            >
              {k === null ? "" : k}
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ marginTop: 20, background: "none", border: "none", color: "#475569", fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.08em" }}>
          CANCELAR
        </button>
      </div>
    </div>
  );
}

// ============================================================
// ROOT APP
// ============================================================
export default function App() {
  const [view, setView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("screen");
    return s || "tables";
  });
  const [orderContext, setOrderContext] = useState(null); // { table, orderType }
  const [menu, setMenu] = useState(null);
  const [lang, setLang] = useState("es");
  const [activeOrders, setActiveOrders] = useState(0);
  const [readyCount, setReadyCount] = useState(0);
  const [translating, setTranslating] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const translationCache = useRef({});
  const t = T[lang];

  useEffect(() => {
    fetchAllModifierGroups();
    fetchMenuFromClover().then(async (rawMenu) => {
      setMenu(rawMenu);
      if (lang === "es") await applyTranslations(rawMenu);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!menu) return;
    if (lang === "es") applyTranslations(menu);
    else setMenu(prev => ({ ...prev, items: prev.items.map(item => ({ ...item, nameEs: item.nameEs || null })) }));
  }, [lang, menu]);

  async function applyTranslations(currentMenu) {
    const needsTranslation = currentMenu.items.filter(item => !translationCache.current[item.id] && !item.nameEs);
    if (needsTranslation.length === 0) {
      setMenu(prev => ({ ...prev, items: prev.items.map(item => ({ ...item, nameEs: translationCache.current[item.id] || item.nameEs || item.name })) }));
      return;
    }
    setTranslating(true);
    const translated = await translateMenuItemsToSpanish(needsTranslation);
    if (translated) needsTranslation.forEach((item, idx) => { translationCache.current[item.id] = translated[idx]; });
    setTranslating(false);
    setMenu(prev => ({ ...prev, items: prev.items.map(item => ({ ...item, nameEs: translationCache.current[item.id] || item.nameEs || item.name })) }));
  }

  useEffect(() => {
    const q = query(collection(db, "orders"));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data());
      setActiveOrders(docs.length);
      setReadyCount(docs.filter(o => {
        const hasK = o.items?.some(i => !isKitchenDimmed(i.name, i.catName || ""));
        const hasD = orderHasDrinksItems(o);
        return (!hasK || !!o.kitchenReady) && (!hasD || !!o.drinksReady);
      }).length);
    });
    return unsub;
  }, []);

  if (!menu) return (
    <div style={S.loading}>
      <div style={S.loadingSpinner} />
      <span style={{ color: "#BE202E", fontWeight: 700 }}>Cargando menú...</span>
    </div>
  );

  return (
    <div style={S.appRoot}>
      {pinOpen && <PinModal onSuccess={() => { setPinOpen(false); setView("history"); }} onClose={() => setPinOpen(false)} />}
      <div style={S.nav}>
        <div style={S.navLeft}>
          <button style={{ ...S.navBtn, ...((view === "tables" || view === "waiter") ? S.navBtnActive : {}) }} onClick={() => { setOrderContext(null); setView("tables"); }}>🍽️ {t.orderStation}</button>
          <button style={{ ...S.navBtn, ...(view === "kitchen" ? S.navBtnActive : {}) }} onClick={() => setView("kitchen")}>
            👨‍🍳 {t.kitchenDisplay}
            {activeOrders > 0 && <span style={S.navBadge}>{activeOrders}</span>}
          </button>
          <button style={{ ...S.navBtn, ...(view === "drinks" ? S.navBtnActive : {}), ...(view === "drinks" ? { color: "#7C3AED", borderBottom: "3px solid #7C3AED" } : {}) }} onClick={() => setView("drinks")}>🥤 Bebidas/Sides</button>
          <button style={{ ...S.navBtn, ...(view === "expo" ? S.navBtnActive : {}), ...(view === "expo" ? { color: "#15803D", borderBottom: "3px solid #15803D" } : {}) }} onClick={() => setView("expo")}>
            🎯 {t.expoDisplay}
            {readyCount > 0 && (
              <span className="expo-badge-pulse" style={{ ...S.navBadge, background: "#15803D" }}>
                {readyCount}
              </span>
            )}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {translating && <span style={S.translatingPill}>🌐 {t.translating}</span>}
          <button
            style={{ ...S.langBtn, ...(view === "history" ? { background: "#BE202E", color: "#fff", border: "1px solid #BE202E" } : {}) }}
            onClick={() => view === "history" ? setView("tables") : setPinOpen(true)}
            title="Historial (restringido)"
          >
            🔒
          </button>
          <button style={S.langBtn} onClick={() => setLang(l => l === "es" ? "en" : "es")}>{lang === "es" ? "🇺🇸 EN" : "🇲🇽 ES"}</button>
        </div>
      </div>
      {view === "tables" && (
        <TableSelectScreen
          lang={lang}
          onSelectTable={(tableNum) => {
            setOrderContext({ table: tableNum, orderType: "table" });
            setView("waiter");
          }}
          onSelectToGo={() => {
            setOrderContext({ table: null, orderType: "togo" });
            setView("waiter");
          }}
        />
      )}
      {view === "waiter" && (
        <WaiterScreen
          menu={menu}
          onOrderSent={() => {}}
          lang={lang}
          initialTable={orderContext?.table}
          initialOrderType={orderContext?.orderType}
          onBack={() => { setOrderContext(null); setView("tables"); }}
        />
      )}
      {view === "kitchen" && <KitchenScreen lang={lang} menu={menu} />}
      {view === "history" && <HistoryScreen lang={lang} />}
      {view === "drinks" && <DrinksStationScreen lang={lang} menu={menu} />}
      {view === "expo" && <ExpoScreen menu={menu} />}
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const S = {
  // TABLE SELECT
  tableSelectRoot: { flex: 1, display: "flex", flexDirection: "column", background: "#F5F3F0", minHeight: "calc(100vh - 53px)", padding: "24px 20px" },
  tableSelectHeader: { marginBottom: 24, textAlign: "center" },
  tableSelectTitle: { fontSize: 26, fontWeight: 900, color: "#1A1A1A", letterSpacing: "-0.02em" },
  tableSelectSub: { display: "block", fontSize: 13, color: "#888", marginTop: 4 },
  tableGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, maxWidth: 540, margin: "0 auto", width: "100%" },
  tableCard: { borderRadius: 16, padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", border: "2px solid transparent", transition: "all 0.15s", userSelect: "none" },
  tableCardFree: { background: "#FFFFFF", border: "2px solid #D1FAE5", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  tableCardOccupied: { background: "#FFFBEB", border: "2px solid #FCD34D", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
  tableCardNum: { fontSize: 48, fontWeight: 900, color: "#1A1A1A", lineHeight: 1 },
  tableCardLabel: { fontSize: 10, fontWeight: 900, letterSpacing: "0.12em" },
  tableCardItems: { fontSize: 12, color: "#666", fontWeight: 600 },
  tableCardTimer: { fontSize: 12, fontWeight: 700, color: "#D97706" },
  tableCardCloseBtn: { marginTop: 6, background: "#15803D", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 800, cursor: "pointer", letterSpacing: "0.04em" },
  toGoRow: { maxWidth: 540, margin: "20px auto 0", width: "100%" },
  toGoCardBtn: { width: "100%", background: "#EFF6FF", border: "2px solid #BFDBFE", borderRadius: 16, padding: "18px 24px", fontSize: 18, fontWeight: 800, color: "#1D4ED8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 },
  toGoBadgeCount: { background: "#1D4ED8", color: "#fff", borderRadius: 20, fontSize: 11, padding: "2px 10px", fontWeight: 800 },
  backBtn: { background: "#F5F3F0", border: "1px solid #DDD", color: "#444", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  waiterTableBig: { fontSize: 20, fontWeight: 900, color: "#BE202E", letterSpacing: "-0.01em" },

  appRoot: { fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#F5F3F0", minHeight: "100vh", color: "#1A1A1A", display: "flex", flexDirection: "column" },
  nav: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FFFFFF", borderBottom: "2px solid #BE202E", padding: "0 12px", flexWrap: "wrap", gap: 4, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  navLeft: { display: "flex", flexWrap: "wrap" },
  navBtn: { background: "none", border: "none", color: "#666", padding: "14px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: "0.01em", whiteSpace: "nowrap" },
  navBtnActive: { color: "#BE202E", borderBottom: "3px solid #BE202E" },
  navBadge: { background: "#BE202E", color: "#fff", borderRadius: 10, fontSize: 10, padding: "1px 5px", marginLeft: 5, fontWeight: 800 },
  langBtn: { background: "#F5F3F0", border: "1px solid #DDD", color: "#1A1A1A", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  translatingPill: { background: "#FFF7ED", border: "1px solid #FED7AA", color: "#C2410C", borderRadius: 20, fontSize: 11, fontWeight: 700, padding: "4px 10px", whiteSpace: "nowrap" },
  loading: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 16, background: "#F5F3F0" },
  loadingSpinner: { width: 36, height: 36, border: "3px solid #E5E0D8", borderTop: "3px solid #BE202E", borderRadius: "50%", animation: "spin 0.8s linear infinite" },

  // ── KEYBOARD CONTROL UI ────────────────────────────────────
  keyboardModePill: { background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1D4ED8", borderRadius: 20, fontSize: 11, fontWeight: 700, padding: "3px 10px" },
  shortcutBar: { display: "flex", gap: 16, alignItems: "center", padding: "6px 16px", background: "#1E293B", flexWrap: "wrap" },
  shortcutItem: { display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#94A3B8", fontWeight: 600 },
  kbd: { background: "#334155", color: "#E2E8F0", border: "1px solid #475569", borderRadius: 4, padding: "1px 6px", fontSize: 11, fontFamily: "monospace", fontWeight: 700 },
  keyboardHintBar: { display: "flex", gap: 12, background: "#1D4ED8", padding: "6px 16px", flexWrap: "wrap" },
  keyboardHint: { fontSize: 11, color: "#BFDBFE", fontWeight: 600 },
  actionFlash: { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "#fff", fontSize: 36, fontWeight: 900, padding: "20px 40px", borderRadius: 16, zIndex: 9999, pointerEvents: "none", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", letterSpacing: "-0.01em" },

  // MODAL
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  modalBox: { background: "#FFFFFF", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" },
  modalHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid #F0EDE8" },
  modalTitle: { fontSize: 20, fontWeight: 900, color: "#1A1A1A", letterSpacing: "-0.01em" },
  modalSubtitle: { fontSize: 12, color: "#888", fontWeight: 600, marginTop: 2 },
  modalCloseBtn: { background: "#F5F3F0", border: "none", borderRadius: 8, width: 32, height: 32, fontSize: 16, cursor: "pointer", color: "#666", flexShrink: 0 },
  modalBody: { flex: 1, overflowY: "auto", padding: "12px 20px" },
  modalLoading: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "32px 0" },
  modalEmpty: { color: "#BBB", textAlign: "center", padding: "32px 0", fontSize: 14 },
  modGroup: { marginBottom: 18 },
  modGroupHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 6 },
  modGroupName: { fontSize: 14, fontWeight: 800, color: "#1A1A1A", letterSpacing: "-0.01em" },
  modGroupBadge: { color: "#fff", borderRadius: 20, padding: "2px 9px", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em" },
  modGroupHint: { fontSize: 11, color: "#AAA", fontWeight: 600 },
  modOptions: { display: "flex", flexDirection: "column", gap: 6 },
  modOption: { display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: "#F5F3F0", border: "2px solid transparent", borderRadius: 10, cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.1s" },
  modOptionSelected: { background: "#FFF1F2", border: "2px solid #BE202E" },
  modOptionIndicator: { fontSize: 18, color: "#BE202E", minWidth: 20, textAlign: "center" },
  modOptionName: { flex: 1, fontSize: 14, fontWeight: 600, color: "#1A1A1A" },
  modOptionPrice: { fontSize: 13, fontWeight: 700, color: "#BE202E" },
  modalFooter: { borderTop: "1px solid #F0EDE8", padding: "14px 20px" },
  modalValidationMsg: { fontSize: 12, color: "#BE202E", fontWeight: 700, marginBottom: 10, background: "#FFF1F2", borderRadius: 8, padding: "8px 10px" },
  modalFooterRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  modalBasePrice: { fontSize: 18, fontWeight: 800, color: "#1A1A1A" },
  modalModPrice: { fontSize: 14, fontWeight: 700, color: "#15803D" },
  modalPriceBreakdown: { display: "flex", alignItems: "baseline", gap: 4 },
  modalConfirmBtn: { background: "#BE202E", color: "#fff", border: "none", borderRadius: 10, padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  modalConfirmBtnDisabled: { background: "#E5E0D8", color: "#AAA", cursor: "not-allowed" },

  // TICKET MODIFIER DISPLAY
  ticketModifiers: { display: "flex", flexDirection: "column", gap: 1, marginTop: 4 },
  ticketModifierChip: { fontSize: 14, fontStyle: "normal", display: "block" },
  ticketSpecialNoteBlock: { display: "flex", flexDirection: "column", gap: 2, marginTop: 4 },
  ticketSpecialNoteLine: { fontSize: 14, fontWeight: 800, letterSpacing: "0.02em" },
  cartModifiers: { display: "flex", flexWrap: "wrap", gap: 4, marginTop: 3 },
  cartModChip: { fontSize: 11, background: "#F0EDE8", borderRadius: 4, padding: "1px 6px" },
  cartSpecialNoteBlock: { display: "flex", flexDirection: "column", gap: 2, marginTop: 4 },
  cartSpecialNoteLine: { fontSize: 11, fontWeight: 800 },

  // KITCHEN
  kitchenRoot: { flex: 1, display: "flex", flexDirection: "column", background: "#F5F3F0", minHeight: "calc(100vh - 53px)" },
  kitchenHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#FFFFFF", borderBottom: "1px solid #E5E0D8", flexWrap: "wrap", gap: 8 },
  kitchenHeaderLeft: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  kitchenTitle: { fontSize: 18, fontWeight: 900, letterSpacing: "-0.02em", color: "#1A1A1A" },
  queuePill: { background: "#D97706", color: "#fff", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 800 },
  kitchenStats: { display: "flex", gap: 8 },
  statPillRed: { background: "#BE202E", color: "#fff", borderRadius: 20, padding: "5px 14px", fontSize: 13, fontWeight: 800 },
  statPillGreen: { background: "#15803D", color: "#fff", borderRadius: 20, padding: "5px 14px", fontSize: 13, fontWeight: 800 },
  kitchenEmpty: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  emptyCheck: { background: "#FFFFFF", border: "2px solid #E5DFD0", borderRadius: 4, padding: "32px 48px", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  emptyCheckInner: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  emptyCheckTitle: { fontSize: 11, fontWeight: 800, color: "#9B8B72", letterSpacing: "0.2em" },
  emptyCheckmark: { fontSize: 64, color: "#15803D", fontWeight: 900, lineHeight: 1 },
  emptyCheckSub: { fontSize: 24, fontWeight: 900, color: "#1A1A1A" },
  emptyCheckSubSmall: { fontSize: 14, color: "#888" },
  ticketGrid: { flex: 1, display: "grid", gap: 16, padding: "16px", alignItems: "start" },

  // TICKET
  ticket: { background: "#FFFDF7", border: "1px solid #E0D8C4", borderRadius: 3, overflow: "hidden", transition: "all 0.3s", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" },
  cancelledBanner: { background: "#BE202E", color: "#fff", fontWeight: 900, fontSize: 16, padding: "8px 14px", textAlign: "center", letterSpacing: "0.08em" },
  toGoBanner: { background: "#0369A1", color: "#fff", fontWeight: 900, fontSize: 13, padding: "6px 14px", textAlign: "center", letterSpacing: "0.05em" },
  modifiedBanner: { background: "#7C3AED", color: "#fff", fontWeight: 900, fontSize: 12, padding: "5px 14px", textAlign: "center", letterSpacing: "0.05em" },
  ticketTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 14px 8px 14px", background: "#F5EFE0" },
  ticketTopLeft: { flex: 1 },
  ticketTopRight: { textAlign: "right" },
  guestCheckTitle: { fontSize: 9, fontWeight: 800, color: "#9B8B72", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 3 },
  tableNumberBig: { fontSize: 28, fontWeight: 900, color: "#1A1A1A", letterSpacing: "-0.02em", lineHeight: 1 },
  toGoNameBig: { fontSize: 21, fontWeight: 900, color: "#0369A1", letterSpacing: "-0.01em", lineHeight: 1.1 },
  ticketMeta: { marginTop: 3 },
  checkNoLabel: { fontSize: 9, fontWeight: 800, color: "#9B8B72", letterSpacing: "0.15em" },
  checkNoValue: { fontSize: 19, fontWeight: 900, color: "#BE202E", letterSpacing: "0.05em" },
  timerBig: { fontSize: 15, fontWeight: 900, marginTop: 3, letterSpacing: "-0.01em" },
  ruledLine: { borderBottom: "1px solid #E0D8C4", margin: "0 14px" },
  colHeaders: { display: "flex", padding: "4px 14px", background: "#F5EFE0" },
  colQty: { width: 42, fontSize: 9, fontWeight: 900, color: "#9B8B72", letterSpacing: "0.12em" },
  colItem: { flex: 1, fontSize: 9, fontWeight: 900, color: "#9B8B72", letterSpacing: "0.12em" },
  itemsList: { padding: "2px 0" },
  itemRow: { display: "flex", alignItems: "flex-start", padding: "6px 14px", minHeight: 36 },
  itemQty: { width: 42, fontSize: 20, fontWeight: 900, letterSpacing: "-0.02em" },
  itemName: { fontSize: 17, lineHeight: 1.2 },
  changeTag: { display: "inline-block", color: "#fff", fontSize: 9, fontWeight: 900, padding: "2px 5px", borderRadius: 4, marginLeft: 7, letterSpacing: "0.06em" },
  noteRow: { display: "flex", gap: 7, padding: "6px 14px", alignItems: "flex-start" },
  noteLabel: { fontSize: 9, fontWeight: 900, color: "#9B8B72", letterSpacing: "0.12em", minWidth: 40, paddingTop: 2 },
  noteText: { fontSize: 13, fontWeight: 600, color: "#444", fontStyle: "italic", flex: 1 },
  ticketFooter: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#F5EFE0", flexWrap: "wrap", gap: 6 },
  statusStamp: { border: "2px solid", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 900, letterSpacing: "0.1em" },
  ticketBtns: { display: "flex", gap: 6, flexWrap: "wrap" },
  btnStart: { background: "#D97706", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 900, cursor: "pointer" },
  btnDone: { background: "#15803D", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 900, cursor: "pointer" },
  queueStrip: { background: "#FFFFFF", borderTop: "2px solid #E5E0D8", padding: "8px 16px", display: "flex", alignItems: "center", gap: 12, overflowX: "auto" },
  queueLabel: { fontSize: 10, fontWeight: 900, color: "#D97706", letterSpacing: "0.15em", whiteSpace: "nowrap" },
  queueItem: { display: "flex", alignItems: "center", gap: 8, background: "#F5F3F0", border: "1px solid #E5E0D8", borderRadius: 8, padding: "6px 12px", whiteSpace: "nowrap" },
  queueOrderId: { fontSize: 12, fontWeight: 900, color: "#BE202E" },
  queueOrderTable: { fontSize: 13, fontWeight: 800, color: "#1A1A1A" },
  queueOrderItems: { fontSize: 12, color: "#888", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" },
  queueOrderTime: { fontSize: 12, fontWeight: 700, color: "#D97706" },

  // WAITER
  waiterRoot: { display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", height: "calc(100vh - 53px)" },
  waiterHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#FFFFFF", borderBottom: "1px solid #E5E0D8", flexWrap: "wrap", gap: 8 },
  waiterLogo: { fontWeight: 800, fontSize: 16, letterSpacing: "-0.01em", color: "#1A1A1A" },
  editingBadge: { background: "#EDE9FE", color: "#7C3AED", borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 800 },
  orderTypeToggle: { display: "flex", background: "#F5F3F0", border: "1px solid #DDD", borderRadius: 10, overflow: "hidden" },
  typeBtn: { background: "none", border: "none", color: "#888", padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  typeBtnActive: { background: "#BE202E", color: "#fff" },
  typeBtnToGo: { background: "#E0F2FE", color: "#0369A1" },
  tableInput: { display: "flex", alignItems: "center", gap: 6, background: "#F5F3F0", border: "2px solid #DDD", borderRadius: 10, padding: "5px 10px" },
  tableInputToGo: { border: "2px solid #0369A1" },
  tableLabel: { fontSize: 11, fontWeight: 800, color: "#BE202E", letterSpacing: "0.08em" },
  tableField: { background: "none", border: "none", color: "#1A1A1A", fontSize: 14, fontWeight: 700, outline: "none" },
  activeOrdersBtn: { background: "#F5F3F0", border: "1px solid #DDD", color: "#444", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" },
  activeOrdersBadge: { background: "#BE202E", color: "#fff", borderRadius: 10, fontSize: 10, padding: "1px 5px", fontWeight: 800 },
  activeOrdersDropdown: { background: "#FFFFFF", borderBottom: "1px solid #E5E0D8", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 },
  dropdownTitle: { fontSize: 10, fontWeight: 800, color: "#AAA", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 },
  activeOrderRow: { background: "#F5F3F0", border: "1px solid #E5E0D8", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", width: "100%", textAlign: "left", flexWrap: "wrap" },
  tableChipSmall: { background: "#FFF1F2", color: "#BE202E", borderRadius: 6, padding: "2px 7px", fontSize: 12, fontWeight: 800 },
  toGoChipSmall: { background: "#E0F2FE", color: "#0369A1", borderRadius: 6, padding: "2px 7px", fontSize: 12, fontWeight: 800 },
  activeOrderItems: { flex: 1, fontSize: 14, color: "#888" },
  activeOrderEdit: { color: "#7C3AED", fontSize: 12, fontWeight: 700 },
  waiterBody: { flex: 1, overflow: "auto", padding: "12px 14px" },
  catRow: { display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" },
  catBtn: { background: "#FFFFFF", border: "1px solid #E5E0D8", color: "#666", borderRadius: 20, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  catBtnActive: { background: "#BE202E", border: "1px solid #BE202E", color: "#fff" },
  menuGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 },
  menuItem: { background: "#FFFFFF", border: "2px solid #E5E0D8", borderRadius: 12, padding: "14px 10px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, position: "relative", transition: "border-color 0.15s, box-shadow 0.15s" },
  menuItemActive: { background: "#FFF1F2", border: "2px solid #BE202E", boxShadow: "0 0 0 2px rgba(190,32,46,0.12)" },
  menuEmoji: { fontSize: 28 },
  menuName: { fontSize: 12, fontWeight: 600, textAlign: "center", color: "#333", lineHeight: 1.3 },
  menuPrice: { fontSize: 13, color: "#BE202E", fontWeight: 700 },
  menuBadge: { position: "absolute", top: 6, right: 6, background: "#BE202E", color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 800, padding: "1px 5px" },

  // CART
  cartPanel: { background: "#FFFFFF", borderTop: "2px solid #E5E0D8", padding: "12px 14px", maxHeight: "38vh", overflowY: "auto" },
  cartTitle: { fontSize: 10, fontWeight: 800, color: "#AAA", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 },
  cartEmpty: { color: "#BBB", fontSize: 13, textAlign: "center", padding: "6px 0" },
  cartCancelWarning: { color: "#BE202E", fontSize: 13, fontWeight: 700, textAlign: "center", padding: "8px", background: "#FFF1F2", borderRadius: 8, marginBottom: 8 },
  cartItems: { display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 },
  cartRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #F0EDE8", flexWrap: "wrap", gap: 4 },
  cartName: { fontSize: 13, color: "#333" },
  cartQtyRow: { display: "flex", alignItems: "center", gap: 6 },
  qtyBtn: { background: "#F5F3F0", border: "1px solid #DDD", color: "#444", width: 28, height: 28, borderRadius: 7, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" },
  cartQty: { fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: "center" },
  cartItemTotal: { fontSize: 12, color: "#BE202E", fontWeight: 600, minWidth: 48, textAlign: "right" },
  noteField: { width: "100%", background: "#F5F3F0", border: "1px solid #E5E0D8", borderRadius: 8, color: "#333", fontSize: 13, padding: "7px 10px", resize: "none", outline: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 10 },
  cartFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 },
  cartTotal: { fontSize: 22, fontWeight: 800, color: "#1A1A1A" },
  sendBtn: { background: "#BE202E", color: "#fff", border: "none", borderRadius: 10, padding: "12px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  sendBtnEdit: { background: "#7C3AED" },
  sendBtnCancel: { background: "#7F1D1D" },
  sendBtnSent: { background: "#15803D" },
  sendBtnDisabled: { background: "#E5E0D8", color: "#AAA", cursor: "not-allowed" },
  cancelBtn: { background: "#F5F3F0", color: "#666", border: "1px solid #DDD", borderRadius: 10, padding: "12px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  cancelOrderBtn: { background: "#7F1D1D", color: "#fff", border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },

  // HISTORY
  historyRoot: { flex: 1, padding: "16px", overflow: "auto" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 },
  statCard: { background: "#FFFFFF", border: "1px solid #E5E0D8", borderRadius: 12, padding: "16px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
  statValue: { fontSize: 26, fontWeight: 900, color: "#BE202E", marginBottom: 4 },
  statLabel: { fontSize: 10, color: "#888", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" },
  historyColumns: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  historyPanel: { display: "flex", flexDirection: "column", gap: 10 },
  panelTitle: { fontSize: 11, fontWeight: 800, color: "#AAA", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 },
  historyEmpty: { color: "#CCC", fontSize: 13, padding: "16px 0", textAlign: "center" },
  historyCard: { background: "#FFFFFF", border: "1px solid #E5E0D8", borderRadius: 12, padding: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
  historyCardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, background: "none", border: "none", width: "100%", cursor: "pointer", padding: 0, color: "inherit", flexWrap: "wrap", gap: 4 },
  historyTable: { fontSize: 15, fontWeight: 800, color: "#1A1A1A" },
  historyId: { fontSize: 10, color: "#BBB", fontWeight: 600 },
  historyTotal: { fontSize: 15, fontWeight: 800, color: "#BE202E" },
  modifiedChip: { background: "#EDE9FE", color: "#7C3AED", borderRadius: 6, padding: "2px 6px", fontSize: 10, fontWeight: 800 },
  historyItems: { display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 6 },
  historyItem: { background: "#F5F3F0", borderRadius: 6, padding: "2px 7px", fontSize: 11, color: "#666" },
  historyMeta: { display: "flex", gap: 10, fontSize: 11, color: "#AAA", flexWrap: "wrap" },
  itemStatCard: { background: "#FFFFFF", border: "1px solid #E5E0D8", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
  itemStatEmoji: { fontSize: 24 },
  itemStatInfo: { flex: 1 },
  itemStatName: { fontSize: 14, fontWeight: 700, color: "#1A1A1A", marginBottom: 2 },
  itemStatMeta: { fontSize: 11, color: "#AAA" },
  itemStatCount: { fontSize: 22, fontWeight: 900, color: "#BE202E", minWidth: 36, textAlign: "center" },
};
