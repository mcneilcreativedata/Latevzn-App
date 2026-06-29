// ============================================================================
// Latevzn — on-device database
// ----------------------------------------------------------------------------
// All of your writing is stored on THIS device only — there is no server.
// We use the browser's built-in database (IndexedDB) through a small, friendly
// library called Dexie. Dexie is loaded from a local file in index.html
// (vendor/dexie.min.js), so it keeps working with no internet connection.
//
// This file sets up one table, "responses", and gives the rest of the app two
// simple jobs: save a new entry, and list past entries.
// ============================================================================

// Dexie is loaded as a normal <script> before this module runs, so it is
// available as a global. We read it from the window here.
const Dexie = window.Dexie;

// Create (or open) a database named "latevzn".
const db = new Dexie('latevzn');

// Describe the shape of the data. The string lists the fields we can search by:
//   ++id        an automatic, ever-increasing id (the row's unique number)
//   sectionId   which section the entry belongs to
//   blockId     which prompt within the section
//   createdAt   when it was saved (a timestamp)
// The entry's "text" is also stored on each row; it just isn't listed here
// because we never need to search by it.
db.version(1).stores({
  responses: '++id, sectionId, blockId, createdAt',
});

// Save a brand-new entry. This is "append-only": every call adds a new row and
// nothing that was saved before is ever changed or removed.
export async function addResponse({ sectionId, blockId, text }) {
  return db.responses.add({
    sectionId,
    blockId,
    text,
    createdAt: Date.now(), // milliseconds since 1970 — easy to sort and format
  });
}

// Get the past entries for one prompt, newest first.
export async function listResponses(sectionId, blockId) {
  const rows = await db.responses
    .where('sectionId')
    .equals(sectionId)
    .and((row) => row.blockId === blockId)
    .sortBy('createdAt'); // oldest → newest
  return rows.reverse(); // flip to newest → oldest
}
