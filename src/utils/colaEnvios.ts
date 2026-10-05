// LAS PARTIDAS QUE TODAVIA NO HAN LLEGADO.
//
// EXISTE POR UNA MEDIDA, NO POR PRECAUCION. El 01/10/2026, con dieciseis
// partidas recogidas, se reconstruyo cuantas se habian jugado de verdad: el
// contador `partida_n` cuenta partidas TERMINADAS (ver hooks/useLogros), asi
// que un hueco en la numeracion es una partida que se acabo y nunca llego.
// Agrupando por las respuestas de la encuesta salieron 21 jugadas y 16
// recibidas. **Una de cada cuatro se perdia**, y es un suelo: si dos moviles
// cayeron en el mismo grupo, sus partidas se contaron una sola vez.
//
// Tres agujeros, y los tres los tapa tener cola:
//   - no se reintentaba nunca, asi que un segundo de mala cobertura era una
//     partida entera;
//   - la PRIMERA partida de cada jugador esperaba a que contestara la encuesta,
//     en memoria: cerrar la app en esa pantalla la perdia, y es la partida mas
//     valiosa que hay, la de alguien que acaba de llegar;
//   - un 400 del validador no se miraba.
//
// Lo que se encola es el cuerpo ya montado, no la partida en curso: asi lo
// pendiente no depende de que el juego siga como estaba cuando se genero.

const CLAVE = 'nomeconsta.porMandar'

// Veinte partidas sin poder mandarse son ya un movil sin conexion desde hace
// dias, no un fallo puntual. Se tira lo mas viejo: una partida de hace una
// semana contesta menos que la de hoy, y lo que no puede pasar es que esto
// crezca sin tope en el almacenamiento de alguien.
const MAX_EN_COLA = 20

// Lo unico que la cola necesita saber del cuerpo. El resto lo monta
// utils/enviarPartida, que es quien sabe que lleva una partida.
export interface Encolable {
  sesion: string
}

function leer<T extends Encolable>(): T[] {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return []
    const v = JSON.parse(crudo)
    return Array.isArray(v) ? (v as T[]) : []
  } catch {
    return []
  }
}

function escribir<T extends Encolable>(cola: T[]) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(cola))
  } catch {
    // Sin almacenamiento no hay cola, y el envio se queda como estaba antes de
    // que esto existiera: se intenta una vez y si falla se pierde.
  }
}

// Mete una partida a la espera. Si ya habia una de la MISMA sesion, la
// sustituye: es la misma partida mas avanzada (la abandonada que luego acabo),
// y mandar las dos seria contarla dos veces.
export function encolar<T extends Encolable>(cuerpo: T) {
  const cola = leer<T>().filter((c) => c.sesion !== cuerpo.sesion)
  cola.push(cuerpo)
  escribir(cola.slice(-MAX_EN_COLA))
}

export function hayPendientes(): boolean {
  return leer().length > 0
}

// Un solo vaciado a la vez. Sin esto, abrir el juego y terminar una partida
// casi a la vez lanzaria dos vaciados sobre la misma cola y la misma partida
// se mandaria dos veces.
let vaciando = false

// Intenta mandar todo lo pendiente. Devuelve cuantas entraron.
//
// No lanza nunca y no espera a nadie: se llama al abrir el juego y al terminar
// una partida, y en los dos sitios lo que el jugador esta mirando importa mas
// que esto.
export async function vaciarCola(): Promise<number> {
  if (vaciando) return 0
  vaciando = true
  try {
    let cola = leer()
    let entraron = 0
    for (const cuerpo of cola) {
      let fuera = false
      try {
        const r = await fetch('/api/partida', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(cuerpo),
          keepalive: true,
        })
        if (r.ok) {
          fuera = true
          entraron += 1
        } else if (r.status >= 400 && r.status < 500) {
          // El servidor dice que esa partida no cuadra (ver worker/index.ts).
          // Reintentarla es gastar bateria para que la rechacen otra vez: se
          // tira y queda en los logs del Worker, que es donde se puede mirar.
          fuera = true
        }
        // Un 5xx se queda en la cola: ahi el fallo es del servidor y mañana
        // puede entrar perfectamente.
      } catch {
        // Sin cobertura. Se para aqui: si no hay red, las siguientes van a
        // fallar igual y no tiene sentido intentarlas una por una.
        break
      }
      if (fuera) {
        // Se reescribe DESPUES de cada una y no al final: si el navegador mata
        // la pestaña a mitad del bucle, lo ya entregado no se vuelve a mandar.
        cola = leer().filter((c) => c.sesion !== cuerpo.sesion)
        escribir(cola)
      }
    }
    return entraron
  } finally {
    vaciando = false
  }
}
