import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { collection, doc, setDoc, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "firebase/firestore";
import { db, useAutoUpdate } from "./App";

// ============================================================
// INVENTORY — cooks' count page  (open with ?screen=inventory)
// ============================================================
// Everything inventory lives in this file, separate from App.js.
//
// Flow: 6-digit PIN (checked server-side by api/staff-auth.js) -> pick AM/PM
// -> count -> submit one document to Firestore `inventoryCounts`.
//
// LOCAL DRAFT: every keypress is saved to this tablet's localStorage, so a
// reload, a dead battery, an idle lock or a WiFi drop never loses a count.
// A submitted count stays on the tablet as "pending" until Firestore confirms
// it landed, and is retried automatically.

// ── SEED ITEMS ───────────────────────────────────────────────
// Tier A only -- the one tier the build spec gives real units and pars for.
// Lives here until the Items admin screen moves it into Firestore. `id` is
// what gets written on every count line: never rename or reuse one.
// TODO(owner): storage location + walking order aren't confirmed yet, so
// items are grouped by category for now.
const ITEMS = [
  { id: "steak-asada",      en: "Steak (asada)",            es: "Carne asada (res)",   cat: "protein", unit: "lb",   par: 56 },
  { id: "chicken",          en: "Chicken",                  es: "Pollo",               cat: "protein", unit: "lb",   par: 35 },
  { id: "pork-pozole",      en: "Pozole pork",              es: "Puerco para pozole",  cat: "protein", unit: "lb",   par: 19 },
  { id: "beef-shank",       en: "Beef shank (caldo)",       es: "Chambarete",          cat: "protein", unit: "lb",   par: 15 },
  { id: "tripe",            en: "Tripe (menudo)",           es: "Pancita / menudo",    cat: "protein", unit: "lb",   par: 11 },
  { id: "milanesa-beef",    en: "Milanesa beef cutlets",    es: "Milanesa de res",     cat: "protein", unit: "lb",   par: 11 },
  { id: "pork-arabe",       en: "Pork for árabe",           es: "Puerco para árabe",   cat: "protein", unit: "lb",   par: 8 },
  { id: "pork-pastor",      en: "Al pastor pork",           es: "Puerco al pastor",    cat: "protein", unit: "lb",   par: 6 },
  { id: "cecina",           en: "Cecina",                   es: "Cecina",              cat: "protein", unit: "lb",   par: 6 },
  { id: "fish",             en: "Fish (frozen)",            es: "Pescado (congelado)", cat: "protein", unit: "lb",   par: 4.5 },
  { id: "milanesa-chicken", en: "Milanesa chicken cutlets", es: "Milanesa de pollo",   cat: "protein", unit: "lb",   par: 4.5 },
  { id: "ground-beef",      en: "Ground beef",              es: "Carne molida",        cat: "protein", unit: "lb",   par: 4 },
  { id: "cabeza",           en: "Cabeza",                   es: "Cabeza de res",       cat: "protein", unit: "lb",   par: 3 },
  { id: "chicharron",       en: "Chicharrón",               es: "Chicharrón",          cat: "protein", unit: "lb",   par: 2 },
  { id: "chorizo",          en: "Chorizo",                  es: "Chorizo",             cat: "protein", unit: "lb",   par: 1.5 },
  { id: "pierna",           en: "Pierna (pork leg)",        es: "Pierna de puerco",    cat: "protein", unit: "lb",   par: 1.5 },
  { id: "avocado",          en: "Avocados",                 es: "Aguacates",           cat: "produce", unit: "each", par: 80 },
  { id: "modelo",           en: "Modelo (bottles)",         es: "Modelo (botellas)",   cat: "beer",    unit: "each", par: 48 },
  { id: "corona",           en: "Corona (bottles)",         es: "Corona (botellas)",   cat: "beer",    unit: "each", par: 24 },
].map(i => ({ ...i, tier: "A" }));

const CATEGORY_ORDER = ["protein", "produce", "beer"];

// AM = Tier A. PM = Tiers A + B per the spec; Tier B isn't seeded yet, so PM
// is Tier A too until it is. Weekly (Tier C) is hidden until it has items.
const COUNT_TYPES = {
  AM: { tiers: ["A"] },
  PM: { tiers: ["A", "B"] },
};
// ── ROLES ────────────────────────────────────────────────────
// The role comes from the server with the PIN check (STAFF_PINS) and is
// stamped on every record. What each role may do is decided here, in one
// place, so later screens (items, purchases, reports) just add a row.
// Keep the role names in sync with ROLES in api/staff-auth.js.
const ROLE_CAN = {
  count: ["admin", "cook", "prep"],
};
const can = (session, action) => !!session && (ROLE_CAN[action] || []).includes(session.role);

const itemsFor = type => ITEMS.filter(i => COUNT_TYPES[type].tiers.includes(i.tier));

const IT = {
  es: {
    title: "Inventario", enterPin: "Escribe tu PIN", pinSub: "6 dígitos", checking: "Verificando…",
    badPin: "PIN incorrecto", locked: s => `Demasiados intentos. Espera ${s}s`,
    noNet: "Sin conexión. No se pudo verificar el PIN.", notConfigured: "PINs no configurados en el servidor.",
    role: { admin: "Admin", cook: "Cocinero", prep: "Preparadora", waitress: "Mesera" },
    noAccess: "Tu PIN no tiene permiso para hacer conteos.",
    hello: n => `Hola, ${n}`, lock: "Salir", chooseCount: "¿Qué conteo vas a hacer?",
    AM: "Conteo AM", AMsub: "Al empezar la mañana", PM: "Conteo PM", PMsub: "Al cerrar",
    resume: (n, total) => `Continuar · ${n}/${total}`, startedBy: n => `Empezado por ${n}`,
    lastSent: (who, when) => `✓ Enviado ${when} · ${who}`,
    pendingBanner: n => `${n} conteo(s) guardado(s) en esta tableta, esperando conexión…`,
    counted: (n, total) => `${n} / ${total} contados`, par: "Par", last: "Último",
    next: "Siguiente ▶", clear: "Borrar", submit: "Enviar conteo", missing: n => `Faltan ${n}`,
    back: "◀ Atrás", savedLocal: "Guardado en esta tableta",
    highTitle: "Revisa estos números", highBody: "Son más de 3× el par. ¿Están bien?",
    fix: "Corregir", confirmSend: "Sí, enviar",
    sending: "Enviando…", sentOk: "✓ Conteo enviado",
    sentQueued: "Guardado en esta tableta. Se enviará solo cuando haya conexión.",
    done: "Listo", tapItem: "Toca un artículo", high: "¿Seguro? Es más de 3× el par",
    cat: { protein: "Carnes", produce: "Verduras", beer: "Cerveza" },
    unit: { lb: "lb", each: "pzas" },
  },
  en: {
    title: "Inventory", enterPin: "Enter your PIN", pinSub: "6 digits", checking: "Checking…",
    badPin: "Wrong PIN", locked: s => `Too many tries. Wait ${s}s`,
    noNet: "No connection. Couldn't check the PIN.", notConfigured: "PINs aren't set up on the server.",
    role: { admin: "Admin", cook: "Cook", prep: "Prep", waitress: "Waitress" },
    noAccess: "Your PIN isn't allowed to do counts.",
    hello: n => `Hi, ${n}`, lock: "Sign out", chooseCount: "Which count are you doing?",
    AM: "AM count", AMsub: "Start of the morning", PM: "PM count", PMsub: "At close",
    resume: (n, total) => `Continue · ${n}/${total}`, startedBy: n => `Started by ${n}`,
    lastSent: (who, when) => `✓ Sent ${when} · ${who}`,
    pendingBanner: n => `${n} count(s) saved on this tablet, waiting for a connection…`,
    counted: (n, total) => `${n} / ${total} counted`, par: "Par", last: "Last",
    next: "Next ▶", clear: "Clear", submit: "Submit count", missing: n => `${n} left`,
    back: "◀ Back", savedLocal: "Saved on this tablet",
    highTitle: "Check these numbers", highBody: "They're more than 3× par. Are they right?",
    fix: "Fix", confirmSend: "Yes, submit",
    sending: "Sending…", sentOk: "✓ Count submitted",
    sentQueued: "Saved on this tablet. It will send by itself once there's a connection.",
    done: "Done", tapItem: "Tap an item", high: "Sure? That's more than 3× par",
    cat: { protein: "Meat", produce: "Produce", beer: "Beer" },
    unit: { lb: "lb", each: "each" },
  },
};

// ── TIME ─────────────────────────────────────────────────────
// A count belongs to the restaurant's business day, not the calendar day or
// the tablet's timezone: a close finished at 12:30am is still "yesterday".
// The day rolls over at 4am Central.
function businessDate(ms = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date(ms - 4 * 3600 * 1000));
}
const fmtTime = ms => new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" }).format(new Date(ms));

