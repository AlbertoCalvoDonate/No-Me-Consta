import { motion } from 'framer-motion'
import { REPARTO, CARTAS_POR_PERSONAJE, ETIQUETA_INDICADOR } from '../data/reparto'
import { StatIcon } from './StatIcon'
import { useLogrosEstado } from '../hooks/useLogros'

// EL REPARTO. Quien es quien y que indicador mueve cada uno.
//
// Existe porque saber quien mueve que ES la habilidad central de un Reigns
// (ves quien habla y ya sabes que te juegas), pero con 23 personajes y una
// partida mediana de ~40 cartas, un personaje concreto te sale unas 6 veces:
// no da tiempo a aprendérselo jugando. Hasta ahora esa informacion solo
// existia en comentarios del codigo.
//
// Los personajes que aun no has visto salen tapados, a proposito: descubrir
// el reparto es parte del juego, no se regala en la primera pantalla.

const pixel = { fontFamily: 'var(--font-pixel)' } as const

export function RepartoPanel({ onCerrar }: { onCerrar: () => void }) {
  const { cartasVistas: _n, idsVistos } = useLogrosEstado()
  void _n

  const conocidos = REPARTO.filter((p) =>
    (CARTAS_POR_PERSONAJE[p.nombre] ?? []).some((id) => idsVistos.has(id))
  ).length

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
          <div style={{ ...pixel, fontWeight: 400, fontSize: 22, color: '#e0b84d' }}>El reparto</div>
          <div style={{ ...pixel, fontWeight: 500, fontSize: 13, color: '#8a8272', marginTop: 2 }}>
            Has conocido a {conocidos} de {REPARTO.length}
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
        {REPARTO.map((p) => {
          const suyas = CARTAS_POR_PERSONAJE[p.nombre] ?? []
          const vistas = suyas.filter((id) => idsVistos.has(id)).length
          const conocido = vistas > 0

          return (
            <div
              key={p.nombre}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                padding: '9px 4px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 62,
                  flexShrink: 0,
                  borderRadius: 7,
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={`/characters/${p.imagen}`}
                  alt=""
                  draggable={false}
                  style={{
                    width: 'auto',
                    height: 'auto',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    aspectRatio: '1020 / 1200',
                    objectFit: 'cover',
                    objectPosition: 'center top',
                    // Sin descubrir: silueta. Se reconoce el pelo y la forma,
                    // no la cara — da pistas sin destriparlo.
                    filter: conocido ? 'none' : 'brightness(0.12) contrast(0.4)',
                  }}
                />
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    ...pixel,
                    fontWeight: 400,
                    fontSize: 17,
                    color: conocido ? '#f2ede0' : '#6b6558',
                    lineHeight: 1.2,
                  }}
                >
                  {conocido ? p.nombre : '¿?'}
                </div>
                <div
                  style={{
                    ...pixel,
                    fontWeight: 500,
                    fontSize: 12.5,
                    color: '#8a8272',
                    lineHeight: 1.35,
                    marginTop: 2,
                  }}
                >
                  {conocido ? p.quien : 'Todavía no se ha cruzado con usted.'}
                </div>
                <div
                  style={{
                    ...pixel,
                    fontWeight: 500,
                    fontSize: 11.5,
                    color: '#6b6558',
                    marginTop: 3,
                  }}
                >
                  {vistas} de {suyas.length} cartas
                </div>
              </div>

              {/* El indicador que encarna: es LA informacion util de esta
                  pantalla, asi que va destacado a la derecha. */}
              {p.dueno && (
                <div style={{ flexShrink: 0, textAlign: 'center', width: 46, opacity: conocido ? 1 : 0.25 }}>
                  <StatIcon statKey={p.dueno} value={5} critical={false} size={28} />
                  <div style={{ ...pixel, fontWeight: 500, fontSize: 10.5, color: '#a8a08c', marginTop: 1 }}>
                    {ETIQUETA_INDICADOR[p.dueno]}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        <div
          style={{
            ...pixel,
            fontWeight: 500,
            fontSize: 12.5,
            color: '#6b6558',
            lineHeight: 1.5,
            padding: '14px 4px 0',
          }}
        >
          Cada personaje empuja su indicador casi siempre. Saber quién habla es
          saber qué te estás jugando antes de leer la carta.
        </div>
      </div>
    </motion.div>
  )
}
