import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  PlusCircle, ScrollText, PieChart as PieChartIcon,
  ChevronLeft, ChevronRight, Pencil, Trash2, Check, Plus, X,
  ShoppingBasket, UtensilsCrossed, Car, Receipt, Clapperboard,
  Sparkles, Package, Plane, Shapes, Tag, LogOut, Download,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

import {
  subscribeMonth, subscribeRecent, getMonthOnce, saveExpense, removeExpense,
  subscribeCategories, saveCategories,
} from './lib/storage.js';
import { onAuthChange, signIn, signOutUser, isAllowed } from './lib/auth.js';

const COLORS = {
  bg: '#14191C',
  surface: '#1B2124',
  surface2: '#20272A',
  border: '#2A3236',
  text: '#EDE7DA',
  textDim: '#9BA3A0',
  textFaint: '#6B7375',
  accent: '#C2883A',
  positive: '#5FA091',
  negative: '#D4674A',
};

const CATEGORIES = [
  { name: 'Groceries', color: '#8FB55C' },
  { name: 'Dineout/ Food order', color: '#E0703C' },
  { name: 'Cab & Petrol', color: '#5B8FC9' },
  { name: 'Bills', color: '#7A6BC7' },
  { name: 'Entertainment', color: '#C769A6' },
  { name: 'Self Care', color: '#D9836F' },
  { name: 'Other essentials', color: '#4FA895' },
  { name: 'Travel', color: '#D6C24A' },
  { name: 'Misc', color: '#9B9384' },
];
const ICON_MAP = {
  'Groceries': ShoppingBasket,
  'Dineout/ Food order': UtensilsCrossed,
  'Cab & Petrol': Car,
  'Bills': Receipt,
  'Entertainment': Clapperboard,
  'Self Care': Sparkles,
  'Other essentials': Package,
  'Travel': Plane,
  'Misc': Shapes,
};
const EXTRA_COLORS = ['#7FA8D9', '#B08BC7', '#6FBF8B', '#D98F5F', '#5FA8A3', '#C2A65C'];
const PEOPLE = ['Sparsh', 'Ishita'];

