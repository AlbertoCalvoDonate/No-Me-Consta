// EL WORKER: sirve el juego y recoge las partidas.
//
// OJO, ESTE FICHERO DECIDE SI LA WEB FUNCIONA. Antes de que existiera, el
// Worker no tenia codigo: Cloudflare servia `dist/` tal cual con la
// configuracion del panel. Al aparecer un `main` en wrangler.jsonc, TODA
// peticion que no case con un fichero estatico pasa por aqui. Por eso lo
// ultimo que hace esta funcion, pase lo que pase, es devolver el sitio:
// cualquier error de lo de abajo no puede dejar el juego sin servir.
//
// Lo propio son dos rutas y nada mas:
//   POST /api/partida   el juego manda una partida terminada
//   GET  /api/partidas  se las descarga quien tenga la clave
//
// Para volver atras si algo sale mal: `npx wrangler rollback --name no-me-consta`,
// o quitar `main` de wrangler.jsonc y desplegar.

interface Env {
  ASSETS: Fetcher
  nomeconsta_partidas: D1Database
  // Secreto para poder LEER lo recogido. Se pone con:
  //   npx wrangler secret put CLAVE_LECTURA
  // Si no esta puesto, la ruta de lectura responde 404 y no se puede sacar
  // nada: es mejor que quede inaccesible a que quede abierta por olvido.
  CLAVE_LECTURA?: string
}

// Tope de tamaño. Una partida larguisima (150 decisiones) ocupa unos 12 KB;
// 64 KB deja margen de sobra y corta en seco a quien quiera llenar la base.
const MAX_BYTES = 64 * 1024
const MAX_DECISIONES = 400

interface Decision {
  turno: number
  carta: string
  lado: string
  medios: number
  gobierno: number
  calle: number
  caja: number
  moralidad: number
}

interface Partida {
  version: string
  final: string
  meses: number
  moralidad: number
  medios: number
  gobierno: number
  calle: number
  caja: number
  // Las dos respuestas de la encuesta, o null si no la contesto. Son valores
  // de una lista cerrada: cualquier otra cosa se guarda como null en vez de
  // rechazar la partida entera, que seria perder el dato bueno por el malo.
  juega: string | null
  reigns: string | null
  // 'pruebas' cuando el propio movil dice que esa partida es una prueba y no
  // cuenta para medir. Es lo UNICO que puede valer: el campo no es texto
  // libre, asi que nadie puede meter por aqui lo que quiera.
  quien: string | null
  // La cuanta partida es esta en ese movil. Un numero, no un identificador:
  // dos personas distintas en su quinta partida mandan el mismo 5. Sirve para
  // la pregunta "¿la gente mejora?" sin saber quien es nadie.
  partidaN: number
  // Aleatorio y DE ESTA PARTIDA, generado por el movil al empezarla. Une la
  // partida a medias con la misma partida ya acabada, para que sea una fila y
  // no dos (ver worker/esquema.sql). `null` lo manda una version antigua del
  // juego: entonces se guarda como siempre, una fila nueva y a correr.
  sesion: string | null
  decisiones: Decision[]
}

const JUEGA = ['a-menudo', 'a-veces', 'casi-nunca']
const REIGNS = ['jugado', 'suena', 'no']
const deLista = (v: unknown, lista: string[]): string | null =>
  typeof v === 'string' && lista.includes(v) ? v : null

const entero = (v: unknown, min: number, max: number): number | null => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  const n = Math.round(v)
  return n >= min && n <= max ? n : null
}

const texto = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.length > 0 && v.length <= max ? v : null

