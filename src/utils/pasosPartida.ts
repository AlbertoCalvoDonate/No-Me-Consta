import type { Stats } from '../types'

// LO QUE SE VA APUNTANDO DURANTE LA PARTIDA.
//
// Una linea por decision: que carta era, que lado se eligio y como quedaron
// las barras. Al terminar, esto es lo que se manda (ver utils/enviarPartida) y
// lo que luego se puede preguntar en SQL.
//
// Nacio como un apaño temporal: un boton rojo al final de la partida que abria
// el compartir del movil para que un tester pegara el texto en un chat. Eso
// funcionaba para las partidas de uno y no para las de nadie mas, que son las
// que hacen falta. El boton se ha quitado; lo que queda es esto, que es la
// mitad util.

export interface PasoPartida {
  turno: number
  carta: string
  lado: 'left' | 'right'
  stats: Stats
  moralidad: number
}

const CLAVE = 'nomeconsta.pasos'

// ESTO VIVIA EN MEMORIA, Y SE CAMBIO EL 01/10/2026 MIDIENDO.
//
// El comentario que habia aqui decia que perder el log al recargar era
// aceptable. Para una web lo era. Instalado como app no: Android mata lo que
// tiene de fondo, y el jugador vuelve a una partida que el juego habia
// guardado pero cuyo log ya no existia.
//
// Lo que llego ese dia a la base: de 213 decisiones esperadas entraron 183. Y
// lo que faltaba no era al azar, que es lo que lo hacia malo de verdad: al
// reanudar solo se mandaba la cola, asi que lo perdido eran SIEMPRE los turnos
// del principio. Tres partidas mandaron 4, 3 y 6 decisiones habiendo jugado
// 12, 15 y 12 meses. O sea que las cartas de apertura salian subrepresentadas
// justo en la estadistica con la que se juzga la apertura.
interface Guardado {
  sesion: string
  pasos: PasoPartida[]
}

// LA SESION: un valor aleatorio por PARTIDA, no por movil.
//
// Hace falta desde que se manda tambien la partida a medias (el jugador que se
// va sin terminar, ver utils/enviarPartida): sin el, una partida abandonada y
// esa misma partida cuando acaba serian dos filas distintas y la segunda
// contaria como una partida de mas.
//
// Y NO ROMPE lo que se le dice al jugador. Se genera al empezar cada partida y
// muere con ella: une dos envios de LA MISMA partida, que es justo lo que hace
// falta, y sigue sin poder unir dos partidas del mismo movil. Es la misma
// promesa que ya hacia el id del servidor (ver worker/esquema.sql), movida al
// cliente solo porque el servidor no puede saber que dos POST son la misma
// partida si nadie se lo dice.
function nuevaSesion(): string {
  try {
    return crypto.randomUUID()
  } catch {
    // Contextos sin crypto (http en una LAN, algun navegador viejo). No tiene
    // que ser infalsificable, solo distinto entre partidas del mismo movil.
    return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
  }
}

function leer(): Guardado {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (crudo) {
      const g = JSON.parse(crudo) as Guardado
      if (g && typeof g.sesion === 'string' && Array.isArray(g.pasos)) return g
    }
  } catch {
    // Incognito, almacenamiento lleno o un JSON a medias de un cierre brusco.
    // Se empieza de cero: es lo mismo que pasaba siempre antes de persistirlo.
  }
  return { sesion: nuevaSesion(), pasos: [] }
}

let estado: Guardado = leer()

function escribir() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado))
  } catch {
    // Si no cabe, la partida sigue: esto es telemetria, no el juego. Lo que no
    // puede pasar es que se caiga la pantalla por no poder apuntar un paso.
  }
}

export function apuntarPaso(p: PasoPartida) {
  estado.pasos.push(p)
  escribir()
}

export function limpiarLog() {
  // Partida nueva: log vacio y sesion nueva. Las dos cosas van juntas a
  // proposito — reusar la sesion haria que la partida nueva pisara la anterior
  // en la base, que es exactamente lo que la sesion existe para evitar.
  estado = { sesion: nuevaSesion(), pasos: [] }
  escribir()
}

// Lo apuntado hasta ahora. Lo necesita el envio automatico (utils/enviarPartida),
// que manda lo mismo que este fichero escribe en texto, pero como datos.
export function pasosDeLaPartida(): PasoPartida[] {
  return estado.pasos
}

export function sesionDeLaPartida(): string {
  return estado.sesion
}
