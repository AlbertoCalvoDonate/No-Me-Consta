import { useEffect, useState } from 'react'
import type { Stats } from '../types'
import type { PasoPartida } from './logPruebas'
import { leerPerfil } from './perfil'

// MANDAR LA PARTIDA TERMINADA, PARA PODER MIRAR SI EL JUEGO ESTA BIEN.
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
//   - y, si contesto la encuesta de la primera partida, sus dos respuestas:
//     si juega a videojuegos y si conocia Reigns. Van las RESPUESTAS, no un
//     identificador (el porque esta explicado en utils/perfil).
//
// QUE NO SE MANDA, NI AQUI NI EN EL SERVIDOR: nada que identifique a nadie.
// Ni nombre, ni correo, ni telefono, ni IP guardada, ni identificador que
// sobreviva a la partida. El id lo pone el servidor, es aleatorio y es DE LA
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
  meses: number
  moralidad: number
  stats: Stats
  version: string
}

// Devuelve si se mando. No lanza nunca: que falle el envio no puede estropear
// la pantalla de fin de partida, que es lo que el jugador esta mirando.
export async function enviarPartida(pasos: PasoPartida[], f: Final): Promise<boolean> {
  if (estaApagado()) return false
  if (pasos.length === 0) return false

  const cuerpo = {
    version: f.version,
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

  try {
    // `keepalive` para que el envio sobreviva si el jugador cierra la pestaña
    // o le da a empezar otra en el mismo segundo: sin el, el navegador cancela
    // la peticion al cambiar de pantalla y se pierden justo las partidas de
    // quien juega del tiron, que son las interesantes.
    const r = await fetch('/api/partida', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo),
      keepalive: true,
    })
    return r.ok
  } catch {
    // Sin cobertura, o con un bloqueador de por medio. No se reintenta: una
    // partida perdida no es nada y reintentar en bucle si molesta.
    return false
  }
}
