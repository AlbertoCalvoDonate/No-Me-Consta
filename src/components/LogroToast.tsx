import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Logro } from '../data/logros'

// Pop-up estilo logro de Xbox: aparece justo debajo de los indicadores, se
// queda unos segundos y se va. Si hay varios, se muestran uno detrás de otro
// (mode="wait": el anterior termina de salir antes de que entre el siguiente,
// si no se solapaban un instante y el nuevo parecía entrar de lado).
export function LogroToast({
  cola,
  onVaciar,
}: {
  cola: Logro[]
  onVaciar: () => void
}) {
  const [i, setI] = useState(0)

  useEffect(() => {
    setI(0)
  }, [cola])

  useEffect(() => {
    if (cola.length === 0) return
    if (i >= cola.length) {
      onVaciar()
      return
    }
    const t = setTimeout(() => setI((n) => n + 1), 3600)
    return () => clearTimeout(t)
  }, [i, cola, onVaciar])

  const actual = cola[i]

  return (
    <div
      style={{
        position: 'absolute',
        top: 104,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      <AnimatePresence mode="wait">
        {actual && (
          <motion.div
            key={actual.id}
            initial={{ opacity: 0, y: -14, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.94 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              maxWidth: '90%',
              padding: '10px 16px 10px 12px',
              borderRadius: 12,
              background: '#1c1c1e',
              border: '2px solid #e0b84d',
              boxShadow: '0 10px 30px rgba(0,0,0,0.55)',
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                flexShrink: 0,
                borderRadius: '50%',
                background: '#e0b84d',
                color: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              ★
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--font-pixel)',
                  fontWeight: 500,
                  fontSize: 11,
                  letterSpacing: 0.6,
                  color: '#8a8272',
                  textTransform: 'uppercase',
                }}
              >
                Logro desbloqueado
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-pixel)',
                  fontWeight: 400,
                  fontSize: 18,
                  color: '#f2ede0',
                  lineHeight: 1.2,
                }}
              >
                {actual.nombre}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
