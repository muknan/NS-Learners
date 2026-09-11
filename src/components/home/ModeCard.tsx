'use client';

import { useRef, type ReactNode } from 'react';

export function ModeCard({ children, onStart }: { children: ReactNode; onStart: () => void }) {
  const pointerType = useRef('');
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- The child button is the sole keyboard/assistive action; card clicks are a mouse-only shortcut.
    <article
      className="mode-card"
      onPointerDownCapture={(event) => {
        pointerType.current = event.pointerType;
      }}
      onPointerCancelCapture={() => {
        pointerType.current = '';
      }}
      onClick={(event) => {
        // WebKit can report a touch-generated click as mouse; trust the originating pointer.
        const mouseGesture = pointerType.current === 'mouse';
        pointerType.current = '';
        if (
          mouseGesture &&
          event.detail > 0 &&
          !(event.target as Element).closest('button') &&
          window.getSelection()?.isCollapsed !== false
        )
          onStart();
      }}
    >
      {children}
    </article>
  );
}
