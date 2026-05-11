'use client';

let activeLocks = 0;
let previousOverflow = '';
let previousPaddingRight = '';

export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') {
    return () => undefined;
  }

  if (activeLocks === 0) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    previousOverflow = document.body.style.overflow;
    previousPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  activeLocks += 1;
  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;
    activeLocks = Math.max(0, activeLocks - 1);

    if (activeLocks === 0) {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      previousOverflow = '';
      previousPaddingRight = '';
    }
  };
}
