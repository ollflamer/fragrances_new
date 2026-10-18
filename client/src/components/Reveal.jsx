import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(useGSAP, ScrollTrigger);

export function Reveal({ children, className = '', watch }) {
  const scope = useRef(null);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const elements = gsap.utils.toArray('[data-reveal]', scope.current);
      if (elements.length) ScrollTrigger.batch(elements, {
        start: 'top 94%', once: true,
        onEnter: (batch) => gsap.fromTo(batch, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .65, stagger: .07, ease: 'power2.out', clearProps: 'all' }),
      });
    });
    return () => media.revert();
  }, { scope, dependencies: [watch], revertOnUpdate: true });
  return <div className={className} ref={scope}>{children}</div>;
}
