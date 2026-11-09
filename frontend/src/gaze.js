import { useEffect } from 'react';

// Un singur listener pentru toți ochii de pe pagină
const subscribers = new Set();
let point = { x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0, y: 0 };
let frame = 0;

function flush() {
  frame = 0;
  subscribers.forEach((fn) => fn(point));
}

if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointermove',
    (e) => {
      point = { x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(flush);
    },
    { passive: true },
  );
}

/** Setează --ex / --ey (între -1 și 1) pe element, după poziția cursorului față de el */
export function useGaze(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = (p) => {
      const r = el.getBoundingClientRect();
      const dx = p.x - (r.left + r.width / 2);
      const dy = p.y - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 260);
      el.style.setProperty('--ex', ((dx / d) * k).toFixed(3));
      el.style.setProperty('--ey', ((dy / d) * k).toFixed(3));
    };
    subscribers.add(update);
    update(point);
    return () => subscribers.delete(update);
  }, [ref]);
}
