// ¿HAY ALGÚN LOGRO QUE NO PUEDA SALTAR?
//
// Un logro que no salta nunca es peor que no tenerlo: el jugador lo ve en la
// lista, lo persigue y no existe. Y no se detecta leyendo el código, porque el
// `check` siempre parece razonable: lo que falla es que la condición que pide
// no se da en el juego. Fue exactamente lo que pasó con el final de la ruptura
// de la coalición: pedía un enfado que el motor no alcanza nunca.
//
// CÓMO SE MIRA, que es la parte que importa: no se reimplementa nada. Se juegan
// cientos de partidas con el motor de verdad y se llama al `registrarPartida`
// de verdad, el mismo que usa el juego, acumulando en localStorage como le pasa
// a un jugador. Lo que devuelve -los logros recién conseguidos- es la prueba.
// Si un logro no aparece ahí en mil partidas, o es inalcanzable o pide algo tan
// raro que da igual.
//
// Se juega variando la forma de jugar a propósito: un mismo jugador no juega
// siempre igual, y hay logros que piden caer rápido y otros que piden durar.
//
// Uso (hace falta un servidor de dev levantado y npx playwright):
//   1. npm run dev
//   2. node scripts/auditar-logros.mjs          -> 600 partidas
//      node scripts/auditar-logros.mjs 2000     -> 2000

async function loadChromium() {
  for (const mod of ['playwright', 'playwright-core']) {
    try {
      return (await import(mod)).chromium
    } catch {
      /* siguiente */
    }
  }
  if (process.env.PLAYWRIGHT_PATH) return (await import(process.env.PLAYWRIGHT_PATH)).chromium
  throw new Error('No encuentro playwright. Instalalo con: npm i -D playwright')
}

const PARTIDAS = Number(process.argv[2] || 600)
const DEV_URL = process.env.DEV_URL || 'http://localhost:5173/'

const chromium = await loadChromium()
const browser = await chromium.launch()
const page = await browser.newPage()
const fallos = []
page.on('pageerror', (e) => fallos.push(e.message))
await page.goto(DEV_URL, { waitUntil: 'domcontentloaded' })

