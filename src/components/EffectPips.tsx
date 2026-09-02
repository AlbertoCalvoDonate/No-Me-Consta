import { motion, type MotionValue } from 'framer-motion'

// Puntos que se encienden sobre el icono al arrastrar la carta: dicen QUE ese
// indicador va a moverse y CUANTO (uno, dos o tres puntos segun la magnitud),
// pero NO hacia donde. Es como lo hace Reigns, y a proposito: obliga a
// aprender que hace cada personaje en vez de leer el resultado antes de
// decidir. Todos del mismo color neutro; nada de verde/rojo ni flechas.
const MAX_PIPS = 3

export function EffectPips({ value, opacity }: { value: number; opacity: MotionValue<number> }) {
  const n = Math.min(Math.abs(value), MAX_PIPS)
  if (n === 0) return null
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: '50%',
        top: 3,
        x: '-50%',
        opacity,
        display: 'flex',
        gap: 3,
        pointerEvents: 'none',
      }}
    >
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#f2ede0',
            // Se despega del icono que tiene debajo, sea claro u oscuro.
            boxShadow: '0 0 0 1.5px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.9)',
          }}
        />
      ))}
    </motion.div>
  )
}
