import test from 'node:test';
import assert from 'node:assert/strict';
import { installDialogFocusTrap } from '../src/lib/dialog-focus.mjs';

function setup() {
  const doc = { activeElement: null, handlers: new Map(), addEventListener(name, fn) { this.handlers.set(name, fn); }, removeEventListener(name, fn) { if (this.handlers.get(name) === fn) this.handlers.delete(name); } };
  const mk = () => ({ isConnected: true, getClientRects: () => [1], closest: () => null, focus() { doc.activeElement = this; } });
  const a = mk(), b = mk(), opener = mk(), outside = mk();
  const root = { focus() { doc.activeElement = this; }, querySelectorAll: () => [a, b], contains(el) { return el === a || el === b; } };
  let dismissals = 0;
  const cleanup = installDialogFocusTrap(root, () => { dismissals++; }, opener, doc);
  const press = (key, shiftKey = false) => {
    let prevented = false;
    doc.handlers.get('keydown')({key, shiftKey, preventDefault() { prevented = true; }});
    return prevented;
  };
  return {doc,a,b,opener,outside,root,cleanup,press,get dismissed(){return dismissals;}};
}

test('modal initially focuses an interactive control', () => {
  const x = setup();assert.equal(x.doc.activeElement, x.a);x.cleanup();
});
test('Tab wraps at both ends and traps attempted outside focus', () => {
  const x = setup();x.b.focus();assert.equal(x.press('Tab'), true);assert.equal(x.doc.activeElement,x.a);
  assert.equal(x.press('Tab',true),true);assert.equal(x.doc.activeElement,x.b);
  x.outside.focus();assert.equal(x.press('Tab'),true);assert.equal(x.doc.activeElement,x.a);x.cleanup();
});
test('Escape requests close and cleanup returns focus to original opener', () => {
  const x = setup();assert.equal(x.press('Escape'),true);assert.equal(x.dismissed,1);x.cleanup();
  assert.equal(x.doc.activeElement,x.opener);assert.equal(x.doc.handlers.has('keydown'),false);
});
test('disabled or hidden modal controls are not focus targets', () => {
  const x=setup();x.b.getClientRects=()=>[];x.a.focus();
  assert.equal(x.press('Tab'),true);assert.equal(x.doc.activeElement,x.a);x.cleanup();
});
