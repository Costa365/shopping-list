'use strict';

const STORAGE_KEY = 'shopping-list:v1';
const form = document.querySelector('#add-form');
const nameInput = document.querySelector('#item-name');
const list = document.querySelector('#items');
const remaining = document.querySelector('#remaining');
const clearButton = document.querySelector('#clear-purchased');
const emptyState = document.querySelector('#empty-state');
const storageNotice = document.querySelector('#storage-notice');

function loadItems() {
  let stored;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    storageNotice.hidden = false;
    return [];
  }
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    const ids = new Set();
    return parsed.filter(item => {
      if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id) ||
          typeof item.name !== 'string' || !item.name.trim() || typeof item.purchased !== 'boolean') return false;
      ids.add(item.id);
      return true;
    });
  } catch {
    return [];
  }
}

let items = loadItems();

function saveItems() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    storageNotice.hidden = true;
  } catch {
    storageNotice.hidden = false;
  }
}

function updateSummary() {
  const count = items.filter(item => !item.purchased).length;
  remaining.textContent = `${count} ${count === 1 ? 'item' : 'items'} left`;
  clearButton.disabled = !items.some(item => item.purchased);
  emptyState.hidden = items.length > 0;
}

function render() {
  list.replaceChildren();
  for (const item of items) {
    const row = document.createElement('li');
    const label = document.createElement('label');
    label.className = `item-label${item.purchased ? ' purchased' : ''}`;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.purchased;
    const name = document.createElement('span');
    name.textContent = item.name;
    checkbox.addEventListener('change', () => {
      item.purchased = checkbox.checked;
      label.classList.toggle('purchased', item.purchased);
      saveItems();
      updateSummary();
    });
    label.append(checkbox, name);
    row.append(label);
    list.append(row);
  }
  updateSummary();
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return;
  items.push({ id: crypto.randomUUID(), name, purchased: false });
  saveItems();
  render();
  nameInput.value = '';
  nameInput.focus();
});

clearButton.addEventListener('click', () => {
  items = items.filter(item => !item.purchased);
  saveItems();
  render();
  nameInput.focus();
});

render();
