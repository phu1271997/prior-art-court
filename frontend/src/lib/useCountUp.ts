import { useEffect, useRef, useState } from "react";

export function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (target === 0 || started.current) {
      setValue(target);
      return;
    }
    started.current = true;

    const t0 = performance.now();
    let raf: number;

    function tick(now: number) {
      const progress = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
