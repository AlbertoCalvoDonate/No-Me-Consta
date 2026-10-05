import { useEffect, useState } from 'react'
import type { Stats } from '../types'
import type { PasoPartida } from './pasosPartida'
import { sesionDeLaPartida } from './pasosPartida'
import { encolar, vaciarCola, type Encolable } from './colaEnvios'
import { leerPerfil } from './perfil'
import { sonPruebas } from './soyPruebas'

// MANDAR LA PARTIDA, PARA PODER MIRAR SI EL JUEGO ESTA BIEN.
//
// Hasta ahora esto se hacia a mano: un boton rojo abria el compartir del movil
// y alguien pegaba el texto en un chat. Funciona para las partidas de uno y no
// funciona para las de nadie mas, que son justo las que hacen falta: lo que no
// se puede saber solo es como juega gente que no eres tu.
//
// QUE SE MANDA, Y ES TODO LO QUE SE MANDA:
//   - que carta salio, en que mes, y a que lado se decidio
//   - las cuatro barras y la moralidad despues de cada decision
//   - como acabo y cuanto duro
//   - la cuanta partida es esta en este movil (un numero, no un identificador)
//   - un valor aleatorio de ESTA partida, que muere con ella (ver `sesion`)
//   - y, si contesto la encuesta de la primera partida, sus dos respuestas:
//     si juega a videojuegos y si conocia Reigns. Van las RESPUESTAS, no un
//     identificador (el porque esta explicado en utils/perfil).
//
// QUE NO SE MANDA, NI AQUI NI EN EL SERVIDOR: nada que identifique a nadie.
// Ni nombre, ni correo, ni telefono, ni IP guardada, ni identificador que
// sobreviva a la partida. El id de la fila lo pone el servidor y es DE LA
// PARTIDA: dos partidas del mismo movil no se pueden relacionar entre si.
// Esto no es una promesa de intenciones, es que el dato no existe en ningun
// sitio (ver worker/esquema.sql).
//
// Y SE PUEDE APAGAR, desde la propia pantalla donde se avisa.

const CLAVE_APAGADO = 'nomeconsta.noMandarPartidas'
const CLAVE_AVISADO = 'nomeconsta.avisoPartidas'

// En una partida larguisima son ~150 decisiones y unos 12 KB. El servidor
// corta en 64 KB; aqui se corta antes para no mandar lo que se va a rechazar.
const MAX_DECISIONES = 400

// El `final` de una partida que el jugador dejo a medias. No es una carta del
// mazo, asi que no choca con ningun id de final de verdad: y por eso las
// consultas pueden quitarlas con un `final <> 'abandonada'` (ver
// worker/consultas.sql, donde ya estan quitadas de todo lo que mide muertes).
export const ABANDONADA = 'abandonada'

export function estaApagado(): boolean {
  try {
    return localStorage.getItem(CLAVE_APAGADO) === '1'
  } catch {
    // Sin almacenamiento no se puede recordar la decision del jugador, y
    // mandar sin poder recordar que dijo que no seria pasarselo por encima.
    return true
  }
}

export function apagar(apagado: boolean) {
  try {
    if (apagado) localStorage.setItem(CLAVE_APAGADO, '1')
    else localStorage.removeItem(CLAVE_APAGADO)
  } catch {
    /* sin almacenamiento ya no se manda nada de todos modos */
  }
}

export function yaSeAviso(): boolean {
  try {
    return localStorage.getItem(CLAVE_AVISADO) === '1'
  } catch {
    return true
  }
}

export function apuntarAviso() {
  try {
    localStorage.setItem(CLAVE_AVISADO, '1')
  } catch {
    /* da igual */
  }
}

// Hook para que la pantalla de ajustes sepa como esta el interruptor sin
// leerlo de localStorage en cada pintado.
export function useMandarPartidas(): [boolean, (v: boolean) => void] {
  const [manda, setManda] = useState(() => !estaApagado())
  useEffect(() => {
    apagar(!manda)
  }, [manda])
  return [manda, setManda]
}

interface Final {
  finalId: string
  // La CUANTA partida es esta en este movil. No es un identificador: es un
  // numero, y dos personas distintas en su quinta partida mandan el mismo 5.
  //
  // Con esto se contesta "¿la gente mejora?" -comparar las primeras partidas
  // contra las decimas, en el monton- que es lo que se queria saber poniendo
  // un id por movil. Sin el id no se puede seguir a UNA persona, pero la
  // pregunta de verdad no era sobre una persona: era sobre la curva.
  numeroDePartida: number
  meses: number
  moralidad: number
  stats: Stats
  version: string
}

