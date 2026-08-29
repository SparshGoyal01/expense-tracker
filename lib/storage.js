// All reading and writing of expense data. Everything lives in one Firestore
// database so both phones see the same thing, updating live.
//
//   expenses/{id}        one document per expense
//   meta/categories      { list: [ {name, color}, ... ] }  custom categories

import {
  collection, doc, query, where,
  onSnapshot, getDocs, setDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase.js';

const expensesCol = collection(db, 'expenses');
const categoriesDoc = doc(db, 'meta', 'categories');

// Live subscription to one month. cb(list) fires immediately with cached data,
// then again every time anything changes on either device. Returns an
// unsubscribe function.
export function subscribeMonth(monthKey, cb) {
  const q = query(expensesCol, where('month', '==', monthKey));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data())),
    (err) => console.error('subscribeMonth failed:', err),
  );
}

// One-off read of a month (used for the 6-month trend chart).
export async function getMonthOnce(monthKey) {
  const snap = await getDocs(query(expensesCol, where('month', '==', monthKey)));
  return snap.docs.map((d) => d.data());
}

// Add a new expense or overwrite an existing one (same id = edit).
export function saveExpense(entry) {
  return setDoc(doc(expensesCol, entry.id), entry);
}

export function removeExpense(id) {
  return deleteDoc(doc(expensesCol, id));
}

// Live subscription to the custom category list.
export function subscribeCategories(cb) {
  return onSnapshot(
    categoriesDoc,
    (d) => cb(d.exists() && Array.isArray(d.data().list) ? d.data().list : []),
    (err) => console.error('subscribeCategories failed:', err),
  );
}

export function saveCategories(list) {
  return setDoc(categoriesDoc, { list });
}
