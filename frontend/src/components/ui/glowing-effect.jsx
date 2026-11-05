import React, { useEffect, useRef, useCallback } from 'react';
import { animate } from 'framer-motion';
import { cn } from '../../lib/utils';

/**
 * GlowingEffect — adapted from the glowing-effect reference component.
 * Renders a conic-gradient glow that follows the mouse cursor around the border.
 *
 * Usage: wrap any card/element in <GlowingEffect> to add the metallic glow.
 *
 * Props:
 *  blur       – blur radius (px) for the glow edge
 *  inactiveZone – normalized radius (0–1) inside which the glow is inactive when mouse is centered
 *  proximity  – px distance from border that activates the glow
 *  spread     – size of the active glow segment (deg)
 *  variant    – 'default' | 'white'
 *  disabled   – turn off the effect entirely
 *  className  – additional classes for the glow div
 */
export function GlowingEffect({
  blur = 0,
  inactiveZone = 0.7,
  proximity = 0,
  spread = 20,
  variant = 'default',
  disabled = false,
  movementDuration = 2,
  borderWidth = 1,
  className,
}) {
  const glowRef = useRef(null);
  const lastPositionRef = useRef({ x: 0, y: 0 });
  const animationHandleRef = useRef(null);

  const handleMouseMove = useCallback(
    (e) => {
      if (!glowRef.current || window.innerWidth <= 768) return;

      const { left, top, width, height } = glowRef.current.getBoundingClientRect();
      const mouseX = e.clientX - left;
      const mouseY = e.clientY - top;

      if (
        mouseX < -proximity ||
        mouseX > width + proximity ||
        mouseY < -proximity ||
        mouseY > height + proximity
      ) {
        return;
      }

      const centerX = width / 2;
      const centerY = height / 2;
      const distanceFromCenter = Math.sqrt((mouseX - centerX) ** 2 + (mouseY - centerY) ** 2);
      const inactiveRadius = Math.sqrt(centerX ** 2 + centerY ** 2) * inactiveZone;

      if (distanceFromCenter < inactiveRadius) {
        if (animationHandleRef.current) {
          animationHandleRef.current.stop();
          animationHandleRef.current = null;
        }
        return;
      }

      const angle = Math.atan2(mouseY - centerY, mouseX - centerX) * (180 / Math.PI);
      lastPositionRef.current = { x: mouseX, y: mouseY };

      if (animationHandleRef.current) animationHandleRef.current.stop();
      animationHandleRef.current = animate(0, angle, {
        duration: movementDuration,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (latest) => {
          if (glowRef.current) {
            glowRef.current.style.setProperty('--start', String(latest));
          }
        },
      });
    },
    [inactiveZone, proximity, movementDuration]
  );

  useEffect(() => {
    if (disabled) return;
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [disabled, handleMouseMove]);

  const monochromeGradient = `radial-gradient(circle, rgba(255,255,255,0.5) 10%, rgba(255,255,255,0) 20%),
    repeating-conic-gradient(from 236.84deg at 50% 50%,
      rgba(255,255,255,0.6) 0%, rgba(200,200,200,0.4) 25%,
      rgba(255,255,255,0.6) 50%, rgba(200,200,200,0.4) 75%,
      rgba(255,255,255,0.6) 100%)`;

  return (
    <div
      ref={glowRef}
      style={{
        '--start': '0',
        '--spread': spread,
        '--blur': `${blur}px`,
        '--radius': '16px',
        '--border-width': `${borderWidth}px`,
        '--gradient': monochromeGradient,
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
      className={cn(
        'glow-effect-container',
        disabled && 'opacity-0',
        className
      )}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          padding: `var(--border-width)`,
          background: `conic-gradient(from calc((var(--start) - var(--spread, 20)) * 1deg), transparent 0%, white calc(var(--spread) * 1%), transparent calc(var(--spread) * 2%)) border-box`,
          mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          filter: `blur(var(--blur))`,
          opacity: 0.8,
        }}
      />
    </div>
  );
}

/**
 * GlowCard — convenience wrapper that gives a card a GlowingEffect border.
 * Drop-in replacement for a plain <div className="card">.
 */
export function GlowCard({ children, className, style, ...glowProps }) {
  return (
    <div
      className={cn('card', className)}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
    >
      <GlowingEffect {...glowProps} />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}