// Se valida campo a campo y no "a ver si parece bien". Esto esta abierto a
// internet: lo que entre aqui es lo que luego se mira para decidir si el juego
// es demasiado dificil, asi que basura dentro es decisiones de diseño mal
// tomadas despues.
function leerPartida(x: unknown): Partida | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  const version = texto(o.version, 20)
  const final = texto(o.final, 60)
  const meses = entero(o.meses, 0, 1000)
  const moralidad = entero(o.moralidad, 0, 10)
  const medios = entero(o.medios, 0, 10)
  const gobierno = entero(o.gobierno, 0, 10)
  const calle = entero(o.calle, 0, 10)
  const caja = entero(o.caja, 0, 10)
  if (
    version === null || final === null || meses === null || moralidad === null ||
    medios === null || gobierno === null || calle === null || caja === null
  ) {
    return null
  }
  if (!Array.isArray(o.decisiones) || o.decisiones.length > MAX_DECISIONES) return null
  const juega = deLista(o.juega, JUEGA)
  const reigns = deLista(o.reigns, REIGNS)
  const quien = o.pruebas === true ? 'pruebas' : null
  const partidaN = entero(o.partidaN, 1, 100000) ?? 1
  // Opcional a proposito: si no viene, o viene rara, se trata como una partida
  // suelta. Rechazar la partida entera por esto seria perder el dato bueno.
  const sesion = texto(o.sesion, 64)

  const decisiones: Decision[] = []
  for (const d of o.decisiones) {
    if (!d || typeof d !== 'object') return null
    const e = d as Record<string, unknown>
    const turno = entero(e.turno, 0, 1000)
    const carta = texto(e.carta, 60)
    const lado = e.lado === 'I' || e.lado === 'D' ? (e.lado as string) : null
    const m = entero(e.medios, 0, 10)
    const g = entero(e.gobierno, 0, 10)
    const c = entero(e.calle, 0, 10)
    const b = entero(e.caja, 0, 10)
    const mo = entero(e.moralidad, 0, 10)
    if (turno === null || carta === null || lado === null || m === null || g === null || c === null || b === null || mo === null) {
      return null
    }
    decisiones.push({ turno, carta, lado, medios: m, gobierno: g, calle: c, caja: b, moralidad: mo })
  }
  return { version, final, meses, moralidad, medios, gobierno, calle, caja, juega, reigns, quien, partidaN, sesion, decisiones }
}

async function guardar(env: Env, p: Partida): Promise<Response> {
  const cuando = Date.now()

  // UNA SOLA SENTENCIA DECIDE SI ES FILA NUEVA O LA MISMA DE ANTES.
  //
  // Lo segundo pasa siempre que alguien deja la partida a medias y vuelve:
  // primero llego la abandonada (por la baliza al ocultarse la pestaña) y
  // ahora llega acabada. Es LA MISMA partida, asi que se actualiza su fila en
  // vez de anadir otra — si no, cada vez que alguien se va al WhatsApp y
  // vuelve habria una muerte de mas en la base.
  //
  // SE HIZO ASI DESPUES DE VERLO FALLAR. El primer intento miraba antes con un
  // SELECT y decidia entre UPDATE e INSERT con lo que encontraba. Probandolo
  // salieron cinco decisiones colgando de una partida inexistente: dos envios
  // casi a la vez pasaron los dos por el SELECT sin encontrar nada, cada uno
  // se invento su id, el segundo choco contra el indice UNIQUE y actualizo la
  // fila del primero — pero sus decisiones ya iban con el id que se habia
  // inventado, que no existia en `partidas`.
  //
  // Con RETURNING no hay hueco donde quepa esa carrera: la base dice cual es
  // el id de verdad DESPUES de resolver el conflicto, y las decisiones van con
  // ese. Cuesta una ida y vuelta mas, y a cambio no puede mentir.
  //
  // El id lo sigue poniendo el SERVIDOR y es de la partida, no del jugador:
  // dos partidas del mismo movil no se pueden relacionar. Es lo que hace
  // cierto el "nada personal" que se le dice al jugador. La sesion que manda
  // el movil tampoco lo rompe: tambien es de la partida y muere con ella.
  const fila = await env.nomeconsta_partidas
    .prepare(
      'INSERT INTO partidas (id, cuando, version, final, meses, moralidad, medios, gobierno, calle, caja, juega, reigns, quien, partida_n, sesion)' +
        ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)' +
        ' ON CONFLICT(sesion) DO UPDATE SET cuando=excluded.cuando, version=excluded.version,' +
        ' final=excluded.final, meses=excluded.meses, moralidad=excluded.moralidad,' +
        ' medios=excluded.medios, gobierno=excluded.gobierno, calle=excluded.calle,' +
        ' caja=excluded.caja, juega=excluded.juega, reigns=excluded.reigns,' +
        ' quien=excluded.quien, partida_n=excluded.partida_n' +
        ' RETURNING id'
    )
    .bind(crypto.randomUUID(), cuando, p.version, p.final, p.meses, p.moralidad, p.medios, p.gobierno, p.calle, p.caja, p.juega, p.reigns, p.quien, p.partidaN, p.sesion)
    .first<{ id: string }>()
  // Con `sesion` a NULL -una version antigua del juego- no hay conflicto
  // posible y entra como entraba siempre: fila nueva y a correr.
  if (!fila) return new Response('no se pudo guardar', { status: 500 })
  const id = fila.id

  // Las decisiones se reemplazan enteras en vez de anadirse. La partida que
  // llega ahora contiene TODO lo que paso -el log vive en localStorage desde
  // el 01/10/2026 (ver utils/pasosPartida)-, asi que lo de antes es un prefijo
  // de esto y mezclarlos solo puede dar un turno repetido. La primera vez el
  // DELETE no borra nada y no cuesta.
  const sentencias = [
    env.nomeconsta_partidas.prepare('DELETE FROM decisiones WHERE partida = ?').bind(id),
  ]
  for (const d of p.decisiones) {
    sentencias.push(
      env.nomeconsta_partidas
        .prepare(
          'INSERT OR IGNORE INTO decisiones (partida, turno, carta, lado, medios, gobierno, calle, caja, moralidad)' +
            ' VALUES (?,?,?,?,?,?,?,?,?)'
        )
        .bind(id, d.turno, d.carta, d.lado, d.medios, d.gobierno, d.calle, d.caja, d.moralidad)
    )
  }
  // En lote: o entran todas las decisiones o no entra ninguna. Media partida
  // guardada contaria como una muerte prematura que nunca ocurrio.
  //
  // Si fallara justo aqui, quedaria la fila de la partida sin sus decisiones.
  // Es el lado bueno por el que caer: `meses` y `final` -lo que mide si el
  // juego esta equilibrado- ya estan bien, y el movil no recibe el 204, asi
  // que la reintenta y el DELETE de arriba la deja entera a la segunda.
  await env.nomeconsta_partidas.batch(sentencias)
  return new Response(null, { status: 204 })
}