interface Cuerpo extends Encolable {
  version: string
  partidaN: number
  final: string
  meses: number
  moralidad: number
  medios: number
  gobierno: number
  calle: number
  caja: number
  juega: string | null
  reigns: string | null
  pruebas?: true
  decisiones: {
    turno: number
    carta: string
    lado: 'I' | 'D'
    medios: number
    gobierno: number
    calle: number
    caja: number
    moralidad: number
  }[]
}

function montar(pasos: PasoPartida[], f: Final): Cuerpo {
  return {
    // Une los envios de ESTA partida -la abandonada y, si vuelve, la que
    // acaba- para que el servidor sepa que son la misma fila y no dos. Muere
    // con la partida (ver utils/pasosPartida).
    sesion: sesionDeLaPartida(),
    version: f.version,
    partidaN: Math.max(1, Math.round(f.numeroDePartida)),
    final: f.finalId,
    meses: Math.max(0, Math.round(f.meses)),
    moralidad: Math.round(f.moralidad),
    medios: f.stats.medios,
    gobierno: f.stats.gobierno,
    calle: f.stats.calle,
    caja: f.stats.caja,
    // Las respuestas de la encuesta, si las hay. `null` cuando no contesto:
    // asi se distingue "no juega" de "no lo sabemos", que no es lo mismo.
    juega: leerPerfil().juega ?? null,
    reigns: leerPerfil().reigns ?? null,
    // "Esto es una prueba mia, no cuenta". Lo dice el movil porque el servidor
    // no puede saberlo: no viaja ningun identificador (ver utils/soyPruebas).
    // No identifica a nadie: es una etiqueta sobre la partida, no sobre quien
    // la juega. Apagado, no se manda nada.
    pruebas: sonPruebas() ? true : undefined,
    decisiones: pasos.slice(0, MAX_DECISIONES).map((p) => ({
      turno: p.turno,
      carta: p.carta,
      // 'I' / 'D' como en el log que ya se compartia a mano, para que lo
      // guardado se lea igual que lo que ya hay en logs-pruebas/.
      lado: p.lado === 'left' ? 'I' : 'D',
      medios: p.stats.medios,
      gobierno: p.stats.gobierno,
      calle: p.stats.calle,
      caja: p.stats.caja,
      moralidad: Math.round(p.moralidad),
    })),
  }
}

// La partida terminada. Devuelve si llego. No lanza nunca: que falle el envio
// no puede estropear la pantalla de fin de partida, que es lo que el jugador
// esta mirando.
//
// Ya no manda a pelo: encola y vacia. Asi una partida que no sale a la primera
// sale al abrir el juego la proxima vez, en vez de perderse (ver
// utils/colaEnvios, donde esta medido cuanto se perdia).
export async function enviarPartida(pasos: PasoPartida[], f: Final): Promise<boolean> {
  if (estaApagado()) return false
  if (pasos.length === 0) return false
  encolar(montar(pasos, f))
  return (await vaciarCola()) > 0
}

// LA PARTIDA QUE EL JUGADOR DEJA A MEDIAS.
//
// El agujero que esto tapa: `enviarPartida` solo corria al acabar, asi que
// quien abria el juego, jugaba cuatro meses y no volvia no mandaba NADA. Las
// medidas que salian de la base eran, por construccion, de gente que habia
// llegado a un final: y la pregunta que mas importa en un playtest es justo
// la contraria: si la gente se cae antes de engancharse.
//
// Va con `sendBeacon` y no con `fetch`: cuando el navegador oculta la pestaña
// puede cancelar peticiones en vuelo, y la baliza esta hecha para que el
// sistema la entregue cuando ya no hay pagina. Ademas se encola igual, por si
// no sale: la sesion hace que mandarla dos veces sea inofensivo, porque el
// servidor actualiza la misma fila en vez de crear otra.
// Lo ultimo que se mando, para no repetirlo. Irse al WhatsApp y volver seis
// veces sin tocar una carta son seis ocultamientos y una sola partida: sin
// esto, seis POST identicos que acaban en el mismo UPDATE.
let ultimoAbandono = ''

export function enviarAbandonada(pasos: PasoPartida[], f: Omit<Final, 'finalId'>) {
  if (estaApagado()) return
  if (pasos.length === 0) return
  const huella = `${sesionDeLaPartida()}:${pasos.length}`
  if (huella === ultimoAbandono) return
  ultimoAbandono = huella
  const cuerpo = montar(pasos, { ...f, finalId: ABANDONADA })
  encolar(cuerpo)
  try {
    navigator.sendBeacon?.(
      '/api/partida',
      new Blob([JSON.stringify(cuerpo)], { type: 'application/json' })
    )
  } catch {
    // Sin sendBeacon (o con un bloqueador): se queda en la cola y sale a la
    // proxima que abra el juego.
  }
}

export { vaciarCola }
