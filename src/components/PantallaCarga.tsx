import { useEffect, useRef, useState } from 'react'
import { COLOR, pixel } from '../utils/estilo'

// Los 22 retratos pesan 1,29 MB y el motor evita repetir personaje, asi que
// las quince primeras cartas de una partida tocan casi quince caras distintas:
// medido, hacen falta LOS 22 para que ninguna salga sin cara (con 18 todavia
// se cuela una). No hay subconjunto util que precargar, es todo o nada.
//
// De ahi esta pantalla: se esperan aqui y a partir de entonces cada carta sale
// al instante, para siempre. En fibra dura un parpadeo.
//
// Lo que no hace nunca es dejar al jugador tirado. Si la red va mal, a los
// TOPE_MS entra igual y el resto sigue cargandose de fondo, que es exactamente
// el comportamiento que habia antes de esta pantalla. Peor que antes no se
// puede poner.
const TOPE_MS = 6000

export function PantallaCarga({ imagenes, onListo }: { imagenes: string[]; onListo: () => void }) {
  const [hechas, setHechas] = useState(0)
  const salido = useRef(false)

  useEffect(() => {
    const salir = () => {
      if (salido.current) return
      salido.current = true
      onListo()
    }
    if (imagenes.length === 0) {
      salir()
      return
    }
    // De cuatro en cuatro, no las 22 de golpe. Si salta el tope y entramos al
    // juego con la descarga a medias, lo que quede en vuelo compite con la
    // imagen de la carta que el jugador esta mirando: medido en 3G lanzando
    // las 22 a la vez, la primera carta tardaba 7,4 s en tener cara. Con
    // cuatro como mucho, la cola que hereda el juego es corta.
    const A_LA_VEZ = 4
    let vivas = true
    let lanzada = 0
    let n = 0
    const t0 = Date.now()
    const lanzar = () => {
      if (!vivas || lanzada >= imagenes.length) return
      const nombre = imagenes[lanzada++]
      const img = new Image()
      img.onload = img.onerror = () => {
        if (!vivas) return
        n++
        setHechas(n)
        if (n >= imagenes.length) return salir()
        // No esperar a agotar el tope para rendirse. Con cuatro descargas
        // hechas ya se sabe a que ritmo va la red: si la cuenta dice que no
        // llega, se entra YA al juego y el resto viene de fondo. Quedarse aqui
        // seis segundos para entrar igual de mal es lo peor de las dos cosas.
        if (n >= A_LA_VEZ) {
          const prevision = ((Date.now() - t0) / n) * imagenes.length
          if (prevision > TOPE_MS) return salir()
        }
        lanzar()
      }
      img.src = '/characters/' + nombre
    }
    for (let i = 0; i < A_LA_VEZ; i++) lanzar()
    // Sonda temprana. La cuenta de arriba solo sirve cuando ya ha terminado
    // alguna descarga, y en 3G con cuatro a la vez la primera no acaba hasta
    // pasados casi cinco segundos: para cuando la cuenta habla, el jugador ya
    // ha esperado de mas. Esto mira el reloj, no las descargas: si al segundo
    // y medio no han entrado ni dos, la red no da para esta pantalla y se
    // entra al juego. En fibra las 22 estan a los 0,4 s, asi que no salta.
    const sonda = window.setTimeout(() => {
      if (n < 2) salir()
    }, 1500)
    const reloj = window.setTimeout(salir, TOPE_MS)
    return () => {
      vivas = false
      window.clearTimeout(sonda)
      window.clearTimeout(reloj)
    }
  }, [imagenes, onListo])

  const pct = imagenes.length ? Math.round((hechas / imagenes.length) * 100) : 100
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div style={{ ...pixel, fontWeight: 400, fontSize: 26, color: COLOR.oro, lineHeight: 1.2 }}>
        Formando gobierno
      </div>
      {/* La barra es la misma tira de segmentos que los indicadores del juego,
          para que esto no parezca una pantalla de otra aplicacion. */}
      <div style={{ display: 'flex', gap: 2, width: '100%', maxWidth: 260, height: 8 }}>
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              borderRadius: 1,
              background: i < Math.round(pct / 5) ? COLOR.oro : 'rgba(255,255,255,0.14)',
            }}
          />
        ))}
      </div>
      <div style={{ ...pixel, fontWeight: 500, fontSize: 14, color: COLOR.apagado }}>
        Reuniendo al gabinete… {pct}%
      </div>
    </div>
  )
}
