// QUIEN ESTA JUGANDO, EN DOS PREGUNTAS.
//
// Sin esto, los numeros que llegan no se pueden leer. "Duro veinte meses" no
// quiere decir nada por si solo: no es lo mismo veinte meses de alguien que
// juega todos los dias y conoce el genero que veinte meses de alguien que no
// ha tocado un videojuego en su vida. Lo primero es que el juego es duro; lo
// segundo es que el juego es normal. Hasta ahora no habia forma de saber cual
// de las dos cosas estabamos mirando.
//
// SE PREGUNTA UNA VEZ, al acabar la PRIMERA partida: antes de jugar nadie sabe
// de que le hablas, y a la tercera ya es un peaje.
//
// Y SE PUEDE PASAR DE LARGO. Una encuesta de la que no se puede salir se
// contesta a lo loco, que es peor que no tener respuesta: ensucia el dato con
// ruido que parece señal.
//
// ===========================================================================
// POR QUE SE MANDAN LAS RESPUESTAS Y NO UN IDENTIFICADOR
//
// Lo util es cruzar el perfil con las partidas: "¿los que conocen Reigns duran
// mas?". Para eso la forma obvia seria ponerle un numero al movil y mandarlo
// con cada partida. Y eso seria, exactamente, un identificador que sigue a una
// persona entre partidas: justo lo que el aviso dice que NO hay.
//
// Asi que no se manda un identificador: se mandan LAS RESPUESTAS, pegadas a
// cada partida. Se puede comparar igual de bien -"partidas de gente que juega
// a menudo" contra "partidas de gente que no"-, y dos personas que contestan
// lo mismo son indistinguibles, asi que sigue sin poderse juntar dos partidas
// de nadie. Se gana el analisis y no se pierde la promesa.
// ===========================================================================

const CLAVE = 'nomeconsta.perfil'

export type Juega = 'a-menudo' | 'a-veces' | 'casi-nunca'
export type Reigns = 'jugado' | 'suena' | 'no'

export interface Perfil {
  juega?: Juega
  reigns?: Reigns
  // Que ya se pregunto, aunque no contestara. Sin esto, quien se la salta la
  // tiene delante otra vez cada partida.
  preguntado?: boolean
}

export function leerPerfil(): Perfil {
  try {
    const raw = localStorage.getItem(CLAVE)
    if (!raw) return {}
    const p = JSON.parse(raw) as Perfil
    return p && typeof p === 'object' ? p : {}
  } catch {
    return {}
  }
}

export function guardarPerfil(p: Perfil) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ ...leerPerfil(), ...p }))
  } catch {
    /* sin almacenamiento se preguntara otra vez; no es grave */
  }
}

export function yaSePregunto(): boolean {
  return leerPerfil().preguntado === true
}
