import { useState } from 'react'
import { COLOR, pixel } from '../utils/estilo'
import { sfx } from '../utils/sfx'
import { guardarPerfil, type Juega, type Reigns } from '../utils/perfil'
import { useAtrasCierra } from '../utils/botonAtras'

// LAS DOS PREGUNTAS, al acabar la primera partida.
//
// Por qué existe y por qué se mandan las respuestas y no un identificador:
// ver utils/perfil. Aquí solo está la pantalla.
//
// Dos preguntas y se acabó. Cada una más es gente que la cierra, y una
// encuesta a medias no vale: si no se sabe si juega, saber si conocía Reigns
// no dice nada.
//
// Se puede saltar, y el botón de saltar se ve igual que los demás. Una
// encuesta de la que no se puede salir se contesta a lo loco, y eso es peor
// que no tener respuesta: ensucia el dato con ruido que parece señal.

const JUEGA: { valor: Juega; texto: string }[] = [
  { valor: 'a-menudo', texto: 'A menudo' },
  { valor: 'a-veces', texto: 'De vez en cuando' },
  { valor: 'casi-nunca', texto: 'Casi nunca' },
]

const REIGNS: { valor: Reigns; texto: string }[] = [
  { valor: 'jugado', texto: 'Lo he jugado' },
  { valor: 'suena', texto: 'Me suena' },
  { valor: 'no', texto: 'No' },
]

export function Encuesta({ onCerrar }: { onCerrar: () => void }) {
  const [juega, setJuega] = useState<Juega | null>(null)
  const [reigns, setReigns] = useState<Reigns | null>(null)
  useAtrasCierra(true, onCerrar)

  const terminar = (guardando: boolean) => {
    sfx.boton()
    guardarPerfil(
      guardando
        ? { juega: juega ?? undefined, reigns: reigns ?? undefined, preguntado: true }
        : { preguntado: true }
    )
    onCerrar()
  }

  const opcion = (puesto: boolean) =>
    ({
      ...pixel,
      flex: 1,
      minWidth: 0,
      background: puesto ? 'rgba(224,184,77,0.14)' : 'none',
      border: `1px solid ${puesto ? COLOR.oro : 'rgba(255,255,255,0.14)'}`,
      borderRadius: 8,
      padding: '8px 6px',
      fontWeight: 500,
      fontSize: 13,
      lineHeight: 1.25,
      color: puesto ? COLOR.oro : COLOR.apagado,
      cursor: 'pointer',
    }) as const

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 45,
        background: 'rgba(0,0,0,0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 22,
      }}
    >
      <div
        style={{
          background: COLOR.panel,
          border: '1px solid rgba(255,255,255,0.16)',
          borderRadius: 14,
          padding: '20px 18px 16px',
          maxWidth: 320,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <p style={{ ...pixel, margin: '0 0 4px', fontWeight: 400, fontSize: 19, lineHeight: 1.3, color: COLOR.texto, textAlign: 'center' }}>
          Dos preguntas y le dejo
        </p>
        <p style={{ ...pixel, margin: '0 0 16px', fontWeight: 500, fontSize: 13, lineHeight: 1.4, color: COLOR.apagado, textAlign: 'center' }}>
          Sirven para saber si el juego está bien de dificultad. Sin ellas, "duró
          veinte meses" no dice nada.
        </p>

        <p style={{ ...pixel, margin: '0 0 7px', fontWeight: 500, fontSize: 14, color: COLOR.texto }}>
          ¿Juegas a videojuegos?
        </p>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {JUEGA.map((o) => (
            <button key={o.valor} onClick={() => { sfx.boton(); setJuega(o.valor) }} style={opcion(juega === o.valor)}>
              {o.texto}
            </button>
          ))}
        </div>

        <p style={{ ...pixel, margin: '0 0 7px', fontWeight: 500, fontSize: 14, color: COLOR.texto }}>
          ¿Conocías <em>Reigns</em>?
        </p>
        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          {REIGNS.map((o) => (
            <button key={o.valor} onClick={() => { sfx.boton(); setReigns(o.valor) }} style={opcion(reigns === o.valor)}>
              {o.texto}
            </button>
          ))}
        </div>

        <button
          onClick={() => terminar(true)}
          disabled={!juega && !reigns}
          style={{
            ...pixel,
            width: '100%',
            background: juega || reigns ? COLOR.oro : 'rgba(255,255,255,0.07)',
            border: 'none',
            borderRadius: 8,
            padding: '9px 16px',
            fontWeight: 400,
            fontSize: 17,
            color: juega || reigns ? '#1a1508' : '#5a5650',
            cursor: juega || reigns ? 'pointer' : 'default',
          }}
        >
          Enviar
        </button>
        <button
          onClick={() => terminar(false)}
          style={{
            ...pixel,
            width: '100%',
            marginTop: 8,
            background: 'none',
            border: 'none',
            padding: '6px 0',
            fontWeight: 500,
            fontSize: 13,
            color: COLOR.apagado,
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          Paso de contestar
        </button>
      </div>
    </div>
  )
}
