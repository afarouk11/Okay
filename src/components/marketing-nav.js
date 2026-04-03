/**
 * Marketing navigation component
 *
 * Renders the shared marketing nav and mobile menu overlay into the page,
 * and wires up the hamburger toggle behaviour.
 *
 * Usage (ES module, in a <script type="module"> block):
 *   import { initMarketingNav } from '/src/components/marketing-nav.js';
 *   initMarketingNav({ activePage: 'pricing' });
 *
 * Recognised activePage values: 'home' | 'features' | 'pricing' | 'contact'
 */

const NAV_LINKS = [
  { label: 'Home',     href: '/',        key: 'home' },
  { label: 'Features', href: '/#features', key: 'features' },
  { label: 'Pricing',  href: '/pricing', key: 'pricing' },
  { label: 'Contact',  href: '/contact', key: 'contact' },
];

/**
 * Build and insert the marketing nav + mobile menu into the document,
 * then attach the hamburger toggle handler.
 *
 * @param {{ activePage?: string }} [options]
 */
export function initMarketingNav({ activePage = '' } = {}) {
  // ── Nav bar ──────────────────────────────────────────────────────────
  const linksHtml = NAV_LINKS.map(({ label, href, key }) => {
    const active = key === activePage ? ' class="active"' : '';
    return `<a href="${href}"${active}>${label}</a>`;
  }).join('\n    ');

  const nav = document.createElement('nav');
  nav.className = 'nav';
  nav.innerHTML = `
  <a href="/" class="nav-logo">Synapti<span>q</span></a>
  <button class="hamburger" id="hamburger" aria-label="Toggle navigation" aria-expanded="false">
    <span></span><span></span><span></span>
  </button>
  <div class="nav-links">
    ${linksHtml}
  </div>
  <div class="nav-right">
    <a class="btn btn-outline" href="/">Log In</a>
    <a class="btn btn-gold" href="/">Sign Up Free</a>
  </div>
`;

  // ── Mobile overlay ───────────────────────────────────────────────────
  const mobileLinksHtml = NAV_LINKS.map(({ label, href }) =>
    `<a href="${href}">${label}</a>`
  ).join('\n  ');

  const overlay = document.createElement('div');
  overlay.className = 'mobile-menu-overlay';
  overlay.id = 'mobile-menu';
  overlay.innerHTML = `\n  ${mobileLinksHtml}\n`;

  // Insert both before the first child of <body>
  document.body.insertBefore(overlay, document.body.firstChild);
  document.body.insertBefore(nav, document.body.firstChild);

  // ── Hamburger toggle ─────────────────────────────────────────────────
  const hamburger = nav.querySelector('#hamburger');
  hamburger.addEventListener('click', () => {
    const isOpen = overlay.classList.toggle('active');
    hamburger.classList.toggle('active', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });

  // Close overlay when a link inside it is clicked
  overlay.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      overlay.classList.remove('active');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
}
