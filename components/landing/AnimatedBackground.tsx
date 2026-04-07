'use client';

import { motion } from 'framer-motion';

const WIRES = [
  { id: 1, d: 'M 0 300 C 360 200, 500 700, 1100 350', color: '#10b981', speed: 3.5 },
  { id: 2, d: 'M 1440 600 C 900 500, 700 200, 100 450', color: '#3b82f6', speed: 4.2 },
  { id: 3, d: 'M 200 900 C 400 700, 600 300, 1200 200', color: '#10b981', speed: 5.0 },
  { id: 4, d: 'M 0 600 C 300 800, 700 600, 900 100', color: '#6366f1', speed: 3.8 },
  { id: 5, d: 'M 700 900 C 900 700, 1100 400, 1440 300', color: '#3b82f6', speed: 4.5 },
  { id: 6, d: 'M 500 0 C 600 250, 800 700, 1440 800', color: '#10b981', speed: 3.2 },
];

const NODES = [
  { id: 1, cx: 160,  cy: 280, status: 'grid' },
  { id: 2, cx: 420,  cy: 520, status: 'grid' },
  { id: 3, cx: 680,  cy: 180, status: 'standby' },
  { id: 4, cx: 900,  cy: 640, status: 'grid' },
  { id: 5, cx: 1160, cy: 300, status: 'fault' },
  { id: 6, cx: 260,  cy: 720, status: 'standby' },
  { id: 7, cx: 760,  cy: 820, status: 'grid' },
  { id: 8, cx: 1280, cy: 680, status: 'grid' },
  { id: 9, cx: 1060, cy: 140, status: 'standby' },
  { id: 10, cx: 540, cy: 360, status: 'grid' },
];

const NODE_COLOR: Record<string, string> = {
  grid:    '#10b981',
  standby: '#3b82f6',
  fault:   '#ef4444',
};

export default function AnimatedBackground() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#080810] via-[#0b0b1a] to-[#080812]" />

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* SVG layer: wires + nodes */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <filter id="blur-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="node-glow">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Static dim wire traces */}
        {WIRES.map((w) => (
          <path key={`trace-${w.id}`} d={w.d} fill="none" stroke={w.color} strokeWidth="1" opacity="0.1" />
        ))}

        {/* Animated energy pulses */}
        {WIRES.map((w) => (
          <motion.path
            key={`pulse-${w.id}`}
            d={w.d}
            fill="none"
            stroke={w.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="20 80"
            filter="url(#blur-glow)"
            initial={{ strokeDashoffset: 100 }}
            animate={{ strokeDashoffset: -300 }}
            transition={{
              duration: w.speed,
              repeat: Infinity,
              ease: 'linear',
              delay: w.id * 0.35,
            }}
          />
        ))}

        {/* Generator nodes */}
        {NODES.map((n) => {
          const color = NODE_COLOR[n.status];
          return (
            <g key={n.id}>
              {/* Pulse ring */}
              <motion.circle
                cx={n.cx} cy={n.cy} r={10}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                filter="url(#node-glow)"
                initial={{ r: 6, opacity: 0.8 }}
                animate={{ r: 22, opacity: 0 }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: 'easeOut',
                  delay: n.id * 0.18,
                }}
              />
              {/* Core */}
              <circle cx={n.cx} cy={n.cy} r={5} fill={color} opacity={0.85} filter="url(#node-glow)" />
              <circle cx={n.cx} cy={n.cy} r={2} fill="white" opacity={0.6} />
            </g>
          );
        })}
      </svg>

      {/* Ambient glow blobs */}
      <div className="absolute top-1/4 right-1/3 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-blue-600/5  rounded-full blur-[120px]" />
      <div className="absolute top-1/2  left-1/2  -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-700/4 rounded-full blur-[140px]" />
    </div>
  );
}
