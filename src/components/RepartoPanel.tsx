import { useState } from 'react'
import { REPARTO, VOCES, CARTAS_POR_PERSONAJE, ETIQUETA_INDICADOR } from '../data/reparto'
import type { Personaje } from '../data/reparto'
import { StatIcon } from './StatIcon'
import { useLogrosEstado } from '../hooks/useLogros'
import { COLOR, pixel } from '../utils/estilo'
import { sfx } from '../utils/sfx'

// EL REPARTO. Quien es quien y que indicador mueve cada uno.
//
// Existe porque saber quien mueve que ES la habilidad central de un Reigns
// (ves quien habla y ya sabes que te juegas), pero con treinta personajes y
// una partida mediana de ~40 cartas, un personaje concreto te sale unas cinco
// veces: no da tiempo a aprendérselo jugando.
//
// Los personajes que aun no has visto salen tapados, a proposito: descubrir
// el reparto es parte del juego, no se regala en la primera pantalla.
//
// VA EN REJILLA Y POR PAGINAS, NO EN LISTA. Era una lista de fichas de 85px
// y con treinta y tantos personajes medía 2.700px: había que arrastrar un
// cuarto de pantalla por cada cuatro personajes, en TODOS los tamaños,
// incluido el ordenador. Una lista que no cabe deja de ser una lista y pasa a
// ser un pozo. En rejilla se ve el reparto entero de un vistazo, que es justo
// lo que esta pantalla tiene que dar, y el detalle de cada uno se abre al
// tocarlo. Cero scroll a cambio de un toque.
const COLUMNAS = 4
const FILAS = 4
const POR_PAGINA = COLUMNAS * FILAS

