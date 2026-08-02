import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function findDialog(root) {
  if (!root) return null;
  const dialogs = root.querySelectorAll('[role="dialog"], [aria-modal="true"]');
  if (dialogs.length) return dialogs[dialogs.length - 1];

  const overlay = root.lastElementChild;
  return overlay?.firstElementChild || overlay;
}

export function useModalFocus({ activeKey, onClose, rootRef, dialogRef, returnFocusRef }) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!activeKey || typeof document === 'undefined') return undefined;

    const requestedOpener = returnFocusRef?.current;
    const opener = requestedOpener instanceof HTMLElement && requestedOpener.isConnected
      ? requestedOpener
      : document.activeElement instanceof HTMLElement ? document.activeElement : null;
    let dialog;
    let focusFrame;

    const prepareDialog = () => {
      dialog = dialogRef?.current || findDialog(rootRef?.current);
      if (!dialog) return;

      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      if (!dialog.hasAttribute('aria-labelledby') && !dialog.hasAttribute('aria-label')) {
        const heading = dialog.querySelector('h1, h2, h3');
        if (heading) {
          if (!heading.id) heading.id = `dialog-title-${activeKey}`;
          dialog.setAttribute('aria-labelledby', heading.id);
        }
      }
      if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');
      dialog.focus({ preventScroll: true });
    };

    focusFrame = window.requestAnimationFrame(prepareDialog);

    const handleKeyDown = (event) => {
      if (!dialog) prepareDialog();
      if (!dialog) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)]
        .filter(element => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true');
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown, true);
      const activeElement = document.activeElement;
      const shouldReturnFocus = !dialog
        || activeElement === document.body
        || dialog.contains(activeElement);
      if (shouldReturnFocus && opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [activeKey, dialogRef, returnFocusRef, rootRef]);
}
