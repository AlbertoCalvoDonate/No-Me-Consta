import { motion, type MotionValue } from 'framer-motion'

// Tamaño de la flecha según la magnitud del efecto (1 a 3 normalmente).
function arrowSize(magnitude: number) {
  return 13 + Math.min(magnitude, 3) * 4 // 1→17, 2→21, 3→25
}

export function EffectArrow({ value, opacity }: { value: number; opacity: MotionValue<number> }) {
  const positive = value > 0
  return (
    <motion.span
      style={{
        position: 'absolute',
        left: '50%',
        top: 0,
        x: '-50%',
        opacity,
        fontSize: arrowSize(Math.abs(value)),
        lineHeight: 1,
        color: positive ? '#4dff88' : '#ff4d4d',
        fontWeight: 700,
      }}
    >
      {positive ? '▲' : '▼'}
    </motion.span>
  )
}