export function RepartoPanel({ onCerrar }: { onCerrar: () => void }) {
  const { idsVistos } = useLogrosEstado()
  const [pagina, setPagina] = useState(0)
  const [abierto, setAbierto] = useState<Personaje | null>(null)

  const todos = [...REPARTO, ...VOCES]
  const conocidos = REPARTO.filter((p) =>
    (CARTAS_POR_PERSONAJE[p.nombre] ?? []).some((id) => idsVistos.has(id))
  ).length

  const paginas = Math.max(1, Math.ceil(todos.length / POR_PAGINA))
  const actual = Math.min(pagina, paginas - 1)
  const visibles = todos.slice(actual * POR_PAGINA, (actual + 1) * POR_PAGINA)

  const vistasDe = (p: Personaje) =>
    (CARTAS_POR_PERSONAJE[p.nombre] ?? []).filter((id) => idsVistos.has(id)).length
  const conoce = (p: Personaje) => vistasDe(p) > 0

  const ir = (d: number) => {
    sfx.boton()
    setPagina(Math.max(0, Math.min(paginas - 1, actual + d)))
  }

  return (
    // El fondo va SOLIDO desde el primer fotograma. Antes el panel entero
    // entraba desde opacity 0, asi que mientras duraba el fundido se veian las
    // dos pantallas superpuestas: el listado encima del menu, con el titulo y
    // los botones transparentandose por debajo. Parecia un parpadeo.
    // Quien anima ahora es el contenido, con .nmc-panel en index.css.
    <div
      className="nmc-panel"
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
          padding: '14px 16px 10px',
          borderBottom: '1px solid rgba(224,184,77,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ ...pixel, fontWeight: 400, fontSize: 22, color: COLOR.oro }}>El reparto</div>
          <div style={{ ...pixel, fontWeight: 500, fontSize: 13, color: COLOR.apagado, marginTop: 2 }}>
            Has conocido a {conocidos} de {REPARTO.length}
          </div>
        </div>
        <button
          onClick={() => { sfx.boton(); onCerrar() }}
          aria-label="Cerrar"
          style={{
            width: 38,
            height: 38,
            border: 'none',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.08)',
            color: COLOR.texto,
            fontSize: 20,
            lineHeight: 1,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>

      {/* La rejilla ocupa el hueco que haya y las celdas se reparten lo que
          hay: en un movil bajito salen mas apretadas y en uno alto con mas
          aire, pero nunca se sale del borde. */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: `repeat(${COLUMNAS}, 1fr)`,
          gridTemplateRows: `repeat(${FILAS}, 1fr)`,
          gap: 6,
          padding: '10px 12px',
          boxSizing: 'border-box',
        }}
      >
        {visibles.map((p) => {
          const conocido = conoce(p)
          return (
            <button
              key={p.nombre}
              onClick={() => { sfx.boton(); setAbierto(p) }}
              style={{
                minWidth: 0,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 3,
                padding: 4,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 9,
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  borderRadius: 6,
                }}
              >
                {p.imagen ? (
                  <img
                    src={`/characters/${p.imagen}`}
                    alt=""
                    draggable={false}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      aspectRatio: '1020 / 1200',
                      objectFit: 'cover',
                      objectPosition: 'center top',
                      // Sin descubrir: silueta. brightness(0) pone todos los
                      // canales a cero -queda la forma del alfa, sin un solo
                      // detalle dentro- e invert lo sube a un gris plano.
                      filter: conocido ? 'none' : 'brightness(0) invert(0.28)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      ...pixel,
                      fontSize: 22,
                      color: 'rgba(255,255,255,0.3)',
                      alignSelf: 'center',
                    }}
                  >
                    ?
                  </div>
                )}
              </div>
              <div
                style={{
                  ...pixel,
                  fontWeight: 500,
                  fontSize: 10,
                  lineHeight: 1.1,
                  color: conocido ? '#d8d2c4' : '#6b6558',
                  width: '100%',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flexShrink: 0,
                }}
              >
                {conocido ? p.nombre : '¿?'}
              </div>
            </button>
          )
        })}
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: '6px 14px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
        }}
      >
        <button onClick={() => ir(-1)} disabled={actual === 0} style={flecha(actual === 0)}>
          ‹
        </button>
        <div style={{ ...pixel, fontWeight: 500, fontSize: 13, color: COLOR.apagado }}>
          {actual + 1} / {paginas}
        </div>
        <button
          onClick={() => ir(1)}
          disabled={actual >= paginas - 1}
          style={flecha(actual >= paginas - 1)}
        >
          ›
        </button>
      </div>

      {/* El detalle. Lo que antes ocupaba una ficha entera en la lista sale
          aqui al tocar, que es cuando de verdad interesa. */}
      {abierto && (
        <div
          onClick={() => setAbierto(null)}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0,0,0,0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: COLOR.panel,
              border: '1px solid rgba(224,184,77,0.35)',
              borderRadius: 14,
              padding: '16px 18px',
              maxWidth: 320,
              width: '100%',
              boxSizing: 'border-box',
              textAlign: 'center',
            }}
          >
            <div style={{ ...pixel, fontWeight: 400, fontSize: 20, color: COLOR.oro }}>
              {conoce(abierto) ? abierto.nombre : '¿?'}
            </div>
            <div
              style={{
                ...pixel,
                fontWeight: 500,
                fontSize: 14,
                lineHeight: 1.4,
                color: COLOR.texto,
                margin: '8px 0 10px',
              }}
            >
              {conoce(abierto) ? abierto.quien : 'Todavía no se ha cruzado con usted.'}
            </div>
            {abierto.dueno && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: conoce(abierto) ? 1 : 0.3,
                  marginBottom: 8,
                }}
              >
                <StatIcon statKey={abierto.dueno} value={5} critical={false} size={26} />
                <span style={{ ...pixel, fontWeight: 500, fontSize: 13, color: '#a8a08c' }}>
                  Empuja {ETIQUETA_INDICADOR[abierto.dueno]}
                </span>
              </div>
            )}
            <div style={{ ...pixel, fontWeight: 500, fontSize: 12.5, color: '#6b6558' }}>
              {vistasDe(abierto)} de {(CARTAS_POR_PERSONAJE[abierto.nombre] ?? []).length} cartas
            </div>
            <button
              onClick={() => { sfx.boton(); setAbierto(null) }}
              style={{
                ...pixel,
                marginTop: 14,
                width: '100%',
                background: 'none',
                border: `1px solid ${COLOR.oro}`,
                borderRadius: 8,
                padding: '7px 16px',
                fontWeight: 400,
                fontSize: 15,
                color: COLOR.oro,
                cursor: 'pointer',
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function flecha(apagada: boolean) {
  return {
    ...pixel,
    width: 42,
    height: 32,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: apagada ? '#3d3a35' : COLOR.oro,
    fontSize: 20,
    lineHeight: 1,
    cursor: apagada ? 'default' : 'pointer',
  } as const
}
