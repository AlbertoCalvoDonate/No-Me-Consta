import { motion } from 'framer-motion'
import { LOGROS } from '../data/logros'
import { useLogrosEstado } from '../hooks/useLogros'

// Lista completa de logros. Los conseguidos van tachados y en dorado; los que
// faltan, en gris. Los ocultos que aún no tienes no revelan la descripción.
export function LogrosPanel({ onCerrar }: { onCerrar: () => void }) {
  const { conseguidos, total, hechos } = useLogrosEstado()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        background: '#0c0c0d',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          padding: '16px 16px 12px',
          borderBottom: '1px solid rgba(224,184,77,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-pixel)',
              fontWeight: 400,
              fontSize: 22,
              color: '#e0b84d',
            }}
          >
            Logros
          </div>
          <div
            style={{
              fontFamily: 'var(--font-pixel)',
              fontWeight: 500,
              fontSize: 13,
              color: '#8a8272',
              marginTop: 2,
            }}
          >
            {hechos} de {total}
          </div>
        </div>
        <button
          onClick={onCerrar}
          aria-label="Cerrar"
          style={{
            width: 38,
            height: 38,
            border: 'none',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.08)',
            color: '#f2ede0',
            fontSize: 20,
            lineHeight: 1,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 20px' }}>
        {LOGROS.map((l) => {
          const hecho = conseguidos.has(l.id)
          const tapado = l.oculto && !hecho
          return (
            <div
              key={l.id}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                padding: '10px 6px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                opacity: hecho ? 1 : 0.55,
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  flexShrink: 0,
                  marginTop: 1,
                  borderRadius: '50%',
                  background: hecho ? '#e0b84d' : 'rgba(255,255,255,0.1)',
                  color: '#1a1a1a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                {hecho ? '✓' : ''}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-pixel)',
                    fontWeight: 400,
                    fontSize: 16,
                    color: hecho ? '#f2ede0' : '#b7b1a3',
                    lineHeight: 1.25,
                  }}
                >
                  {tapado ? 'Logro oculto' : l.nombre}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-pixel)',
                    fontWeight: 500,
                    fontSize: 13,
                    color: '#8a8272',
                    lineHeight: 1.35,
                    marginTop: 2,
                  }}
                >
                  {tapado ? 'Sigue jugando para descubrirlo.' : l.desc}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