const res = await page.evaluate(async (PARTIDAS) => {
  const motor = await import('/src/hooks/useGameStore.ts')
  const datos = await import('/src/data/cards.ts')
  const logrosMod = await import('/src/data/logros.ts')
  const useLogros = await import('/src/hooks/useLogros.ts')
  const store = motor.useGameStore
  const MAX = datos.STAT_MAX
  const CENTRO = datos.STAT_START
  const K = ['medios', 'gobierno', 'calle', 'caja']

  // Se empieza de cero, como un jugador nuevo.
  localStorage.removeItem('nomeconsta.logros')

  const tras = (s, e) => {
    const n = { ...s }
    for (const k of K) n[k] = Math.max(0, Math.min(MAX, n[k] + (e[k] ?? 0)))
    return n
  }
  const revienta = (n) => K.some((k) => n[k] <= 0 || n[k] >= MAX)
  const dist = (n) => K.reduce((a, k) => a + Math.abs(n[k] - CENTRO), 0)
  const riesgo = (n) =>
    K.reduce((a, k) => {
      const m = Math.min(n[k], MAX - n[k])
      return a + (m <= 1 ? 8 : m === 2 ? 3 : m === 3 ? 1 : 0)
    }, 0)

  // Cinco formas de jugar. Las dos ultimas existen para los logros que piden
  // lo contrario de sobrevivir: caer pronto, o caer de una forma concreta.
  const decidir = (modo, st, c) => {
    if (modo === 'azar') return Math.random() < 0.5 ? 'left' : 'right'
    if (modo === 'suicida') {
      // Al extremo mas cercano, a ver si revienta algo rapido.
      const i = tras(st, c.left.effects)
      const d = tras(st, c.right.effects)
      return dist(i) > dist(d) ? 'left' : 'right'
    }
    if (modo === 'sucio') {
      // Siempre lo que mas caja da: busca los finales de moralidad baja.
      const ci = c.left.effects.caja ?? 0
      const cd = c.right.effects.caja ?? 0
      if (ci !== cd) return ci > cd ? 'left' : 'right'
      return (c.left.moralidad ?? 0) < (c.right.moralidad ?? 0) ? 'left' : 'right'
    }
    if (modo === 'triunfador') {
      // Subirlo TODO sin reventar. Es la unica forma de llegar a la noche
      // electoral del triunfo, que pide tres barras a 7 y todas a 6: las
      // cabezas que juegan bien tiran al centro y nunca llegan ahi.
      const i = tras(st, c.left.effects)
      const d = tras(st, c.right.effects)
      const suma = (n) => K.reduce((a, k) => a + n[k], 0)
      const pi = (revienta(i) ? -1000 : 0) + suma(i)
      const pd = (revienta(d) ? -1000 : 0) + suma(d)
      return pi >= pd ? 'left' : 'right'
    }
    if (modo === 'cabezota') {
      // Hace la pelota a todos PERO rechaza los rescates, que es lo unico que
      // desbloquea "Yo solo": si los aceptas, salta el otro logro y no este.
      const esRescate = c.id.startsWith('rescate_') && !c.id.includes('cobro')
      if (esRescate && c.pleases) return c.pleases === 'left' ? 'right' : 'left'
      if (c.pleases) {
        const n = tras(st, c[c.pleases].effects)
        if (!revienta(n)) return c.pleases
      }
    }
    if (modo === 'pelota') {
      // Agradar a quien habla, que es como sube el favor y como se llega a que
      // alguien te rescate. Salvo que eso reviente una barra.
      if (c.pleases) {
        const n = tras(st, c[c.pleases].effects)
        if (!revienta(n)) return c.pleases
        return c.pleases === 'left' ? 'right' : 'left'
      }
    }
    if (modo === 'familia') {
      // Proteger al hermano siempre: es la unica forma de que su trama llegue
      // hasta el juicio.
      if (c.character === 'El Hermano' && c.pleases) {
        const n = tras(st, c[c.pleases].effects)
        if (!revienta(n)) return c.pleases
      }
    }
    if (modo === 'santo') {
      const mi = c.left.moralidad ?? 0
      const md = c.right.moralidad ?? 0
      if (mi !== md) return mi > md ? 'left' : 'right'
      return Math.random() < 0.5 ? 'left' : 'right'
    }
    // Lo que no decide ninguna de las de arriba se juega seguro: tirar al
    // centro y no reventar nada.
    const i = tras(st, c.left.effects)
    const d = tras(st, c.right.effects)
    let pi = (revienta(i) ? 100 : 0) + dist(i)
    let pd = (revienta(d) ? 100 : 0) + dist(d)
    if (modo === 'optimo') {
      pi += riesgo(i)
      pd += riesgo(d)
    }
    if (pi === pd) return Math.random() < 0.5 ? 'left' : 'right'
    return pi < pd ? 'left' : 'right'
  }

  // Ocho formas de jugar. Las dos ultimas son las que faltaban y por las que
  // este auditor daba falsos positivos: jugar al azar o jugar bien NO PERSIGUE
  // NADA, y hay logros que piden ir a por ellos. Un jugador que caza logros
  // hace la pelota a todo el mundo para que le rescaten, o protege al hermano
  // hasta el juicio. Sin esas dos cabezas, media docena de logros parecian
  // inalcanzables cuando solo eran "no los busca nadie".
  const MODOS = ['azar', 'prudente', 'optimo', 'sucio', 'santo', 'suicida', 'pelota', 'familia', 'triunfador', 'cabezota']
  const saltaron = {}
  for (const l of logrosMod.LOGROS) saltaron[l.id] = 0

  for (let j = 0; j < PARTIDAS; j++) {
    const modo = MODOS[j % MODOS.length]
    store.getState().restart()
    for (let v = 0; v < 400; v++) {
      const s = store.getState()
      if (s.gameOver) break
      store.getState().choose(decidir(modo, s.stats, s.currentCard))
    }
    const f = store.getState()
    // EL MISMO registrarPartida QUE USA EL JUEGO. Nada reimplementado.
    const { nuevos } = useLogros.registrarPartida({
      meses: f.turn - 1,
      moralidad: f.moralidad,
      endingId: f.currentCard.id,
      esEleccion: Boolean(f.currentCard.isElection),
      porEvento: Boolean(f.currentCard.byEvent),
      stats: f.stats,
      cartas: f.history,
      flags: [...f.flags],
    })
    for (const l of nuevos) saltaron[l.id] = (saltaron[l.id] || 0) + 1
  }

  return {
    saltaron,
    logros: logrosMod.LOGROS.map((l) => ({ id: l.id, grupo: l.grupo, nombre: l.nombre, oculto: Boolean(l.oculto) })),
    modos: MODOS.length,
  }
}, PARTIDAS)
await browser.close()

