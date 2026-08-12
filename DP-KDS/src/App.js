import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, doc, onSnapshot,
  addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, orderBy, limit, serverTimestamp
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
    bar: "BARRA",
    barSeat: "Asiento",
    barLabel: "BARRA",
    patioLabel: "PATIO",
    seat: "Asiento",
    guest: "Invitado",
    plato: "Plato",
    shared: "Compartido",
    orderSummary: "Resumen de Orden",
    tapToAdd: "Toca los artículos para agregarlos",
    tapToReplace: "Toca un platillo nuevo para reemplazar",
    specialInstructions: "Instrucciones especiales...",
    sendToKitchen: "Enviar a Cocina",
    updateOrder: "Actualizar Orden",
    sending: "Enviando...",
    sent: "✓ Enviado!",
    updated: "✓ Actualizado!",
    allCaughtUp: "Sin pendientes",
    allCaughtUpSub: "No hay órdenes en cocina",
    startCooking: "EMPEZAR",
    markDone: "LISTO ✓",
    active: "activas",
    done: "listas",
    new: "NUEVA",
    inProgress: "EN PROCESO",
    completed: "LISTA",
    modified: "MODIFICADA",
    cancelled: "ORDEN CANCELADA",
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
    completeOrder: "Completar",
    confirmComplete: "¿Marcar esta orden como entregada y completada? Esto la quitará de órdenes activas.",
    editHistory: "Historial de Cambios",
    original: "Original",
    edit: "Edición",
    cancelEdit: "Cancelar",
    toGoLabel: "PARA LLEVAR",
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
    specialSubtitle: "Artículo personalizado",
    specialDescription: "Descripción",
    specialAmount: "Monto a cobrar",
    addToOrder: "Agregar a Orden",
    replaceInOrder: "Reemplazar",
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
    tabDrinks: "Bebidas",
    tabFood: "Comida",
    backToCategories: "← Categorías",
    tableOrders: "Órdenes de la Mesa",
    noActiveOrders: "Sin órdenes activas",
    newBarOrder: "+ Nueva Orden de Barra",
  },
  en: {
    orderStation: "Order Station",
    kitchenDisplay: "Kitchen Display",
    orderHistory: "History",
    table: "TABLE",
    toGo: "TO GO",
    toGoName: "Customer name",
    bar: "BAR",
    barSeat: "Seat",
    barLabel: "BAR",
    patioLabel: "PATIO",
    seat: "Seat",
    guest: "Guest",
    plato: "Plato",
    shared: "Shared",
    orderSummary: "Order Summary",
    tapToAdd: "Tap items to add them",
    tapToReplace: "Tap a new item to replace it",
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
    cancelled: "ORDER CANCELLED",
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
    completeOrder: "Complete",
    confirmComplete: "Mark this order as delivered and complete? This will remove it from active orders.",
    editHistory: "Edit History",
    original: "Original",
    edit: "Edit",
    cancelEdit: "Cancel",
    toGoLabel: "TO GO",
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
    specialSubtitle: "Custom item",
    specialDescription: "Description",
    specialAmount: "Amount to charge",
    addToOrder: "Add to Order",
    replaceInOrder: "Replace",
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
    tabDrinks: "Drinks",
    tabFood: "Food",
    backToCategories: "← Categories",
    tableOrders: "Table Orders",
    noActiveOrders: "No active orders",
    newBarOrder: "+ New Bar Order",
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

// Clover paginates with limit/offset; a menu that's grown past a single
// page (200 items) would otherwise get silently truncated at whatever the
// hardcoded limit was, so keep fetching until a short page tells us we've
// reached the end.
async function cloverRequestAllPages(basePath, pageSize = 200) {
  const sep = basePath.includes("?") ? "&" : "?";
  let offset = 0;
  let all = [];
  while (true) {
    const res = await cloverRequest(`${basePath}${sep}limit=${pageSize}&offset=${offset}`);
    const elements = res.elements || [];
    all = all.concat(elements);
    if (elements.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

// ============================================================
// All modifier groups loaded once at startup
let ALL_MODIFIER_GROUPS = [];
async function fetchAllModifierGroups() {
  try {
    const groupElements = await cloverRequestAllPages("modifier_groups?expand=modifiers");
    ALL_MODIFIER_GROUPS = groupElements.map(group => ({
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
    console.error("fetchAllModifierGroups FAILED:", err.message, err);
  }
}

function getModifierGroupsForItem(item) {
  if (!item || ALL_MODIFIER_GROUPS.length === 0) return [];
  // Prefer the item's real Clover modifierGroup associations. Fall back to
  // whole-word name matching only for items that don't carry that data (e.g.
  // MOCK_MENU when the Clover fetch fails). Must be a whole-word match, not a
  // substring: a loose substring check let a lone "A" in "A La Mexicana
  // Omelette" match nearly every group prefix (each contains the letter A),
  // and let "Mole" match inside "Guacamole" — pulling in dozens of unrelated
  // required choices (Chilaquiles Egg Style, Guacamole Spice Level, etc.) on
  // an item that should show none.
  let matched;
  if (item.modifierGroupIds && item.modifierGroupIds.length > 0) {
    const ids = new Set(item.modifierGroupIds);
    matched = ALL_MODIFIER_GROUPS.filter(group => ids.has(group.id));
  } else {
    const nameWords = new Set((item.name || "").toLowerCase().split(/\s+/).map(w => w.replace(/s$/, "")));
    matched = ALL_MODIFIER_GROUPS.filter(group => {
      const groupPrefix = group.name.split(" - ")[0].toLowerCase().trim().replace(/s$/, "");
      return nameWords.has(groupPrefix);
    });
  }
  // Required groups (minRequired > 0) render before optional ones.
  return [...matched].sort((a, b) => (a.minRequired > 0 ? 0 : 1) - (b.minRequired > 0 ? 0 : 1));
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
    console.warn("Menu translation failed:", err.message);
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
    const [itemElements, catElements] = await Promise.all([
      cloverRequestAllPages("items?expand=categories,modifierGroups"),
      cloverRequestAllPages("categories"),
    ]);
    const categories = catElements.map(cat => ({
      id: cat.id,
      name: { es: cat.name, en: cat.name },
    }));
    const items = itemElements
      .filter(item => item.available !== false)
      .map(item => ({
        id: item.id,
        categoryId: item.categories?.elements?.[0]?.id || "uncategorized",
        name: item.name,
        nameEs: null,
        price: item.price || 0,
        emoji: "🍽️",
        modifierGroupIds: (item.modifierGroups?.elements || []).map(g => g.id),
      }));
    if (categories.length === 0) {
      return { categories: [{ id: "uncategorized", name: { es: "Menú", en: "Menu" } }], items };
    }
    const usedCatIds = new Set(items.map(i => i.categoryId));
    const knownCategories = categories.filter(cat => usedCatIds.has(cat.id));
    // Items with no category assigned in Clover fall back to the
    // "uncategorized" sentinel id, which never matches a real Clover
    // category — give them a real tab so they're actually reachable
    // instead of loading into memory but never appearing anywhere.
    if (usedCatIds.has("uncategorized")) {
      knownCategories.push({ id: "uncategorized", name: { es: "Sin categoría", en: "Uncategorized" } });
    }
    return { categories: sortCategories(knownCategories), items };
  } catch (err) {
    console.warn("Clover menu fetch failed, using mock menu:", err.message);
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

function buildCloverOrderNote(order) {
  if (order.isToGo) return `${order.toGoName}${order.note ? " | " + order.note : ""}`;
  if (order.isBar) return `B${order.table}${order.note ? " | " + order.note : ""}`;
  if (order.isPatio) return `P${order.table}${order.note ? " | " + order.note : ""}`;
  return `MESA ${order.table}${order.note ? " | " + order.note : ""}`;
}

async function sendOrderToClover(order) {
  try {
    const orderTypeId = order.isToGo ? CLOVER_ORDER_TYPES.takeOut : CLOVER_ORDER_TYPES.dineIn;
    // Clover doesn't treat unitQty as a quantity multiplier for regular
    // items — each line item represents a single unit. To show "qty 2" on
    // the POS you need two separate line items, not one with unitQty:2000.
    //
    // All line items + modifications are sent in one atomic_order/orders
    // call instead of the order-then-N-sequential-POSTs approach. The old
    // approach left a multi-second window where the register/terminal could
    // open an order while it was still being built, which is a documented
    // cause of the POS "won't let you charge" glitch on API-created orders.
    const lineItems = [];
    for (const item of order.items) {
      for (let unit = 0; unit < item.qty; unit++) {
        lineItems.push({
          name: item.name,
          price: item.price,
          ...(item.modifiers && item.modifiers.length > 0
            ? { modifications: item.modifiers.map(mod => ({ modifier: { id: mod.id }, name: mod.name, amount: mod.price })) }
            : {}),
        });
      }
    }
    const cloverOrder = await cloverRequest("atomic_order/orders", "POST", {
      orderCart: {
        orderType: { id: orderTypeId },
        note: buildCloverOrderNote(order),
        state: "open",
        lineItems,
      },
    });
    const cloverOrderId = cloverOrder.id;
    if (!cloverOrderId) throw new Error("No order ID returned from Clover");
    return cloverOrderId;
  } catch (err) {
    console.warn("Clover order push failed (saved to Firebase only):", err.message);
  }
}

async function updateOrderInClover(order) {
  if (!order.cloverOrderId) return null;
  // Clover has no atomic "replace all line items" call, and patching items
  // one-by-one would reopen the same multi-call race window atomic_order/orders
  // was added to avoid. This used to only patch the note, leaving the item
  // list on the POS permanently stale after any edit — which is exactly why
  // cashiers had to reinput edited orders by hand at charge time. Deleting
  // and recreating the order atomically keeps the POS in sync with every
  // edit. Callers must persist the returned id as the order's new cloverOrderId.
  try {
    await cloverRequest(`orders/${order.cloverOrderId}`, "DELETE");
  } catch (err) {
    console.warn("Clover order delete failed during edit sync:", err.message);
  }
  return (await sendOrderToClover(order)) || null;
}

// Confirmed against real orders in the live account: a Clover order that
// was actually charged on the register comes back state:"locked" with a
// payments.elements entry whose result is "SUCCESS". Orders paid in cash
// (or rung up separately at the register, disconnected from this specific
// Clover order) stay state:"open" with no payments at all — this check
// correctly returns false for those, by design, not by bug. Callers must
// NOT treat "false" as "not paid yet, keep waiting" for such orders; it
// just means this signal doesn't apply and a human needs to close it.
async function isOrderPaidOnClover(cloverOrderId, total) {
  if (!cloverOrderId) return false;
  try {
    const data = await cloverRequest(`orders/${cloverOrderId}?expand=payments`);
    if (data.state !== "locked") return false;
    const payments = data.payments?.elements || [];
    const paidAmount = payments
      .filter(p => p.result === "SUCCESS")
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    return paidAmount >= total;
  } catch (err) {
    console.warn("Clover payment check failed:", err.message);
    return false;
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
  const diffKey = i => i.id + "::" + (i.seat ?? "");
  const result = [];
  const oldMap = {};
  oldItems.forEach(i => { oldMap[diffKey(i)] = i; });
  const newMap = {};
  newItems.forEach(i => { newMap[diffKey(i)] = i; });
  newItems.forEach(item => {
    const old = oldMap[diffKey(item)];
    if (!old) result.push({ ...item, changeType: "added" });
    else if (item.qty > old.qty) result.push({ ...item, changeType: "increased" });
    else if (item.qty < old.qty) result.push({ ...item, changeType: "decreased" });
    else result.push({ ...item, changeType: "unchanged" });
  });
  oldItems.forEach(item => {
    if (!newMap[diffKey(item)]) result.push({ ...item, changeType: "removed" });
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
  const updates = {
    items: newItems,
    note: newNote,
    total: newItems.reduce((s, i) => s + i.price * i.qty, 0),
    modified: true,
    lastModified: Date.now(),
    latestDiff: diff,
    editHistory: [],
  };
  // If items were added/increased, the kitchen/drinks station hasn't cooked
  // them yet — reset both ready flags so the ticket reappears on the active
  // screen instead of staying invisible if it had already been marked done
  // (e.g. a second round sent after the first round finished cooking).
  if (diff.some(i => i.changeType === "added" || i.changeType === "increased")) {
    updates.kitchenReady = false;
    updates.drinksReady = false;
  }
  await updateDoc(orderRef, updates);
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

// Guards against the same order being archived twice when multiple devices
// race to close it -- same failure shape as bumpingIds/undoingIds above.
// This got a lot more likely once the auto-close-on-payment check (below in
// App) started running on every open device instead of just whichever
// tablet happened to be sitting on the table-select screen.
const closingIds = new Set();
async function closeTable(tableOrders) {
  for (const order of tableOrders) {
    if (closingIds.has(order.firestoreId)) continue;
    closingIds.add(order.firestoreId);
    try {
      const orderRef = doc(db, "orders", order.firestoreId);
      const snap = await getDoc(orderRef);
      if (snap.exists()) {
        await addDoc(collection(db, "completedOrders"), { ...snap.data(), completedAt: Date.now() });
        await deleteDoc(orderRef);
      }
    } finally {
      closingIds.delete(order.firestoreId);
    }
  }
}

// ── AUTO-CLOSE ON CONFIRMED CLOVER PAYMENT ────────────────────
// Checks each active table/bar-seat/patio/to-go group's Clover order for a
// real completed payment (isOrderPaidOnClover) and, if found, closes that
// group exactly like the waitress's own Cerrar Mesa tap. Deliberately does
// nothing for groups with no confirmed Clover payment — cash, or anything
// rung up separately at the register, never shows a payment on this order —
// those still need the manual tap, same as before this existed.
//
// Called on a 45s interval from App (see below) so it runs on every open
// device -- Kitchen/Drinks/Expo Pis included -- not just whichever tablet
// happens to be sitting on the table-select screen. `autoClosingKeys` is a
// Set ref local to whichever component's interval is calling this, just
// to dedupe within that one device's own repeated 45s ticks; closeTable's
// own closingIds guard (above) is what actually protects against two
// different devices racing to close the same table.
async function checkPendingPayments(liveOrders, autoClosingKeys) {
  const groups = {};
  function addTo(gk, o) {
    if (!groups[gk]) groups[gk] = [];
    groups[gk].push(o);
  }
  liveOrders.filter(o => o.status !== "done" && !o.isToGo && !o.isBar && !o.isPatio).forEach(o => addTo(`table:${o.table}`, o));
  liveOrders.filter(o => o.status !== "done" && o.isBar).forEach(o => addTo(`bar:${o.table}`, o));
  liveOrders.filter(o => o.status !== "done" && o.isPatio).forEach(o => addTo(`patio:${o.table}`, o));
  liveOrders.filter(o => o.status !== "done" && o.isToGo).forEach(o => addTo(`togo:${o.toGoSlot}`, o));

  for (const [key, groupOrders] of Object.entries(groups)) {
    if (autoClosingKeys.has(key)) continue;
    // Deliberately NOT gated on allReady here. It used to be, to avoid
    // yanking a ticket off-screen on a pre-paid tab before the food was
    // actually made -- but in practice a station's ready flag (especially
    // drinksReady) can just never get tapped, which silently blocked this
    // from ever firing even on a confirmed payment. A confirmed Clover
    // payment is the real signal a table is done; KDS1/2/3 must clear on
    // that alone, not on top of every station remembering to tap done.
    let paid = false;
    for (const o of groupOrders) {
      if (o.cloverOrderId && await isOrderPaidOnClover(o.cloverOrderId, o.total)) { paid = true; break; }
    }
    if (paid) {
      autoClosingKeys.add(key);
      await closeTable(groupOrders);
      autoClosingKeys.delete(key);
    }
  }
}

// ── PER-STATION COMPLETION ─────────────────────────────────────
// Marking an order ready at a station only clears it off that station's
// screen (kitchenReady/drinksReady) — it must NOT remove the order from
// the table's active list or the waitress's view. Only an explicit
// waitress action (Cerrar Mesa, or "Completar" on a specific order) or
// the runner confirming delivery at Expo actually archives the order.
async function _completeOrder(orderId) {
  const ref = doc(db, "orders", orderId);
  await updateDoc(ref, { allReady: true, allReadyAt: Date.now() });
}

// Kitchen is almost always the last station to finish in practice (Drinks/
// Sides prep is quick by comparison), so a kitchen bump now also closes out
// the Drinks/Sides side of the ticket instead of waiting on a separate tap
// there. KDS2 still shows the order live the whole time Kitchen is cooking
// it -- this only skips the extra confirmation once Kitchen says done.
async function markKitchenReady(order) {
  const ref = doc(db, "orders", order.firestoreId);
  await updateDoc(ref, { kitchenReady: true, drinksReady: true });
  await _completeOrder(order.firestoreId);
}

async function markDrinksReady(order) {
  const ref = doc(db, "orders", order.firestoreId);
  await updateDoc(ref, { drinksReady: true });
  const hasKitchen = orderHasKitchenItems(order);
  if (!hasKitchen || order.kitchenReady) {
    await _completeOrder(order.firestoreId);
  }
}

// Runner/expo confirms food physically reached the table. This clears the
// order off the Expo screen's "ready to deliver" queue but — unlike
// bumpOrder — deliberately does NOT archive/delete it, so it keeps showing
// as an active order for that table until the waitress closes it out.
//
// Also force kitchenReady/drinksReady true here: an order can reach Expo's
// "ready" state without ever setting drinksReady itself (e.g. a to-go order
// with no real drink/side items still forces onto the Drinks/Sides screen
// for bagging via orderHasDrinksItems, but never needs a real drinks-station
// bump). Without this, such orders never leave the Drinks screen even after
// Expo has already delivered them — this makes that completion flow over to
// Kitchen/Drinks so they clear too.
async function markDelivered(order) {
  const ref = doc(db, "orders", order.firestoreId);
  await updateDoc(ref, { delivered: true, deliveredAt: Date.now(), kitchenReady: true, drinksReady: true });
}

// Guards against a burst of rapid-fire calls for the same order (numpad key
// bounce, or a cook mashing Enter when a ticket doesn't disappear instantly)
// racing each other: without this, multiple calls can all read the doc
// before the first delete lands, each archiving its own duplicate copy.
const bumpingIds = new Set();
async function bumpOrder(order) {
  if (bumpingIds.has(order.firestoreId)) return;
  bumpingIds.add(order.firestoreId);
  try {
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
  } finally {
    bumpingIds.delete(order.firestoreId);
  }
}

// ── UNDO LAST COMPLETED ORDER (mistake recovery) ────────────────
// Live-subscribes to the most recently completed order so Kitchen/Drinks/Expo
// screens can offer a one-tap "undo" for the last accidental bump.
function useLastCompletedOrder() {
  const [lastCompleted, setLastCompleted] = useState(null);
  useEffect(() => {
    const q = query(collection(db, "completedOrders"), orderBy("completedAt", "desc"), limit(1));
    const unsub = onSnapshot(q, (snapshot) => {
      setLastCompleted(snapshot.empty ? null : { firestoreId: snapshot.docs[0].id, ...snapshot.docs[0].data() });
    });
    return unsub;
  }, []);
  return lastCompleted;
}

// ── ORDER CHIMES (Kitchen / Drinks / Expo screens) ───────────────
// Two distinct recorded sounds (public/sounds/*.mp3) so staff can tell
// "a new order landed" apart from "an order already on the board just
// changed" by ear, without having to look up — a sharp counter-bell ding
// for new, a softer double-tone microwave-bell for a modification. Each
// call makes its own Audio() instance rather than reusing one shared
// element, so two chimes firing close together (see useOrderChimes below)
// play out independently instead of the second cutting off the first's
// tail. Kiosk browsers (Chromium on the Raspberry Pis) block autoplay
// until the page has seen one user gesture; since these screens are
// driven by a numpad dongle / touch bumps, that gesture normally lands
// within moments of boot, but the very first chime right after a Pi
// reboot can be silently swallowed by that policy.
function playChimeFile(url) {
  try {
    const audio = new Audio(url);
    audio.play().catch(err => console.warn("chime playback blocked:", err.message));
  } catch (err) {
    console.warn("chime playback failed:", err.message);
  }
}
function playNewOrderChime() { playChimeFile("/sounds/new-order.mp3"); }
function playOrderModifiedChime() { playChimeFile("/sounds/order-modified.mp3"); }

// ── DRINKS-STATION ALERT (KDS2, played through KDS1's speaker) ───
// KDS2/Drinks has no speaker of its own yet, so when an order that needs
// Ausencia's attention comes in, this plays through KDS1's speaker as a
// third, distinct cue layered after the normal new/modified chime -- so
// Chuy knows to flag her. Synthesized via Web Audio API instead of a
// recorded file (a placeholder until a real recording replaces it) --
// a quick two-note rising blip that doesn't resemble either recorded
// chime, so it can't be mistaken for a kitchen-only event.
let sharedAudioCtx = null;
function playDrinksAlertTone() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!sharedAudioCtx) sharedAudioCtx = new Ctx();
    const ctx = sharedAudioCtx;
    const now = ctx.currentTime;
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.13;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.35, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.13);
    });
  } catch (err) {
    console.warn("drinks alert tone failed:", err.message);
  }
}

// Plays the right chime per order: a brand-new firestoreId gets the
// new-order sound, an edit to an id already seen before (its
// lastModified/timestamp signature changed) gets the distinct modified
// sound instead -- never both for the same event. Skips the first
// population so opening/reloading a screen doesn't chime once per order
// already sitting on the board.
//
// If more than one order changes in the very same snapshot -- genuinely
// possible, e.g. two tickets fired within the same network round trip --
// each one still gets its own chime instead of collapsing to a single
// ding (the old version only checked "did anything change" as a
// boolean, so a simultaneous second order was silently dropped). They're
// staggered a beat apart so they're audible as separate events rather
// than overlapping into a blur.
// `needsDrinksAlert(order)` is optional -- when given, any new/modified
// order it flags true for also gets playDrinksAlertTone layered on after
// the normal chime (see playDrinksAlertTone above for why that lives here
// instead of on KDS2 itself).
function useOrderChimes(orders, needsDrinksAlert) {
  const prevMapRef = useRef(null);
  const key = orders.map(o => `${o.firestoreId}:${o.lastModified || o.timestamp}`).join(",");
  useEffect(() => {
    const prevMap = prevMapRef.current;
    const orderById = new Map(orders.map(o => [o.firestoreId, o]));
    const currentMap = new Map(orders.map(o => [o.firestoreId, o.lastModified || o.timestamp]));
    if (prevMap !== null) {
      let delay = 0;
      currentMap.forEach((sig, id) => {
        const isNew = !prevMap.has(id);
        const isModified = !isNew && prevMap.get(id) !== sig;
        if (isNew) {
          setTimeout(playNewOrderChime, delay);
          delay += 400;
        } else if (isModified) {
          setTimeout(playOrderModifiedChime, delay);
          delay += 400;
        }
        if ((isNew || isModified) && needsDrinksAlert?.(orderById.get(id))) {
          setTimeout(playDrinksAlertTone, delay);
          delay += 400;
        }
      });
    }
    prevMapRef.current = currentMap;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

// ── AUTO-UPDATE ON DEPLOY ────────────────────────────────────────
// Kiosk Pis and waitress tablets are just a browser tab left open for a
// whole shift — nothing reloads them when a new build ships, so they can
// silently run stale code for days. This polls the deployed page for a
// new build (CRA hashes its JS bundle filename, so the hash changes on
// every deploy) and reloads automatically once one shows up. It never
// reloads while view === "waiter" — that screen's cart only lives in
// local state, and yanking the page out from under a waitress mid-order
// would lose whatever she'd typed so far. The check just runs again next
// interval until she's back on a safe screen.
function useAutoUpdate(viewRef) {
  const currentBundleRef = useRef(
    document.querySelector('script[src*="/static/js/main."]')?.getAttribute("src") || null
  );
  useEffect(() => {
    if (!currentBundleRef.current) return; // dev server: no hashed bundle to compare
    async function check() {
      try {
        // Kiosk wrapper apps (FullKiosk, etc.) run their own WebView cache
        // that can ignore both HTTP cache headers and the fetch cache option,
        // serving a stale "/" response even right after a reboot. A query
        // string this app has never requested before can't have a cached
        // entry, so it forces a real network hit — same trick applied to
        // the reload navigation below.
        const res = await fetch("/?_cb=" + Date.now(), { cache: "no-store" });
        const html = await res.text();
        const match = html.match(/\/static\/js\/main\.[^"]+\.js/);
        if (match && match[0] !== currentBundleRef.current && viewRef.current !== "waiter") {
          const url = new URL(window.location.href);
          url.searchParams.set("_r", Date.now());
          window.location.href = url.toString();
        }
      } catch (err) {
        console.warn("update check failed:", err.message);
      }
    }
    const interval = setInterval(check, 120000);
    return () => clearInterval(interval);
  }, [viewRef]);
}

// Guards against the same stale `lastCompleted` snapshot being undone twice
// before Firestore's onSnapshot round-trip swaps in the next one. The "0" key
// is deliberately repeatable to walk back through history, but mashing it (or
// numpad key-repeat on hold) faster than that round-trip replays the same
// order and recreates it a second time as a duplicate live ticket. Same fix
// as bumpingIds above, same failure shape.
const undoingIds = new Set();
async function undoCompletedOrder(order) {
  if (!order) return;
  if (undoingIds.has(order.firestoreId)) return;
  undoingIds.add(order.firestoreId);
  try {
    const { firestoreId, completedAt, duration, allReadyAt, ...rest } = order;
    await addDoc(collection(db, "orders"), {
      ...rest,
      status: "in_progress",
      kitchenReady: false,
      drinksReady: false,
      allReady: false,
    });
    await deleteDoc(doc(db, "completedOrders", firestoreId));
  } finally {
    undoingIds.delete(order.firestoreId);
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
// Category keywords for ANY real beverage (Bebidas) — used only to keep
// the kitchen ticket free of drinks it doesn't prepare (see
// isKitchenDimmed). Deliberately excludes "happy hour" and "bar" — Clover
// has some food items (nachos, pico de gallo, guacamole) miscategorized
// under Happy Hour, and "bar" would false-positive on "barbacoa"; either
// would wrongly hide food from the kitchen ticket.
const DRINK_ITEM_CATEGORY_KEYWORDS = [
  "beverage", "bebida", "drink", "agua", "soda", "jugo", "juice", "refresco",
  "beer", "cerveza", "wine", "vino", "liquor", "licor", "cocktail", "coctel", "cóctel",
];

// True for any beverage at all (soda, beer, wine, cocktail, agua fresca,
// ...) — broader than DRINKS_RULES' "agua_fresca" rule on purpose, since
// the kitchen shouldn't show ANY drink regardless of whether it's the one
// KDS2 actually prepares a ticket for.
function isBeverageItem(itemName, catName = "") {
  if (itemName.toLowerCase().includes("agua fresca")) return true;
  const c = (catName || "").toLowerCase();
  return DRINK_ITEM_CATEGORY_KEYWORDS.some(k => c.includes(k));
}

const DRINKS_RULES = [
  {
    key: "agua_fresca",
    color: "#7C3AED",
    bg: "#F5F3FF",
    label: "AGUA FRESCA",
    // Only agua fresca gets a KDS2 ticket — other beverages (soda, beer,
    // wine, cocktails) don't need prep/tracking here, just isKitchenDimmed
    // below (via isBeverageItem) to stay off the kitchen ticket too.
    match: (name) => name.toLowerCase().includes("agua fresca"),
  },
  {
    key: "caldo",
    color: "#BE202E",
    bg: "#FFF1F2",
    label: "CALDO",
    match: (name, catName = "") => {
      const c = catName.toLowerCase();
      return name.toLowerCase().includes("caldo") || c.includes("sopa") || c.includes("soup");
    },
  },
  {
    key: "guacamole",
    color: "#15803D",
    bg: "#F0FDF4",
    label: "GUACAMOLE",
    match: (name) => name.toLowerCase().includes("guacamol"),
  },
  {
    key: "pico_de_gallo",
    color: "#15803D",
    bg: "#F0FDF4",
    label: "PICO DE GALLO",
    match: (name) => name.toLowerCase().includes("pico de gallo"),
  },
  {
    key: "side_salsa",
    color: "#D97706",
    bg: "#FFFBEB",
    label: "SIDE DE SALSA",
    match: (name) => name.toLowerCase().includes("side de salsa"),
  },
  {
    key: "side_chips",
    color: "#D97706",
    bg: "#FFFBEB",
    label: "SIDE DE CHIPS",
    match: (name) => name.toLowerCase().includes("side de chips"),
  },
];

const TOGO_COLOR   = "#92400E";
const TOGO_BG      = "#FEF3C7";
const DINEIN_COLOR = "#1D4ED8";
const DINEIN_BG    = "#EFF6FF";
const BAR_COLOR    = "#7C3AED";
const BAR_BG       = "#F3E8FF";
const PATIO_COLOR  = "#0D9488";
const PATIO_BG     = "#CCFBF1";

// Kitchen/Drinks tickets show a fixed "budget" of weighted units per card
// before the rest spills onto a "Cont." card -- fixed and flat on purpose
// (see GuestCheckTicket/KitchenScreen): shrinking font to force everything
// onto one card is what caused the 8/8 overflow bugs. One consistent,
// always-readable size; long orders get a second card instead.
//
// A flat item count isn't enough of a budget on its own: a bare "1 Coca
// Cola" row costs far less screen height than an item with modifiers under
// a fresh per-seat "PLATO N" header, and a card that's too tall for the
// screen has no scrollbar a numpad can reach -- the extra content is just
// gone (found 2026-08-08: a 2-seat order with only ~4 items total still
// overflowed because both seats' headers plus a couple of modifiers pushed
// it past the fold). Each item costs 1 unit, +1 per modifier, +1 the first
// time a seat appears on a given card (its "PLATO N" header). Deliberately
// conservative -- err toward more, shorter cards over risking another cutoff.
//
// Raised 5 -> 7 on 2026-08-08 after dropping the redundant giant ticket-top
// name/table (freed real vertical room) and shrinking the "PLATO N" header
// font to a fraction of the item text (each header now costs less height
// too) -- both of the things that made 5 the safe ceiling before. Still a
// deliberately modest bump, not a jump to whatever the math might allow.
const UNITS_PER_CARD = 7;

// Splits an order's items into per-card chunks. Groups by seat first
// (preserving first-appearance order) so one seat's items always stay
// contiguous even if they weren't already adjacent, then packs seats'
// items in order, breaking to a new card whenever the running weighted
// total would exceed UNITS_PER_CARD. A seat that reappears on a
// continuation card pays its header cost again there, since it renders
// there again too (see GuestCheckTicket/DrinksTicket's seatGroups).
function buildTicketCards(items) {
  const groups = [];
  const seatIndex = new Map();
  items.forEach(item => {
    const key = item.seat ?? null;
    if (!seatIndex.has(key)) { seatIndex.set(key, groups.length); groups.push({ seat: key, items: [] }); }
    groups[seatIndex.get(key)].items.push(item);
  });

  const cards = [];
  let current = [];
  let units = 0;
  let openSeats = new Set();
  const cost = (item, seat) => 1 + (item.modifiers?.length || 0) + (openSeats.has(seat) ? 0 : 1);

  groups.forEach(group => {
    group.items.forEach(item => {
      let itemUnits = cost(item, group.seat);
      if (current.length > 0 && units + itemUnits > UNITS_PER_CARD) {
        cards.push(current);
        current = [];
        units = 0;
        openSeats = new Set();
        itemUnits = cost(item, group.seat);
      }
      current.push(item);
      units += itemUnits;
      openSeats.add(group.seat);
    });
  });
  if (current.length > 0 || cards.length === 0) cards.push(current);
  return cards;
}

// Total weighted units for a whole order (same per-item/per-seat-header
// cost as buildTicketCards, just not chunked into cards).
function orderUnitTotal(items) {
  const seatsSeen = new Set();
  let units = 0;
  items.forEach(item => {
    const seat = item.seat ?? null;
    units += 1 + (item.modifiers?.length || 0) + (seatsSeen.has(seat) ? 0 : 1);
    seatsSeen.add(seat);
  });
  return units;
}

// A long order used to spill onto extra "Cont." cards at full size, which
// could eat most of the Kitchen screen's MAX_VISIBLE slots for one order
// and crowd out everyone else's tickets. Up to UNITS_SINGLE_CARD_CEILING,
// pack everything onto one card instead and shrink the text to fit --
// only orders bigger than that still spill to a second card, so text never
// shrinks past MIN_TICKET_SCALE (see the 8/8 overflow-bug history above
// buildTicketCards for why unbounded shrinking is dangerous).
const UNITS_SINGLE_CARD_CEILING = 20;
const MIN_TICKET_SCALE = 0.45;
function packOrderCards(items) {
  const total = orderUnitTotal(items);
  if (total <= UNITS_SINGLE_CARD_CEILING) {
    const scale = total <= UNITS_PER_CARD ? 1 : Math.max(MIN_TICKET_SCALE, UNITS_PER_CARD / total);
    return { cards: [items], scale };
  }
  return { cards: buildTicketCards(items), scale: 1 };
}

// Base font specs ({min,coeff,offset,max} in `clamp(min, coeff*cqw - offset, max)`)
// for Kitchen ticket text, so packOrderCards' scale can shrink all of them
// together (see clampFont below and its uses in the S stylesheet / GuestCheckTicket).
const FONT_COL          = { min: 14.4, coeff: 8.462,  offset: 14.768, max: 36 };
const FONT_ITEM_QTY     = { min: 24,   coeff: 21.538, offset: 49.232, max: 80 };
const FONT_ITEM_NAME    = { min: 20,   coeff: 18.462, offset: 42.768, max: 68 };
// Deliberately a flat 0.7x of FONT_ITEM_NAME's own min/coeff/offset/max --
// clamp() is scalar-homogeneous, so multiplying every term by the same
// factor guarantees this renders smaller than the item name at every
// container width, not just at the sizes we happened to eyeball (a plate
// header competing with the food text for attention was the original bug).
const FONT_PLATE_HEADER = { min: 14,   coeff: 12.92,  offset: 29.94,  max: 48 };
const FONT_SPECIAL_NOTE = { min: 16.8, coeff: 15,     offset: 34,     max: 56 };
const FONT_MODIFIER     = { min: 21,   coeff: 18.75,  offset: 42.5,   max: 70 };
function clampFont(f, scale = 1) {
  return `clamp(${(f.min * scale).toFixed(2)}px, calc(${(f.coeff * scale).toFixed(3)}cqw - ${(f.offset * scale).toFixed(2)}px), ${(f.max * scale).toFixed(2)}px)`;
}
// Scales a raw px spacing value (row padding, plate-header padding, divider
// margins) by the same factor as the fonts, so a packed card actually
// reclaims vertical space instead of just shrinking glyphs inside
// full-size rows -- see packOrderCards.
function scalePx(px, scale = 1) {
  return Math.round(px * scale);
}

function getOrderAccentColor(order) {
  if (order.isToGo) return TOGO_COLOR;
  if (order.isBar) return BAR_COLOR;
  if (order.isPatio) return PATIO_COLOR;
  return DINEIN_COLOR;
}

function getOrderAccentBg(order) {
  if (order.isToGo) return TOGO_BG;
  if (order.isBar) return BAR_BG;
  if (order.isPatio) return PATIO_BG;
  return DINEIN_BG;
}

function getDrinksRule(itemName, catName) {
  return DRINKS_RULES.find(r => r.match(itemName, catName)) || null;
}

function orderHasDrinksItems(order) {
  if (order.isToGo) return true;
  return order.items?.some(item => getDrinksRule(item.name, item.catName)) ?? false;
}

// Whether an order actually needs a drinks-station bump before it can be
// marked complete. Unlike orderHasDrinksItems (which also forces true for
// to-go orders so they're visible on the Drinks/Sides screen for bagging),
// this only looks at real item matches — otherwise a to-go order with no
// drink/side items waits forever on a bump nobody will ever make, and stays
// stuck "active" even after the kitchen marks it done.
function orderNeedsDrinksStation(order) {
  return order.items?.some(item => getDrinksRule(item.name, item.catName)) ?? false;
}

// Items the kitchen doesn't cook — left off kitchen tickets entirely.
// Any beverage qualifies (not just agua fresca, the only one KDS2 gets a
// ticket for) — sides/extras are food the kitchen makes, so they stay on
// the ticket.
function isKitchenDimmed(itemName, catName = "") {
  return isBeverageItem(itemName, catName);
}

function orderHasKitchenItems(order) {
  return order.items?.some(i => !isKitchenDimmed(i.name, i.catName || "")) ?? false;
}

// Diff-or-plain item list for an order's Kitchen ticket, with bebidas/
// alcohol already stripped out (see isKitchenDimmed) — shared by
// KitchenScreen's card-count/MAX_VISIBLE accounting and GuestCheckTicket's
// own render so both agree on how many cards an order actually needs.
function getKitchenTicketItems(order, catNameById) {
  const source = order.modified && order.latestDiff
    ? order.latestDiff
    : order.items.map(i => ({ ...i, changeType: "unchanged" }));
  return source.filter(i => !isKitchenDimmed(i.name, i.catName || catNameById[i.categoryId] || ""));
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
function ModifierModal({ item, displayName, lang, onConfirm, onClose, swapMode }) {
  const t = T[lang];
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState({});
  const [specialNote, setSpecialNote] = useState("");

  useEffect(() => {
    const groups = getModifierGroupsForItem(item);
    setGroups(groups);
    const init = {};
    groups.forEach(g => { init[g.id] = new Set(); });
    setSelections(init);
    setLoading(false);
  }, [item]);

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
            <div style={S.modalSubtitle}>{swapMode ? t.replaceInOrder : t.customizeItem}</div>
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
                {swapMode ? t.replaceInOrder : t.addToOrder} — {fmt(item.price + modTotal)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SpecialModal({ lang, onConfirm, onClose }) {
  const t = T[lang];
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const amountCents = Math.round(parseFloat(amount || "0") * 100);
  const canConfirm = amount.trim() !== "" && !isNaN(amountCents) && amountCents > 0;
  const fieldStyle = { width: "100%", background: "#F5F3F0", border: "2px solid #E5E0D8", borderRadius: 10, color: "#333", fontSize: 14, padding: "10px 12px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm(description, amountCents);
  }

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div>
            <div style={S.modalTitle}>⭐ Special</div>
            <div style={S.modalSubtitle}>{t.specialSubtitle}</div>
          </div>
          <button style={S.modalCloseBtn} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalBody}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1A1A1A", marginBottom: 6 }}>{t.specialDescription}</div>
            <input
              style={fieldStyle}
              placeholder="Special"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={60}
              autoFocus
            />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1A1A1A", marginBottom: 6 }}>{t.specialAmount}</div>
            <div style={{ ...fieldStyle, display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#BE202E", marginRight: 4 }}>$</span>
              <input
                style={{ flex: 1, background: "none", border: "none", color: "#333", fontSize: 16, fontWeight: 700, outline: "none", fontFamily: "inherit" }}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div style={S.modalFooter}>
          <div style={S.modalFooterRow}>
            <div />
            <button style={{ ...S.modalConfirmBtn, ...(!canConfirm ? S.modalConfirmBtnDisabled : {}) }} onClick={handleConfirm} disabled={!canConfirm}>
              {t.addToOrder}{canConfirm ? ` — ${fmt(amountCents)}` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GUEST CHECK TICKET COMPONENT
// ============================================================
function GuestCheckTicket({ order, cardIndex = 0, t, isQueue, isFocused, catNameById = {} }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsedSecs = Math.floor((Date.now() - order.timestamp) / 1000);
  const isUrgent = elapsedSecs > 600;
  const isWarning = elapsedSecs > 300;
  const timerColor = isUrgent ? "#BE202E" : isWarning ? "#D97706" : "#15803D";

  // Bebidas/alcohol never belong on the cook's ticket -- cooks don't make
  // drinks and seeing one on their card was leading them to get it
  // cancelled off the waitress screen instead of just being left off KDS1
  // in the first place. Drinks/Sides (KDS2) still gets these via its own
  // ticket, unaffected by this filter.
  const allItems = getKitchenTicketItems(order, catNameById);

  // Orders that don't fit UNITS_PER_CARD at full size shrink onto one card
  // (packOrderCards' `scale`) instead of spilling onto a separate "Cont."
  // card -- one long order used to be able to eat most of KitchenScreen's
  // MAX_VISIBLE slots by itself. Only truly huge orders still get a second
  // card, as a floor so text never shrinks past readability.
  const isContinuation = cardIndex > 0;
  const { cards, scale } = packOrderCards(allItems);
  const items = cards[cardIndex] || [];

  // Cluster items by seat so each guest's plate reads as one obvious block
  // on the ticket instead of a tiny inline tag per item — only when the
  // order actually has per-guest tagging; otherwise render flat as before.
  const hasSeats = items.some(i => i.seat);
  const seatGroups = [];
  const seatIndex = new Map();
  items.forEach(item => {
    const key = item.seat ?? null;
    if (!seatIndex.has(key)) {
      seatIndex.set(key, seatGroups.length);
      seatGroups.push({ seat: key, items: [] });
    }
    seatGroups[seatIndex.get(key)].items.push(item);
  });

  const changeStyle = (changeType) => {
    switch (changeType) {
      case "added":     return { color: "#15803D", bg: "#F0FDF4" };
      case "increased": return { color: "#15803D", bg: "#F0FDF4" };
      case "decreased": return { color: "#D97706", bg: "#FFFBEB" };
      case "removed":   return { color: "#BE202E", bg: "#FFF1F2", tagBg: "#BE202E", label: `✕ ${t.removed}` };
      default:          return { color: "#1A1A1A", bg: "transparent" };
    }
  };

  const ticketAccentColor = getOrderAccentColor(order);
  const ticketTintBg = getOrderAccentBg(order);

  // Order code stays out of the cook-facing UI to save space, but is
  // still logged for debugging/traceability against Firebase.
  useEffect(() => { console.log("[Kitchen ticket] order id:", order.id); }, [order.id]);

  return (
    <div style={{
      ...S.ticket,
      background: ticketTintBg,
      borderLeft: `10px solid ${ticketAccentColor}`,
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
      {order.isToGo && <div style={S.toGoBanner}>{t.toGoLabel} — {order.toGoName}{isContinuation ? " CONT." : ""}</div>}
      {order.isBar && <div style={{ ...S.toGoBanner, background: BAR_COLOR }}>{t.barLabel} — {order.table}{isContinuation ? " CONT." : ""}</div>}
      {order.isPatio && <div style={{ ...S.toGoBanner, background: PATIO_COLOR }}>{t.patioLabel} — {order.table}{isContinuation ? " CONT." : ""}</div>}
      {!order.isToGo && !order.isBar && !order.isPatio && <div style={{ ...S.toGoBanner, background: DINEIN_COLOR }}>{t.table2} — {order.table}{isContinuation ? " CONT." : ""}</div>}
      {order.modified && !order.cancelled && <div style={S.modifiedBanner}>{t.modified}</div>}

      {/* Keyboard shortcut hint — only shown on focused ticket */}
      {isFocused && !isQueue && (
        <div style={S.keyboardHintBar}>
          <span style={S.keyboardHint}><strong>ENTER</strong> = {t.markDone}</span>
          <span style={S.keyboardHint}><strong>2</strong> = {t.shortcutPrev}</span>
          <span style={S.keyboardHint}><strong>3</strong> = {t.shortcutNext}</span>
          <span style={S.keyboardHint}><strong>0</strong> = {t.shortcutUndo}</span>
        </div>
      )}

      <div style={S.ticketTop}>
        <div style={S.ticketTopLeft}>
          <div style={S.guestCheckTitle}>{t.guestCheck}</div>
        </div>
        <div style={S.ticketTopRight}>
          <div style={{ ...S.timerBig, color: timerColor }}>{elapsed(order.timestamp)}</div>
        </div>
      </div>

      <div style={S.ruledLine} />
      <div style={S.colHeaders}>
        <span style={{ ...S.colQty, fontSize: clampFont(FONT_COL, scale) }}>{t.qty}</span>
        <span style={{ ...S.colItem, fontSize: clampFont(FONT_COL, scale) }}>{t.item}</span>
      </div>
      <div style={S.ruledLine} />

      <div style={S.itemsList}>
        {seatGroups.map((group, gi) => (
          <div key={group.seat ?? "shared"}>
            {hasSeats && gi > 0 && <div style={{ ...S.plateDivider, margin: `${scalePx(6, scale)}px 14px 0` }} />}
            {hasSeats && (
              <div style={{ ...S.plateHeader, padding: `${scalePx(10, scale)}px 14px ${scalePx(5, scale)}px` }}>
                <span style={{ ...S.plateHeaderText, fontSize: clampFont(FONT_PLATE_HEADER, scale) }}>
                  {group.seat ? `${t.plato} ${group.seat}` : t.shared}
                </span>
              </div>
            )}
            {group.items.map((item, idx) => {
              const cs = changeStyle(item.changeType);
              const isZeroed = item.qty === 0;
              const isRemoved = item.changeType === "removed" || isZeroed;
              return (
                <div key={idx} style={{ ...S.itemRow, padding: `${scalePx(6, scale)}px 14px`, minHeight: scalePx(36, scale), background: order.cancelled ? "#FFF1F2" : isZeroed ? "#F3F4F6" : cs.bg, borderBottom: idx < group.items.length - 1 ? "1px solid #E5DFD0" : "none", opacity: isZeroed ? 0.35 : 1 }}>
                  <span style={{ ...S.itemQty, fontSize: clampFont(FONT_ITEM_QTY, scale), width: clampFont(FONT_ITEM_QTY, scale), color: order.cancelled ? "#BE202E" : isZeroed ? "#9CA3AF" : cs.color, textDecoration: isZeroed ? "line-through" : "none" }}>{item.qty}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ ...S.itemName, fontSize: clampFont(FONT_ITEM_NAME, scale), color: order.cancelled ? "#BE202E" : isZeroed ? "#9CA3AF" : cs.color, textDecoration: order.cancelled || isRemoved ? "line-through" : "none", fontWeight: item.changeType !== "unchanged" ? 900 : 700 }}>
                      {item.name}
                      {cs.tagBg && !order.cancelled && !isZeroed && <span style={{ ...S.changeTag, fontSize: clampFont(FONT_COL, scale), background: cs.tagBg }}>{cs.label}</span>}
                    </span>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div style={{ ...S.ticketModifiers, marginTop: scalePx(4, scale) }}>
                        {item.modifiers.map((mod, mi) => {
                          const isRemoval = REMOVE_TRIGGERS.some(w => mod.name.toLowerCase().includes(w));
                          return (
                            <span key={mi} style={{ ...S.ticketModifierChip, fontSize: clampFont(FONT_MODIFIER, scale), color: isRemoval ? "#BE202E" : "#15803D", fontWeight: 800, textTransform: "uppercase" }}>
                              {isRemoval ? "− " : "+ "}{mod.name.toUpperCase()}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {item.specialNote && (
                      <div style={{ ...S.ticketSpecialNoteBlock, marginTop: scalePx(4, scale) }}>
                        {parseSpecialNote(item.specialNote).map((seg, si) => (
                          <div key={si} style={{ ...S.ticketSpecialNoteLine, fontSize: clampFont(FONT_SPECIAL_NOTE, scale), color: seg.type === "add" ? "#15803D" : seg.type === "remove" ? "#BE202E" : "#1A1A1A" }}>
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
        ))}
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
          {order.cancelled ? "CANCELLED" : order.modified ? t.modified : order.status === "new" ? t.new : t.inProgress}
        </div>
        {!isQueue && !order.cancelled && (
          <div style={S.ticketBtns}>
            {order.status === "new" && (
              <button style={S.btnStart} onClick={() => updateOrderStatus(order.firestoreId, "in_progress")}>
                {t.startCooking}
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
  const MAX_VISIBLE = 4; // tuned for the 24" Dell monitor on KDS1 — raise/lower after seeing it in person
  const lastCompleted = useLastCompletedOrder();
  // Orders this Kitchen screen itself just soft-completed (kitchenReady,
  // not archived) — 0 pops the most recent one off to undo it, repeatable
  // up to 3 deep. Deliberately local/live-only: it only flips flags back on
  // orders already sitting in `orders`, never touches `completedOrders` or
  // recreates anything, so it can never flood the waitress screen or Clover
  // with resurrected old data (see the "0" handler below).
  const UNDO_STACK_LIMIT = 3;
  const lastMarkedReadyStackRef = useRef([]);

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

  const active = orders.filter(o => !o.kitchenReady && orderHasKitchenItems(o));

  // Build one "card" per packOrderCards() chunk of each order (see
  // GuestCheckTicket -- same helper, so the count here always matches what
  // actually renders), keeping each order's cards together as a unit --
  // an order either shows in full (all its cards) or goes to the queue
  // strip whole, so a continuation card can never get silently cut off
  // at the MAX_VISIBLE boundary. Memoized so it's referentially stable
  // across renders that don't change `active` (handleKeyDown depends on it).
  const visible = useMemo(() => {
    const result = [];
    for (const order of active) {
      const sourceItems = getKitchenTicketItems(order, catNameById);
      const cardCount = packOrderCards(sourceItems).cards.length;
      if (result.length + cardCount > MAX_VISIBLE) break;
      for (let i = 0; i < cardCount; i++) {
        result.push({ order, cardIndex: i, cardKey: `${order.firestoreId}:${i}` });
      }
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  const visibleOrderIds = new Set(visible.map(c => c.order.firestoreId));
  const queued = active.filter(o => !visibleOrderIds.has(o.firestoreId));
  // KDS1 is the only station with a speaker right now, so it needs to
  // chime for every live order restaurant-wide -- not just the ones with
  // kitchen items (`active`) -- otherwise a drinks-only order (e.g. an
  // agua fresca with nothing for the kitchen to cook) never makes a
  // sound anywhere. Revisit once KDS2/Drinks gets its own speaker. Orders
  // that also need Drinks/Sides get playDrinksAlertTone layered on top so
  // Chuy knows to flag Ausencia.
  useOrderChimes(orders, orderHasDrinksItems);

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

  function handleUndoLastCompleted() {
    if (!lastCompleted) return;
    const label = lastCompleted.isToGo ? lastCompleted.toGoName : lastCompleted.isBar ? `Barra ${lastCompleted.table}` : lastCompleted.isPatio ? `Patio ${lastCompleted.table}` : `Mesa ${lastCompleted.table}`;
    if (!window.confirm(`¿Deshacer la última orden completada (${label})?`)) return;
    undoCompletedOrder(lastCompleted);
    flash("Orden restaurada", "#7C3AED");
  }

  // ── Keyboard / numpad handler ──────────────────────────────
  // All key logic lives here. The numpad USB dongle plugs into
  // the Pi and the browser sees standard keydown events —
  // identical to pressing keys on a laptop keyboard.
  //
  // NUMPAD MAPPING (what the cook presses) — deliberately just two keys:
  //   Enter → soft-complete the focused order. Calls markKitchenReady, the
  //           same per-station handoff the touchscreen "Marcar Listo" button
  //           uses: clears the ticket off THIS screen but leaves the order
  //           live (still linked to its table/Clover order) for Expo/the
  //           waitress. It does NOT archive/delete — that only happens when
  //           the waitress closes the table (Cerrar Mesa) at checkout, or
  //           the order is bumped from Expo. Previously this called
  //           bumpOrder (full archive) directly, which severed the table's
  //           active-order record — if the waitress sent another round for
  //           the same table before the guest paid, findActiveOrderForIdentifier
  //           found nothing to merge into and created a second, disconnected
  //           order (and a second Clover ticket) for a table that was still open.
  //   0     → undo the last Enter (soft-complete) if one hasn't been
  //           superseded yet; otherwise falls back to undoing the last fully
  //           archived order, repeatable to keep going back.
  //
  const handleKeyDown = useCallback((e) => {
    // Don't steal keys when user is typing in an input/textarea
    if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;

    const order = visible[focusedIndex]?.order;

    // Normalize numpad keys — e.code is the physical key, e.key varies by OS/NumLock.
    let key = e.key;
    if (e.code === "NumpadEnter") key = "Enter";
    if (/^Numpad[0-9]$/.test(e.code)) key = e.code.slice(6);

    switch (key) {
      // ── ENTER: soft-complete the focused order (cache it, don't delete) ──
      case "Enter": {
        e.preventDefault();
        if (!order || order.cancelled) return;
        markKitchenReady(order);
        lastMarkedReadyStackRef.current = [...lastMarkedReadyStackRef.current, order].slice(-UNDO_STACK_LIMIT);
        flash("Cocina Lista", "#15803D");
        break;
      }

      // ── 0: undo this screen's own last Enter, repeatable up to
      // UNDO_STACK_LIMIT deep. Used to also fall back to resurrecting
      // lastCompleted (the single most recently archived order
      // restaurant-wide, any table/station) with no confirmation -- since
      // that ref reset on every page reload (auto-update reloads every
      // ~2min), that fallback fired far more than intended and dumped
      // random already-closed/paid tables back onto the waitress's live
      // view and Clover. Restoring an archived order now only happens via
      // the on-screen "Deshacer" button, which confirms first and shows
      // exactly which order it's about to bring back.
      case "0": {
        e.preventDefault();
        const stack = lastMarkedReadyStackRef.current;
        const last = stack[stack.length - 1];
        if (last) {
          const ref = doc(db, "orders", last.firestoreId);
          updateDoc(ref, { kitchenReady: false, allReady: false, allReadyAt: null });
          lastMarkedReadyStackRef.current = stack.slice(0, -1);
          flash("Orden Restaurada", "#7C3AED");
        }
        break;
      }

      // ── 2 / 3: move focus to the previous/next visible ticket ──
      case "2": { e.preventDefault(); setFocusedIndex(i => Math.max(i - 1, 0)); break; }
      case "3": { e.preventDefault(); setFocusedIndex(i => Math.min(i + 1, visible.length - 1)); break; }

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
          <span style={{ ...S.kitchenTitle, fontSize: "clamp(13px, calc(0.9vw + 6px), 22px)" }}>{t.kitchenDisplay}</span>
          {queued.length > 0 && <span style={{ ...S.queuePill, fontSize: "clamp(11px, calc(0.5vw + 6px), 15px)", padding: "3px 10px" }}>+{queued.length} {t.inQueue}</span>}
          {/* Keyboard mode indicator */}
          <span style={S.keyboardModePill}>{t.keyboardMode}</span>
        </div>
        <div style={S.kitchenStats}>
          <span style={{ ...S.statPillRed, fontSize: "clamp(11px, calc(0.5vw + 6px), 15px)", padding: "4px 10px" }}>{active.length} {t.active}</span>
          {lastCompleted && (
            <button style={{ ...S.undoBtn, fontSize: "clamp(11px, calc(0.5vw + 6px), 15px)", padding: "4px 10px" }} onClick={handleUndoLastCompleted}>Deshacer</button>
          )}
        </div>
      </div>

      {/* Action flash feedback — big centered overlay so cooks can see it from far away */}
      {actionFlash && (
        <div style={{ ...S.actionFlash, background: actionFlash.color }}>
          {actionFlash.msg}
        </div>
      )}

      {/* Numpad shortcut legend — always visible at bottom of header.
          Hardcoded to Spanish (not t.*) since this is the fixed cook-facing
          instruction for KDS 1's two-key numpad, independent of the app-wide
          EN/ES toggle. */}
      <div style={S.shortcutBar}>
        <span style={S.shortcutItem}><kbd style={S.kbd}>ENTER</kbd> Marcar lista (cocina)</span>
        <span style={S.shortcutItem}><kbd style={S.kbd}>0</kbd> Atrás (deshacer)</span>
      </div>

      {active.length === 0 ? (
        <div style={S.kitchenEmpty}>
          <div style={{ ...S.emptyCheck, padding: "20px 32px" }}>
            <div style={{ ...S.emptyCheckInner, gap: 6 }}>
              <div style={{ ...S.emptyCheckTitle, fontSize: "clamp(10px, calc(0.75vw + 6.5px), 20px)" }}>{t.guestCheck}</div>
              <div style={{ ...S.emptyCheckmark, fontSize: "clamp(34px, calc(5.1vw + 15.5px), 112px)" }}>✓</div>
              <div style={{ ...S.emptyCheckSub, fontSize: "clamp(13px, calc(1.9vw + 5.8px), 42px)" }}>{t.allCaughtUp}</div>
              <div style={{ ...S.emptyCheckSubSmall, fontSize: "clamp(10px, calc(0.97vw + 6.1px), 24px)" }}>{t.allCaughtUpSub}</div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ ...S.ticketGrid, gridTemplateColumns: "repeat(auto-fit, minmax(420px, 420px))" }}>
          {visible.map((card, idx) => (
            <div key={card.cardKey} onClick={() => setFocusedIndex(idx)} style={{ cursor: "pointer", containerType: "inline-size" }}>
              <GuestCheckTicket
                order={card.order}
                cardIndex={card.cardIndex}
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
              <span style={S.queueOrderTable}>{order.isToGo ? order.toGoName : order.isBar ? order.table : order.isPatio ? order.table : `${t.table2} ${order.table}`}</span>
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
function DrinksTicket({ order, cardIndex = 0, t, catNameById, isFocused }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsedSecs = Math.floor((Date.now() - order.timestamp) / 1000);
  const isUrgent  = elapsedSecs > 600;
  const isWarning = elapsedSecs > 300;
  const timerColor = isUrgent ? "#BE202E" : isWarning ? "#D97706" : "#15803D";

  const isContinuation = cardIndex > 0;
  const cardItems = buildTicketCards(order.items || [])[cardIndex] || [];

  const ticketAccentColor = getOrderAccentColor(order);
  const ticketTintBg = getOrderAccentBg(order);

  // Order code stays out of the cook-facing UI to save space, but is
  // still logged for debugging/traceability against Firebase.
  useEffect(() => { console.log("[Drinks ticket] order id:", order.id); }, [order.id]);

  return (
    <div style={{
      ...S.ticket,
      background: order.drinksReady ? "#F0FDF4" : ticketTintBg,
      borderLeft: `10px solid ${order.drinksReady ? "#15803D" : ticketAccentColor}`,
      opacity: order.drinksReady ? 0.75 : 1,
      outline: isFocused ? "4px solid #2563EB" : "none",
      outlineOffset: isFocused ? "3px" : "0",
      boxShadow: isFocused
        ? "0 0 0 4px rgba(37,99,235,0.25), 0 2px 10px rgba(0,0,0,0.08)"
        : "0 2px 10px rgba(0,0,0,0.08)",
    }}>
      {order.isToGo && (
        <div style={{ ...S.toGoBanner, background: TOGO_COLOR }}>
          PARA LLEVAR — {order.toGoName}{isContinuation ? " CONT." : ""}
        </div>
      )}
      {order.isBar && (
        <div style={{ ...S.toGoBanner, background: BAR_COLOR }}>
          BARRA — {order.table}{isContinuation ? " CONT." : ""}
        </div>
      )}
      {order.isPatio && (
        <div style={{ ...S.toGoBanner, background: PATIO_COLOR }}>
          PATIO — {order.table}{isContinuation ? " CONT." : ""}
        </div>
      )}
      {order.modified && !order.cancelled && <div style={S.modifiedBanner}>{t.modified}</div>}

      {/* Keyboard shortcut hint — only shown on focused ticket, matches Kitchen's hint bar */}
      {isFocused && (
        <div style={S.keyboardHintBar}>
          <span style={S.keyboardHint}><strong>ENTER</strong> = {t.markDone}</span>
          <span style={S.keyboardHint}><strong>2</strong> = {t.shortcutPrev}</span>
          <span style={S.keyboardHint}><strong>3</strong> = {t.shortcutNext}</span>
          <span style={S.keyboardHint}><strong>0</strong> = {t.shortcutUndo}</span>
        </div>
      )}

      <div style={S.ticketTop}>
        <div style={S.ticketTopLeft}>
          <div style={S.guestCheckTitle}>BEBIDAS / SIDES</div>
          {!order.isToGo && !order.isBar && !order.isPatio && (
            <div style={S.ticketMeta}>
              <span style={S.tableNumberBig}>{t.table2} {order.table}{isContinuation ? " CONT." : ""}</span>
            </div>
          )}
        </div>
        <div style={S.ticketTopRight}>
          <div style={{ ...S.timerBig, color: timerColor }}>{elapsed(order.timestamp)}</div>
        </div>
      </div>

      <div style={S.ruledLine} />
      <div style={S.colHeaders}>
        <span style={S.colQty}>{t.qty}</span>
        <span style={S.colItem}>{t.item}</span>
      </div>
      <div style={S.ruledLine} />

      <div style={S.itemsList}>
        {cardItems.map((item, idx) => {
          const rule = getDrinksRule(item.name, item.catName || catNameById?.[item.categoryId] || "");
          const color = rule ? rule.color : order.isToGo ? TOGO_COLOR : "#C0B8AC";
          const bg    = rule ? rule.bg    : order.isToGo ? TOGO_BG    : "transparent";
          const label = rule ? rule.label : null;
          const dimmed = !rule && !order.isToGo;
          const showDetails = item.modifiers && item.modifiers.length > 0;
          return (
            <div key={idx} style={{
              ...S.itemRow,
              background: bg,
              opacity: dimmed ? 0.3 : 1,
              borderBottom: idx < cardItems.length - 1 ? "1px solid #E5DFD0" : "none",
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
                {showDetails && (
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

      <div style={{ ...S.ruledLine, borderColor: "#B8A88A", borderWidth: 2 }} />
      <div style={S.ticketFooter}>
        {order.drinksReady ? (
          <div style={{ ...S.statusStamp, borderColor: "#15803D", color: "#15803D" }}>
            ✓ LISTO — ESPERANDO PAGO
          </div>
        ) : (
          <>
            <div style={{ ...S.statusStamp, borderColor: STATUS_COLORS[order.status], color: STATUS_COLORS[order.status] }}>
              {order.status === "new" ? t.new : t.inProgress}
            </div>
            {!order.cancelled && (
              <div style={S.ticketBtns}>
                {order.status === "new" && (
                  <button style={S.btnStart} onClick={() => updateOrderStatus(order.firestoreId, "in_progress")}>
                    {t.startCooking}
                  </button>
                )}
                {order.status === "in_progress" && (
                  <button style={S.btnDone} onClick={() => markDrinksReady(order)}>
                    ✓ {t.markDone}
                  </button>
                )}
              </div>
            )}
          </>
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
  const lastCompleted = useLastCompletedOrder();
  // Orders this Drinks screen itself just soft-completed via numpad Enter
  // (drinksReady, not archived) — 0 pops the most recent one off to undo
  // it, repeatable up to 3 deep. Same pattern as Kitchen's own stack.
  const UNDO_STACK_LIMIT = 3;
  const lastMarkedReadyStackRef = useRef([]);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() })));
    });
    return unsub;
  }, []);

  const catNameById = {};
  if (menu) menu.categories.forEach(c => { catNameById[c.id] = c.name[lang] || c.name.en || ""; });

  // A ticket drops off this screen the instant it's marked ready here --
  // same as KitchenScreen's own `active` filter below. Kitchen bumps now
  // also flip drinksReady (see markKitchenReady), so in practice a ticket
  // clears KDS1 and KDS2 together instead of lingering checked-off on KDS2
  // until the table's payment closes it.
  const pending = orders.filter(o => !o.drinksReady && orderHasDrinksItems(o));
  const done    = orders.filter(o => o.drinksReady && orderHasDrinksItems(o));
  const active  = pending;

  // Same per-order card grouping as KitchenScreen -- see its comment.
  const visible = useMemo(() => {
    const result = [];
    for (const order of active) {
      const cardCount = buildTicketCards(order.items || []).length;
      if (result.length + cardCount > MAX_VISIBLE) break;
      for (let i = 0; i < cardCount; i++) {
        result.push({ order, cardIndex: i, cardKey: `${order.firestoreId}:${i}` });
      }
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  const visibleOrderIds = new Set(visible.map(c => c.order.firestoreId));
  const queued = active.filter(o => !visibleOrderIds.has(o.firestoreId));

  useEffect(() => {
    if (focusedIndex >= visible.length && visible.length > 0) setFocusedIndex(visible.length - 1);
  }, [visible.length, focusedIndex]);

  function flash(msg, color = "#15803D") {
    setActionFlash({ msg, color });
    setTimeout(() => setActionFlash(null), 1200);
  }

  function handleUndoLastCompleted() {
    if (!lastCompleted) return;
    const label = lastCompleted.isToGo ? lastCompleted.toGoName : lastCompleted.isBar ? `Barra ${lastCompleted.table}` : lastCompleted.isPatio ? `Patio ${lastCompleted.table}` : `Mesa ${lastCompleted.table}`;
    if (!window.confirm(`¿Deshacer la última orden completada (${label})?`)) return;
    undoCompletedOrder(lastCompleted);
    flash("Orden restaurada", "#7C3AED");
  }

  const handleKeyDown = useCallback((e) => {
    if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
    const order = visible[focusedIndex]?.order;
    let key = e.key;
    if (e.code === "NumpadEnter")    key = "Enter";
    if (e.code === "NumpadAdd")      key = "+";
    if (e.code === "NumpadSubtract") key = "-";
    if (e.code === "NumpadMultiply") key = "*";
    switch (key) {
      case "Enter": {
        e.preventDefault();
        if (!order || order.cancelled || order.drinksReady) return;
        markDrinksReady(order);
        lastMarkedReadyStackRef.current = [...lastMarkedReadyStackRef.current, order].slice(-UNDO_STACK_LIMIT);
        flash("✓ Listo!", "#15803D");
        break;
      }
      // "2"/"3" and "0" are the standard numpad labels (match Kitchen); "+"/"-"/"*"
      // stay wired to the same actions too so nothing that already relied on them breaks.
      case "+": case "3": { e.preventDefault(); setFocusedIndex(i => Math.min(i + 1, visible.length - 1)); break; }
      case "-": case "2": { e.preventDefault(); setFocusedIndex(i => Math.max(i - 1, 0)); break; }
      // Undoes this screen's own last Enter (soft-complete), repeatable up
      // to UNDO_STACK_LIMIT deep -- same pattern as Kitchen's "0". Used to
      // also fall back to resurrecting lastCompleted (the single most
      // recently archived order restaurant-wide, any table/station) with no
      // confirmation -- that dumped random already-closed/paid tables back
      // onto the waitress's live view. Restoring an archived order now only
      // happens via the on-screen "Deshacer" button (confirms first, names
      // the order).
      case "*": case "0": {
        e.preventDefault();
        const stack = lastMarkedReadyStackRef.current;
        const last = stack[stack.length - 1];
        if (last) {
          const ref = doc(db, "orders", last.firestoreId);
          updateDoc(ref, { drinksReady: false, allReady: false, allReadyAt: null });
          lastMarkedReadyStackRef.current = stack.slice(0, -1);
          flash("Orden Restaurada", "#7C3AED");
        }
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
          <span style={{ ...S.kitchenTitle, fontSize: "clamp(13px, calc(0.9vw + 6px), 22px)" }}>Bebidas / Sides</span>
          {queued.length > 0 && <span style={{ ...S.queuePill, fontSize: "clamp(11px, calc(0.5vw + 6px), 15px)", padding: "3px 10px" }}>+{queued.length} {t.inQueue}</span>}
        </div>
        <div style={S.kitchenStats}>
          <span style={{ ...S.statPillRed, fontSize: "clamp(11px, calc(0.5vw + 6px), 15px)", padding: "4px 10px" }}>{pending.length} {t.active}</span>
          {done.length > 0 && (
            <span style={{ ...S.statPillGreen, fontSize: "clamp(11px, calc(0.5vw + 6px), 15px)", padding: "4px 10px" }}>{done.length} listo{done.length !== 1 ? "s" : ""}</span>
          )}
          {lastCompleted && (
            <button style={{ ...S.undoBtn, fontSize: "clamp(11px, calc(0.5vw + 6px), 15px)", padding: "4px 10px" }} onClick={handleUndoLastCompleted}>Deshacer</button>
          )}
        </div>
      </div>

      {/* Color legend */}
      <div style={{ display: "flex", gap: 16, padding: "6px 16px", background: "#1E293B", flexWrap: "wrap" }}>
        <span style={{ fontSize: "clamp(22px, calc(2.110vw + 14.90px), 55px)", color: "#C4B5FD", fontWeight: 800 }}>AGUA FRESCA</span>
        <span style={{ fontSize: "clamp(22px, calc(2.110vw + 14.90px), 55px)", color: "#FCA5A5", fontWeight: 800 }}>CALDO</span>
        <span style={{ fontSize: "clamp(22px, calc(2.110vw + 14.90px), 55px)", color: "#FCD34D", fontWeight: 800 }}>PARA LLEVAR</span>
        <span style={{ fontSize: "clamp(22px, calc(2.110vw + 14.90px), 55px)", color: "#86EFAC", fontWeight: 800 }}>GUACAMOLE</span>
      </div>

      {actionFlash && (
        <div style={{ ...S.actionFlash, background: actionFlash.color }}>{actionFlash.msg}</div>
      )}

      {active.length === 0 ? (
        <div style={S.kitchenEmpty}>
          <div style={{ ...S.emptyCheck, padding: "20px 32px" }}>
            <div style={{ ...S.emptyCheckInner, gap: 6 }}>
              <div style={{ ...S.emptyCheckTitle, fontSize: "clamp(10px, calc(0.75vw + 6.5px), 20px)" }}>BEBIDAS / SIDES</div>
              <div style={{ ...S.emptyCheckmark, fontSize: "clamp(34px, calc(5.1vw + 15.5px), 112px)" }}>✓</div>
              <div style={{ ...S.emptyCheckSub, fontSize: "clamp(13px, calc(1.9vw + 5.8px), 42px)" }}>{t.allCaughtUp}</div>
              <div style={{ ...S.emptyCheckSubSmall, fontSize: "clamp(10px, calc(0.97vw + 6.1px), 24px)" }}>{t.allCaughtUpSub}</div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ ...S.ticketGrid, gridTemplateColumns: "repeat(auto-fit, minmax(420px, 420px))" }}>
          {visible.map((card, idx) => (
            <div key={card.cardKey} onClick={() => setFocusedIndex(idx)} style={{ cursor: "pointer", containerType: "inline-size" }}>
              <DrinksTicket order={card.order} cardIndex={card.cardIndex} t={t} catNameById={catNameById} isFocused={idx === focusedIndex} />
            </div>
          ))}
        </div>
      )}

      {queued.length > 0 && (
        <div style={S.queueStrip}>
          <div style={S.queueLabel}>COLA / QUEUE</div>
          {queued.map(order => (
            <div key={order.firestoreId} style={S.queueItem}>
              <span style={S.queueOrderTable}>
                {order.drinksReady && <span style={{ color: "#15803D" }}>✓ </span>}
                {order.isToGo ? order.toGoName : order.isBar ? order.table : order.isPatio ? order.table : `${t.table2} ${order.table}`}
              </span>
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

  // Order code stays out of the runner-facing UI to save space, but is
  // still logged for debugging/traceability against Firebase.
  useEffect(() => { console.log("[Expo ticket] order id:", order.id); }, [order.id]);

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

  const ticketAccentColor = getOrderAccentColor(order);
  const ticketTintBg = getOrderAccentBg(order);

  return (
    <div
      className={allDone && !order.delivered ? "expo-ticket-ready" : ""}
      style={{
        background: order.delivered ? "#F3F4F6" : allDone ? "#FFFFFF" : ticketTintBg,
        border: order.delivered ? "3px solid #9CA3AF" : allDone ? "3px solid #15803D" : `1.5px solid ${ticketAccentColor}`,
        borderLeft: order.delivered ? "3px solid #9CA3AF" : allDone ? "3px solid #15803D" : `10px solid ${ticketAccentColor}`,
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        opacity: order.delivered ? 0.7 : 1,
        transition: "border-color 0.3s, box-shadow 0.3s",
        boxShadow: order.delivered ? "0 2px 8px rgba(0,0,0,0.06)" : allDone ? "0 4px 20px rgba(21,128,61,0.3)" : "0 2px 8px rgba(0,0,0,0.06)",
        containerType: "inline-size",
      }}
    >
      {/* Header */}
      <div style={{ background: allDone ? "#DCFCE7" : "#F5EFE0", padding: "10px 14px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "clamp(18px, calc(10.578cqw - 18.46px), 45px)", fontWeight: 800, color: "#9B8B72", letterSpacing: "0.18em", textTransform: "uppercase" }}>
            {order.isToGo ? "Para Llevar" : order.isBar ? "Barra" : order.isPatio ? "Patio" : "Mesa"}
          </div>
          <div style={{ fontSize: order.isToGo ? "clamp(20px, calc(17.308cqw - 38.85px), 65px)" : "clamp(39px, calc(35.096cqw - 80.57px), 130px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", color: allDone ? "#15803D" : (order.isBar ? BAR_COLOR : order.isPatio ? PATIO_COLOR : "#1A1A1A"), textTransform: "uppercase", wordBreak: "break-word" }}>
            {order.isToGo ? order.toGoName : order.table}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
          <div style={{ fontSize: "clamp(21px, calc(18.750cqw - 42.50px), 70px)", fontWeight: 900, color: timerColor, marginTop: 2, whiteSpace: "nowrap" }}>{elapsed(order.timestamp)}</div>
        </div>
      </div>

      {order.modified && <div style={{ background: "#7C3AED", color: "#fff", fontSize: "clamp(20px, calc(11.539cqw - 19.23px), 50px)", fontWeight: 900, padding: "3px 10px", textAlign: "center", letterSpacing: "0.06em", textTransform: "uppercase" }}>MODIFICADA</div>}

      {/* Station columns */}
      <div style={{ display: "flex", flex: 1, minHeight: 100 }}>
        {hasKitchen && (
          <div style={{ flex: 1, minWidth: 0, padding: "10px 12px", background: order.kitchenReady ? "#F0FDF4" : "#FFFBEB", borderRight: hasDrinks ? "1px solid #E0D8C4" : "none", containerType: "inline-size" }}>
            <div style={{ fontSize: "clamp(20px, calc(11.539cqw - 19.23px), 50px)", fontWeight: 900, letterSpacing: "0.1em", color: order.kitchenReady ? "#15803D" : "#D97706", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between", textTransform: "uppercase" }}>
              COCINA
              {order.kitchenReady && <span>✓</span>}
            </div>
            {kitchenItems.map((item, i) => (
              <div key={i} style={{ fontSize: "clamp(20px, calc(17.308cqw - 38.85px), 65px)", fontWeight: 700, color: order.kitchenReady ? "#9CA3AF" : "#1A1A1A", textDecoration: order.kitchenReady ? "line-through" : "none", marginBottom: 3, lineHeight: 1.3, textTransform: "uppercase", overflowWrap: "break-word", wordBreak: "break-word" }}>
                <span style={{ fontWeight: 900 }}>{item.qty}×</span> {item.name}
              </div>
            ))}
            <div style={{ marginTop: 8, background: order.kitchenReady ? "#DCFCE7" : order.status === "in_progress" ? "#FEF3C7" : "#F5F3F0", color: order.kitchenReady ? "#15803D" : order.status === "in_progress" ? "#D97706" : "#9CA3AF", borderRadius: 6, padding: "4px 8px", fontSize: "clamp(22px, calc(12.500cqw - 20.00px), 55px)", fontWeight: 800, textAlign: "center", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {order.kitchenReady ? "LISTO" : order.status === "in_progress" ? "COCINANDO" : "EN COLA"}
            </div>
          </div>
        )}

        {hasDrinks && (
          <div style={{ flex: 1, minWidth: 0, padding: "10px 12px", background: order.drinksReady ? "#F0FDF4" : "#F5F3FF", containerType: "inline-size" }}>
            <div style={{ fontSize: "clamp(20px, calc(11.539cqw - 19.23px), 50px)", fontWeight: 900, letterSpacing: "0.1em", color: order.drinksReady ? "#15803D" : "#7C3AED", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between", textTransform: "uppercase" }}>
              BEBIDAS
              {order.drinksReady && <span>✓</span>}
            </div>
            {drinksItems.map((item, i) => (
              <div key={i} style={{ fontSize: "clamp(20px, calc(17.308cqw - 38.85px), 65px)", fontWeight: 700, color: order.drinksReady ? "#9CA3AF" : "#1A1A1A", textDecoration: order.drinksReady ? "line-through" : "none", marginBottom: 3, lineHeight: 1.3, textTransform: "uppercase", overflowWrap: "break-word", wordBreak: "break-word" }}>
                <span style={{ fontWeight: 900 }}>{item.qty}×</span> {item.name}
              </div>
            ))}
            <div style={{ marginTop: 8, background: order.drinksReady ? "#DCFCE7" : "#EDE9FE", color: order.drinksReady ? "#15803D" : "#7C3AED", borderRadius: 6, padding: "4px 8px", fontSize: "clamp(22px, calc(12.500cqw - 20.00px), 55px)", fontWeight: 800, textAlign: "center", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {order.drinksReady ? "LISTO" : "PREPARANDO"}
            </div>
          </div>
        )}

        {!hasKitchen && !hasDrinks && (
          <div style={{ flex: 1, padding: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {order.items?.map((item, i) => (
              <div key={i} style={{ fontSize: "clamp(20px, calc(17.308cqw - 38.85px), 65px)", fontWeight: 700, color: "#1A1A1A", marginBottom: 3, textTransform: "uppercase" }}>
                {item.qty}× {item.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      {order.note && (
        <div style={{ padding: "5px 12px", background: "#FFFBEB", borderTop: "1px solid #E0D8C4", fontSize: "clamp(22px, calc(12.500cqw - 20.00px), 55px)", color: "#666", fontStyle: "italic", textTransform: "uppercase" }}>
          {order.note}
        </div>
      )}

      {/* Footer: status / bump */}
      <div style={{ padding: "10px 14px", background: order.delivered ? "#6B7280" : allDone ? "#15803D" : "#F5F3F0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, borderTop: allDone ? "none" : "1px solid #E0D8C4" }}>
        {order.delivered ? (
          <div style={{ fontSize: "clamp(20px, calc(17.308cqw - 38.85px), 65px)", fontWeight: 900, color: "#FFFFFF", letterSpacing: "0.04em", textTransform: "uppercase", width: "100%", textAlign: "center" }}>
            ✓ ENTREGADO — ESPERANDO PAGO
          </div>
        ) : allDone ? (
          <>
            <div style={{ fontSize: "clamp(20px, calc(17.308cqw - 38.85px), 65px)", fontWeight: 900, color: "#FFFFFF", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              LISTO PARA ENTREGAR
            </div>
            <button
              onClick={() => markDelivered(order)}
              style={{ background: "#FFFFFF", color: "#15803D", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: "clamp(20px, calc(17.308cqw - 38.85px), 65px)", fontWeight: 900, cursor: "pointer", letterSpacing: "0.06em", whiteSpace: "nowrap", flexShrink: 0, textTransform: "uppercase" }}
            >
              BUMP ✓
            </button>
          </>
        ) : (
          <div style={{ fontSize: "clamp(24px, calc(13.942cqw - 23.65px), 60px)", fontWeight: 700, color: "#9CA3AF", width: "100%", textAlign: "center", textTransform: "uppercase" }}>
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
  const lastCompleted = useLastCompletedOrder();
  useOrderChimes(orders);

  function handleUndoLastCompleted() {
    if (!lastCompleted) return;
    const label = lastCompleted.isToGo ? lastCompleted.toGoName : lastCompleted.isBar ? `Barra ${lastCompleted.table}` : lastCompleted.isPatio ? `Patio ${lastCompleted.table}` : `Mesa ${lastCompleted.table}`;
    if (!window.confirm(`¿Deshacer la última orden completada (${label})?`)) return;
    undoCompletedOrder(lastCompleted);
  }

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("timestamp", "asc"));
    return onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })));
    });
  }, []);

  // Auto-mark stale ready orders as delivered after 90s if the runner forgot
  // to bump — moves it into the muted "delivered, awaiting payment" group
  // below instead of leaving it glowing in the ready queue forever; never
  // touches the waitress side.
  useEffect(() => {
    const stale = orders.filter(o => o.allReady && !o.delivered && o.allReadyAt && Date.now() - o.allReadyAt > 90000);
    stale.forEach(o => markDelivered(o));
  }, [orders]);

  const catNameById = {};
  if (menu) menu.categories.forEach(c => { catNameById[c.id] = c.name.es || c.name.en || ""; });

  const isOrderReady = (o) => {
    const hasK = orderHasKitchenItems(o);
    const hasD = orderNeedsDrinksStation(o);
    return (!hasK || !!o.kitchenReady) && (!hasD || !!o.drinksReady);
  };

  // Expo keeps tracking an order until it's actually archived (payment
  // closes the table, see checkPendingPayments/closeTable) -- it no longer
  // drops off the instant Kitchen marks its part ready. Split into three
  // groups so a runner can still tell at a glance what needs action
  // (readyOrders) vs. what's just sitting there waiting on the tab to close
  // (deliveredOrders), instead of both looking identical.
  const expoOrders = orders;

  const readyOrders     = expoOrders.filter(o => isOrderReady(o) && !o.delivered);
  const deliveredOrders = expoOrders.filter(o => isOrderReady(o) && o.delivered);
  const activeOrders    = expoOrders.filter(o => !isOrderReady(o));

  return (
    <div style={S.kitchenRoot}>
      <div style={S.kitchenHeader}>
        <div style={S.kitchenHeaderLeft}>
          <span style={{ ...S.kitchenTitle, fontSize: "clamp(13px, calc(0.9vw + 6px), 22px)" }}>Expo / Entrega</span>
          {readyOrders.length > 0 && (
            <span className="expo-badge-pulse" style={{ ...S.queuePill, background: "#15803D", fontSize: "clamp(11px, calc(0.5vw + 6px), 15px)", padding: "3px 10px" }}>
              {readyOrders.length} LISTA{readyOrders.length > 1 ? "S" : ""}
            </span>
          )}
        </div>
        <div style={S.kitchenStats}>
          <span style={{ ...S.statPillRed, fontSize: "clamp(11px, calc(0.5vw + 6px), 15px)", padding: "4px 10px" }}>{activeOrders.length} en proceso</span>
          <span style={{ ...S.statPillGreen, fontSize: "clamp(11px, calc(0.5vw + 6px), 15px)", padding: "4px 10px" }}>{readyOrders.length} lista{readyOrders.length !== 1 ? "s" : ""}</span>
          {deliveredOrders.length > 0 && (
            <span style={{ ...S.statPillGreen, background: "#9CA3AF", fontSize: "clamp(11px, calc(0.5vw + 6px), 15px)", padding: "4px 10px" }}>{deliveredOrders.length} entregada{deliveredOrders.length !== 1 ? "s" : ""}</span>
          )}
          {lastCompleted && (
            <button style={{ ...S.undoBtn, fontSize: "clamp(11px, calc(0.5vw + 6px), 15px)", padding: "4px 10px" }} onClick={handleUndoLastCompleted}>Deshacer</button>
          )}
        </div>
      </div>

      {orders.length === 0 ? (
        <div style={S.kitchenEmpty}>
          <div style={{ ...S.emptyCheck, padding: "20px 32px" }}>
            <div style={{ ...S.emptyCheckInner, gap: 6 }}>
              <div style={{ ...S.emptyCheckTitle, fontSize: "clamp(10px, calc(0.75vw + 6.5px), 20px)" }}>EXPO</div>
              <div style={{ ...S.emptyCheckmark, fontSize: "clamp(34px, calc(5.1vw + 15.5px), 112px)" }}>✓</div>
              <div style={{ ...S.emptyCheckSub, fontSize: "clamp(13px, calc(1.9vw + 5.8px), 42px)" }}>Todo al día</div>
              <div style={{ ...S.emptyCheckSubSmall, fontSize: "clamp(10px, calc(0.97vw + 6.1px), 24px)" }}>Sin órdenes pendientes</div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(440px, 440px))", gap: 14, padding: 16, alignItems: "start", overflowY: "auto" }}>
          {/* Ready orders first (at top), then still-cooking, then delivered-but-unpaid last (least urgent) */}
          {readyOrders.map(order => (
            <ExpoTicket key={order.firestoreId} order={order} catNameById={catNameById} />
          ))}
          {activeOrders.map(order => (
            <ExpoTicket key={order.firestoreId} order={order} catNameById={catNameById} />
          ))}
          {deliveredOrders.map(order => (
            <ExpoTicket key={order.firestoreId} order={order} catNameById={catNameById} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// ACTIVE ORDERS PICKER MODAL — shared by table / to-go / bar
// ============================================================
function ActiveOrdersModal({ title, orders, lang, onEditOrder, onClose }) {
  const t = T[lang];
  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div style={S.modalTitle}>{title}</div>
          <button style={S.modalCloseBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{ ...S.modalBody, display: "flex", flexDirection: "column", gap: 8 }}>
          {orders.length === 0 && <div style={S.modalEmpty}>{t.noActiveOrders}</div>}
          {orders.map(order => (
            <div key={order.firestoreId} style={S.activeOrderRow}>
              <button style={S.activeOrderMain} onClick={() => onEditOrder(order)}>
                <span style={order.isToGo ? S.toGoChipSmall : order.isBar ? { ...S.toGoChipSmall, background: BAR_BG, color: BAR_COLOR } : order.isPatio ? { ...S.toGoChipSmall, background: PATIO_BG, color: PATIO_COLOR } : S.tableChipSmall}>
                  {order.isToGo ? `🥡 ${order.toGoName}` : order.isBar ? `🍺 ${order.table}` : order.isPatio ? `🌿 ${order.table}` : `${t.table2} ${order.table}`}
                </span>
                <span style={S.activeOrderItems}>{order.items.map(i => `${i.emoji ? i.emoji + " " : ""}${i.qty}× ${i.name}`).join(", ")}</span>
                <span style={S.activeOrderEdit}>✏️ {t.editOrder}</span>
              </button>
              <button
                style={S.activeOrderComplete}
                onClick={() => { if (window.confirm(t.confirmComplete)) bumpOrder(order); }}
              >
                ✓ {t.completeOrder}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TABLE SELECT SCREEN
// ============================================================
const TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const PATIO_TABLES = [1, 2, 3, 4];
const BAR_SEATS = [1, 2, 3, 4];
const TOGO_SLOTS = [1, 2, 3, 4];

// Shared tile for a single table/seat, reused by the Mesas, Patio, and
// Barra sections — they all follow the same open/occupied/close pattern,
// just against a different orders-by-key map and free-state accent color.
function FloorTile({ num, occupied, itemCount, earliest, isClosing, onOpen, onClose, closeLabel, freeStyle, subtitle }) {
  return (
    <div
      style={{ ...S.tableCard, ...(occupied ? S.tableCardOccupied : (freeStyle || S.tableCardFree)) }}
      onClick={onOpen}
    >
      <div style={S.tableCardNum}>{num}</div>
      <div style={{ ...S.tableCardLabel, color: occupied ? "#92400E" : "#15803D" }}>
        {occupied ? "OCUPADA" : "LIBRE"}
      </div>
      {occupied && (
        <>
          {subtitle && <div style={S.tableCardSubtitle}>{subtitle}</div>}
          <div style={S.tableCardItems}>{itemCount} artículo{itemCount !== 1 ? "s" : ""}</div>
          <div style={S.tableCardTimer}>{elapsed(earliest)}</div>
          <button
            style={{ ...S.tableCardCloseBtn, opacity: isClosing ? 0.5 : 1 }}
            onClick={onClose}
            disabled={isClosing}
          >
            {isClosing ? "..." : closeLabel}
          </button>
        </>
      )}
    </div>
  );
}

function TableSelectScreen({ lang, onSelectTable, onSelectToGo, onSelectBar, onSelectPatio, onEditOrder }) {
  const t = T[lang];
  const [orders, setOrders] = useState([]);
  const [closing, setClosing] = useState(null);
  const [detailTable, setDetailTable] = useState(null);
  const [detailBarSeat, setDetailBarSeat] = useState(null);
  const [detailPatio, setDetailPatio] = useState(null);
  const [detailToGo, setDetailToGo] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const activeByTable = {};
  orders.filter(o => o.status !== "done" && !o.isToGo && !o.isBar && !o.isPatio).forEach(o => {
    if (!activeByTable[o.table]) activeByTable[o.table] = [];
    activeByTable[o.table].push(o);
  });
  const activeByBarSeat = {};
  orders.filter(o => o.status !== "done" && o.isBar).forEach(o => {
    if (!activeByBarSeat[o.table]) activeByBarSeat[o.table] = [];
    activeByBarSeat[o.table].push(o);
  });
  const activeByPatio = {};
  orders.filter(o => o.status !== "done" && o.isPatio).forEach(o => {
    if (!activeByPatio[o.table]) activeByPatio[o.table] = [];
    activeByPatio[o.table].push(o);
  });
  const activeByToGoSlot = {};
  orders.filter(o => o.status !== "done" && o.isToGo).forEach(o => {
    if (!activeByToGoSlot[o.toGoSlot]) activeByToGoSlot[o.toGoSlot] = [];
    activeByToGoSlot[o.toGoSlot].push(o);
  });

  async function handleClose(key, ordersByKey, e) {
    e.stopPropagation();
    setClosing(key);
    await closeTable(ordersByKey[key] || []);
    setClosing(null);
  }

  function renderFloorTile(num, ordersByKey, { onSelect, onDetail, closeLabel, freeStyle, getSubtitle }) {
    const key = num.toString();
    const tileOrders = ordersByKey[key] || [];
    const occupied = tileOrders.length > 0;
    const itemCount = tileOrders.reduce((s, o) => s + (o.items?.length || 0), 0);
    const earliest = occupied ? Math.min(...tileOrders.map(o => o.timestamp)) : null;
    return (
      <FloorTile
        key={num}
        num={num}
        occupied={occupied}
        itemCount={itemCount}
        earliest={earliest}
        isClosing={closing === key}
        onOpen={() => tileOrders.length === 1 ? onEditOrder(tileOrders[0]) : occupied ? onDetail(key) : onSelect(key)}
        onClose={(e) => handleClose(key, ordersByKey, e)}
        closeLabel={closeLabel}
        freeStyle={freeStyle}
        subtitle={occupied && getSubtitle ? getSubtitle(tileOrders[0]) : null}
      />
    );
  }

  return (
    <div style={S.tableSelectRoot}>
      {detailTable && (
        <ActiveOrdersModal
          title={`${t.table2} ${detailTable} — ${t.tableOrders}`}
          orders={activeByTable[detailTable] || []}
          lang={lang}
          onEditOrder={(order) => { setDetailTable(null); onEditOrder(order); }}
          onClose={() => setDetailTable(null)}
        />
      )}
      {detailBarSeat && (
        <ActiveOrdersModal
          title={`🍺 Barra ${detailBarSeat} — ${lang === "es" ? "Órdenes de la Barra" : "Bar Orders"}`}
          orders={activeByBarSeat[detailBarSeat] || []}
          lang={lang}
          onEditOrder={(order) => { setDetailBarSeat(null); onEditOrder(order); }}
          onClose={() => setDetailBarSeat(null)}
        />
      )}
      {detailPatio && (
        <ActiveOrdersModal
          title={`🌿 Patio ${detailPatio} — ${lang === "es" ? "Órdenes del Patio" : "Patio Orders"}`}
          orders={activeByPatio[detailPatio] || []}
          lang={lang}
          onEditOrder={(order) => { setDetailPatio(null); onEditOrder(order); }}
          onClose={() => setDetailPatio(null)}
        />
      )}
      {detailToGo && (
        <ActiveOrdersModal
          title={`🥡 ${t.toGoLabel} ${detailToGo}`}
          orders={activeByToGoSlot[detailToGo] || []}
          lang={lang}
          onEditOrder={(order) => { setDetailToGo(null); onEditOrder(order); }}
          onClose={() => setDetailToGo(null)}
        />
      )}
      <div style={S.tableSelectHeader}>
        <span style={S.tableSelectTitle}>🍽️ Dona Paty's</span>
        <span style={S.tableSelectSub}>Selecciona una mesa para ordenar</span>
      </div>

      <div style={{ ...S.sectionLabel, color: BAR_COLOR }}>🍺 Barra</div>
      <div style={{ ...S.tableGrid, gridTemplateColumns: "repeat(4, 1fr)" }}>
        {BAR_SEATS.map(num => renderFloorTile(num, activeByBarSeat, {
          onSelect: onSelectBar, onDetail: setDetailBarSeat, closeLabel: "✓ Cerrar Asiento", freeStyle: S.tableCardFreeBar,
        }))}
      </div>

      <div style={S.sectionLabel}>🍽️ Mesas</div>
      <div style={S.tableGrid}>
        {TABLES.map(num => renderFloorTile(num, activeByTable, {
          onSelect: onSelectTable, onDetail: setDetailTable, closeLabel: "✓ Cerrar Mesa",
        }))}
      </div>

      <div style={{ ...S.sectionLabel, color: PATIO_COLOR }}>🌿 Patio</div>
      <div style={{ ...S.tableGrid, gridTemplateColumns: "repeat(4, 1fr)" }}>
        {PATIO_TABLES.map(num => renderFloorTile(num, activeByPatio, {
          onSelect: onSelectPatio, onDetail: setDetailPatio, closeLabel: "✓ Cerrar Mesa", freeStyle: S.tableCardFreePatio,
        }))}
      </div>

      <div style={S.floorDivider} />

      <div style={{ ...S.sectionLabel, color: TOGO_COLOR }}>🥡 Para Llevar</div>
      <div style={{ ...S.tableGrid, gridTemplateColumns: "repeat(4, 1fr)" }}>
        {TOGO_SLOTS.map(num => renderFloorTile(num, activeByToGoSlot, {
          onSelect: onSelectToGo, onDetail: setDetailToGo, closeLabel: "✓ Cerrar", freeStyle: S.tableCardFreeToGo,
          getSubtitle: (order) => order.toGoName,
        }))}
      </div>
    </div>
  );
}

// ============================================================
// WAITER SCREEN
// ============================================================
const DRINK_CAT_KEYWORDS = [
  "beverage", "bebida", "drink", "agua", "happy hour",
  "beer", "cerveza", "liquor", "licor", "cocktail", "coctel", "cóctel",
  "wine", "vino", "bar", "soda", "juice", "jugo",
];

function isDrinkCategory(cat) {
  const name = (cat.name.en || cat.name.es || "").toLowerCase();
  return DRINK_CAT_KEYWORDS.some(k => name.includes(k));
}

function getCategoryEmoji(cat) {
  const name = (cat.name.en || cat.name.es || "").toLowerCase();
  if (name.includes("cocktail") || name.includes("coctel") || name.includes("cóctel")) return "🍹";
  if (name.includes("beer") || name.includes("cerveza")) return "🍺";
  if (name.includes("wine") || name.includes("vino")) return "🍷";
  if (name.includes("liquor") || name.includes("licor")) return "🥃";
  if (name.includes("beverage") || name.includes("bebida") || name.includes("drink")) return "🥤";
  if (name.includes("agua") || name.includes("water")) return "💧";
  if (name.includes("juice") || name.includes("jugo")) return "🧃";
  if (name.includes("soda")) return "🥤";
  if (name.includes("appetizer") || name.includes("starter") || name.includes("entrada")) return "🥗";
  if (name.includes("soup") || name.includes("sopa")) return "🍲";
  if (name.includes("taco")) return "🌮";
  if (name.includes("burrito")) return "🌯";
  if (name.includes("fajita")) return "🥘";
  if (name.includes("dessert") || name.includes("postre")) return "🍰";
  if (name.includes("breakfast") || name.includes("desayuno")) return "🍳";
  if (name.includes("side") || name.includes("extra")) return "🥙";
  if (name.includes("kid")) return "👧";
  if (name.includes("festival")) return "🎉";
  if (name.includes("main") || name.includes("dinner") || name.includes("plato")) return "🍽️";
  return "🍴";
}

// Distinguishes cart lines by item + seat + exact modifier set + note, so the
// same item with different modifiers gets its own line instead of merging qty.
function cartLineKey(id, seat, modifiers, specialNote) {
  const modKey = (modifiers || []).map(m => m.id).sort().join(",");
  return `${id}|${seat ?? ""}|${modKey}|${specialNote || ""}`;
}

function WaiterScreen({ menu, onOrderSent, lang, initialTable, initialOrderType, initialEditOrder, onBack }) {
  const t = T[lang];
  const [activeTab, setActiveTab] = useState("drinks");
  const [activeCategory, setActiveCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [activeSeat, setActiveSeat] = useState(null);
  const [seatCount, setSeatCount] = useState(0);
  const MAX_SEATS = 4;
  const [orderType, setOrderType] = useState(initialOrderType || "table");
  const [tableNum, setTableNum] = useState(initialTable || "");
  const [toGoName, setToGoName] = useState("");
  const [toGoSlot, setToGoSlot] = useState(initialOrderType === "togo" ? (initialTable || null) : null);
  const [barSeat, setBarSeat] = useState(initialOrderType === "bar" ? (initialTable || "") : "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [note, setNote] = useState("");
  const [editingOrder, setEditingOrder] = useState(null);
  const [modModalItem, setModModalItem] = useState(null);
  const [specialModalCat, setSpecialModalCat] = useState(null);
  const [swapTargetKey, setSwapTargetKey] = useState(null);
  const rootRef = useRef(null);
  const [rootHeight, setRootHeight] = useState(null);
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const footerRef = useRef(null);
  const [footerHeight, setFooterHeight] = useState(0);

  // The menu panel and cart panel are meant to scroll independently of each
  // other, but on some tablet WebViews the flex cross-axis stretch that's
  // supposed to bound their height wasn't reliable — both ended up scrolling
  // together as one page instead of the cart's send button staying isolated
  // from the food/drink list. Give both panels a literal measured pixel
  // height (root height minus the header's real rendered height) instead of
  // leaving that up to flex, so overflow:hidden has an unambiguous box to
  // clip against no matter how that's implemented.
  useEffect(() => {
    if (!headerRef.current) return;
    const ro = new ResizeObserver(([entry]) => setHeaderHeight(entry.contentRect.height));
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, []);
  const mainHeight = rootHeight ? Math.max(200, rootHeight - headerHeight) : null;

  // The send-button footer is pinned with position:absolute (see cartFooterArea)
  // instead of relying on flex to keep it out of the scroll area — some tablet
  // WebViews weren't reliably clamping the scroll area's height even with
  // minHeight:0 set, letting cart content push the footer below the fold.
  // Absolute positioning can't be pushed around by content, so measure its
  // real rendered height and reserve that much space at the bottom of the
  // scroll area instead.
  useEffect(() => {
    if (!footerRef.current) return;
    const ro = new ResizeObserver(([entry]) => setFooterHeight(entry.contentRect.height));
    ro.observe(footerRef.current);
    return () => ro.disconnect();
  }, []);

  // Exit swap mode if the targeted line disappears from the cart (e.g. its
  // qty was zeroed out via the − button while a replacement was pending).
  useEffect(() => {
    if (swapTargetKey && !cart.some(c => cartLineKey(c.id, c.seat, c.modifiers, c.specialNote) === swapTargetKey)) {
      setSwapTargetKey(null);
    }
  }, [cart, swapTargetKey]);

  // If we arrived here from the table/to-go/bar picker with an order to edit,
  // load it once on mount — this screen remounts fresh each time view === "waiter".
  useEffect(() => {
    if (initialEditOrder) loadOrderForEdit(initialEditOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The top nav bar wraps to 2 lines on narrower tablets, so its real
  // height varies. Rather than assume a fixed nav height (which broke
  // scrolling last time), measure the actual gap between the viewport
  // top and this screen's own top edge, and size to exactly what's left.
  // No body-scroll locking here — if this is ever off by a few px, the
  // page can still fall back to scrolling instead of getting stuck.
  useEffect(() => {
    function recalc() {
      if (!rootRef.current) return;
      const top = rootRef.current.getBoundingClientRect().top;
      setRootHeight(Math.max(300, window.innerHeight - top));
    }
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(document.body);
    window.addEventListener("resize", recalc);
    window.addEventListener("orientationchange", recalc);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recalc);
      window.removeEventListener("orientationchange", recalc);
    };
  }, []);

  const drinkCategories = menu.categories.filter(isDrinkCategory);
  const foodCategories = menu.categories.filter(c => !isDrinkCategory(c));
  const tabCategories = activeTab === "drinks" ? drinkCategories : foodCategories;
  const filteredItems = activeCategory ? menu.items.filter(i => i.categoryId === activeCategory) : [];
  const cartTotal = cart.reduce((sum, i) => sum + (i.price + (i.modifiers?.reduce((ms, m) => ms + m.price, 0) ?? 0)) * i.qty, 0);
  const isEditing = !!editingOrder;
  const identifier = orderType === "togo" ? toGoName : orderType === "bar" ? barSeat : tableNum;
  const canSend = identifier.trim() && (cart.length > 0 || isEditing);
  const isCancellingOrder = isEditing && cart.every(i => i.qty === 0);
  const swapTargetItem = swapTargetKey ? cart.find(c => cartLineKey(c.id, c.seat, c.modifiers, c.specialNote) === swapTargetKey) : null;

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

    if (swapTargetKey) {
      const targetKey = swapTargetKey;
      setSwapTargetKey(null);
      setCart(prev => prev.map(c => cartLineKey(c.id, c.seat, c.modifiers, c.specialNote) === targetKey
        ? { ...item, catName, displayName: getItemDisplayName(item), qty: c.qty, modifiers: selectedMods, specialNote: specialNote || null, seat: c.seat }
        : c));
      return;
    }

    const seat = (orderType === "table" || orderType === "patio") ? activeSeat : null;
    const newKey = cartLineKey(item.id, seat, selectedMods, specialNote || null);
    setCart(prev => {
      const existing = prev.find(c => cartLineKey(c.id, c.seat, c.modifiers, c.specialNote) === newKey);
      if (existing) return prev.map(c => c === existing ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, catName, displayName: getItemDisplayName(item), qty: 1, modifiers: selectedMods, specialNote: specialNote || null, seat }];
    });
  }

  function handleSpecialTap(categoryId) { setSpecialModalCat(categoryId); }

  function handleSpecialConfirm(description, amountCents) {
    const categoryId = specialModalCat;
    setSpecialModalCat(null);
    const cat = menu.categories.find(c => c.id === categoryId);
    const catName = cat ? (cat.name.en || cat.name.es || "") : "";
    const name = description.trim() || "Special";
    const seat = (orderType === "table" || orderType === "patio") ? activeSeat : null;
    // Every Special gets a fresh id -- unlike real menu items, two Specials
    // with different descriptions/amounts must never collapse into one cart
    // line via cartLineKey matching on id.
    const id = `special-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setCart(prev => [...prev, { id, categoryId, name, nameEs: name, price: amountCents, emoji: "⭐", catName, displayName: name, qty: 1, modifiers: [], specialNote: null, seat }]);
  }

  function removeFromCart(target) {
    const key = cartLineKey(target.id, target.seat, target.modifiers, target.specialNote);
    setCart(prev => {
      const existing = prev.find(c => cartLineKey(c.id, c.seat, c.modifiers, c.specialNote) === key);
      if (existing?.qty === 1) {
        if (isEditing) return prev.map(c => c === existing ? { ...c, qty: 0 } : c);
        return prev.filter(c => c !== existing);
      }
      return prev.map(c => c === existing ? { ...c, qty: c.qty - 1 } : c);
    });
  }

  function incrementCartItem(target) {
    const key = cartLineKey(target.id, target.seat, target.modifiers, target.specialNote);
    setCart(prev => prev.map(c => cartLineKey(c.id, c.seat, c.modifiers, c.specialNote) === key ? { ...c, qty: c.qty + 1 } : c));
  }

  function loadOrderForEdit(order) {
    setEditingOrder(order);
    setCart([...order.items.map(i => ({ ...i }))]);
    setNote(order.note || "");
    setOrderType(order.isToGo ? "togo" : order.isBar ? "bar" : order.isPatio ? "patio" : "table");
    if (order.isToGo) { setToGoName(order.toGoName || ""); setToGoSlot(order.toGoSlot || null); }
    else if (order.isBar) setBarSeat(order.table || "");
    else setTableNum(order.table || "");
    const maxSeat = order.items.reduce((max, i) => i.seat ? Math.max(max, i.seat) : max, 0);
    setSeatCount(Math.min(maxSeat, MAX_SEATS));
  }

  function cancelEdit() {
    setEditingOrder(null); setCart([]); setNote(""); setTableNum(""); setToGoName(""); setToGoSlot(null); setBarSeat(""); setActiveSeat(null); setSeatCount(0);
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
        const newCloverOrderId = await updateOrderInClover({ ...editingOrder, items: cart, note });
        if (newCloverOrderId) {
          await updateDoc(doc(db, "orders", editingOrder.firestoreId), { cloverOrderId: newCloverOrderId });
        }
      }
      setSending(false); setSent(true);
      setTimeout(() => { setSent(false); cancelEdit(); }, 2000);
    } else {
      // A table/to-go/bar can already have an active order (e.g. the
      // waitress sent drinks earlier and is now back to add food) even
      // though she didn't explicitly tap "Editar Orden". Sending a second
      // fresh order in that case used to create a second Clover ticket for
      // the same table — so check for one first and merge into it instead.
      const existing = await findActiveOrderForIdentifier();
      if (existing) {
        const mergedItems = [...existing.items, ...cart.map(i => ({ ...i, name: i.name }))];
        const mergedNote = [existing.note, note].filter(Boolean).join(" | ");
        await editKitchenOrder(existing.firestoreId, existing.items, mergedItems, mergedNote);
        const newCloverOrderId = await updateOrderInClover({ ...existing, items: mergedItems, note: mergedNote });
        if (newCloverOrderId) {
          await updateDoc(doc(db, "orders", existing.firestoreId), { cloverOrderId: newCloverOrderId });
        }
        setSending(false); setSent(true);
        onOrderSent?.({ ...existing, items: mergedItems });
      } else {
        const order = {
          id: genId(), table: orderType === "bar" ? barSeat : (orderType === "table" || orderType === "patio") ? tableNum : null,
          isToGo: orderType === "togo", toGoName: orderType === "togo" ? toGoName : null,
          toGoSlot: orderType === "togo" ? toGoSlot : null,
          isBar: orderType === "bar",
          isPatio: orderType === "patio",
          items: cart.map(i => ({ ...i, name: i.name })), note, total: cartTotal,
          timestamp: Date.now(), status: "new", editHistory: [],
        };
        const cloverOrderId = await sendOrderToClover(order);
        await pushOrderToKitchen({ ...order, cloverOrderId: cloverOrderId || null });
        setSending(false); setSent(true);
        onOrderSent?.(order);
      }
      setTimeout(() => {
        setCart([]); setNote(""); setSent(false); setActiveSeat(null); setSeatCount(0);
        if (!initialTable && orderType !== "togo" && orderType !== "bar") { setTableNum(""); }
        if (orderType === "togo") { setToGoName(""); setToGoSlot(null); }
        if (orderType === "bar") setBarSeat("");
      }, 2000);
    }
  }

  async function findActiveOrderForIdentifier() {
    const snap = await getDocs(collection(db, "orders"));
    const orders = snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
    return orders.find(o => {
      if (o.status === "done" || o.cancelled) return false;
      if (orderType === "table") return !o.isToGo && !o.isBar && !o.isPatio && String(o.table) === String(tableNum);
      if (orderType === "togo") return o.isToGo && String(o.toGoSlot) === String(toGoSlot);
      if (orderType === "bar") return o.isBar && String(o.table) === String(barSeat);
      if (orderType === "patio") return o.isPatio && String(o.table) === String(tableNum);
      return false;
    }) || null;
  }

  return (
    <div ref={rootRef} style={{ ...S.waiterRoot, ...(rootHeight ? { height: rootHeight } : {}) }}>
      {modModalItem && (
        <ModifierModal item={modModalItem} displayName={getItemDisplayName(modModalItem)} lang={lang} onConfirm={handleModifierConfirm} onClose={() => setModModalItem(null)} swapMode={!!swapTargetKey} />
      )}
      {specialModalCat && (
        <SpecialModal lang={lang} onConfirm={handleSpecialConfirm} onClose={() => setSpecialModalCat(null)} />
      )}
      <div ref={headerRef} style={S.waiterHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {onBack && (
            <button style={S.backBtn} onClick={onBack}>← Mesas</button>
          )}
          {initialOrderType === "bar" ? (
            <span style={{ ...S.waiterTableBig, color: BAR_COLOR }}>🍺 Barra{initialTable ? ` ${initialTable}` : ""}</span>
          ) : initialOrderType === "patio" ? (
            <span style={{ ...S.waiterTableBig, color: PATIO_COLOR }}>🌿 Patio{initialTable ? ` ${initialTable}` : ""}</span>
          ) : initialOrderType === "togo" ? (
            <span style={{ ...S.waiterTableBig, color: TOGO_COLOR }}>🥡 Para Llevar{initialTable ? ` ${initialTable}` : ""}</span>
          ) : initialTable ? (
            <span style={S.waiterTableBig}>🪑 Mesa {initialTable}</span>
          ) : (
            <span style={S.waiterLogo}>🍽️ {t.orderStation}</span>
          )}
          {isEditing && <span style={S.editingBadge}>✏️ {t.editOrder}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {!initialTable && !initialOrderType && (
            <div style={S.orderTypeToggle}>
              <button style={{ ...S.typeBtn, ...(orderType === "table" ? S.typeBtnActive : {}) }} onClick={() => setOrderType("table")}>🪑 {t.table}</button>
              <button style={{ ...S.typeBtn, ...(orderType === "bar" ? { background: BAR_COLOR, color: "#fff" } : {}) }} onClick={() => { setOrderType("bar"); setActiveSeat(null); }}>🍺 {t.bar}</button>
              <button style={{ ...S.typeBtn, ...(orderType === "togo" ? S.typeBtnToGo : {}) }} onClick={() => { setOrderType("togo"); setActiveSeat(null); }}>🥡 {t.toGo}</button>
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
          {initialOrderType === "bar" && !initialTable && (
            <div style={{ ...S.tableInput, background: BAR_BG, borderColor: "#DDD6FE" }}>
              <span style={{ ...S.tableLabel, color: BAR_COLOR }}>🍺</span>
              <input
                style={{ ...S.tableField, width: 90 }}
                value={barSeat}
                onChange={e => setBarSeat(e.target.value)}
                placeholder={t.barSeat}
                maxLength={10}
              />
            </div>
          )}
          {!initialTable && !initialOrderType && (
            <div style={{ ...S.tableInput, ...(orderType === "togo" ? S.tableInputToGo : {}), ...(orderType === "bar" ? { background: BAR_BG, borderColor: "#DDD6FE" } : {}) }}>
              <span style={{ ...S.tableLabel, ...(orderType === "togo" ? { color: "#0369A1" } : {}), ...(orderType === "bar" ? { color: BAR_COLOR } : {}) }}>{orderType === "togo" ? "🥡" : orderType === "bar" ? "🍺" : t.table}</span>
              <input
                style={{ ...S.tableField, width: orderType === "togo" ? 130 : orderType === "bar" ? 90 : 48 }}
                value={orderType === "togo" ? toGoName : orderType === "bar" ? barSeat : tableNum}
                onChange={e => orderType === "togo" ? setToGoName(e.target.value) : orderType === "bar" ? setBarSeat(e.target.value) : setTableNum(e.target.value)}
                placeholder={orderType === "togo" ? t.toGoName : orderType === "bar" ? t.barSeat : "#"}
                maxLength={orderType === "togo" ? 30 : orderType === "bar" ? 10 : 3}
              />
            </div>
          )}
        </div>
      </div>
      <div style={{ ...S.waiterMain, ...(mainHeight ? { height: mainHeight, maxHeight: mainHeight } : {}) }}>
        {/* LEFT: tab + category/item navigation */}
        <div style={{ ...S.menuPanel, ...(mainHeight ? { height: mainHeight, maxHeight: mainHeight } : {}) }}>
          {swapTargetItem && (
            <div style={S.swapBanner}>
              <span>{t.tapToReplace}: <strong>{swapTargetItem.displayName || swapTargetItem.name}</strong></span>
              <button style={S.swapBannerCancel} onClick={() => setSwapTargetKey(null)}>✕</button>
            </div>
          )}
          <div style={S.tabBar}>
            <button
              style={{ ...S.tabBtn, ...(activeTab === "drinks" ? S.tabBtnActive : {}) }}
              onClick={() => { setActiveTab("drinks"); setActiveCategory(null); }}
            >
              🥤 {t.tabDrinks}
            </button>
            <button
              style={{ ...S.tabBtn, ...(activeTab === "food" ? S.tabBtnActive : {}) }}
              onClick={() => { setActiveTab("food"); setActiveCategory(null); }}
            >
              🍽️ {t.tabFood}
            </button>
          </div>
          <div style={S.catArea}>
            {!activeCategory ? (
              <div style={S.categoryGrid}>
                {tabCategories.map(cat => (
                  <button key={cat.id} style={S.catTile} onClick={() => setActiveCategory(cat.id)}>
                    <span style={S.catTileEmoji}>{getCategoryEmoji(cat)}</span>
                    <span style={S.catTileName}>{cat.name[lang] || cat.name.en}</span>
                  </button>
                ))}
                {tabCategories.length === 0 && (
                  <div style={{ color: "#BBB", fontSize: 14, padding: 24, gridColumn: "1/-1", textAlign: "center" }}>
                    {activeTab === "drinks" ? "No drink categories found" : "No food categories found"}
                  </div>
                )}
              </div>
            ) : (
              <>
                <button style={S.backToCats} onClick={() => setActiveCategory(null)}>
                  {t.backToCategories}
                </button>
                <div style={S.menuGrid}>
                  {filteredItems.map(item => {
                    const inCartQty = cart.filter(c => c.id === item.id).reduce((s, c) => s + c.qty, 0);
                    const displayName = getItemDisplayName(item);
                    return (
                      <button key={item.id} style={{ ...S.menuItem, ...(inCartQty > 0 ? S.menuItemActive : {}) }} onClick={() => handleItemTap(item)}>
                        <span style={S.menuEmoji}>{item.emoji}</span>
                        <span style={S.menuName}>{displayName}</span>
                        <span style={S.menuPrice}>{fmt(item.price)}</span>
                        {inCartQty > 0 && <span style={S.menuBadge}>×{inCartQty}</span>}
                      </button>
                    );
                  })}
                  <button key="special-card" style={S.menuItem} onClick={() => handleSpecialTap(activeCategory)}>
                    <span style={S.menuEmoji}>⭐</span>
                    <span style={S.menuName}>Special</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT: cart */}
        <div style={{ ...S.cartPanel, ...(mainHeight ? { height: mainHeight, maxHeight: mainHeight } : {}) }}>
          <div style={S.cartTitle}>{t.orderSummary}</div>
          {(orderType === "table" || orderType === "patio") && (
            <div style={S.seatChipRow}>
              <button style={{ ...S.seatChip, ...(activeSeat === null ? S.seatChipActive : {}) }} onClick={() => setActiveSeat(null)}>{t.shared}</button>
              {Array.from({ length: seatCount }, (_, i) => i + 1).map(n => (
                <button key={n} style={{ ...S.seatChip, ...(activeSeat === n ? S.seatChipActive : {}) }} onClick={() => setActiveSeat(n)}>{t.guest} {n}</button>
              ))}
              {seatCount < MAX_SEATS && (
                <button style={S.seatChipAdd} onClick={() => { const next = seatCount + 1; setSeatCount(next); setActiveSeat(next); }}>+</button>
              )}
            </div>
          )}
          <div style={{ ...S.cartScrollArea, paddingBottom: footerHeight + 14 }}>
            {cart.filter(i => i.qty > 0).length === 0 && isEditing ? (
              <div style={S.cartCancelWarning}>🚫 All items removed — this will cancel the order</div>
            ) : cart.length === 0 ? (
              <div style={S.cartEmpty}>{t.tapToAdd}</div>
            ) : (
              <div style={S.cartItems}>
                {((orderType === "table" || orderType === "patio")
                  ? [null, ...Array.from({ length: MAX_SEATS }, (_, i) => i + 1)]
                      .map(seat => ({ seat, items: cart.filter(i => (i.seat ?? null) === seat) }))
                      .filter(g => g.items.length > 0)
                  : [{ seat: null, items: cart }]
                ).map(group => (
                  <div key={group.seat ?? "shared"}>
                    {(orderType === "table" || orderType === "patio") && cart.some(i => i.seat) && (
                      <div style={S.cartGroupHeader}>
                        <span>{group.seat ? `${t.guest} ${group.seat}` : t.shared}</span>
                        <span>{fmt(group.items.reduce((s, i) => s + (i.price + (i.modifiers?.reduce((ms, m) => ms + m.price, 0) ?? 0)) * i.qty, 0))}</span>
                      </div>
                    )}
                    {group.items.map(item => {
                      const lineKey = cartLineKey(item.id, item.seat, item.modifiers, item.specialNote);
                      const isSwapTarget = swapTargetKey === lineKey;
                      return (
                      <div key={lineKey} style={{ ...S.cartRow, opacity: item.qty === 0 ? 0.4 : 1, textDecoration: item.qty === 0 ? "line-through" : "none", ...(isSwapTarget ? S.cartRowSwapping : {}) }}>
                        <div
                          style={{ flex: 1, cursor: item.qty > 0 ? "pointer" : "default" }}
                          onClick={() => { if (item.qty > 0) setSwapTargetKey(isSwapTarget ? null : lineKey); }}
                        >
                          <span style={S.cartName}>{item.emoji} {item.displayName || item.name} {item.qty > 0 && <span style={S.cartSwapHint}>✎</span>}</span>
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
                          <button style={S.qtyBtn} onClick={() => removeFromCart(item)}>−</button>
                          <span style={S.cartQty}>{item.qty}</span>
                          <button style={S.qtyBtn} onClick={() => incrementCartItem(item)}>+</button>
                          <span style={S.cartItemTotal}>{fmt((item.price + (item.modifiers?.reduce((s, m) => s + m.price, 0) ?? 0)) * item.qty)}</span>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div ref={footerRef} style={S.cartFooterArea}>
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
      if (!itemStats[item.name]) itemStats[item.name] = { count: 0, totalTime: 0 };
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
                  {order.isToGo ? <span style={S.toGoChipSmall}>{order.toGoName}</span> : order.isBar ? <span style={{ ...S.toGoChipSmall, background: BAR_BG, color: BAR_COLOR }}>{order.table}</span> : order.isPatio ? <span style={{ ...S.toGoChipSmall, background: PATIO_BG, color: PATIO_COLOR }}>{order.table}</span> : <span style={S.historyTable}>{t.table2} {order.table}</span>}
                  {order.modified && <span style={S.modifiedChip}>{t.modified}</span>}
                  <span style={S.historyId}>#{order.id}</span>
                </div>
                <span style={S.historyTotal}>{fmt(order.total)}</span>
              </button>
              <div style={S.historyItems}>{order.items?.map((item, i) => <span key={i} style={S.historyItem}>{item.name} ×{item.qty}</span>)}</div>
              <div style={S.historyMeta}>
                <span>{t.duration}: {fmtDuration(order.duration, lang)}</span>
                {order.note && <span>{order.note}</span>}
              </div>
            </div>
          ))}
        </div>
        <div style={S.historyPanel}>
          <div style={S.panelTitle}>{t.itemAnalysis}</div>
          {itemList.length === 0 ? <div style={S.historyEmpty}>{t.noHistory}</div> : itemList.map(item => (
            <div key={item.name} style={S.itemStatCard}>
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
        <div style={{ fontSize: 11, fontWeight: 900, color: "#64748B", letterSpacing: "0.2em", marginBottom: 24 }}>HISTORIAL — ACCESO RESTRINGIDO</div>
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

  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);
  useAutoUpdate(viewRef);

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
    else if (menu.items.some(item => item.nameEs)) {
      setMenu(prev => ({ ...prev, items: prev.items.map(item => ({ ...item, nameEs: item.nameEs || null })) }));
    }
  }, [lang, menu]);

  async function applyTranslations(currentMenu) {
    const needsTranslation = currentMenu.items.filter(item => !translationCache.current[item.id] && !item.nameEs);
    if (needsTranslation.length === 0) {
      const alreadyResolved = currentMenu.items.every(item => item.nameEs === (translationCache.current[item.id] || item.nameEs || item.name));
      if (!alreadyResolved) {
        setMenu(prev => ({ ...prev, items: prev.items.map(item => ({ ...item, nameEs: translationCache.current[item.id] || item.nameEs || item.name })) }));
      }
      return;
    }
    setTranslating(true);
    const translated = await translateMenuItemsToSpanish(needsTranslation);
    if (translated) needsTranslation.forEach((item, idx) => { translationCache.current[item.id] = translated[idx]; });
    setTranslating(false);
    setMenu(prev => ({ ...prev, items: prev.items.map(item => ({ ...item, nameEs: translationCache.current[item.id] || item.nameEs || item.name })) }));
  }

  // Live orders, kept in a ref (not state) purely for the payment-check
  // interval below -- avoids re-triggering that effect on every snapshot.
  const ordersRef = useRef([]);
  const autoClosingKeysRef = useRef(new Set());
  useEffect(() => {
    const q = query(collection(db, "orders"));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data());
      setActiveOrders(docs.length);
      setReadyCount(docs.filter(o => {
        const hasK = o.items?.some(i => !isKitchenDimmed(i.name, i.catName || ""));
        const hasD = orderNeedsDrinksStation(o);
        return (!hasK || !!o.kitchenReady) && (!hasD || !!o.drinksReady);
      }).length);
      ordersRef.current = snapshot.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
    });
    return unsub;
  }, []);

  // Runs the Clover-payment auto-close check (see checkPendingPayments)
  // on every device this app is open on -- Kitchen/Drinks/Expo Pis
  // included -- instead of only whichever tablet happens to be showing
  // the table-select screen, which is where this used to live exclusively.
  useEffect(() => {
    const interval = setInterval(() => {
      checkPendingPayments(ordersRef.current, autoClosingKeysRef.current);
    }, 45000);
    return () => clearInterval(interval);
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
          onSelectToGo={(slotNum) => {
            setOrderContext({ table: slotNum, orderType: "togo" });
            setView("waiter");
          }}
          onSelectBar={(seat) => {
            setOrderContext({ table: seat, orderType: "bar" });
            setView("waiter");
          }}
          onSelectPatio={(tableNum) => {
            setOrderContext({ table: tableNum, orderType: "patio" });
            setView("waiter");
          }}
          onEditOrder={(order) => {
            setOrderContext({
              table: order.isToGo ? order.toGoSlot : order.table,
              orderType: order.isToGo ? "togo" : order.isBar ? "bar" : order.isPatio ? "patio" : "table",
              editOrder: order,
            });
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
          initialEditOrder={orderContext?.editOrder}
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
  sectionLabel: { fontSize: 12, fontWeight: 900, letterSpacing: "0.1em", color: "#999", textTransform: "uppercase", maxWidth: 600, width: "100%", margin: "22px auto 10px", textAlign: "left" },
  floorDivider: { height: 1, background: "#E5E0D8", maxWidth: 600, width: "100%", margin: "24px auto 0" },
  tableGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, maxWidth: 600, margin: "0 auto", width: "100%" },
  tableCard: { borderRadius: 16, padding: "24px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", border: "2px solid transparent", transition: "all 0.15s", userSelect: "none" },
  tableCardFree: { background: "#FFFFFF", border: "2px solid #D1FAE5", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  tableCardFreePatio: { background: "#FFFFFF", border: "2px solid #99F6E4", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  tableCardFreeBar: { background: "#FFFFFF", border: "2px solid #DDD6FE", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  tableCardFreeToGo: { background: "#FFFFFF", border: "2px solid #FDE68A", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  tableCardOccupied: { background: "#FFFBEB", border: "2px solid #FCD34D", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
  tableCardNum: { fontSize: 54, fontWeight: 900, color: "#1A1A1A", lineHeight: 1 },
  tableCardLabel: { fontSize: 10, fontWeight: 900, letterSpacing: "0.12em" },
  tableCardItems: { fontSize: 12, color: "#666", fontWeight: 600 },
  tableCardSubtitle: { fontSize: 13, color: "#1A1A1A", fontWeight: 800 },
  tableCardTimer: { fontSize: 12, fontWeight: 700, color: "#D97706" },
  tableCardCloseBtn: { marginTop: 6, background: "#15803D", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 800, cursor: "pointer", letterSpacing: "0.04em" },
  backBtn: { background: "#F5F3F0", border: "1px solid #DDD", color: "#444", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  waiterTableBig: { fontSize: 20, fontWeight: 900, color: "#BE202E", letterSpacing: "-0.01em" },

  appRoot: { fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#F5F3F0", minHeight: "100vh", color: "#1A1A1A", display: "flex", flexDirection: "column" },
  nav: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FFFFFF", borderBottom: "2px solid #BE202E", padding: "0 12px", flexWrap: "wrap", gap: 4, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", position: "sticky", top: 0, zIndex: 60 },
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
  shortcutBar: { display: "flex", gap: 28, alignItems: "center", padding: "14px 20px", background: "#1E293B", flexWrap: "wrap" },
  shortcutItem: { display: "flex", alignItems: "center", gap: 8, fontSize: "clamp(16px, calc(0.6vw + 14px), 24px)", color: "#CBD5E1", fontWeight: 700 },
  kbd: { background: "#334155", color: "#E2E8F0", border: "1px solid #475569", borderRadius: 6, padding: "5px 12px", fontSize: "clamp(14px, calc(0.5vw + 12px), 20px)", fontFamily: "monospace", fontWeight: 700 },
  keyboardHintBar: { display: "flex", gap: 12, background: "#1D4ED8", padding: "6px 16px", flexWrap: "wrap" },
  keyboardHint: { fontSize: 11, color: "#BFDBFE", fontWeight: 600 },
  actionFlash: { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "#fff", fontSize: "clamp(18px, calc(1.786vw + 11.07px), 45px)", fontWeight: 900, padding: "20px 40px", borderRadius: 16, zIndex: 9999, pointerEvents: "none", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", letterSpacing: "-0.01em" },

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
  ticketModifierChip: { fontSize: "clamp(21px, calc(18.750cqw - 42.50px), 70px)", fontStyle: "normal", display: "block", textTransform: "uppercase" },
  ticketSpecialNoteBlock: { display: "flex", flexDirection: "column", gap: 2, marginTop: 4 },
  ticketSpecialNoteLine: { fontSize: "clamp(16.8px, calc(15cqw - 34px), 56px)", fontWeight: 800, letterSpacing: "0.02em", textTransform: "uppercase" },
  cartModifiers: { display: "flex", flexWrap: "wrap", gap: 4, marginTop: 3 },
  cartModChip: { fontSize: 11, background: "#F0EDE8", borderRadius: 4, padding: "1px 6px" },
  cartSpecialNoteBlock: { display: "flex", flexDirection: "column", gap: 2, marginTop: 4 },
  cartSpecialNoteLine: { fontSize: 11, fontWeight: 800 },

  // KITCHEN
  kitchenRoot: { flex: 1, display: "flex", flexDirection: "column", background: "#F5F3F0", minHeight: "calc(100vh - 53px)" },
  kitchenHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: "#FFFFFF", borderBottom: "1px solid #E5E0D8", flexWrap: "wrap", gap: 8 },
  kitchenHeaderLeft: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  kitchenTitle: { fontSize: "clamp(28px, calc(4.059vw + 12.89px), 90px)", fontWeight: 900, letterSpacing: "-0.02em", color: "#1A1A1A", textTransform: "uppercase" },
  queuePill: { background: "#D97706", color: "#fff", borderRadius: 20, padding: "3px 12px", fontSize: "clamp(24px, calc(2.354vw + 15.28px), 60px)", fontWeight: 800, textTransform: "uppercase" },
  kitchenStats: { display: "flex", gap: 8 },
  statPillRed: { background: "#BE202E", color: "#fff", borderRadius: 20, padding: "5px 14px", fontSize: "clamp(26px, calc(2.516vw + 17.19px), 65px)", fontWeight: 800, textTransform: "uppercase" },
  statPillGreen: { background: "#15803D", color: "#fff", borderRadius: 20, padding: "5px 14px", fontSize: "clamp(26px, calc(2.516vw + 17.19px), 65px)", fontWeight: 800, textTransform: "uppercase" },
  undoBtn: { background: "#7C3AED", color: "#fff", border: "none", borderRadius: 20, padding: "5px 14px", fontSize: "clamp(26px, calc(2.516vw + 17.19px), 65px)", fontWeight: 800, textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap" },
  kitchenEmpty: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  emptyCheck: { background: "#FFFFFF", border: "2px solid #E5DFD0", borderRadius: 4, padding: "32px 48px", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  emptyCheckInner: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  emptyCheckTitle: { fontSize: "clamp(22px, calc(2.110vw + 14.90px), 55px)", fontWeight: 800, color: "#9B8B72", letterSpacing: "0.2em", textTransform: "uppercase" },
  emptyCheckmark: { fontSize: "clamp(96px, calc(14.529vw + 43.95px), 320px)", color: "#15803D", fontWeight: 900, lineHeight: 1 },
  emptyCheckSub: { fontSize: "clamp(36px, calc(5.439vw + 16.68px), 120px)", fontWeight: 900, color: "#1A1A1A", textTransform: "uppercase" },
  emptyCheckSubSmall: { fontSize: "clamp(28px, calc(2.760vw + 17.56px), 70px)", color: "#888", textTransform: "uppercase" },
  ticketGrid: { flex: 1, display: "grid", gap: 16, padding: "16px", alignItems: "start", justifyContent: "start" },

  // TICKET
  ticket: { background: "#FFFDF7", border: "1px solid #E0D8C4", borderRadius: 3, overflow: "hidden", transition: "all 0.3s", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" },
  cancelledBanner: { background: "#BE202E", color: "#fff", fontWeight: 900, fontSize: "clamp(24px, calc(21.635cqw - 49.81px), 80px)", padding: "8px 14px", textAlign: "center", letterSpacing: "0.08em", textTransform: "uppercase" },
  toGoBanner: { background: "#0369A1", color: "#fff", fontWeight: 900, fontSize: "clamp(20px, calc(17.308cqw - 38.85px), 65px)", padding: "6px 14px", textAlign: "center", letterSpacing: "0.05em", textTransform: "uppercase" },
  modifiedBanner: { background: "#7C3AED", color: "#fff", fontWeight: 900, fontSize: "clamp(24px, calc(13.942cqw - 23.65px), 60px)", padding: "5px 14px", textAlign: "center", letterSpacing: "0.05em", textTransform: "uppercase" },
  ticketTop: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 14px 8px 14px", background: "#F5EFE0" },
  ticketTopLeft: { flex: 1 },
  ticketTopRight: { textAlign: "right", flexShrink: 0 },
  guestCheckTitle: { fontSize: "clamp(18px, calc(10.578cqw - 18.46px), 45px)", fontWeight: 800, color: "#9B8B72", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 3 },
  tableNumberBig: { fontSize: "clamp(42px, calc(37.500cqw - 85.00px), 140px)", fontWeight: 900, color: "#1A1A1A", letterSpacing: "-0.02em", lineHeight: 1, overflowWrap: "break-word" },
  ticketMeta: { marginTop: 3 },
  timerBig: { fontSize: "clamp(22px, calc(20.192cqw - 46.15px), 75px)", fontWeight: 900, marginTop: 3, letterSpacing: "-0.01em" },
  ruledLine: { borderBottom: "1px solid #E0D8C4", margin: "0 14px" },
  colHeaders: { display: "flex", padding: "4px 14px", background: "#F5EFE0" },
  colQty: { flexShrink: 0, whiteSpace: "nowrap", marginRight: 10, fontSize: "clamp(14.4px, calc(8.462cqw - 14.768px), 36px)", fontWeight: 900, color: "#9B8B72", letterSpacing: "0.12em", textTransform: "uppercase" },
  colItem: { flex: 1, fontSize: "clamp(14.4px, calc(8.462cqw - 14.768px), 36px)", fontWeight: 900, color: "#9B8B72", letterSpacing: "0.12em", textTransform: "uppercase" },
  itemsList: { padding: "2px 0" },
  itemRow: { display: "flex", alignItems: "flex-start", padding: "6px 14px", minHeight: 36 },
  itemQty: { width: "clamp(24px, calc(21.538cqw - 49.232px), 80px)", fontSize: "clamp(24px, calc(21.538cqw - 49.232px), 80px)", fontWeight: 900, letterSpacing: "-0.02em" },
  itemName: { fontSize: "clamp(20px, calc(18.462cqw - 42.768px), 68px)", lineHeight: 1.2, textTransform: "uppercase" },
  changeTag: { display: "inline-block", color: "#fff", fontSize: "clamp(14.4px, calc(8.462cqw - 14.768px), 36px)", fontWeight: 900, padding: "2px 5px", borderRadius: 4, marginLeft: 7, letterSpacing: "0.06em", textTransform: "uppercase" },
  noteRow: { display: "flex", gap: 7, padding: "6px 14px", alignItems: "flex-start" },
  noteLabel: { fontSize: "clamp(18px, calc(10.578cqw - 18.46px), 45px)", fontWeight: 900, color: "#9B8B72", letterSpacing: "0.12em", minWidth: 40, paddingTop: 2, textTransform: "uppercase" },
  noteText: { fontSize: "clamp(20px, calc(17.308cqw - 38.85px), 65px)", fontWeight: 600, color: "#444", fontStyle: "italic", flex: 1, textTransform: "uppercase" },
  ticketFooter: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#F5EFE0", flexWrap: "wrap", gap: 6 },
  statusStamp: { border: "2px solid", borderRadius: 4, padding: "2px 8px", fontSize: "clamp(22px, calc(12.500cqw - 20.00px), 55px)", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase" },
  ticketBtns: { display: "flex", gap: 6, flexWrap: "wrap" },
  btnStart: { background: "#D97706", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: "clamp(20px, calc(17.308cqw - 38.85px), 65px)", fontWeight: 900, cursor: "pointer", textTransform: "uppercase" },
  btnDone: { background: "#15803D", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: "clamp(20px, calc(17.308cqw - 38.85px), 65px)", fontWeight: 900, cursor: "pointer", textTransform: "uppercase" },
  queueStrip: { background: "#FFFFFF", borderTop: "2px solid #E5E0D8", padding: "8px 16px", display: "flex", alignItems: "center", gap: 12, overflowX: "auto" },
  queueLabel: { fontSize: "clamp(20px, calc(1.948vw + 12.99px), 50px)", fontWeight: 900, color: "#D97706", letterSpacing: "0.15em", whiteSpace: "nowrap", textTransform: "uppercase" },
  queueItem: { display: "flex", alignItems: "center", gap: 8, background: "#F5F3F0", border: "1px solid #E5E0D8", borderRadius: 8, padding: "6px 12px", whiteSpace: "nowrap" },
  queueOrderTable: { fontSize: "clamp(26px, calc(2.516vw + 17.19px), 65px)", fontWeight: 800, color: "#1A1A1A", textTransform: "uppercase" },
  queueOrderItems: { fontSize: "clamp(24px, calc(2.354vw + 15.28px), 60px)", color: "#888", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", textTransform: "uppercase" },
  queueOrderTime: { fontSize: "clamp(24px, calc(2.354vw + 15.28px), 60px)", fontWeight: 700, color: "#D97706" },

  // WAITER
  waiterRoot: { display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", height: "calc(100dvh - 53px)" },
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
  activeOrderRow: { background: "#F5F3F0", border: "1px solid #E5E0D8", borderRadius: 10, padding: "4px 4px 4px 12px", display: "flex", alignItems: "center", gap: 10, width: "100%" },
  activeOrderMain: { background: "none", border: "none", padding: "4px 0", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flex: 1, textAlign: "left", flexWrap: "wrap" },
  activeOrderComplete: { background: "#15803D", color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 },
  tableChipSmall: { background: "#FFF1F2", color: "#BE202E", borderRadius: 6, padding: "2px 7px", fontSize: 12, fontWeight: 800 },
  toGoChipSmall: { background: "#E0F2FE", color: "#0369A1", borderRadius: 6, padding: "2px 7px", fontSize: 12, fontWeight: 800 },
  activeOrderItems: { flex: 1, fontSize: 14, color: "#888" },
  activeOrderEdit: { color: "#7C3AED", fontSize: 12, fontWeight: 700 },
  waiterMain: { display: "flex", flex: 1, overflow: "hidden", minHeight: 0 },
  menuPanel: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 },
  swapBanner: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "#EDE9FE", color: "#7C3AED", padding: "10px 14px", fontSize: 13, fontWeight: 700, flexShrink: 0 },
  swapBannerCancel: { background: "none", border: "none", color: "#7C3AED", fontSize: 16, fontWeight: 800, cursor: "pointer", padding: "0 4px" },
  tabBar: { display: "flex", borderBottom: "2px solid #E5E0D8", background: "#FAFAF8", flexShrink: 0 },
  tabBtn: { flex: 1, background: "none", border: "none", borderBottom: "3px solid transparent", padding: "16px 0", fontSize: 17, fontWeight: 800, cursor: "pointer", color: "#999", letterSpacing: "0.03em", transition: "color 0.15s, border-color 0.15s" },
  tabBtnActive: { color: "#BE202E", borderBottom: "3px solid #BE202E", background: "#FFF" },
  catArea: { flex: 1, overflowY: "auto", padding: "16px" },
  categoryGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  catTile: { background: "#FFFFFF", border: "2px solid #E5E0D8", borderRadius: 16, padding: "28px 16px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, minHeight: 150, transition: "border-color 0.15s, box-shadow 0.15s" },
  catTileEmoji: { fontSize: 44 },
  catTileName: { fontSize: 17, fontWeight: 700, textAlign: "center", color: "#1A1A1A", lineHeight: 1.3 },
  backToCats: { display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#BE202E", fontWeight: 800, fontSize: 18, cursor: "pointer", padding: "12px 0 14px 0", letterSpacing: "0.02em" },
  menuGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 },
  menuItem: { background: "#FFFFFF", border: "2px solid #E5E0D8", borderRadius: 14, padding: "18px 12px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 7, position: "relative", transition: "border-color 0.15s, box-shadow 0.15s", minHeight: 140 },
  menuEmoji: { fontSize: 46 },
  menuItemActive: { background: "#FFF1F2", border: "2px solid #BE202E", boxShadow: "0 0 0 2px rgba(190,32,46,0.12)" },
  menuName: { fontSize: 20, fontWeight: 600, textAlign: "center", color: "#333", lineHeight: 1.3 },
  menuPrice: { fontSize: 21, color: "#BE202E", fontWeight: 700 },
  menuBadge: { position: "absolute", top: 8, right: 8, background: "#BE202E", color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 800, padding: "3px 8px" },

  // CART
  cartPanel: { width: 300, flexShrink: 0, background: "#FFFFFF", borderLeft: "2px solid #E5E0D8", display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, position: "relative" },
  cartScrollArea: { flex: 1, overflowY: "auto", padding: "0 14px", minHeight: 0 },
  cartFooterArea: { borderTop: "1px solid #E5E0D8", padding: "10px 14px", position: "absolute", left: 0, right: 0, bottom: 0, background: "#FFFFFF", zIndex: 2, boxShadow: "0 -2px 8px rgba(0,0,0,0.06)" },
  cartTitle: { fontSize: 10, fontWeight: 800, color: "#AAA", letterSpacing: "0.12em", textTransform: "uppercase", padding: "12px 14px 8px", flexShrink: 0 },
  cartEmpty: { color: "#BBB", fontSize: 13, textAlign: "center", padding: "6px 0" },
  cartCancelWarning: { color: "#BE202E", fontSize: 13, fontWeight: 700, textAlign: "center", padding: "8px", background: "#FFF1F2", borderRadius: 8, marginBottom: 8 },
  cartItems: { display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 },
  cartRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #F0EDE8", flexWrap: "wrap", gap: 4 },
  cartRowSwapping: { background: "#EDE9FE", borderRadius: 8, boxShadow: "0 0 0 2px #7C3AED" },
  cartName: { fontSize: 13, color: "#333" },
  cartSwapHint: { fontSize: 11, color: "#AAA" },
  seatChipRow: { display: "flex", gap: 4, flexWrap: "wrap", padding: "0 14px 10px", flexShrink: 0 },
  seatChip: { background: "#F5F3F0", border: "1px solid #DDD", borderRadius: 8, padding: "4px 9px", fontSize: 11, fontWeight: 700, color: "#888", cursor: "pointer", whiteSpace: "nowrap" },
  seatChipActive: { background: "#BE202E", color: "#fff", borderColor: "#BE202E" },
  seatChipAdd: { background: "#F5F3F0", border: "1px dashed #AAA", borderRadius: 8, padding: "4px 11px", fontSize: 13, fontWeight: 900, color: "#555", cursor: "pointer", whiteSpace: "nowrap" },
  cartGroupHeader: { fontSize: 10, fontWeight: 800, color: "#9B8B72", letterSpacing: "0.1em", textTransform: "uppercase", padding: "10px 0 2px", display: "flex", justifyContent: "space-between" },
  plateHeader: { padding: "10px 14px 5px", background: "#F5EFE0" },
  plateHeaderText: { fontWeight: 900, letterSpacing: "0.07em", color: "#1A1A1A", textTransform: "uppercase" },
  plateDivider: { borderBottom: "5px solid #1A1A1A", margin: "6px 14px 0" },
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
  itemStatInfo: { flex: 1 },
  itemStatName: { fontSize: 14, fontWeight: 700, color: "#1A1A1A", marginBottom: 2 },
  itemStatMeta: { fontSize: 11, color: "#AAA" },
  itemStatCount: { fontSize: 22, fontWeight: 900, color: "#BE202E", minWidth: 36, textAlign: "center" },
};