// ── DEVICE + LOCAL STORAGE ───────────────────────────────────
// localStorage can throw (private mode, storage cleared/blocked by the kiosk
// browser), so every access is wrapped and the page still works without it.
const DRAFTS_KEY = "dpkds.inv.drafts.v1";
const DEVICE_KEY = "dpkds.inv.deviceId";
const lsGet = (k) => { try { return window.localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { window.localStorage.setItem(k, v); return true; } catch { return false; } };
const newId = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

// Which physical tablet a record came from. Random, not a hardware id.
function deviceId() {
  let id = lsGet(DEVICE_KEY);
  if (!id) { id = newId(); lsSet(DEVICE_KEY, id); }
  return id;
}
const APP_BUILD = document.querySelector('script[src*="/static/js/main."]')?.getAttribute("src") || "dev";

function loadDrafts() {
  try {
    const all = JSON.parse(lsGet(DRAFTS_KEY) || "{}");
    // An unfinished count from an earlier business day is no longer a count
    // of anything real. Pending (already submitted, not yet delivered) ones
    // are kept no matter how old.
    const today = businessDate();
    Object.keys(all).forEach(k => { if (all[k].status === "open" && all[k].businessDate !== today) delete all[k]; });
    return all;
  } catch { return {}; }
}
const saveDrafts = drafts => lsSet(DRAFTS_KEY, JSON.stringify(drafts));

// ── FIRESTORE ────────────────────────────────────────────────
// Sign-ins and failed attempts, so "who was on the tablet at 9pm" has an
// answer. Never include the digits typed.
function logAuth(event, staff) {
  addDoc(collection(db, "inventoryAuthLog"), {
    event, staffId: staff?.id || null, staffName: staff?.name || null, role: staff?.role || null,
    at: serverTimestamp(), atClient: Date.now(), deviceId: deviceId(), appBuild: APP_BUILD,
  }).catch(err => console.warn("auth log failed:", err.message));
}

// The document id IS the draft id, so a retry or a double-tap overwrites the
// same document with the same content instead of creating a second count.
const SEND_TIMEOUT_MS = 8000;
function sendCount(payload) {
  const write = setDoc(doc(db, "inventoryCounts", payload.id), { ...payload, submittedAt: serverTimestamp() });
  // Offline, setDoc never settles -- it just queues in memory. Treat silence
  // as "not delivered yet" and let the pending-retry loop confirm it later.
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), SEND_TIMEOUT_MS));
  return Promise.race([write, timeout]);
}

