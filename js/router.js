// ============================================================================
// Latevzn — tiny hash router
// ----------------------------------------------------------------------------
// A "router" decides what screen to show based on the web address.
// We use the part of the address after the "#" symbol (the "hash"), because
// that works on simple hosting like GitHub Pages without any server setup.
//
// Examples of addresses this understands:
//   #/                              -> the home screen
//   #/section/your-working-method   -> one section's placeholder screen
//
// This file does not draw anything itself. It just figures out the current
// route and calls a function you give it whenever the route changes.
// ============================================================================

// Turn the current hash into a simple { name, params } object.
export function parseRoute() {
  // Strip the leading "#" and any leading "/" so we are left with the path.
  const raw = window.location.hash.replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean);

  // No parts means we are at the home screen.
  if (parts.length === 0) {
    return { name: 'home', params: {} };
  }

  // "section/<id>" means a specific section screen.
  if (parts[0] === 'section' && parts[1]) {
    return { name: 'section', params: { id: parts[1] } };
  }

  // Anything we do not recognise falls back to home.
  return { name: 'home', params: {} };
}

// Call `onChange` now and every time the address hash changes.
export function startRouter(onChange) {
  window.addEventListener('hashchange', () => onChange(parseRoute()));
  onChange(parseRoute());
}