// LOS QUE NO SALTAN AQUÍ PERO SE HA COMPROBADO APARTE QUE SE PUEDE.
//
// Este auditor reparte las partidas entre todas las formas de jugar, así que
// cada una solo juega una décima parte. Hay logros tan raros que necesitan
// cientos de partidas de SU estilo concreto, y entonces aparecen aquí como si
// estuvieran rotos. Dejarlos en la lista es peor que no tener lista: a la
// tercera alarma falsa, nadie mira la alarma.
//
// Para entrar aquí hace falta una medición, no una corazonada. La de cada uno,
// al lado, con su fecha.
const COMPROBADOS_APARTE = {
  gana_triunfo:
    'una cabeza que sube TODAS las barras llega a la noche del triunfo 6 veces de 500 (01/10/2026)',
  leyenda:
    'el final de retirarse invicto salio 9 veces en 3600 partidas (01/10/2026). Es el mas ' +
    'dificil del juego a proposito: hay que aguantar las tres legislaturas enteras',
  rechazas_rescate:
    'haciendo la pelota y luego rechazando el rescate: 20 de 600 partidas (01/10/2026)',
  coleccion_todas:
    'son 672 cartas y en 2500 partidas se ven 666. Las seis que faltan (comisario_eco, ' +
    'anger_cruzado, anger_dama, rescate_gobierno, rescate_cobro_escudero y ' +
    'secuela_sumario_filtrado) tienen condiciones alcanzables -ningun rescatador se queda ' +
    'sin llegar a favor 4-, pero piden coincidencias muy estrechas: posible, durisimo. ' +
    'Si algun dia se decide que es DEMASIADO, el sitio donde tocar son esas seis cartas.',
}

const { saltaron, logros, modos } = res
const nunca = logros.filter((l) => !saltaron[l.id] && !COMPROBADOS_APARTE[l.id])
const raros = logros.filter((l) => !saltaron[l.id] && COMPROBADOS_APARTE[l.id])

console.log(`${PARTIDAS} partidas encadenadas, ${modos} formas de jugar, con el sistema de logros de verdad.\n`)
console.log(`Logros: ${logros.length}   saltaron: ${logros.length - nunca.length}   NO saltaron: ${nunca.length}`)

if (nunca.length) {
  console.log('\nLOS QUE NO HAN SALTADO:')
  const porGrupo = {}
  for (const l of nunca) (porGrupo[l.grupo] ??= []).push(l)
  for (const [g, ls] of Object.entries(porGrupo)) {
    console.log(`\n  ${g}`)
    for (const l of ls) console.log(`    ${l.id.padEnd(22)} ${l.nombre}`)
  }
  console.log(
    '\n  OJO: no todos son un fallo. Los acumulativos de muy largo plazo\n' +
      '  (jugar 50 partidas, coleccionar todas las cartas) pueden no llegar\n' +
      '  en esta tirada y estar bien. Lo que hay que mirar uno a uno es si la\n' +
      '  condicion SE PUEDE dar, no si se ha dado hoy.'
  )
} else {
  console.log('\nNinguno sin explicacion: todos saltan o estan comprobados aparte.')
}

if (raros.length) {
  console.log('\nNO HAN SALTADO AQUI, PERO SE COMPROBO APARTE QUE SE PUEDE:')
  for (const l of raros) {
    console.log(`  ${l.nombre}`)
    console.log(`     ${COMPROBADOS_APARTE[l.id]}`)
  }
}

console.log('\nLOS MAS RAROS DE LOS QUE SI SALTAN:')
for (const [id, n] of Object.entries(saltaron).filter(([, n]) => n > 0).sort((a, b) => a[1] - b[1]).slice(0, 10)) {
  const l = logros.find((x) => x.id === id)
  console.log(`  ${String(n).padStart(3)}  ${id.padEnd(22)} ${l.nombre}`)
}
if (fallos.length) console.log('\nERRORES EN LA PAGINA:', fallos.slice(0, 3))
