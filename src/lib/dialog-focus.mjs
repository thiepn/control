/**
 * Trap keyboard focus in a modal project editor and return focus to its opener.
 * Document injection allows deterministic keyboard regression tests.
 *
 * @param {HTMLElement} root
 * @param {()=>void} close
 * @param {HTMLElement|null} restore
 * @param {Document} [doc]
 * @returns {()=>void}
 */
export function installDialogFocusTrap(root, close, restore, doc = document) {
  const selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const focusables = () => Array.from(root.querySelectorAll(selector))
    .filter(element => element.getClientRects().length > 0 && !element.closest('[inert]'));
  (focusables()[0] ?? root).focus();
  /** @param {KeyboardEvent} event */
  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const eligible = focusables();
    if (!eligible.length) {
      event.preventDefault();
      root.focus();
      return;
    }
    const first = eligible[0];
    const last = eligible[eligible.length - 1];
    if (event.shiftKey && (doc.activeElement === first || !root.contains(doc.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (doc.activeElement === last || !root.contains(doc.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  };
  doc.addEventListener('keydown', onKeyDown);
  return () => {
    doc.removeEventListener('keydown', onKeyDown);
    if (restore?.isConnected) restore.focus();
  };
}
