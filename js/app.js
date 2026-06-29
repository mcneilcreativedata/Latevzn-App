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

// The element on the page where every screen is drawn.
const appEl = document.getElementById('app');

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
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Relative path so it works on GitHub Pages sub-folders too.
      navigator.serviceWorker.register('./sw.js').catch((error) => {
        console.warn('Service worker registration failed:', error);
      });
    });
  }
}

// ---- Start the app -------------------------------------------------------
startRouter(render);
registerServiceWorker();
