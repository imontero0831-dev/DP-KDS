import { useState, useEffect } from "react";
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
// CLOVER MENU FETCH — falls back to MOCK_MENU on error
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
        price: item.price || 0,
        emoji: "🍽️",
      }));

    // If no categories from Clover, group all items under one
    if (categories.length === 0) {
      return {
        categories: [{ id: "uncategorized", name: { es: "Menú", en: "Menu" } }],
        items,
      };
    }

    return { categories, items };
  } catch (err) {
    console.warn("⚠️ Clover menu fetch failed, using mock menu:", err.message);
    return MOCK_MENU;
  }
}

// ============================================================
// CLOVER ORDER PUSH
// ============================================================
async function sendOrderToClover(order) {
  try {
    // 1. Create the order
    const cloverOrder = await cloverRequest("orders", "POST", {
      title: order.isToGo ? `Para Llevar - ${order.toGoName}` : `Mesa ${order.table}`,
      note: order.note || "",
      orderType: { id: order.isToGo ? "togo" : "dine_in" },
    });

    const cloverOrderId = cloverOrder.id;

    // 2. Add line items
    await Promise.all(
      order.items.map(item =>
        cloverRequest(`orders/${cloverOrderId}/line_items`, "POST", {
          item: { id: item.id },
          unitQty: item.qty,
        })
      )
    );

    console.log("✅ Order sent to Clover:", cloverOrderId);
    return cloverOrderId;
  } catch (err) {
    console.warn("⚠️ Clover order push failed (order saved to Firebase only):", err.message);
  }
}

async function updateOrderInClover(order) {
  try {
    if (!order.cloverOrderId) return;
    await cloverRequest(`orders/${order.cloverOrderId}`, "PUT", {
      note: order.note || "",
    });
    console.log("✅ Clover order updated:", order.cloverOrderId);
  } catch (err) {
    console.warn("⚠️ Clover order update failed:", err.message);
  }
}