async function fetchRecentCounts() {
  const snap = await getDocs(query(collection(db, "inventoryCounts"), orderBy("submittedAt", "desc"), limit(8)));
  return snap.docs.map(d => d.data());
}

// ── PIN SCREEN ───────────────────────────────────────────────
const MAX_TRIES = 5;
const LOCKOUT_MS = 60000;

function PinScreen({ lang, onAuthed }) {
  const t = IT[lang];
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [, tick] = useState(0);
  const triesRef = useRef(0);

  useEffect(() => {
    if (!lockedUntil) return;
    const i = setInterval(() => { if (Date.now() >= lockedUntil) setLockedUntil(0); else tick(n => n + 1); }, 500);
    return () => clearInterval(i);
  }, [lockedUntil]);

  async function check(full) {
    setBusy(true);
    try {
      const res = await fetch("/api/staff-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: full }),
      });
      if (res.status === 200) {
        const staff = await res.json();
        logAuth("signin", staff);
        onAuthed(staff);
        return;
      }
      if (res.status === 401) {
        triesRef.current += 1;
        logAuth("bad_pin", null);
        if (triesRef.current >= MAX_TRIES) {
          triesRef.current = 0;
          setLockedUntil(Date.now() + LOCKOUT_MS);
          logAuth("lockout", null);
        }
        setError(t.badPin);
      } else {
        setError(t.notConfigured);
      }
    } catch {
      setError(t.noNet);
    }
    setBusy(false);
    setPin("");
  }

  function press(k) {
    if (busy || lockedUntil) return;
    setError(null);
    if (k === "⌫") return setPin(p => p.slice(0, -1));
    const next = (pin + k).slice(0, 6);
    setPin(next);
    if (next.length === 6) check(next);
  }

  const secsLeft = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
  return (
    <div style={IS.center}>
      <div style={IS.pinCard}>
        <div style={IS.pinTitle}>{t.enterPin}</div>
        <div style={IS.pinSub}>{busy ? t.checking : t.pinSub}</div>
        <div style={IS.pinDots}>
          {[0, 1, 2, 3, 4, 5].map(i => <div key={i} style={{ ...IS.pinDot, ...(pin.length > i ? IS.pinDotOn : {}) }} />)}
        </div>
        <div style={IS.pinMsg}>{lockedUntil ? t.locked(secsLeft) : error || " "}</div>
        <div style={IS.keyGrid}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "⌫"].map((k, i) => k === null
            ? <div key={i} />
            : <button key={i} style={{ ...IS.key, ...(busy || lockedUntil ? IS.keyOff : {}) }} onClick={() => press(String(k))}>{k}</button>)}
        </div>
      </div>
    </div>
  );
}

