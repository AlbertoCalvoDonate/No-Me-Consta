import { LOGROS } from '../data/logros'
import { useLogrosEstado } from '../hooks/useLogros'
import { COLOR, pixel } from '../utils/estilo'
import { sfx } from '../utils/sfx'

// Lista completa de logros. Los conseguidos van tachados y en dorado; los que
// faltan, en gris. Los ocultos que aún no tienes no revelan la descripción.
export function LogrosPanel({ onCerrar }: { onCerrar: () => void }) {
  const { conseguidos, total, hechos } = useLogrosEstado()

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
              ...pixel,
              fontWeight: 400,
              fontSize: 22,
              color: COLOR.oro,
            }}
          >
            Logros
          </div>
          <div
            style={{
              ...pixel,
              fontWeight: 500,
              fontSize: 13,
              color: COLOR.apagado,
              marginTop: 2,
            }}
          >
            {hechos} de {total}
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

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 20px' }}>
        {LOGROS.map((l, i) => {
          const hecho = conseguidos.has(l.id)
          const tapado = l.oculto && !hecho
          // Cabecera al empezar cada bloque, con cuantos llevas de el: 49
          // logros de corrido no dejaban ver que hay tramos muy distintos
          // (durar, epitetos, tramas, coleccion) ni por donde vas en cada uno.
          const abre = i === 0 || LOGROS[i - 1].grupo !== l.grupo
          const delGrupo = abre ? LOGROS.filter((x) => x.grupo === l.grupo) : []
          const hechosGrupo = delGrupo.filter((x) => conseguidos.has(x.id)).length
          // Los ocultos que aun no tienes se juntan en UNA linea al final de su
          // bloque. Pintados uno a uno eran filas identicas ("Logro oculto /
          // Sigue jugando para descubrirlo"): en "Por donde cae" salian nueve
          // seguidas y la seccion entera parecia un error. Al conseguirlos van
          // apareciendo con su nombre y el contador de pendientes baja.
          const cierra = i === LOGROS.length - 1 || LOGROS[i + 1].grupo !== l.grupo
          const pendientes = () =>
            LOGROS.filter((x) => x.grupo === l.grupo && x.oculto && !conseguidos.has(x.id)).length
          // Un oculto no pinta fila propia: solo arrastra la cabecera si abre el
          // bloque y el resumen si lo cierra.
          if (tapado) {
            if (!abre && !cierra) return null
            return (
              <div key={l.id}>
                {abre && (
                  <Cabecera grupo={l.grupo} hechos={hechosGrupo} total={delGrupo.length} primero={i === 0} />
                )}
                {cierra && <FilaOcultos n={pendientes()} />}
              </div>
            )
          }
          return (
            <div key={l.id}>
            {abre && (
              <Cabecera grupo={l.grupo} hechos={hechosGrupo} total={delGrupo.length} primero={i === 0} />
            )}
            <div
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
                  background: hecho ? COLOR.oro : 'rgba(255,255,255,0.1)',
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
                    ...pixel,
                    fontWeight: 400,
                    fontSize: 16,
                    color: hecho ? COLOR.texto : '#b7b1a3',
                    lineHeight: 1.25,
                  }}
                >
                  {tapado ? 'Logro oculto' : l.nombre}
                </div>
                <div
                  style={{
                    ...pixel,
                    fontWeight: 500,
                    fontSize: 13,
                    color: COLOR.apagado,
                    lineHeight: 1.35,
                    marginTop: 2,
                  }}
                >
                  {tapado ? 'Sigue jugando para descubrirlo.' : l.desc}
                </div>
              </div>
            </div>
            {/* Los ocultos del bloque, en una sola linea al cerrarlo. */}
            {cierra && <FilaOcultos n={pendientes()} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Cabecera de bloque con el progreso de ese bloque.
function Cabecera({
  grupo,
  hechos,
  total,
  primero,
}: {
  grupo: string
  hechos: number
  total: number
  primero: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 8,
        margin: primero ? '4px 6px 2px' : '20px 6px 2px',
        paddingBottom: 4,
        borderBottom: '1px solid rgba(224,184,77,0.22)',
      }}
    >
      <span
        style={{
          ...pixel,
          fontWeight: 500,
          fontSize: 12,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: COLOR.apagado,
        }}
      >
        {grupo}
      </span>
      <span
        style={{
          ...pixel,
          fontWeight: 500,
          fontSize: 12,
          color: hechos === total ? COLOR.oro : '#5f5a50',
        }}
      >
        {hechos}/{total}
      </span>
    </div>
  )
}

// Todos los ocultos pendientes de un bloque, en una linea.
function FilaOcultos({ n }: { n: number }) {
  if (n === 0) return null
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        padding: '10px 6px',
        opacity: 0.4,
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          flexShrink: 0,
          borderRadius: '50%',
          border: '1px dashed rgba(255,255,255,0.25)',
          boxSizing: 'border-box',
        }}
      />
      <div
        style={{
          ...pixel,
          fontWeight: 500,
          fontSize: 14,
          color: COLOR.apagado,
        }}
      >
        {n === 1 ? '1 logro oculto por descubrir' : `${n} logros ocultos por descubrir`}
      </div>
    </div>
  )
}