// ============================================================
// MOCK MENU — fallback if Clover is unreachable
// ============================================================
const MOCK_MENU = {
  categories: [
    { id: "cat1", name: { es: "Entradas", en: "Starters" } },
    { id: "cat2", name: { es: "Platos Principales", en: "Mains" } },
    { id: "cat3", name: { es: "Bebidas", en: "Drinks" } },
    { id: "cat4", name: { es: "Postres", en: "Desserts" } },
  ],
  items: [
    { id: "i1", categoryId: "cat1", name: "Chips & Salsa", price: 599, emoji: "🌮" },
    { id: "i2", categoryId: "cat1", name: "Sopa del Día", price: 699, emoji: "🍲" },
    { id: "i3", categoryId: "cat1", name: "Alitas de Pollo", price: 1099, emoji: "🍗" },
    { id: "i4", categoryId: "cat2", name: "Hamburguesa", price: 1299, emoji: "🍔" },
    { id: "i5", categoryId: "cat2", name: "Salmón a la Parrilla", price: 1899, emoji: "🐟" },
    { id: "i6", categoryId: "cat2", name: "Pasta Primavera", price: 1499, emoji: "🍝" },
    { id: "i7", categoryId: "cat2", name: "Costillas BBQ", price: 2199, emoji: "🥩" },
    { id: "i8", categoryId: "cat3", name: "Limonada", price: 349, emoji: "🍋" },
    { id: "i9", categoryId: "cat3", name: "Té Helado", price: 299, emoji: "🧋" },
    { id: "i10", categoryId: "cat3", name: "Cerveza Artesanal", price: 699, emoji: "🍺" },
    { id: "i11", categoryId: "cat3", name: "Margarita", price: 999, emoji: "🍹" },
    { id: "i12", categoryId: "cat4", name: "Pastel de Queso", price: 799, emoji: "🍰" },
    { id: "i13", categoryId: "cat4", name: "Brownie con Helado", price: 849, emoji: "🍫" },
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
const STATUS_COLORS = { new: "#CC2200", in_progress: "#CC7700", done: "#1a7a3a" };

// ============================================================
// GUEST CHECK TICKET COMPONENT
// ============================================================
function GuestCheckTicket({ order, t, isQueue }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsedSecs = Math.floor((Date.now() - order.timestamp) / 1000);
  const isUrgent = elapsedSecs > 600;
  const isWarning = elapsedSecs > 300;
  const timerColor = isUrgent ? "#CC2200" : isWarning ? "#CC7700" : "#1a5c1a";

  const items = order.modified && order.latestDiff
    ? order.latestDiff
    : order.items.map(i => ({ ...i, changeType: "unchanged" }));

  const changeStyle = (changeType) => {
    switch (changeType) {
      case "added":     return { color: "#0a5c0a", bg: "#e8f5e8", tagBg: null, label: null };
      case "increased": return { color: "#0a5c0a", bg: "#e8f5e8", tagBg: null, label: null };
      case "decreased": return { color: "#CC7700", bg: "#fff8e8", tagBg: null, label: null };
      case "removed":   return { color: "#8B0000", bg: "#fde8e8", tagBg: "#8B0000", label: `✕ ${t.removed}` };
      default:          return { color: "#1a1a1a", bg: "transparent", tagBg: null, label: null };
    }
  };

  return (
    <div style={{ ...S.ticket, opacity: isQueue ? 0.5 : 1, transform: isQueue ? "scale(0.97)" : "scale(1)" }}>
      {order.cancelled && <div style={S.cancelledBanner}>{t.cancelled}</div>}
      {order.isToGo && <div style={S.toGoBanner}>🥡 {t.toGoLabel} — {order.toGoName}</div>}
      {order.modified && !order.cancelled && <div style={S.modifiedBanner}>⚡ {t.modified}</div>}

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
          return (
            <div key={idx} style={{
              ...S.itemRow,
              background: order.cancelled ? "#fde8e8" : cs.bg,
              borderBottom: idx < items.length - 1 ? "1px solid #d4c9a8" : "none",
            }}>
              <span style={{ ...S.itemQty, color: order.cancelled ? "#8B0000" : cs.color }}>
                {item.qty}
              </span>
              <span style={{
                ...S.itemName,
                color: order.cancelled ? "#8B0000" : cs.color,
                textDecoration: order.cancelled || isRemoved ? "line-through" : "none",
                fontWeight: item.changeType !== "unchanged" ? 900 : 700,
              }}>
                {item.name}
                {cs.tagBg && !order.cancelled && (
                  <span style={{ ...S.changeTag, background: cs.tagBg }}>{cs.label}</span>
                )}
              </span>
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

      <div style={{ ...S.ruledLine, borderColor: "#8B7355", borderWidth: 2 }} />

      <div style={S.ticketFooter}>
        <div style={{
          ...S.statusStamp,
          borderColor: order.cancelled ? "#8B0000" : order.modified ? "#6600CC" : STATUS_COLORS[order.status],
          color: order.cancelled ? "#8B0000" : order.modified ? "#6600CC" : STATUS_COLORS[order.status],
        }}>
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
              <button style={S.btnDone} onClick={() => updateOrderStatus(order.firestoreId, "done")}>
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
// KITCHEN SCREEN
// ============================================================
function KitchenScreen({ lang }) {
  const t = T[lang];
  const [orders, setOrders] = useState([]);
  const MAX_VISIBLE = 3;

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
      setOrders(data);
    });
    return unsub;
  }, []);

  const active = orders.filter(o => o.status !== "done");
  const visible = active.slice(0, MAX_VISIBLE);
  const queued = active.slice(MAX_VISIBLE);
  const doneCount = orders.filter(o => o.status === "done").length;

  return (
    <div style={S.kitchenRoot}>
      <div style={S.kitchenHeader}>
        <div style={S.kitchenHeaderLeft}>
          <span style={S.kitchenTitle}>👨‍🍳 {t.kitchenDisplay}</span>
          {queued.length > 0 && <span style={S.queuePill}>+{queued.length} {t.inQueue}</span>}
        </div>
        <div style={S.kitchenStats}>
          <span style={S.statPill}>{active.length} {t.active}</span>
          <span style={{ ...S.statPill, background: "#1a7a3a" }}>{doneCount} {t.done}</span>
        </div>
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
        <div style={{ ...S.ticketGrid, gridTemplateColumns: `repeat(${Math.min(visible.length, MAX_VISIBLE)}, 1fr)` }}>
          {visible.map(order => (
            <GuestCheckTicket key={order.firestoreId} order={order} t={t} isQueue={false} />
          ))}
        </div>
      )}

      {queued.length > 0 && (
        <div style={S.queueStrip}>
          <div style={S.queueLabel}>COLA / QUEUE</div>
          {queued.map(order => (
            <div key={order.firestoreId} style={S.queueItem}>
              <span style={S.queueOrderId}>#{order.id}</span>
              <span style={S.queueOrderTable}>
                {order.isToGo ? `🥡 ${order.toGoName}` : `${t.table2} ${order.table}`}
              </span>
              <span style={S.queueOrderItems}>
                {order.items.map(i => `${i.qty}× ${i.name}`).join(", ")}
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
// WAITER SCREEN
// ============================================================
function WaiterScreen({ menu, onOrderSent, lang }) {
  const t = T[lang];
  const [activeCategory, setActiveCategory] = useState(menu.categories[0]?.id);
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState("table");
  const [tableNum, setTableNum] = useState("");
  const [toGoName, setToGoName] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [note, setNote] = useState("");
  const [editingOrder, setEditingOrder] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const [showActiveOrders, setShowActiveOrders] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
      setActiveOrders(data.filter(o => o.status !== "done"));
    });
    return unsub;
  }, []);

  const filteredItems = menu.items.filter(i => i.categoryId === activeCategory);
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const isEditing = !!editingOrder;
  const identifier = orderType === "togo" ? toGoName : tableNum;
  const canSend = identifier.trim() && (cart.length > 0 || isEditing);
  const isCancellingOrder = isEditing && cart.every(i => i.qty === 0);

  function addToCart(item) {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
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
    setEditingOrder(null);
    setCart([]);
    setNote("");
    setTableNum("");
    setToGoName("");
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
        id: genId(),
        table: orderType === "table" ? tableNum : null,
        isToGo: orderType === "togo",
        toGoName: orderType === "togo" ? toGoName : null,
        items: cart, note, total: cartTotal,
        timestamp: Date.now(), status: "new", editHistory: [],
      };
      const cloverOrderId = await sendOrderToClover(order);
      await pushOrderToKitchen({ ...order, cloverOrderId: cloverOrderId || null });
      setSending(false); setSent(true);
      onOrderSent?.(order);
      setTimeout(() => { setCart([]); setTableNum(""); setToGoName(""); setNote(""); setSent(false); }, 2000);
    }
  }

  return (
    <div style={S.waiterRoot}>
      <div style={S.waiterHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={S.waiterLogo}>🍽️ {t.orderStation}</span>
          {isEditing && <span style={S.editingBadge}>✏️ {t.editOrder}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {activeOrders.length > 0 && (
            <button style={S.activeOrdersBtn} onClick={() => setShowActiveOrders(v => !v)}>
              {t.activeOrders} <span style={S.activeOrdersBadge}>{activeOrders.length}</span>
            </button>
          )}
          <div style={S.orderTypeToggle}>
            <button style={{ ...S.typeBtn, ...(orderType === "table" ? S.typeBtnActive : {}) }} onClick={() => setOrderType("table")}>🪑 {t.table}</button>
            <button style={{ ...S.typeBtn, ...(orderType === "togo" ? S.typeBtnToGo : {}) }} onClick={() => setOrderType("togo")}>🥡 {t.toGo}</button>
          </div>
          <div style={{ ...S.tableInput, ...(orderType === "togo" ? S.tableInputToGo : {}) }}>
            <span style={{ ...S.tableLabel, ...(orderType === "togo" ? { color: "#00C2FF" } : {}) }}>
              {orderType === "togo" ? "🥡" : t.table}
            </span>
            <input
              style={{ ...S.tableField, width: orderType === "togo" ? 140 : 52 }}
              value={orderType === "togo" ? toGoName : tableNum}
              onChange={e => orderType === "togo" ? setToGoName(e.target.value) : setTableNum(e.target.value)}
              placeholder={orderType === "togo" ? t.toGoName : "#"}
              maxLength={orderType === "togo" ? 30 : 3}
            />
          </div>
        </div>
      </div>

      {showActiveOrders && (
        <div style={S.activeOrdersDropdown}>
          <div style={S.dropdownTitle}>{t.activeOrders} — {t.editOrder}</div>
          {activeOrders.map(order => (
            <button key={order.firestoreId} style={S.activeOrderRow} onClick={() => loadOrderForEdit(order)}>
              <span style={order.isToGo ? S.toGoChipSmall : S.tableChipSmall}>
                {order.isToGo ? `🥡 ${order.toGoName}` : `${t.table2} ${order.table}`}
              </span>
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
              {cat.name[lang]}
            </button>
          ))}
        </div>
        <div style={S.menuGrid}>
          {filteredItems.map(item => {
            const inCart = cart.find(c => c.id === item.id);
            return (
              <button key={item.id} style={{ ...S.menuItem, ...(inCart ? S.menuItemActive : {}) }} onClick={() => addToCart(item)}>
                <span style={S.menuEmoji}>{item.emoji}</span>
                <span style={S.menuName}>{item.name}</span>
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
                <span style={S.cartName}>{item.emoji} {item.name}</span>
                <div style={S.cartQtyRow}>
                  <button style={S.qtyBtn} onClick={() => removeFromCart(item.id)}>−</button>
                  <span style={S.cartQty}>{item.qty}</span>
                  <button style={S.qtyBtn} onClick={() => addToCart(item)}>+</button>
                  <span style={S.cartItemTotal}>{fmt(item.price * item.qty)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <textarea style={S.noteField} placeholder={t.specialInstructions} value={note} onChange={e => setNote(e.target.value)} rows={2} />
        <div style={S.cartFooter}>
          <span style={S.cartTotal}>{fmt(cartTotal)}</span>
          <div style={{ display: "flex", gap: 10 }}>
            {isEditing && <button style={S.cancelBtn} onClick={cancelEdit}>{t.cancelEdit}</button>}
            {isEditing && (
              <button style={S.cancelOrderBtn} onClick={() => setCart(cart.map(i => ({ ...i, qty: 0 })))}>
                🚫 Cancel Order
              </button>
            )}
            <button
              style={{
                ...S.sendBtn,
                ...(isCancellingOrder ? S.sendBtnCancel : isEditing ? S.sendBtnEdit : {}),
                ...(sent ? S.sendBtnSent : {}),
                ...(!canSend ? S.sendBtnDisabled : {}),
              }}
              onClick={handleSend} disabled={sending || !canSend}
            >
              {sent ? (isEditing ? t.updated : t.sent)
                : sending ? t.sending
                : isCancellingOrder ? "🚫 Confirm Cancel"
                : isEditing ? t.updateOrder
                : t.sendToKitchen}
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
  const itemList = Object.entries(itemStats)
    .map(([name, s]) => ({ name, ...s, avgTime: s.totalTime / s.count }))
    .sort((a, b) => b.count - a.count);

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
// ROOT APP
// ============================================================
export default function App() {
  const [view, setView] = useState("waiter");
  const [menu, setMenu] = useState(null);
  const [lang, setLang] = useState("es");
  const [activeOrders, setActiveOrders] = useState(0);
  const t = T[lang];

  useEffect(() => { fetchMenuFromClover().then(setMenu); }, []);
  useEffect(() => {
    const q = query(collection(db, "orders"));
    const unsub = onSnapshot(q, (snapshot) => {
      setActiveOrders(snapshot.docs.filter(d => d.data().status !== "done").length);
    });
    return unsub;
  }, []);

  if (!menu) return (
    <div style={S.loading}><div style={S.loadingSpinner} /><span>Cargando menú...</span></div>
  );

  return (
    <div style={S.appRoot}>
      <div style={S.nav}>
        <div style={S.navLeft}>
          <button style={{ ...S.navBtn, ...(view === "waiter" ? S.navBtnActive : {}) }} onClick={() => setView("waiter")}>🍽️ {t.orderStation}</button>
          <button style={{ ...S.navBtn, ...(view === "kitchen" ? S.navBtnActive : {}) }} onClick={() => setView("kitchen")}>
            👨‍🍳 {t.kitchenDisplay}
            {activeOrders > 0 && <span style={S.navBadge}>{activeOrders}</span>}
          </button>
          <button style={{ ...S.navBtn, ...(view === "history" ? S.navBtnActive : {}) }} onClick={() => setView("history")}>📊 {t.orderHistory}</button>
        </div>
        <button style={S.langBtn} onClick={() => setLang(l => l === "es" ? "en" : "es")}>
          {lang === "es" ? "🇺🇸 EN" : "🇲🇽 ES"}
        </button>
      </div>
      {view === "waiter" && <WaiterScreen menu={menu} onOrderSent={() => {}} lang={lang} />}
      {view === "kitchen" && <KitchenScreen lang={lang} />}
      {view === "history" && <HistoryScreen lang={lang} />}
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const S = {
  appRoot: { fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#0A0A0A", minHeight: "100vh", color: "#F0EDE8", display: "flex", flexDirection: "column" },
  nav: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#141414", borderBottom: "1px solid #222", padding: "0 16px" },
  navLeft: { display: "flex" },
  navBtn: { background: "none", border: "none", color: "#666", padding: "16px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer", letterSpacing: "0.02em" },
  navBtnActive: { color: "#FF4D00", borderBottom: "2px solid #FF4D00" },
  navBadge: { background: "#FF4D00", color: "#fff", borderRadius: 10, fontSize: 11, padding: "1px 6px", marginLeft: 6, fontWeight: 700 },
  langBtn: { background: "#222", border: "1px solid #333", color: "#ccc", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  loading: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 16, color: "#888", background: "#0A0A0A" },
  loadingSpinner: { width: 36, height: 36, border: "3px solid #333", borderTop: "3px solid #FF4D00", borderRadius: "50%" },
  kitchenRoot: { flex: 1, display: "flex", flexDirection: "column", background: "#1a1a1a", minHeight: "calc(100vh - 53px)" },
  kitchenHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", background: "#111", borderBottom: "2px solid #333" },
  kitchenHeaderLeft: { display: "flex", alignItems: "center", gap: 14 },
  kitchenTitle: { fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", color: "#F0EDE8" },
  queuePill: { background: "#CC7700", color: "#fff", borderRadius: 20, padding: "4px 14px", fontSize: 14, fontWeight: 800 },
  kitchenStats: { display: "flex", gap: 10 },
  statPill: { background: "#CC2200", color: "#fff", borderRadius: 20, padding: "6px 16px", fontSize: 15, fontWeight: 800 },
  kitchenEmpty: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center" },
  emptyCheck: { background: "#f5f0e8", border: "2px solid #c8b89a", borderRadius: 4, padding: "40px 60px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" },
  emptyCheckInner: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  emptyCheckTitle: { fontSize: 13, fontWeight: 800, color: "#8B7355", letterSpacing: "0.15em" },
  emptyCheckmark: { fontSize: 80, color: "#1a7a3a", fontWeight: 900, lineHeight: 1 },
  emptyCheckSub: { fontSize: 28, fontWeight: 900, color: "#1a1a1a" },
  emptyCheckSubSmall: { fontSize: 16, color: "#666" },
  ticketGrid: { flex: 1, display: "grid", gap: 20, padding: "20px 24px", alignItems: "start" },
  ticket: { background: "#f5f0e8", border: "1px solid #c8b89a", borderRadius: 3, boxShadow: "0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.8)", overflow: "hidden", transition: "all 0.3s", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" },
  cancelledBanner: { background: "#8B0000", color: "#fff", fontWeight: 900, fontSize: 24, padding: "16px 20px", textAlign: "center", letterSpacing: "0.08em" },
  toGoBanner: { background: "#0066AA", color: "#fff", fontWeight: 900, fontSize: 20, padding: "10px 20px", textAlign: "center", letterSpacing: "0.08em" },
  modifiedBanner: { background: "#6600CC", color: "#fff", fontWeight: 900, fontSize: 16, padding: "8px 20px", textAlign: "center", letterSpacing: "0.08em" },
  ticketTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "16px 20px 12px 20px", background: "#ede8d8" },
  ticketTopLeft: { flex: 1 },
  ticketTopRight: { textAlign: "right" },
  guestCheckTitle: { fontSize: 11, fontWeight: 900, color: "#8B7355", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 6 },
  tableNumberBig: { fontSize: 42, fontWeight: 900, color: "#1a1a1a", letterSpacing: "-0.02em", lineHeight: 1 },
  toGoNameBig: { fontSize: 32, fontWeight: 900, color: "#0066AA", letterSpacing: "-0.01em", lineHeight: 1.1 },
  ticketMeta: { marginTop: 4 },
  checkNoLabel: { fontSize: 10, fontWeight: 800, color: "#8B7355", letterSpacing: "0.15em" },
  checkNoValue: { fontSize: 28, fontWeight: 900, color: "#CC2200", letterSpacing: "0.05em" },
  timerBig: { fontSize: 22, fontWeight: 900, marginTop: 6, letterSpacing: "-0.01em" },
  ruledLine: { borderBottom: "1px solid #c8b89a", margin: "0 20px" },
  colHeaders: { display: "flex", padding: "6px 20px", background: "#ede8d8" },
  colQty: { width: 60, fontSize: 11, fontWeight: 900, color: "#8B7355", letterSpacing: "0.12em" },
  colItem: { flex: 1, fontSize: 11, fontWeight: 900, color: "#8B7355", letterSpacing: "0.12em" },
  itemsList: { padding: "4px 0" },
  itemRow: { display: "flex", alignItems: "center", padding: "10px 20px", minHeight: 52 },
  itemQty: { width: 60, fontSize: 32, fontWeight: 900, letterSpacing: "-0.02em" },
  itemName: { flex: 1, fontSize: 26, lineHeight: 1.2 },
  changeTag: { display: "inline-block", color: "#fff", fontSize: 11, fontWeight: 900, padding: "2px 8px", borderRadius: 4, marginLeft: 10, letterSpacing: "0.08em" },
  noteRow: { display: "flex", gap: 10, padding: "10px 20px", alignItems: "flex-start" },
  noteLabel: { fontSize: 11, fontWeight: 900, color: "#8B7355", letterSpacing: "0.12em", minWidth: 50, paddingTop: 2 },
  noteText: { fontSize: 18, fontWeight: 600, color: "#333", fontStyle: "italic", flex: 1 },
  ticketFooter: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "#ede8d8" },
  statusStamp: { border: "3px solid", borderRadius: 4, padding: "4px 14px", fontSize: 14, fontWeight: 900, letterSpacing: "0.12em" },
  ticketBtns: { display: "flex", gap: 10 },
  btnStart: { background: "#CC7700", color: "#fff", border: "none", borderRadius: 6, padding: "12px 24px", fontSize: 18, fontWeight: 900, cursor: "pointer", letterSpacing: "0.05em" },
  btnDone: { background: "#1a7a3a", color: "#fff", border: "none", borderRadius: 6, padding: "12px 24px", fontSize: 18, fontWeight: 900, cursor: "pointer", letterSpacing: "0.05em" },
  queueStrip: { background: "#111", borderTop: "2px solid #333", padding: "10px 24px", display: "flex", alignItems: "center", gap: 20, overflowX: "auto" },
  queueLabel: { fontSize: 11, fontWeight: 900, color: "#CC7700", letterSpacing: "0.15em", whiteSpace: "nowrap" },
  queueItem: { display: "flex", alignItems: "center", gap: 10, background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "8px 14px", whiteSpace: "nowrap" },
  queueOrderId: { fontSize: 13, fontWeight: 900, color: "#CC2200" },
  queueOrderTable: { fontSize: 14, fontWeight: 800, color: "#F0EDE8" },
  queueOrderItems: { fontSize: 13, color: "#888", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" },
  queueOrderTime: { fontSize: 13, fontWeight: 700, color: "#CC7700" },
  waiterRoot: { display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", height: "calc(100vh - 53px)" },
  waiterHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", background: "#141414", borderBottom: "1px solid #222", flexWrap: "wrap", gap: 10 },
  waiterLogo: { fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" },
  editingBadge: { background: "#A855F7", color: "#fff", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 800 },
  orderTypeToggle: { display: "flex", background: "#0A0A0A", border: "1px solid #333", borderRadius: 10, overflow: "hidden" },
  typeBtn: { background: "none", border: "none", color: "#666", padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  typeBtnActive: { background: "#333", color: "#FF4D00" },
  typeBtnToGo: { background: "#0a2540", color: "#00C2FF" },
  tableInput: { display: "flex", alignItems: "center", gap: 8, background: "#0A0A0A", border: "2px solid #333", borderRadius: 10, padding: "6px 12px" },
  tableInputToGo: { border: "2px solid #00C2FF" },
  tableLabel: { fontSize: 12, fontWeight: 800, color: "#FF4D00", letterSpacing: "0.1em" },
  tableField: { background: "none", border: "none", color: "#F0EDE8", fontSize: 16, fontWeight: 700, outline: "none" },
  activeOrdersBtn: { background: "#1a1a2e", border: "1px solid #333", color: "#ccc", borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 },
  activeOrdersBadge: { background: "#FF4D00", color: "#fff", borderRadius: 10, fontSize: 11, padding: "1px 6px", fontWeight: 800 },
  activeOrdersDropdown: { background: "#141414", borderBottom: "2px solid #333", padding: "12px 20px", display: "flex", flexDirection: "column", gap: 8 },
  dropdownTitle: { fontSize: 11, fontWeight: 800, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 },
  activeOrderRow: { background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", width: "100%", textAlign: "left" },
  tableChipSmall: { background: "#222", color: "#FF4D00", borderRadius: 6, padding: "3px 8px", fontSize: 13, fontWeight: 800 },
  toGoChipSmall: { background: "#0a2540", color: "#00C2FF", borderRadius: 6, padding: "3px 8px", fontSize: 13, fontWeight: 800 },
  activeOrderItems: { flex: 1, fontSize: 16, color: "#888" },
  activeOrderEdit: { color: "#A855F7", fontSize: 13, fontWeight: 700 },
  waiterBody: { flex: 1, overflow: "auto", padding: "16px 20px" },
  catRow: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  catBtn: { background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#888", borderRadius: 20, padding: "8px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  catBtnActive: { background: "#FF4D00", border: "1px solid #FF4D00", color: "#fff" },
  menuGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 },
  menuItem: { background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 14, padding: "18px 12px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, position: "relative" },
  menuItemActive: { background: "#1F1510", border: "1px solid #FF4D00" },
  menuEmoji: { fontSize: 36 },
  menuName: { fontSize: 13, fontWeight: 600, textAlign: "center", color: "#E0DDD8" },
  menuPrice: { fontSize: 14, color: "#FF4D00", fontWeight: 700 },
  menuBadge: { position: "absolute", top: 8, right: 8, background: "#FF4D00", color: "#fff", borderRadius: 10, fontSize: 11, fontWeight: 800, padding: "1px 6px" },
  cartPanel: { background: "#141414", borderTop: "1px solid #222", padding: "14px 20px", maxHeight: "38vh", overflowY: "auto" },
  cartTitle: { fontSize: 11, fontWeight: 800, color: "#555", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 },
  cartEmpty: { color: "#444", fontSize: 14, textAlign: "center", padding: "8px 0" },
  cartCancelWarning: { color: "#CC2200", fontSize: 14, fontWeight: 700, textAlign: "center", padding: "8px 0", background: "#1a0000", borderRadius: 8, marginBottom: 8 },
  cartItems: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 },
  cartRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #1E1E1E" },
  cartName: { fontSize: 14, color: "#D0CCC8" },
  cartQtyRow: { display: "flex", alignItems: "center", gap: 8 },
  qtyBtn: { background: "#2A2A2A", border: "none", color: "#ccc", width: 28, height: 28, borderRadius: 7, cursor: "pointer", fontSize: 16 },
  cartQty: { fontSize: 15, fontWeight: 700, minWidth: 20, textAlign: "center" },
  cartItemTotal: { fontSize: 13, color: "#FF4D00", fontWeight: 600, minWidth: 52, textAlign: "right" },
  noteField: { width: "100%", background: "#0A0A0A", border: "1px solid #222", borderRadius: 8, color: "#ccc", fontSize: 13, padding: "8px 12px", resize: "none", outline: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 12 },
  cartFooter: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cartTotal: { fontSize: 24, fontWeight: 800 },
  sendBtn: { background: "#FF4D00", color: "#fff", border: "none", borderRadius: 10, padding: "14px 28px", fontSize: 16, fontWeight: 700, cursor: "pointer" },
  sendBtnEdit: { background: "#A855F7" },
  sendBtnCancel: { background: "#8B0000" },
  sendBtnSent: { background: "#27AE60" },
  sendBtnDisabled: { background: "#1E1E1E", color: "#444", cursor: "not-allowed" },
  cancelBtn: { background: "#1E1E1E", color: "#888", border: "1px solid #333", borderRadius: 10, padding: "14px 20px", fontSize: 15, fontWeight: 700, cursor: "pointer" },
  cancelOrderBtn: { background: "#8B0000", color: "#fff", border: "none", borderRadius: 10, padding: "14px 20px", fontSize: 15, fontWeight: 700, cursor: "pointer" },
  historyRoot: { flex: 1, padding: "20px", overflow: "auto" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 },
  statCard: { background: "#141414", border: "1px solid #222", borderRadius: 14, padding: "20px", textAlign: "center" },
  statValue: { fontSize: 32, fontWeight: 900, color: "#FF4D00", marginBottom: 4 },
  statLabel: { fontSize: 12, color: "#666", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" },
  historyColumns: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  historyPanel: { display: "flex", flexDirection: "column", gap: 12 },
  panelTitle: { fontSize: 13, fontWeight: 800, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 },
  historyEmpty: { color: "#333", fontSize: 14, padding: "20px 0", textAlign: "center" },
  historyCard: { background: "#141414", border: "1px solid #222", borderRadius: 12, padding: "14px" },
  historyCardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, background: "none", border: "none", width: "100%", cursor: "pointer", padding: 0, color: "inherit" },
  historyTable: { fontSize: 16, fontWeight: 800, color: "#F0EDE8" },
  historyId: { fontSize: 11, color: "#444", fontWeight: 600 },
  historyTotal: { fontSize: 16, fontWeight: 800, color: "#FF4D00" },
  modifiedChip: { background: "#2d1b4e", color: "#A855F7", borderRadius: 6, padding: "2px 7px", fontSize: 11, fontWeight: 800 },
  historyItems: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  historyItem: { background: "#1A1A1A", borderRadius: 6, padding: "3px 8px", fontSize: 12, color: "#888" },
  historyMeta: { display: "flex", gap: 12, fontSize: 12, color: "#555" },
  itemStatCard: { background: "#141414", border: "1px solid #222", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 },
  itemStatEmoji: { fontSize: 28 },
  itemStatInfo: { flex: 1 },
  itemStatName: { fontSize: 15, fontWeight: 700, color: "#E0DDD8", marginBottom: 2 },
  itemStatMeta: { fontSize: 12, color: "#555" },
  itemStatCount: { fontSize: 24, fontWeight: 900, color: "#FF4D00", minWidth: 40, textAlign: "center" },
};