// ── HOME: PICK A COUNT ───────────────────────────────────────
function HomeScreen({ lang, drafts, recent, onPick }) {
  const t = IT[lang];
  const today = businessDate();
  return (
    <div style={IS.center}>
      <div style={{ width: "100%", maxWidth: 720 }}>
        <div style={IS.homeTitle}>{t.chooseCount}</div>
        <div style={IS.homeGrid}>
          {Object.keys(COUNT_TYPES).map(type => {
            const draft = drafts[`${today}|${type}`];
            const open = draft && draft.status === "open" ? draft : null;
            const sent = recent.find(c => c.countType === type && c.businessDate === today);
            return (
              <button key={type} style={IS.homeBtn} onClick={() => onPick(type)}>
                <span style={IS.homeBtnTitle}>{type === "AM" ? "☀️" : "🌙"} {t[type]}</span>
                <span style={IS.homeBtnSub}>{t[`${type}sub`]}</span>
                {open && <span style={IS.homeResume}>{t.resume(Object.keys(open.lines).length, itemsFor(type).length)} · {t.startedBy(open.startedBy.name)}</span>}
                {!open && sent && <span style={IS.homeSent}>{t.lastSent(sent.submittedBy?.name, fmtTime(sent.submittedAtClient))}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── COUNT SCREEN ─────────────────────────────────────────────
const fmtQty = n => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));
const isHigh = (item, qty) => qty > item.par * 3;

function CountScreen({ lang, type, draft, lastQty, onChangeLine, onSubmit, onBack }) {
  const t = IT[lang];
  const items = useMemo(() => itemsFor(type), [type]);
  const [selectedId, setSelectedId] = useState(() => (items.find(i => !draft.lines[i.id]) || items[0]).id);
  // What's being typed for the selected item. Kept as a string so "4." and
  // "0.5" can be typed digit by digit.
  const [buffer, setBuffer] = useState("");
  const [confirmHigh, setConfirmHigh] = useState(false);
  const [wide, setWide] = useState(window.innerWidth >= 820);
  const rowRefs = useRef({});

  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 820);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const selected = items.find(i => i.id === selectedId);
  const countedN = items.filter(i => draft.lines[i.id]).length;
  const highItems = items.filter(i => draft.lines[i.id] && isHigh(i, draft.lines[i.id].qty));

  function select(id) {
    setSelectedId(id);
    setBuffer("");
    rowRefs.current[id]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function commit(nextBuffer) {
    setBuffer(nextBuffer);
    const n = parseFloat(nextBuffer);
    onChangeLine(selected, nextBuffer === "" || Number.isNaN(n) ? null : n);
  }

  function pressKey(k) {
    if (k === "⌫") return commit(buffer.slice(0, -1));
    if (k === "." && buffer.includes(".")) return;
    const next = buffer === "0" && k !== "." ? k : buffer + k;
    // 4 whole digits, 2 decimals: enough for any real count, and it stops a
    // leaning hand from typing 4000000.
    if (!/^\d{0,4}(\.\d{0,2})?$/.test(next)) return;
    commit(next === "." ? "0." : next);
  }

  function bump(by) {
    const current = draft.lines[selected.id]?.qty || 0;
    commit(fmtQty(Math.min(9999, current + by)));
  }

  function next() {
    const idx = items.findIndex(i => i.id === selectedId);
    const rest = [...items.slice(idx + 1), ...items.slice(0, idx)];
    const target = rest.find(i => !draft.lines[i.id]) || items[Math.min(idx + 1, items.length - 1)];
    select(target.id);
  }

  function trySubmit() {
    if (highItems.length > 0) setConfirmHigh(true);
    else onSubmit();
  }

  const groups = CATEGORY_ORDER.map(cat => ({ cat, items: items.filter(i => i.cat === cat) })).filter(g => g.items.length);
  const selectedQty = draft.lines[selected.id]?.qty;
  const name = i => (lang === "es" ? i.es : i.en);

  const keypad = (
    <div style={{ ...IS.pad, ...(wide ? IS.padWide : IS.padNarrow) }}>
      <div style={IS.padItem}>{name(selected)}</div>
      <div style={IS.padDisplay}>
        <span style={{ ...IS.padNumber, ...(selectedQty == null ? { color: "#C9C3BB" } : {}) }}>{buffer !== "" ? buffer : selectedQty != null ? fmtQty(selectedQty) : "—"}</span>
        <span style={IS.padUnit}>{t.unit[selected.unit]}</span>
      </div>
      <div style={IS.padWarn}>{selectedQty != null && isHigh(selected, selectedQty) ? `⚠️ ${t.high}` : " "}</div>
      <div style={IS.quickRow}>
        <button style={IS.quick} onClick={() => bump(0.5)}>+½</button>
        <button style={IS.quick} onClick={() => bump(1)}>+1</button>
        <button style={IS.quick} onClick={() => bump(5)}>+5</button>
      </div>
      <div style={IS.keyGrid}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map(k => (
          <button key={k} style={IS.key} onClick={() => pressKey(k)}>{k}</button>
        ))}
      </div>
      <div style={IS.quickRow}>
        <button style={{ ...IS.quick, flex: 1 }} onClick={() => commit("")}>{t.clear}</button>
        <button style={{ ...IS.quick, ...IS.nextBtn, flex: 2 }} onClick={next}>{t.next}</button>
      </div>
    </div>
  );

  return (
    <div style={IS.countRoot}>
      <div style={IS.countHeader}>
        <button style={IS.backBtn} onClick={onBack}>{t.back}</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={IS.progressLabel}>
            <span>{t[type]} · {t.counted(countedN, items.length)}</span>
            <span style={IS.savedLocal}>💾 {t.savedLocal}</span>
          </div>
          <div style={IS.progressTrack}><div style={{ ...IS.progressFill, width: `${(countedN / items.length) * 100}%` }} /></div>
        </div>
        <button
          style={{ ...IS.submitBtn, ...(countedN < items.length ? IS.submitOff : {}) }}
          disabled={countedN < items.length}
          onClick={trySubmit}
        >
          {countedN < items.length ? t.missing(items.length - countedN) : t.submit}
        </button>
      </div>

      <div style={{ ...IS.countBody, flexDirection: wide ? "row" : "column" }}>
        <div style={IS.list}>
          {groups.map(g => (
            <div key={g.cat}>
              <div style={IS.groupHeader}>{t.cat[g.cat]}</div>
              {g.items.map(item => {
                const line = draft.lines[item.id];
                const last = lastQty[item.id];
                const high = line && isHigh(item, line.qty);
                return (
                  <button
                    key={item.id}
                    ref={el => { rowRefs.current[item.id] = el; }}
                    style={{ ...IS.row, ...(item.id === selectedId ? IS.rowSelected : {}), ...(high ? IS.rowHigh : {}) }}
                    onClick={() => select(item.id)}
                  >
                    <span style={IS.rowMain}>
                      <span style={IS.rowName}>{name(item)}</span>
                      <span style={IS.rowMeta}>{t.par} {fmtQty(item.par)} {t.unit[item.unit]}{last != null ? ` · ${t.last} ${fmtQty(last)}` : ""}</span>
                    </span>
                    <span style={{ ...IS.rowQty, ...(line ? {} : IS.rowQtyEmpty) }}>
                      {high && "⚠️ "}{line ? fmtQty(line.qty) : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {keypad}
      </div>

      {confirmHigh && (
        <div style={IS.overlay}>
          <div style={IS.dialog}>
            <div style={IS.dialogTitle}>⚠️ {t.highTitle}</div>
            <div style={IS.dialogBody}>{t.highBody}</div>
            {highItems.map(i => (
              <div key={i.id} style={IS.dialogRow}>
                <span>{name(i)}</span>
                <b>{fmtQty(draft.lines[i.id].qty)} {t.unit[i.unit]} <span style={{ color: "#888", fontWeight: 500 }}>({t.par} {fmtQty(i.par)})</span></b>
              </div>
            ))}
            <div style={IS.dialogBtns}>
              <button style={IS.dialogBtn} onClick={() => { setConfirmHigh(false); select(highItems[0].id); }}>{t.fix}</button>
              <button style={{ ...IS.dialogBtn, ...IS.dialogBtnPrimary }} onClick={() => { setConfirmHigh(false); onSubmit(); }}>{t.confirmSend}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ROOT ─────────────────────────────────────────────────────
// A shared kitchen tablet left signed in means the next person counts under
// someone else's name, so the session locks after this much idle time. The
// draft is untouched; whoever signs in next picks it up.
const IDLE_LOCK_MS = 5 * 60 * 1000;

export default function InventoryApp() {
  const [lang, setLang] = useState("es");
  const [session, setSession] = useState(null); // { id, name, role, issuedAt, sig } -- memory only, a reload signs out
  const [drafts, setDrafts] = useState(loadDrafts);
  const [activeType, setActiveType] = useState(null);
  const [recent, setRecent] = useState([]);
  const [result, setResult] = useState(null); // null | "sending" | "ok" | "queued"
  const t = IT[lang];

  // Reuse the order screens' deploy auto-reload. It skips reloading while the
  // ref reads "waiter" (its "someone is mid-entry" signal), so borrow that
  // value while a count is open. A reload wouldn't lose the draft, but it
  // would sign the cook out mid-count.
  const viewRef = useRef("inventory");
  useEffect(() => { viewRef.current = activeType ? "waiter" : "inventory"; }, [activeType]);
  useAutoUpdate(viewRef);

  const draftsRef = useRef(drafts);
  const updateDrafts = useCallback((fn) => {
    const next = fn(draftsRef.current);
    draftsRef.current = next;
    saveDrafts(next);
    setDrafts(next);
  }, []);

  const refreshRecent = useCallback(() => {
    fetchRecentCounts().then(setRecent).catch(err => console.warn("recent counts failed:", err.message));
  }, []);
  useEffect(() => { if (session) refreshRecent(); }, [session, refreshRecent]);

  // Deliver counts that were submitted while offline. Runs whether or not
  // anyone is signed in: the payload already records who submitted it.
  const flushPending = useCallback(async () => {
    const pending = Object.entries(draftsRef.current).filter(([, d]) => d.status === "pending");
    let delivered = false;
    for (const [key, d] of pending) {
      try {
        await sendCount(d.payload);
        updateDrafts(all => { const next = { ...all }; delete next[key]; return next; });
        delivered = true;
      } catch (err) {
        console.warn("pending count not delivered yet:", err.message);
      }
    }
    return delivered;
  }, [updateDrafts]);

  useEffect(() => {
    flushPending();
    const interval = setInterval(flushPending, 30000);
    window.addEventListener("online", flushPending);
    return () => { clearInterval(interval); window.removeEventListener("online", flushPending); };
  }, [flushPending]);

  // Idle lock
  useEffect(() => {
    if (!session) return;
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { logAuth("idle_lock", session); setSession(null); setActiveType(null); }, IDLE_LOCK_MS);
    };
    reset();
    window.addEventListener("pointerdown", reset);
    return () => { clearTimeout(timer); window.removeEventListener("pointerdown", reset); };
  }, [session]);

  const draftKey = activeType ? `${businessDate()}|${activeType}` : null;
  const draft = draftKey ? drafts[draftKey] : null;

  function pickType(type) {
    const key = `${businessDate()}|${type}`;
    if (!draftsRef.current[key] || draftsRef.current[key].status !== "open") {
      updateDrafts(all => ({
        ...all,
        [key]: {
          id: newId(), status: "open", countType: type, businessDate: businessDate(),
          startedAt: Date.now(), startedBy: { id: session.id, name: session.name, role: session.role }, lines: {},
        },
      }));
    }
    setActiveType(type);
  }

  function changeLine(item, qty) {
    updateDrafts(all => {
      const d = all[draftKey];
      const lines = { ...d.lines };
      if (qty == null) delete lines[item.id];
      // Unit, par and name are copied onto the line so the record still reads
      // correctly after someone later edits the item's par or unit.
      else lines[item.id] = { qty, by: session.id, byRole: session.role, at: Date.now(), unit: item.unit, par: item.par, name: item.en };
      return { ...all, [draftKey]: { ...d, lines } };
    });
  }

  async function submit() {
    const d = draftsRef.current[draftKey];
    const payload = {
      schema: 1,
      id: d.id,
      countType: d.countType,
      businessDate: d.businessDate,
      startedAt: d.startedAt,
      startedBy: d.startedBy,
      submittedBy: { id: session.id, name: session.name, role: session.role },
      // Proof this session came from a correct PIN with this role -- see
      // api/staff-auth.js.
      auth: { issuedAt: session.issuedAt, sig: session.sig },
      submittedAtClient: Date.now(),
      contributors: [...new Set(Object.values(d.lines).map(l => l.by))],
      flaggedHigh: itemsFor(d.countType).filter(i => d.lines[i.id] && isHigh(i, d.lines[i.id].qty)).map(i => i.id),
      lines: d.lines,
      device: { id: deviceId(), userAgent: navigator.userAgent },
      appBuild: APP_BUILD,
    };
    // Park it as pending on the tablet BEFORE the network call, so nothing
    // that happens during the send can lose it.
    // It moves to its own key so starting another count of the same type today
    // can't overwrite an undelivered one.
    updateDrafts(all => {
      const next = { ...all, [`pending|${d.id}`]: { ...d, status: "pending", payload } };
      delete next[draftKey];
      return next;
    });
    setActiveType(null);
    setResult("sending");
    const delivered = await flushPending();
    setResult(delivered ? "ok" : "queued");
    if (delivered) refreshRecent();
  }

  // Newest submitted quantity per item, shown faded on each row so a typo
  // like 400-for-40 stands out.
  const lastQty = useMemo(() => {
    const map = {};
    recent.forEach(c => Object.entries(c.lines || {}).forEach(([id, l]) => { if (!(id in map)) map[id] = l.qty; }));
    return map;
  }, [recent]);

  const pendingN = Object.values(drafts).filter(d => d.status === "pending").length;

  return (
    <div style={IS.root}>
      <div style={IS.nav}>
        <span style={IS.navTitle}>📦 {t.title}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {session && <span style={IS.navUser}>{t.hello(session.name)} · {t.role[session.role]}</span>}
          {session && <button style={IS.navBtn} onClick={() => { logAuth("signout", session); setSession(null); setActiveType(null); }}>🔒 {t.lock}</button>}
          <button style={IS.navBtn} onClick={() => setLang(l => (l === "es" ? "en" : "es"))}>{lang === "es" ? "🇺🇸 EN" : "🇲🇽 ES"}</button>
        </div>
      </div>
      {pendingN > 0 && result !== "sending" && <div style={IS.pendingBanner}>📡 {t.pendingBanner(pendingN)}</div>}

      {!session && <PinScreen lang={lang} onAuthed={setSession} />}
      {session && !can(session, "count") && <div style={IS.center}><div style={IS.homeTitle}>🚫 {t.noAccess}</div></div>}
      {session && can(session, "count") && !draft && <HomeScreen lang={lang} drafts={drafts} recent={recent} onPick={pickType} />}
      {session && can(session, "count") && draft && draft.status === "open" && (
        <CountScreen
          key={draft.id}
          lang={lang}
          type={activeType}
          draft={draft}
          lastQty={lastQty}
          onChangeLine={changeLine}
          onSubmit={submit}
          onBack={() => setActiveType(null)}
        />
      )}

      {result && (
        <div style={IS.overlay}>
          <div style={{ ...IS.dialog, textAlign: "center" }}>
            <div style={IS.dialogTitle}>{result === "sending" ? t.sending : result === "ok" ? t.sentOk : `💾 ${t.sentQueued}`}</div>
            {result !== "sending" && (
              <div style={IS.dialogBtns}>
                <button style={{ ...IS.dialogBtn, ...IS.dialogBtnPrimary }} onClick={() => setResult(null)}>{t.done}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const RED = "#BE202E";
const IS = {
  root: { display: "flex", flexDirection: "column", height: "100dvh", background: "#F5F3F0", color: "#1A1A1A", fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", userSelect: "none", WebkitUserSelect: "none" },
  nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "#fff", borderBottom: "1px solid #E5E0DA", flexShrink: 0 },
  navTitle: { fontSize: 20, fontWeight: 900, color: RED },
  navUser: { fontSize: 16, fontWeight: 700 },
  navBtn: { fontSize: 15, fontWeight: 700, padding: "10px 14px", minHeight: 44, borderRadius: 10, border: "1px solid #D8D2CA", background: "#fff", color: "#1A1A1A", cursor: "pointer" },
  pendingBanner: { background: "#FEF3C7", color: "#92400E", fontWeight: 700, fontSize: 15, padding: "10px 16px", textAlign: "center", flexShrink: 0 },
  center: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" },

  pinCard: { background: "#fff", borderRadius: 20, padding: "28px 24px", width: "100%", maxWidth: 360, textAlign: "center", boxShadow: "0 10px 40px rgba(0,0,0,0.08)" },
  pinTitle: { fontSize: 24, fontWeight: 900 },
  pinSub: { fontSize: 14, color: "#888", marginTop: 4 },
  pinDots: { display: "flex", justifyContent: "center", gap: 12, margin: "22px 0 8px" },
  pinDot: { width: 18, height: 18, borderRadius: "50%", background: "#E5E0DA" },
  pinDotOn: { background: RED },
  pinMsg: { fontSize: 15, fontWeight: 700, color: RED, minHeight: 22, marginBottom: 12 },

  keyGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 },
  key: { fontSize: 28, fontWeight: 800, minHeight: 64, borderRadius: 14, border: "1px solid #D8D2CA", background: "#fff", color: "#1A1A1A", cursor: "pointer", touchAction: "manipulation" },
  keyOff: { opacity: 0.4 },

  homeTitle: { fontSize: 26, fontWeight: 900, textAlign: "center", marginBottom: 20 },
  homeGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 },
  homeBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "32px 20px", minHeight: 170, borderRadius: 20, border: "2px solid #E5E0DA", background: "#fff", color: "#1A1A1A", cursor: "pointer", touchAction: "manipulation" },
  homeBtnTitle: { fontSize: 28, fontWeight: 900 },
  homeBtnSub: { fontSize: 16, color: "#888" },
  homeResume: { marginTop: 8, fontSize: 15, fontWeight: 800, color: "#92400E", background: "#FEF3C7", padding: "6px 12px", borderRadius: 999 },
  homeSent: { marginTop: 8, fontSize: 15, fontWeight: 800, color: "#15803D" },

  countRoot: { flex: 1, display: "flex", flexDirection: "column", minHeight: 0 },
  countHeader: { display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "#fff", borderBottom: "1px solid #E5E0DA", flexShrink: 0 },
  backBtn: { fontSize: 16, fontWeight: 700, padding: "0 14px", minHeight: 48, borderRadius: 10, border: "1px solid #D8D2CA", background: "#fff", color: "#1A1A1A", cursor: "pointer", whiteSpace: "nowrap" },
  progressLabel: { display: "flex", justifyContent: "space-between", gap: 8, fontSize: 15, fontWeight: 800, marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden" },
  savedLocal: { color: "#15803D", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis" },
  progressTrack: { height: 10, borderRadius: 999, background: "#E5E0DA", overflow: "hidden" },
  progressFill: { height: "100%", background: "#15803D", borderRadius: 999, transition: "width 0.2s" },
  submitBtn: { fontSize: 17, fontWeight: 900, padding: "0 18px", minHeight: 48, borderRadius: 10, border: "none", background: "#15803D", color: "#fff", cursor: "pointer", whiteSpace: "nowrap" },
  submitOff: { background: "#D8D2CA", color: "#777", cursor: "default" },

  countBody: { flex: 1, display: "flex", minHeight: 0 },
  list: { flex: 1, overflowY: "auto", padding: "0 12px 24px", minHeight: 0, WebkitOverflowScrolling: "touch" },
  groupHeader: { position: "sticky", top: 0, zIndex: 1, background: "#F5F3F0", fontSize: 13, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: "#777", padding: "14px 6px 6px" },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", minHeight: 68, padding: "10px 16px", marginBottom: 6, borderRadius: 14, border: "2px solid transparent", background: "#fff", color: "#1A1A1A", textAlign: "left", cursor: "pointer", touchAction: "manipulation" },
  rowSelected: { border: `2px solid ${RED}`, boxShadow: "0 2px 10px rgba(190,32,46,0.15)" },
  rowHigh: { background: "#FEF3C7" },
  rowMain: { display: "flex", flexDirection: "column", minWidth: 0 },
  rowName: { fontSize: 20, fontWeight: 800, lineHeight: 1.15 },
  rowMeta: { fontSize: 14, color: "#999", marginTop: 3 },
  rowQty: { fontSize: 28, fontWeight: 900, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
  rowQtyEmpty: { color: "#C9C3BB" },

  pad: { background: "#fff", display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 },
  padWide: { width: 360, padding: 16, borderLeft: "1px solid #E5E0DA", overflowY: "auto" },
  padNarrow: { padding: "10px 12px 14px", borderTop: "1px solid #E5E0DA", boxShadow: "0 -6px 20px rgba(0,0,0,0.06)" },
  padItem: { fontSize: 18, fontWeight: 800, color: RED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  padDisplay: { display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: 8, padding: "6px 14px", borderRadius: 14, background: "#F5F3F0" },
  padNumber: { fontSize: 44, fontWeight: 900, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 },
  padUnit: { fontSize: 18, fontWeight: 700, color: "#888" },
  padWarn: { fontSize: 14, fontWeight: 800, color: "#92400E", minHeight: 20 },
  quickRow: { display: "flex", gap: 10 },
  quick: { flex: 1, fontSize: 20, fontWeight: 800, minHeight: 56, borderRadius: 14, border: "1px solid #D8D2CA", background: "#F5F3F0", color: "#1A1A1A", cursor: "pointer", touchAction: "manipulation" },
  nextBtn: { background: RED, color: "#fff", border: "none" },

  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 10 },
  dialog: { background: "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 460 },
  dialogTitle: { fontSize: 22, fontWeight: 900, marginBottom: 6 },
  dialogBody: { fontSize: 16, color: "#666", marginBottom: 14 },
  dialogRow: { display: "flex", justifyContent: "space-between", gap: 12, fontSize: 17, padding: "10px 0", borderTop: "1px solid #EEE9E3" },
  dialogBtns: { display: "flex", gap: 10, marginTop: 18 },
  dialogBtn: { flex: 1, fontSize: 18, fontWeight: 800, minHeight: 56, borderRadius: 14, border: "1px solid #D8D2CA", background: "#fff", color: "#1A1A1A", cursor: "pointer" },
  dialogBtnPrimary: { background: "#15803D", color: "#fff", border: "none" },
};