// Whoever is signed in is the default "spent by" person.
const PERSON_BY_EMAIL = {
  'sparshgoyal20@gmail.com': 'Sparsh',
  'ishitahinger03@gmail.com': 'Ishita',
};
function personForEmail(email) {
  return PERSON_BY_EMAIL[(email || '').toLowerCase()] || 'Sparsh';
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function monthKeyOf(dateStr) { return dateStr.slice(0, 7); }
function monthLabel(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}
function monthShort(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
}
function addMonths(monthKey, delta) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function fmtDateLabel(dateStr) {
  const [y, m, day] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtINR(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function fmtAdded(iso) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (sameDay(d, now)) return `Today, ${time}`;
  if (sameDay(d, yesterday)) return `Yesterday, ${time}`;
  return `${d.getDate()} ${d.toLocaleDateString('en-IN', { month: 'short' })}, ${time}`;
}

function csvCell(v) {
  const s = String(v == null ? '' : v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function downloadMonthCsv(monthKey, list) {
  const sorted = [...list].sort((a, b) =>
    a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const rows = [['Date', 'Description', 'Category', 'Person', 'Amount (INR)']];
  sorted.forEach((e) => rows.push([e.date, e.description, e.category, e.person, Math.round(e.amount)]));
  rows.push(['', '', '', 'Total', Math.round(sorted.reduce((s, e) => s + e.amount, 0))]);
  const body = rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' }); // BOM: Excel opens rupee sign correctly
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kharcha-${monthKey}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ── Sign-in gate screens ────────────────────────────────────────────────────
const gateWrap = {
  minHeight: '100vh', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', textAlign: 'center',
  background: COLORS.bg, color: COLORS.text, padding: '32px 28px',
  fontFamily: "'Inter', system-ui, sans-serif",
};

function GateShell({ children }) {
  return (
    <div style={gateWrap}>
      <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: 'italic', fontWeight: 600, fontSize: 30, marginBottom: 6 }}>
        Kharcha Update
      </div>
      <div style={{ fontSize: 12.5, color: COLORS.textDim, marginBottom: 28, letterSpacing: '0.02em' }}>
        Sparsh &amp; Ishita's shared ledger
      </div>
      {children}
    </div>
  );
}

function LoadingScreen() {
  return <GateShell><div style={{ color: COLORS.textFaint, fontSize: 13.5 }}>Loading…</div></GateShell>;
}

function SignInScreen() {
  return (
    <GateShell>
      <button
        onClick={signIn}
        style={{
          background: COLORS.accent, color: COLORS.bg, border: 'none',
          padding: '14px 26px', borderRadius: 14, fontSize: 15, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Sign in with Google
      </button>
      <div style={{ fontSize: 12, color: COLORS.textFaint, marginTop: 18, maxWidth: 260, lineHeight: 1.5 }}>
        Only the two of us can get in. Use the Google account you set up in the tracker.
      </div>
    </GateShell>
  );
}

function BlockedScreen({ email }) {
  return (
    <GateShell>
      <div style={{ fontSize: 14, color: COLORS.negative, fontWeight: 600, marginBottom: 8 }}>
        This account can't use the tracker
      </div>
      <div style={{ fontSize: 12.5, color: COLORS.textDim, maxWidth: 280, lineHeight: 1.5 }}>
        You're signed in as <b>{email}</b>. Ask Sparsh to add this address, or sign in with the right account.
      </div>
      <button
        onClick={signOutUser}
        style={{
          marginTop: 22, background: COLORS.surface, color: COLORS.text,
          border: `1px solid ${COLORS.border}`, padding: '10px 20px', borderRadius: 12,
          fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Sign out
      </button>
    </GateShell>
  );
}

// ── Main app ────────────────────────────────────────────────────────────────
function App() {
  const [user, setUser] = useState(undefined); // undefined = still checking

  const [view, setView] = useState('add');
  const [currentMonth, setCurrentMonth] = useState(monthKeyOf(todayStr()));
  const [expenses, setExpenses] = useState([]);
  const [recent, setRecent] = useState([]); // latest 5 across all months, for the Add screen
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState(null);
  const [person, setPerson] = useState('Sparsh');
  const [date, setDate] = useState(todayStr());
  const [editingId, setEditingId] = useState(null);

  const [personFilter, setPersonFilter] = useState('All');
  const [trend, setTrend] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);

  const [customCategories, setCustomCategories] = useState([]);
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => onAuthChange(setUser), []);

  const signedIn = user && isAllowed(user.email);

  // Default the "spent by" toggle to whoever is signed in on this device.
  useEffect(() => {
    if (user?.email) setPerson(personForEmail(user.email));
  }, [user?.email]);

  // Publish the bottom bar's real height as --nav-h so the Save button, toast and
  // page padding line up with it on every device (notches, big fonts, rotation).
  const navRef = useRef(null);
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty('--nav-h', `${el.offsetHeight}px`);
    set();
    window.addEventListener('resize', set);
    window.addEventListener('orientationchange', set);
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(set);
      // border-box so padding changes (e.g. the home-indicator inset when rotating) count too
      try { ro.observe(el, { box: 'border-box' }); } catch (e) { ro.observe(el); }
    }
    return () => {
      window.removeEventListener('resize', set);
      window.removeEventListener('orientationchange', set);
      if (ro) ro.disconnect();
    };
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    return subscribeCategories(setCustomCategories);
  }, [signedIn]);

  // "Recently added" is always the 5 newest entries overall, whatever month
  // the Ledger happens to be showing.
  useEffect(() => {
    if (!signedIn) return;
    return subscribeRecent(5, setRecent);
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    setLoading(true);
    let first = true;
    const unsub = subscribeMonth(currentMonth, (list) => {
      setExpenses(list);
      if (first) { setLoading(false); first = false; }
    });
    return unsub;
  }, [signedIn, currentMonth]);

  useEffect(() => {
    if (!signedIn || view !== 'insights') return;
    let cancelled = false;
    setTrendLoading(true);
    (async () => {
      const months = [];
      for (let i = 5; i >= 0; i--) months.push(addMonths(currentMonth, -i));
      const results = await Promise.all(months.map(async (mk) => {
        const list = mk === currentMonth ? expenses : await getMonthOnce(mk);
        return { month: mk, total: list.reduce((s, e) => s + e.amount, 0) };
      }));
      if (!cancelled) { setTrend(results); setTrendLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [signedIn, view, currentMonth, expenses]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }
  function resetForm() {
    setAmount(''); setDesc(''); setCategory(null);
    setPerson(personForEmail(user && user.email)); setDate(todayStr()); setEditingId(null);
  }
  async function handleSave() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !category) return;
    const monthKey = monthKeyOf(date);
    const entry = {
      id: editingId || uid(),
      amount: amt,
      description: desc.trim() || category,
      category, person, date,
      month: monthKey,
      // An entry being edited may come from the Ledger month OR from "Recently
      // added" (any month) - keep its original createdAt either way.
      createdAt: editingId
        ? ([...expenses, ...recent].find((e) => e.id === editingId)?.createdAt || new Date().toISOString())
        : new Date().toISOString(),
    };
    try {
      await saveExpense(entry);
    } catch (e) {
      showToast('Could not save — check connection');
      return;
    }
    if (editingId) showToast('Updated');
    else if (monthKey === currentMonth) showToast(`Saved ${fmtINR(amt)} to ${category}`);
    else showToast(`Saved ${fmtINR(amt)} to ${monthLabel(monthKey)}`);
    resetForm();
  }
  async function handleDelete(id) {
    try {
      await removeExpense(id);
    } catch (e) {
      showToast('Could not delete — check connection');
      return;
    }
    if (editingId === id) resetForm();
  }
  function startEdit(e) {
    setEditingId(e.id);
    setAmount(String(e.amount));
    setDesc(e.description);
    setCategory(e.category);
    setPerson(e.person);
    setDate(e.date);
    setView('add');
  }
  async function confirmAddCategory() {
    const name = newCatName.trim();
    if (!name) { setShowNewCatInput(false); return; }
    const existing = allCategories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setCategory(existing.name);
    } else {
      const color = EXTRA_COLORS[customCategories.length % EXTRA_COLORS.length];
      const updated = [...customCategories, { name, color }];
      setCustomCategories(updated);
      try { await saveCategories(updated); } catch (e) { showToast('Could not save category'); }
      setCategory(name);
    }
    setShowNewCatInput(false);
    setNewCatName('');
  }

  const allCategories = [...CATEGORIES, ...customCategories];
  const CAT_COLOR_MAP = Object.fromEntries(allCategories.map((c) => [c.name, c.color]));

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const filteredExpenses = personFilter === 'All' ? expenses : expenses.filter((e) => e.person === personFilter);
  const byDate = {};
  [...filteredExpenses]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .forEach((e) => { (byDate[e.date] = byDate[e.date] || []).push(e); });

  const categoryTotals = allCategories
    .map((c) => ({ name: c.name, color: c.color, value: expenses.filter((e) => e.category === c.name).reduce((s, e) => s + e.amount, 0) }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const topExpenses = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const isCurrentOrFutureMonth = currentMonth >= monthKeyOf(todayStr());

  const css = `
    .exp-app, .exp-app * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    .exp-app {
      min-height: 100vh;
      min-height: 100dvh;
      background: ${COLORS.bg};
      color: ${COLORS.text};
      font-family: 'Inter', system-ui, sans-serif;
      display: flex; flex-direction: column;
    }
    .exp-app button { font: inherit; border: none; background: none; cursor: pointer; color: inherit; touch-action: manipulation; }
    /* Inputs have a built-in minimum width (~20 characters) that can be wider than a phone.
       min-width:0 + max-width:100% lets every input shrink to whatever room it is given. */
    .exp-app input { font: inherit; min-width: 0; max-width: 100%; }
    /* --nav-h is the real height of the bottom bar, measured at runtime. */
    .exp-shell { max-width: 460px; margin: 0 auto; width: 100%; min-width: 0; flex: 1; display: flex; flex-direction: column; padding-bottom: calc(var(--nav-h, 72px) + 28px); padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right); }
    .exp-header { padding: 22px 20px 10px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .exp-header > div:first-child { min-width: 0; }
    .exp-title { font-family: 'Fraunces', serif; font-style: italic; font-weight: 600; font-size: 28px; letter-spacing: -0.01em; }
    .exp-subtitle { font-size: 12.5px; color: ${COLORS.textDim}; margin-top: 3px; letter-spacing: 0.02em; }
    .exp-signout { display: flex; align-items: center; gap: 4px; font-size: 11px; color: ${COLORS.textFaint}; padding: 4px 2px; flex-shrink: 0; }
    .exp-monthnav { display: flex; align-items: center; justify-content: space-between; padding: 6px 20px 16px; }
    .exp-monthnav .navbtn { background: ${COLORS.surface}; border: 1px solid ${COLORS.border}; width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: ${COLORS.textDim}; }
    .exp-monthnav .label { font-family: 'Fraunces', serif; font-size: 17px; font-weight: 600; }
    .exp-total-card { margin: 0 20px 16px; background: ${COLORS.surface}; border: 1px solid ${COLORS.border}; border-radius: 16px; padding: 18px 20px; position: relative; overflow: hidden; }
    .exp-total-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: repeating-linear-gradient(90deg, ${COLORS.border} 0 6px, transparent 6px 12px); }
    .exp-total-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: ${COLORS.textFaint}; }
    .exp-total-amount { font-family: 'IBM Plex Mono', monospace; font-size: clamp(26px, 8.5vw, 32px); font-weight: 600; margin-top: 4px; font-variant-numeric: tabular-nums; }
    .exp-total-delta { font-size: 12.5px; margin-top: 5px; font-weight: 500; }
    .exp-amount-field { margin: 8px 20px 4px; display: flex; align-items: center; background: ${COLORS.surface}; border: 1px solid ${COLORS.border}; border-radius: 16px; padding: 16px 20px; }
    .exp-amount-field .rupee { font-family: 'IBM Plex Mono', monospace; font-size: clamp(22px, 7vw, 26px); color: ${COLORS.textFaint}; margin-right: 6px; flex-shrink: 0; }
    .exp-amount-field input { flex: 1 1 0; width: 100%; min-width: 0; background: transparent; border: none; outline: none; font-family: 'IBM Plex Mono', monospace; font-size: clamp(26px, 8.5vw, 32px); color: ${COLORS.text}; font-variant-numeric: tabular-nums; }
    .exp-amount-field input::-webkit-outer-spin-button, .exp-amount-field input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .exp-field { margin: 12px 20px; }
    .exp-field label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: ${COLORS.textFaint}; margin-bottom: 6px; }
    /* 16px minimum: iPhone Safari zooms the whole page when focusing a smaller input. */
    .exp-field input[type=text], .exp-field input[type=date] { display: block; width: 100%; min-width: 0; max-width: 100%; min-height: 46px; background: ${COLORS.surface}; border: 1px solid ${COLORS.border}; border-radius: 12px; padding: 12px 14px; color: ${COLORS.text}; font-size: 16px; color-scheme: dark; -webkit-appearance: none; appearance: none; }
    .exp-field input[type=date]::-webkit-date-and-time-value { text-align: left; min-height: 1.2em; }
    .exp-cat-grid2 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 4px 20px 4px; }
    .exp-cat-card { min-width: 0; position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 4px 9px; border-radius: 14px; border: 1.5px solid ${COLORS.border}; background: ${COLORS.surface}; transition: all .12s; }
    .exp-cat-card .icon-wrap { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: ${COLORS.surface2}; color: ${COLORS.textDim}; }
    .exp-cat-card .lbl { max-width: 100%; font-size: 10.5px; text-align: center; line-height: 1.2; color: ${COLORS.textDim}; overflow-wrap: anywhere; }
    .exp-cat-card.active { border-color: var(--cc); background: var(--ccs); }
    .exp-cat-card.active .icon-wrap { background: var(--cc); color: ${COLORS.bg}; }
    .exp-cat-card.active .lbl { color: ${COLORS.text}; font-weight: 600; }
    .exp-cat-card.add-new { border-style: dashed; }
    .exp-cat-card .check { position: absolute; top: 6px; right: 6px; width: 15px; height: 15px; border-radius: 50%; background: var(--cc); display: flex; align-items: center; justify-content: center; }
    .exp-newcat-row { display: flex; align-items: center; gap: 6px; margin: 4px 20px 4px; background: ${COLORS.surface}; border: 1px dashed ${COLORS.border}; border-radius: 12px; padding: 8px 10px; }
    .exp-newcat-row input { flex: 1 1 0; min-width: 0; background: transparent; border: none; outline: none; color: ${COLORS.text}; font-size: 16px; }
    .exp-newcat-row .confirm { color: ${COLORS.accent}; padding: 4px; }
    .exp-newcat-row .cancel { color: ${COLORS.textFaint}; padding: 4px; }
    .exp-recent-card { margin: 0 20px 10px; background: ${COLORS.surface}; border: 1px solid ${COLORS.border}; border-radius: 14px; padding: 12px 14px; }
    .exp-recent-card .top-row { display: flex; align-items: center; gap: 8px; }
    .exp-recent-card .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .exp-recent-card .desc { flex: 1; min-width: 0; font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .exp-recent-card .amt { flex-shrink: 0; font-family: 'IBM Plex Mono', monospace; font-size: 14.5px; font-variant-numeric: tabular-nums; }
    .exp-recent-card .meta-row { display: flex; align-items: center; justify-content: space-between; margin-top: 7px; gap: 8px; }
    .exp-recent-card .meta { flex: 1; min-width: 0; font-size: 11px; color: ${COLORS.textFaint}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .exp-recent-card .actions { display: flex; gap: 8px; flex-shrink: 0; }
    .exp-recent-card .iconbtn { color: ${COLORS.textFaint}; }
    .exp-segment { display: flex; margin: 14px 20px; background: ${COLORS.surface}; border: 1px solid ${COLORS.border}; border-radius: 12px; padding: 3px; }
    .exp-segment button { flex: 1; padding: 9px; border-radius: 9px; font-size: 13.5px; color: ${COLORS.textDim}; font-weight: 500; }
    .exp-segment button.active { background: ${COLORS.accent}; color: ${COLORS.bg}; font-weight: 700; }
    .exp-app .exp-save-btn { position: sticky; bottom: calc(var(--nav-h, 72px) + 10px); z-index: 20; margin: 20px 20px 4px; padding: 17px; border-radius: 16px; background: ${COLORS.accent}; color: ${COLORS.bg}; font-weight: 800; font-size: 16px; letter-spacing: 0.01em; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 12px 28px -6px rgba(194, 136, 58, 0.5), 0 3px 10px rgba(0, 0, 0, 0.45); }
    .exp-app .exp-save-btn:active { transform: translateY(1px); }
    .exp-app .exp-save-btn.disabled { background: ${COLORS.surface2}; color: ${COLORS.textFaint}; border: 1px solid ${COLORS.border}; box-shadow: none; cursor: default; }
    .exp-save-hint { text-align: center; font-size: 11.5px; color: ${COLORS.textFaint}; margin: 6px 20px 0; }
    .exp-delete-link { display: block; margin: 12px auto 4px; font-size: 12.5px; color: ${COLORS.textFaint}; text-decoration: underline; }
    .exp-section-title { font-family: 'Fraunces', serif; font-size: 12.5px; color: ${COLORS.textFaint}; padding: 16px 20px 6px; text-transform: uppercase; letter-spacing: 0.08em; }
    .exp-row { display: flex; align-items: center; padding: 10px 20px; gap: 8px; }
    .exp-row .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .exp-row .desc { min-width: 0; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 42%; }
    .exp-row .leader { flex: 1; border-bottom: 1.5px dotted ${COLORS.border}; margin: 0 4px; position: relative; top: -3px; min-width: 10px; }
    .exp-row .amt { flex-shrink: 0; font-family: 'IBM Plex Mono', monospace; font-size: 14px; font-variant-numeric: tabular-nums; }
    .exp-row .person-badge { font-size: 9.5px; width: 18px; height: 18px; border-radius: 50%; background: ${COLORS.surface2}; border: 1px solid ${COLORS.border}; display: flex; align-items: center; justify-content: center; color: ${COLORS.textDim}; flex-shrink: 0; }
    .exp-row .iconbtn { color: ${COLORS.textFaint}; padding: 2px; flex-shrink: 0; }
    .exp-filter-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; padding: 0 20px 14px; }
    .exp-filter-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .exp-app .exp-csv-btn { display: flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 99px; border: 1px solid ${COLORS.border}; font-size: 12px; color: ${COLORS.textDim}; flex-shrink: 0; }
    .exp-app .exp-csv-btn:active { background: ${COLORS.surface2}; }
    .exp-filter-chip { padding: 6px 14px; border-radius: 99px; border: 1px solid ${COLORS.border}; font-size: 12.5px; color: ${COLORS.textDim}; }
    .exp-filter-chip.active { background: ${COLORS.accent}; color: ${COLORS.bg}; border-color: ${COLORS.accent}; font-weight: 600; }
    .exp-empty { text-align: center; padding: 44px 24px; color: ${COLORS.textFaint}; font-size: 13.5px; }
    .exp-donut-wrap { position: relative; padding: 4px 20px 0; }
    .exp-donut-center { position: absolute; inset: 0; top: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; }
    .exp-donut-center .amt { font-family: 'IBM Plex Mono', monospace; font-size: 19px; font-weight: 700; }
    .exp-donut-center .lbl { font-size: 10px; color: ${COLORS.textFaint}; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }
    .exp-legend { padding: 2px 20px 0; }
    .exp-legend-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid ${COLORS.border}; }
    .exp-legend-row:last-child { border-bottom: none; }
    .exp-legend-row .dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
    .exp-legend-row .name { flex: 1; font-size: 13.5px; }
    .exp-legend-row .pct { font-size: 11.5px; color: ${COLORS.textFaint}; width: 36px; text-align: right; }
    .exp-legend-row .amt { font-family: 'IBM Plex Mono', monospace; font-size: 13.5px; width: 78px; text-align: right; font-variant-numeric: tabular-nums; }
    .exp-nav { position: fixed; bottom: 0; left: 0; right: 0; background: ${COLORS.surface}; border-top: 1px solid ${COLORS.border}; display: flex; max-width: 460px; margin: 0 auto; padding-bottom: env(safe-area-inset-bottom); padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right); }
    .exp-nav button { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 11px 0 16px; color: ${COLORS.textFaint}; font-size: 10.5px; }
    .exp-nav button.active { color: ${COLORS.accent}; }
    .exp-toast { position: fixed; bottom: calc(var(--nav-h, 72px) + 24px); left: 50%; transform: translateX(-50%); width: max-content; max-width: calc(100vw - 32px); text-align: center; line-height: 1.35; background: ${COLORS.text}; color: ${COLORS.bg}; padding: 10px 18px; border-radius: 22px; font-size: 13px; font-weight: 600; z-index: 50; }
    /* Landscape phones: not enough height to pin a big button above the bottom bar. */
    @media (max-height: 520px) { .exp-app .exp-save-btn { position: static; } }
  `;

  if (user === undefined) return <LoadingScreen />;
  if (user === null) return <SignInScreen />;
  if (!isAllowed(user.email)) return <BlockedScreen email={user.email} />;

  return (
    <div className="exp-app">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;1,600&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');`}</style>
      <style>{css}</style>

      <div className="exp-shell">
        <div className="exp-header">
          <div>
            <div className="exp-title">Kharcha Update</div>
            <div className="exp-subtitle">Sparsh &amp; Ishita's shared ledger</div>
          </div>
          <button className="exp-signout" onClick={signOutUser} title={`Signed in as ${user.email}`}>
            <LogOut size={12} /> Sign out
          </button>
        </div>

        {view === 'add' && (
          <>
            <div className="exp-amount-field">
              <span className="rupee">₹</span>
              <input type="number" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>

            <div className="exp-field">
              <label>What was it for?</label>
              <input type="text" placeholder="e.g. Big Bazaar run" value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>

            <div className="exp-field" style={{ marginBottom: 0 }}><label>Category</label></div>
            <div className="exp-cat-grid2">
              {allCategories.map((c) => {
                const Icon = ICON_MAP[c.name] || Tag;
                const active = category === c.name;
                return (
                  <button
                    key={c.name}
                    className={`exp-cat-card ${active ? 'active' : ''}`}
                    style={{ '--cc': c.color, '--ccs': c.color + '22' }}
                    onClick={() => setCategory(c.name)}
                  >
                    {active && <span className="check"><Check size={9} color={COLORS.bg} /></span>}
                    <span className="icon-wrap"><Icon size={17} /></span>
                    <span className="lbl">{c.name}</span>
                  </button>
                );
              })}
              <button className="exp-cat-card add-new" onClick={() => setShowNewCatInput((v) => !v)}>
                <span className="icon-wrap"><Plus size={17} /></span>
                <span className="lbl">New</span>
              </button>
            </div>

            {showNewCatInput && (
              <div className="exp-newcat-row">
                <input
                  type="text"
                  placeholder="New category name"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmAddCategory(); }}
                />
                <button className="confirm" onClick={confirmAddCategory}><Check size={16} /></button>
                <button className="cancel" onClick={() => { setShowNewCatInput(false); setNewCatName(''); }}><X size={16} /></button>
              </div>
            )}

            <div className="exp-segment">
              {PEOPLE.map((p) => (
                <button key={p} className={person === p ? 'active' : ''} onClick={() => setPerson(p)}>{p}</button>
              ))}
            </div>

            <div className="exp-field">
              <label>Date</label>
              <input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
            </div>

            <button className={`exp-save-btn ${(!amount || !category) ? 'disabled' : ''}`} disabled={!amount || !category} onClick={handleSave}>
              <Check size={20} />
              {editingId
                ? 'Update entry'
                : (amount && category ? `Save ${fmtINR(parseFloat(amount) || 0)}` : 'Save entry')}
            </button>
            {!editingId && (!amount || !category) && (
              <div className="exp-save-hint">
                {!amount && !category
                  ? 'Enter an amount and choose a category to save'
                  : !amount ? 'Enter an amount to save' : 'Choose a category to save'}
              </div>
            )}
            {editingId && (
              <button className="exp-delete-link" onClick={() => handleDelete(editingId)}>Delete this entry</button>
            )}

            {!editingId && recent.length > 0 && (
              <>
                <div className="exp-section-title">Recently added</div>
                {recent.map((e) => (
                  <div key={e.id} className="exp-recent-card">
                    <div className="top-row">
                      <span className="dot" style={{ background: CAT_COLOR_MAP[e.category] }} />
                      <span className="desc">{e.description}</span>
                      <span className="amt">{fmtINR(e.amount)}</span>
                    </div>
                    <div className="meta-row">
                      <span className="meta">{e.category} · {e.person} · Added {fmtAdded(e.createdAt)}</span>
                      <span className="actions">
                        <button className="iconbtn" onClick={() => startEdit(e)}><Pencil size={13} /></button>
                        <button className="iconbtn" onClick={() => handleDelete(e.id)}><Trash2 size={13} /></button>
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {view === 'ledger' && (
          <>
            <div className="exp-monthnav">
              <button className="navbtn" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}><ChevronLeft size={18} /></button>
              <span className="label">{monthLabel(currentMonth)}</span>
              <button className="navbtn" style={{ opacity: isCurrentOrFutureMonth ? 0.35 : 1 }} disabled={isCurrentOrFutureMonth} onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight size={18} /></button>
            </div>
            <div className="exp-total-card">
              <div className="exp-total-label">Total spent</div>
              <div className="exp-total-amount">{loading ? '—' : fmtINR(total)}</div>
            </div>
            <div className="exp-filter-row">
              <div className="exp-filter-chips">
                {['All', ...PEOPLE].map((p) => (
                  <button key={p} className={`exp-filter-chip ${personFilter === p ? 'active' : ''}`} onClick={() => setPersonFilter(p)}>{p}</button>
                ))}
              </div>
              {!loading && expenses.length > 0 && (
                <button className="exp-csv-btn" onClick={() => downloadMonthCsv(currentMonth, expenses)}>
                  <Download size={13} /> CSV
                </button>
              )}
            </div>

            {loading ? (
              <div className="exp-empty">Loading…</div>
            ) : Object.keys(byDate).length === 0 ? (
              <div className="exp-empty">No expenses logged for {monthLabel(currentMonth)} yet.</div>
            ) : (
              Object.entries(byDate).map(([d, items]) => (
                <div key={d}>
                  <div className="exp-section-title">{fmtDateLabel(d)}</div>
                  {items.map((e) => (
                    <div key={e.id} className="exp-row">
                      <span className="dot" style={{ background: CAT_COLOR_MAP[e.category] }} />
                      <span className="desc">{e.description}</span>
                      <span className="leader" />
                      <span className="amt">{fmtINR(e.amount)}</span>
                      <span className="person-badge">{e.person[0]}</span>
                      <button className="iconbtn" onClick={() => startEdit(e)}><Pencil size={14} /></button>
                      <button className="iconbtn" onClick={() => handleDelete(e.id)}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </>
        )}

        {view === 'insights' && (
          <>
            <div className="exp-monthnav">
              <button className="navbtn" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}><ChevronLeft size={18} /></button>
              <span className="label">{monthLabel(currentMonth)}</span>
              <button className="navbtn" style={{ opacity: isCurrentOrFutureMonth ? 0.35 : 1 }} disabled={isCurrentOrFutureMonth} onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight size={18} /></button>
            </div>
            <div className="exp-total-card">
              <div className="exp-total-label">Total spent</div>
              <div className="exp-total-amount">{loading ? '—' : fmtINR(total)}</div>
              {trend && trend.length >= 2 && trend[trend.length - 2].total > 0 && !loading && (() => {
                const prior = trend[trend.length - 2].total;
                const delta = ((total - prior) / prior) * 100;
                return (
                  <div className="exp-total-delta" style={{ color: delta >= 0 ? COLORS.negative : COLORS.positive }}>
                    {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}% vs {monthLabel(trend[trend.length - 2].month)}
                  </div>
                );
              })()}
            </div>

            {loading ? (
              <div className="exp-empty">Loading…</div>
            ) : categoryTotals.length === 0 ? (
              <div className="exp-empty">Nothing logged yet for {monthLabel(currentMonth)}.</div>
            ) : (
              <>
                <div className="exp-donut-wrap">
                  <ResponsiveContainer width="100%" height={210}>
                    <PieChart>
                      <Pie data={categoryTotals} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={2} strokeWidth={0}>
                        {categoryTotals.map((c, i) => <Cell key={i} fill={c.color} />)}
                      </Pie>
                      <Tooltip
                        formatter={(v) => fmtINR(v)}
                        contentStyle={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: COLORS.text }}
                        itemStyle={{ color: COLORS.text }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="exp-donut-center">
                    <div className="amt">{fmtINR(total)}</div>
                    <div className="lbl">Total</div>
                  </div>
                </div>

                <div className="exp-section-title">By category</div>
                <div className="exp-legend">
                  {categoryTotals.map((c) => (
                    <div key={c.name} className="exp-legend-row">
                      <span className="dot" style={{ background: c.color }} />
                      <span className="name">{c.name}</span>
                      <span className="pct">{Math.round((c.value / total) * 100)}%</span>
                      <span className="amt">{fmtINR(c.value)}</span>
                    </div>
                  ))}
                </div>

                <div className="exp-section-title">Top expenses</div>
                {topExpenses.map((e) => (
                  <div key={e.id} className="exp-row">
                    <span className="dot" style={{ background: CAT_COLOR_MAP[e.category] }} />
                    <span className="desc">{e.description}</span>
                    <span className="leader" />
                    <span className="amt">{fmtINR(e.amount)}</span>
                    <span className="person-badge">{e.person[0]}</span>
                  </div>
                ))}

                <div className="exp-section-title">6-month trend</div>
                <div style={{ padding: '4px 8px 20px' }}>
                  {trendLoading || !trend ? (
                    <div className="exp-empty">Loading…</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={trend} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke={COLORS.border} strokeDasharray="3 3" />
                        <XAxis dataKey="month" tickFormatter={monthShort} tick={{ fill: COLORS.textFaint, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip
                          formatter={(v) => fmtINR(v)}
                          labelFormatter={(m) => monthLabel(m)}
                          contentStyle={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: COLORS.text }}
                          itemStyle={{ color: COLORS.text }}
                        />
                        <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                          {trend.map((t, i) => <Cell key={i} fill={t.month === currentMonth ? COLORS.accent : COLORS.border} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="exp-nav" ref={navRef}>
        <button className={view === 'add' ? 'active' : ''} onClick={() => { setView('add'); if (!editingId) resetForm(); }}>
          <PlusCircle size={20} /> Add
        </button>
        <button className={view === 'ledger' ? 'active' : ''} onClick={() => setView('ledger')}>
          <ScrollText size={20} /> Ledger
        </button>
        <button className={view === 'insights' ? 'active' : ''} onClick={() => setView('insights')}>
          <PieChartIcon size={20} /> Insights
        </button>
      </div>

      {toast && <div className="exp-toast">{toast}</div>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
