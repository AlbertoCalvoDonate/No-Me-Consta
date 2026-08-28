import { motion, type MotionValue } from 'framer-motion'

// Tamaño de la flecha según la magnitud del efecto (1 a 3 normalmente).
function arrowSize(magnitude: number) {
  return 20 + Math.min(magnitude, 3) * 6 // 1→26, 2→32, 3→38
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
        // Sombra para que la flecha se despegue del icono que tiene debajo.
        textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9)',
      }}
    >
      {positive ? '▲' : '▼'}
    </motion.span>
  )
}
