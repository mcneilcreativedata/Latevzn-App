// ============================================================================
// Latevzn — app logic
// ----------------------------------------------------------------------------
// This file draws the screens and wires everything together:
//   1. Shows the home screen (a list of the guide's sections).
//   2. Shows a placeholder screen when you tap into a section.
//   3. Turns on the "service worker" so the app can work offline.
//
// It is written in plain JavaScript and runs straight in the browser —
// there is no build step.
// ============================================================================

import { SECTIONS, getSection } from './data.js';
import { startRouter } from './router.js';
import { addResponse, listResponses } from './db.js';

// The element on the page where every screen is drawn.
const appEl = document.getElementById('app');

// ---- The one section that is wired up so far -----------------------------
// For now the section and its prompt live here as plain constants. Note that
// the address slug (`route`) and the database id (`sectionId`) are allowed to
// differ — the home screen links to `your-working-method`, but entries are
// stored under `working-method`.
const WORKING_METHOD = {
  route: 'your-working-method', // matches the id in data.js (the web address)
  sectionId: 'working-method',  // how entries are labelled in the database
  blockId: 'this-week-noticed', // which prompt within the section
  prompt: 'This week I noticed:',
};

// A tiny helper to safely show text without it being treated as HTML.
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ---- Screen: Home --------------------------------------------------------
// Draws the list of sections. Each one links to its placeholder screen.
function renderHome() {
  const items = SECTIONS.map((section) => `
    <li class="card">
      <a class="card-link" href="#/section/${section.id}">
        <span class="card-title">${escapeHtml(section.title)}</span>
        <span class="card-arrow" aria-hidden="true">›</span>
      </a>
    </li>
  `).join('');

  appEl.innerHTML = `
    <section class="screen">
      <p class="intro">Your photography reflection journal. Choose a section to begin.</p>
      <ul class="card-list">
        ${items}
      </ul>
    </section>
  `;
}

// ---- Screen: Section placeholder -----------------------------------------
// Shows the section title, its short blurb, and a clear "coming soon" note.
function renderSection(id) {
  const section = getSection(id);

  // If the address points to a section we do not know, go back home.
  if (!section) {
    window.location.hash = '#/';
    return;
  }

  // The one section that is actually built gets its real screen; the rest
  // still show the placeholder.
  if (id === WORKING_METHOD.route) {
    renderWorkingMethod(section);
    return;
  }

  appEl.innerHTML = `
    <section class="screen">
      <a class="back-link" href="#/">‹ Back</a>
      <h2 class="screen-title">${escapeHtml(section.title)}</h2>
      <p class="intro">${escapeHtml(section.blurb)}</p>
      <div class="placeholder">
        <p><strong>Coming soon.</strong></p>
        <p>This section isn't built yet — it's a placeholder for now.</p>
      </div>
    </section>
  `;
}

// ---- Screen: Your Working Method -----------------------------------------
// Shows the prompt with a writing box and a Save button, then lists past
// entries (newest first) underneath.
function renderWorkingMethod(section) {
  appEl.innerHTML = `
    <section class="screen">
      <a class="back-link" href="#/">‹ Back</a>
      <h2 class="screen-title">${escapeHtml(section.title)}</h2>

      <div class="entry-form">
        <label class="prompt-label" for="entry-text">${escapeHtml(WORKING_METHOD.prompt)}</label>
        <textarea id="entry-text" class="entry-input" rows="5"
          placeholder="Write your reflection…"></textarea>
        <button id="save-entry" class="save-button" type="button">Save</button>
      </div>

      <ul id="entries" class="entries"></ul>
    </section>
  `;

  const textarea = document.getElementById('entry-text');
  const saveButton = document.getElementById('save-entry');

  // Save the current text as a new entry, then clear the box and refresh.
  saveButton.addEventListener('click', async () => {
    const text = textarea.value.trim();
    if (!text) {
      // Nothing written — gently focus the box and do nothing else.
      textarea.focus();
      return;
    }

    saveButton.disabled = true;
    try {
      await addResponse({
        sectionId: WORKING_METHOD.sectionId,
        blockId: WORKING_METHOD.blockId,
        text,
      });
      textarea.value = '';
      await refreshEntries();
      textarea.focus();
    } finally {
      saveButton.disabled = false;
    }
  });

  // Show whatever has been saved before.
  refreshEntries();
}

// Re-draw the list of past entries (newest first).
async function refreshEntries() {
  const listEl = document.getElementById('entries');
  if (!listEl) {
    return;
  }

  const entries = await listResponses(
    WORKING_METHOD.sectionId,
    WORKING_METHOD.blockId
  );

  if (entries.length === 0) {
    listEl.innerHTML = `
      <li class="entries-empty">No entries yet. Your saved reflections will appear here.</li>
    `;
    return;
  }

  listEl.innerHTML = entries.map((entry) => `
    <li class="entry">
      <p class="entry-date">${escapeHtml(formatDate(entry.createdAt))}</p>
      <p class="entry-text">${escapeHtml(entry.text)}</p>
    </li>
  `).join('');
}

// Turn a stored timestamp into a friendly date and time.
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString();
}

// ---- Decide which screen to draw -----------------------------------------
function render(route) {
  if (route.name === 'section') {
    renderSection(route.params.id);
  } else {
    renderHome();
  }
  // Jump back to the top whenever the screen changes.
  window.scrollTo(0, 0);
}

// ---- Offline support: register the service worker ------------------------
// The service worker is a small background script that caches the app so it
// can open without an internet connection. We only register it if the
// browser supports it.
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  // Was a service worker already in charge when this page loaded? If so, a
  // later change of controller means a NEW version has taken over, and we
  // refresh once so the page starts using it. On the very first visit there is
  // no controller yet, so we skip the refresh and avoid an extra reload.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded || !hadController) {
      return;
    }
    reloaded = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    // Relative path so it works on GitHub Pages sub-folders too.
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}

// ---- Start the app -------------------------------------------------------
startRouter(render);
registerServiceWorker();
