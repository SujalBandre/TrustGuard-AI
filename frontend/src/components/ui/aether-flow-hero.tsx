import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

/**
 * AetherFlowHero — Full-screen canvas particle network hero.
 * Adapted for TrustGuard AI monochrome theme (Black/Silver/White).
 *
 * Props:
 *  theme      – 'dark' | 'light'  (controls canvas bg + particle colors)
 *  title      – ReactNode or string for headline
 *  subtitle   – string
 *  badgeText  – string for the top badge pill
 *  children   – CTA buttons / cards rendered below the subtitle
 */
const AetherFlowHero = ({ theme = 'dark', title, subtitle, badgeText = 'Live', children }) => {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    const mouse = { x: null, y: null, radius: 180 };

    // Derive colors from theme
    const isDark = theme === 'dark';
    const particleColor   = isDark ? 'rgba(212, 212, 212, 0.75)' : 'rgba(60, 60, 60, 0.75)';
    const lineColorBase   = isDark ? '200, 200, 200'             : '80, 80, 80';
    const lineColorHover  = isDark ? '255, 255, 255'             : '0, 0, 0';
    const bgColor         = isDark ? '#0A0A0A'                   : '#FAFAF9';

    class Particle {
      constructor(x, y, dirX, dirY, size) {
        this.x = x;
        this.y = y;
        this.directionX = dirX;
        this.directionY = dirY;
        this.size = size;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
        ctx.fillStyle = particleColor;
        ctx.fill();
      }

      update() {
        if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
        if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;

        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius + this.size) {
            const force = (mouse.radius - dist) / mouse.radius;
            this.x -= (dx / dist) * force * 4;
            this.y -= (dy / dist) * force * 4;
          }
        }

        this.x += this.directionX;
        this.y += this.directionY;
        this.draw();
      }
    }

    function init() {
      particles = [];
      const count = Math.floor((canvas.height * canvas.width) / 9000);
      for (let i = 0; i < count; i++) {
        const size = Math.random() * 1.8 + 0.8;
        const x = Math.random() * (canvas.width  - size * 4) + size * 2;
        const y = Math.random() * (canvas.height - size * 4) + size * 2;
        const dirX = (Math.random() * 0.4) - 0.2;
        const dirY = (Math.random() * 0.4) - 0.2;
        particles.push(new Particle(x, y, dirX, dirY, size));
      }
    }

    function connect() {
      const maxDist = (canvas.width / 7) * (canvas.height / 7);
      for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
          const distSq =
            (particles[a].x - particles[b].x) ** 2 +
            (particles[a].y - particles[b].y) ** 2;

          if (distSq < maxDist) {
            const opacity = 1 - distSq / 20000;

            const isNearMouse =
              mouse.x !== null &&
              Math.sqrt((particles[a].x - mouse.x) ** 2 + (particles[a].y - mouse.y) ** 2) < mouse.radius;

            ctx.strokeStyle = `rgba(${isNearMouse ? lineColorHover : lineColorBase}, ${opacity * 0.6})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
      }
    }

    function animate() {
      animationFrameId = requestAnimationFrame(animate);
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => p.update());
      connect();
    }

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };

    const onMouseMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onMouseOut  = ()  => { mouse.x = null; mouse.y = null; };

    window.addEventListener('resize',    resize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseout',  onMouseOut);
    resize();
    animate();

    return () => {
      window.removeEventListener('resize',    resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseout',  onMouseOut);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);   // re-run when theme changes

  const fadeUp = {
    hidden:  { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1, y: 0,
      transition: { delay: i * 0.18 + 0.2, duration: 0.75, ease: 'easeInOut' },
    }),
  };

  return (
    <div
      className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden"
      style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />

      <div style={{
        position: 'relative', zIndex: 10, textAlign: 'center',
        padding: '6rem 1.5rem 2rem', width: '100%', maxWidth: '900px', margin: '0 auto',
      }}>
        {/* Badge pill */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 16px', borderRadius: '100px', marginBottom: '28px',
            background: 'var(--accent-dim)', border: '1px solid var(--border-strong)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <span style={{
            display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
            background: 'var(--accent-success)', boxShadow: '0 0 8px var(--accent-success)',
          }} />
          <Zap size={13} color="var(--accent-primary)" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
            {badgeText}
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 5.5rem)',
            fontWeight: 800, letterSpacing: '-0.03em',
            lineHeight: 1.1, marginBottom: '24px',
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          style={{
            maxWidth: '600px', margin: '0 auto 48px',
            fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.7,
          }}
        >
          {subtitle}
        </motion.p>

        {/* Children (CTA buttons/cards) */}
        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          style={{ display: 'flex', justifyContent: 'center', width: '100%' }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};

export default AetherFlowHero;
