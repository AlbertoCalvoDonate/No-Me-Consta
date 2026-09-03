import { motion, type MotionValue } from 'framer-motion'

// Un punto que se enciende sobre el icono al arrastrar la carta: dice QUE ese
// indicador va a moverse y CUANTO (punto pequeño, mediano o gordo según la
// magnitud), pero NO hacia donde. Es como Reigns — un solo circulo que crece
// con el efecto — y a proposito: obliga a aprender que hace cada personaje.
function pipSize(magnitude: number) {
  if (magnitude >= 3) return 12
  if (magnitude === 2) return 8
  return 5
}

export function EffectPips({ value, opacity }: { value: number; opacity: MotionValue<number> }) {
  const mag = Math.abs(value)
  if (mag === 0) return null
  const d = pipSize(mag)
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: '50%',
        top: 3,
        x: '-50%',
        opacity,
        width: 12,
        height: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          width: d,
          height: d,
          borderRadius: '50%',
          background: '#f2ede0',
          // Se despega del icono que tiene debajo, sea claro u oscuro.
          boxShadow: '0 0 0 1.5px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.9)',
        }}
      />
    </motion.div>
  )
}
