import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect x='0' y='0' width='64' height='64' rx='12' fill='#13ec5b'/><rect x='14' y='22' width='36' height='22' rx='6' fill='#8d5a3a' stroke='#2d2d2d' stroke-width='2'/><circle cx='44' cy='33' r='3' fill='#2d2d2d'/><rect x='20' y='16' width='20' height='10' rx='2' fill='#14d86a'/></svg>`;
  const fallbackLogo = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2600);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const bgGradient = isDark
    ? 'radial-gradient(ellipse at 50% 40%, #1a2240 0%, #0b0d19 100%)'
    : 'radial-gradient(ellipse at 50% 40%, #f0f4ff 0%, #e8ecf8 100%)';

  const textColor = isDark ? '#e8ecff' : '#0b0d19';
  const subtitleColor = isDark ? 'rgba(200,210,255,0.5)' : 'rgba(80,90,140,0.6)';
  const iconBg = isDark ? '#1c2440' : '#ffffff';
  const iconBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const iconShadow = isDark
    ? '0 20px 60px rgba(19,236,91,0.2), 0 4px 24px rgba(0,0,0,0.5)'
    : '0 20px 60px rgba(19,236,91,0.12), 0 4px 20px rgba(0,0,0,0.1)';

  return (
    <motion.div
      key="splash"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: bgGradient,
      }}
    >
      {/* ── Orbs decorativos animados ── */}
      <motion.div
        animate={{ y: [-10, 10, -10], x: [-6, 6, -6] }}
        transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '10%',
          left: '15%',
          width: 260,
          height: 260,
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(19,236,91,0.07) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(19,236,91,0.06) 0%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />
      <motion.div
        animate={{ y: [8, -8, 8], x: [5, -5, 5] }}
        transition={{ repeat: Infinity, duration: 9, ease: 'easeInOut', delay: 1.5 }}
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '10%',
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(136,84,208,0.07) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(136,84,208,0.05) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay: 0.5 }}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 340,
          height: 340,
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(19,236,91,0.04) 0%, transparent 60%)'
            : 'radial-gradient(circle, rgba(19,236,91,0.035) 0%, transparent 60%)',
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Conteúdo central ── */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Anel pulsante externo */}
        <motion.div
          animate={{ scale: [1, 1.18, 1], opacity: [0.3, 0.06, 0.3] }}
          transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut', delay: 0.7 }}
          style={{
            position: 'absolute',
            width: 140,
            height: 140,
            borderRadius: 36,
            border: '1.5px solid rgba(19,236,91,0.35)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* Ícone principal */}
        <motion.div
          initial={{ scale: 0, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.08 }}
          style={{
            marginBottom: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 100,
            height: 100,
            borderRadius: 28,
            background: iconBg,
            border: `1.5px solid ${iconBorder}`,
            boxShadow: iconShadow,
          }}
        >
          <motion.img
            src="https://i.imgur.com/fH0lMQq.png"
            alt="Money Balance"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackLogo; }}
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut', delay: 0.8 }}
            style={{ width: 58, height: 58, objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(19,236,91,0.3))' }}
          />
        </motion.div>

        {/* Nome do app */}
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          style={{
            color: textColor,
            fontSize: 30,
            fontWeight: 800,
            fontFamily: '"Poetsen One", cursive',
            letterSpacing: '-0.02em',
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          Money Balance
        </motion.h1>

        {/* Subtítulo */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.55, ease: 'easeOut' }}
          style={{
            color: subtitleColor,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          Gestão Financeira Inteligente
        </motion.p>
      </div>

      {/* ── Barra de progresso inferior ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 56,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 120,
          height: 2,
          borderRadius: 2,
          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 2.2, ease: 'easeInOut', delay: 0.2 }}
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #13ec5b, #00d68f)',
            borderRadius: 2,
          }}
        />
      </div>
    </motion.div>
  );
};