async function leer(env: Env, url: URL): Promise<Response> {
  if (!env.CLAVE_LECTURA) return new Response('no hay nada aqui', { status: 404 })
  if (url.searchParams.get('clave') !== env.CLAVE_LECTURA) {
    return new Response('no hay nada aqui', { status: 404 })
  }
  const limite = Math.min(Number(url.searchParams.get('limite') ?? 200) || 200, 2000)
  const { results } = await env.nomeconsta_partidas
    .prepare(
      'SELECT p.*, (SELECT json_group_array(json_object(' +
        "'turno', d.turno, 'carta', d.carta, 'lado', d.lado," +
        "'medios', d.medios, 'gobierno', d.gobierno, 'calle', d.calle," +
        "'caja', d.caja, 'moralidad', d.moralidad))" +
        ' FROM decisiones d WHERE d.partida = p.id ORDER BY d.turno) AS decisiones' +
        ' FROM partidas p ORDER BY p.cuando DESC LIMIT ?'
    )
    .bind(limite)
    .all()
  return new Response(JSON.stringify(results, null, 1), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    try {
      if (url.pathname === '/api/partida' && request.method === 'POST') {
        const largo = Number(request.headers.get('content-length') ?? 0)
        if (largo > MAX_BYTES) return new Response('demasiado grande', { status: 413 })
        const cuerpo = await request.text()
        if (cuerpo.length > MAX_BYTES) return new Response('demasiado grande', { status: 413 })
        let datos: unknown
        try {
          datos = JSON.parse(cuerpo)
        } catch {
          return new Response('no es json', { status: 400 })
        }
        const partida = leerPartida(datos)
        if (!partida) return new Response('no cuadra', { status: 400 })
        return await guardar(env, partida)
      }

      if (url.pathname === '/api/partidas' && request.method === 'GET') {
        return await leer(env, url)
      }
      // Cualquier otra cosa bajo /api/ se corta aqui. Si se dejara seguir,
      // caeria en el reparto de ficheros y, con el index.html de respuesta a
      // lo que no existe, un GET a /api/partida devolveria el juego con un
      // 200: parece que la ruta funciona cuando no hace nada.
      if (url.pathname.startsWith('/api/')) {
        return new Response('no', { status: 404 })
      }
    } catch (e) {
      // Que recoger partidas falle no puede tumbar el juego. Se apunta en los
      // logs del Worker y se sigue como si nada.
      console.error('fallo en /api:', e instanceof Error ? e.message : e)
      if (url.pathname.startsWith('/api/')) {
        return new Response('ha fallado algo', { status: 500 })
      }
    }

    // TODO LO DEMAS ES EL JUEGO. Incluido lo que no case con ningun fichero:
    // de eso se encarga `not_found_handling` del wrangler.jsonc, que devuelve
    // el index.html para que las rutas inventadas sigan abriendo el juego,
    // igual que antes de que este fichero existiera.
    return env.ASSETS.fetch(request)
  },
}
