// Comprueba que las relaciones con los personajes siguen vivas.
//
// El enfado y el favor son la memoria del juego: desairar al Juez cuatro
// veces abre finales, darle la razon al Escudero tres veces hace que aparezca
// a salvarte. Todo eso se declara con el NOMBRE del personaje escrito a mano
// dentro de una funcion:
//
//     condition: (_s, _m, ctx) => (ctx.anger['El Juez'] ?? 0) >= 4
//
// Si alguien renombra un personaje, o escribe "El juez", o le cambia una
// tilde, esa linea no falla: devuelve 0 y la relacion desaparece del juego
// sin que nada se queje. Ya paso una vez con nombres viejos tras un rename.
//
// Esto lo comprueba de dos maneras, porque una sola no basta:
//
//   ESTATICO  cada nombre citado en un anger/favor existe en el reparto, con
//             su tilde y su mayuscula.
//   JUGANDO   cada umbral declarado (enfado >= 4, favor >= 3...) se alcanza
//             de verdad en partidas reales. Un nombre correcto tambien puede
//             estar muerto: si nadie llega nunca a ese numero, la carta que
//             lo pide no existe en la practica.
//
// Ojo con una trampa que ya pico una vez: Vite normaliza las comillas de los
// literales a dobles, asi que un patron que solo busque comillas simples
// encuentra CERO citas y el auditor da todo por bueno sin haber mirado nada.
// Por eso cero citas cuenta como fallo, no como aprobado.
//
// Uso (hace falta un servidor de dev levantado y npx playwright):
//   1. npm run dev
//   2. node scripts/auditar-relaciones.mjs        -> 400 partidas
//      node scripts/auditar-relaciones.mjs 1500

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

const DEV_URL = process.env.DEV_URL || 'http://localhost:5173/'
const PARTIDAS = Number(process.argv[2] || 400)

const chromium = await loadChromium()
const browser = await chromium.launch()
const page = await browser.newPage()
const fallos = []
page.on('pageerror', (e) => fallos.push(e.message))
await page.goto(DEV_URL, { waitUntil: 'domcontentloaded' })

const r = await page.evaluate(async (PARTIDAS) => {
  const { cards, STAT_MAX, STAT_START, ELECTION_INTERVAL, ELECTION_MAX_TERMS } = await import(
    '/src/data/cards.ts'
  )
  const { REPARTO, CARTAS_POR_PERSONAJE } = await import('/src/data/reparto.ts')
  const { useGameStore } = await import('/src/hooks/useGameStore.ts')
  const NOMBRES = new Set(REPARTO.map((p) => p.nombre))

  // El umbral del rescate no se exporta: vive dentro del store. Se lee del
  // fuente en vez de copiarlo aqui, que copiar numeros del motor es como se
  // empieza a mentir.
  const fuenteStore = await (await fetch('/src/hooks/useGameStore.ts')).text()
  const FAVOR_PARA_RESCATE = Number(fuenteStore.match(/FAVOR_PARA_RESCATE = (\d+)/)?.[1] ?? 0)

  // ---- ESTATICO -----------------------------------------------------------
  // Se lee el codigo de las propias funciones del mazo: es la unica forma de
  // ver los nombres que hay escritos dentro de un condition o un weight.
  const citas = []
  const fantasmas = []
  const umbrales = []
  for (const c of cards) {
    const fuente = [c.condition, c.weight]
      .map((f) => (typeof f === 'function' ? String(f) : ''))
      .join(' ')
    if (!fuente) continue
    for (const m of fuente.matchAll(/\b(anger|favor)\[\s*['"]([^'"]+)['"]\s*\]/g)) {
      citas.push({ card: c.id, tipo: m[1], nombre: m[2] })
      if (!NOMBRES.has(m[2])) fantasmas.push({ card: c.id, nombre: m[2], donde: m[1] })
    }
    // Nombres sueltos dentro de la funcion (listas de socios, etc).
    for (const m of fuente.matchAll(/['"]((?:El|La|Los|Las) [A-ZÁÉÍÓÚÑ][^'"]{2,28})['"]/g)) {
      if (!NOMBRES.has(m[1])) fantasmas.push({ card: c.id, nombre: m[1], donde: 'lista' })
    }
    // Umbrales declarados: enfado o favor >= N.
    for (const m of fuente.matchAll(
      /\b(anger|favor)\[\s*['"]([^'"]+)['"]\s*\]\s*\?\?\s*0\)\s*>=\s*(\d+)/g
    )) {
      umbrales.push({ card: c.id, tipo: m[1], nombre: m[2], n: Number(m[3]) })
    }
  }

  // Personajes del reparto sin una sola carta, y cartas cuyo personaje no
  // esta en el reparto (las voces de cierre lo estan a proposito).
  const sinCartas = REPARTO.filter((p) => !(CARTAS_POR_PERSONAJE[p.nombre] || []).length).map(
    (p) => p.nombre
  )
  const vocesSueltas = [...new Set(cards.map((c) => c.character))].filter((n) => !NOMBRES.has(n))

  // Quien puede acumular enfado o favor: hace falta que alguna carta suya
  // diga de que lado se le da la razon.
  const conPleases = {}
  for (const c of cards) {
    if (c.pleases) conPleases[c.character] = (conPleases[c.character] || 0) + 1
  }
  // Los rescates: el personaje que firma uno tiene que poder ganarse el favor
  // que pide, o la carta no sale jamas.
  const rescates = cards
    .filter((c) => c.rescatePara)
    .map((c) => ({ id: c.id, quien: c.character, pleases: conPleases[c.character] || 0 }))

  // ---- JUGANDO ------------------------------------------------------------
  const CLAVES = ['medios', 'gobierno', 'calle', 'caja']
  const tras = (stats, ef) => {
    const n = { ...stats }
    for (const k of CLAVES) n[k] = Math.max(0, Math.min(STAT_MAX, n[k] + (ef[k] ?? 0)))
    return n
  }
  const revienta = (n) => CLAVES.some((k) => n[k] <= 0 || n[k] >= STAT_MAX)
  const dist = (n) => CLAVES.reduce((a, k) => a + Math.abs(n[k] - STAT_START), 0)
  const store = useGameStore

  const topeEnfado = {}
  const topeFavor = {}
  // El maximo de cada partida por separado. El maximo global dice si un
  // umbral se PUEDE alcanzar; esto dice cada cuanto se alcanza, que es lo que
  // separa una relacion viva de una que existe sobre el papel.
  const porPartida = []
  const vistas = new Set()
  let turnos = 0
  for (let p = 0; p < PARTIDAS; p++) {
    store.getState().restart()
    const enfadoAqui = {}
    const favorAqui = {}
    for (let v = 0; v < 400; v++) {
      const s = store.getState()
      if (s.gameOver) break
      vistas.add(s.currentCard.id)
      const i = tras(s.stats, s.currentCard.left.effects)
      const d = tras(s.stats, s.currentCard.right.effects)
      const pi = (revienta(i) ? 100 : 0) + dist(i)
      const pd = (revienta(d) ? 100 : 0) + dist(d)
      s.choose(pi === pd ? (Math.random() < 0.5 ? 'left' : 'right') : pi < pd ? 'left' : 'right')
      turnos++
      const f = store.getState()
      for (const [n, x] of Object.entries(f.anger)) {
        if (!(n in topeEnfado) || x > topeEnfado[n]) topeEnfado[n] = x
        if (!(n in enfadoAqui) || x > enfadoAqui[n]) enfadoAqui[n] = x
      }
      for (const [n, x] of Object.entries(f.favor)) {
        if (!(n in topeFavor) || x > topeFavor[n]) topeFavor[n] = x
        if (!(n in favorAqui) || x > favorAqui[n]) favorAqui[n] = x
      }
    }
    porPartida.push({ anger: enfadoAqui, favor: favorAqui })
  }
  for (const u of umbrales) {
    u.partidas = porPartida.filter((p) => (p[u.tipo][u.nombre] ?? 0) >= u.n).length
  }

  const inalcanzables = umbrales.filter((u) => {
    const tope = u.tipo === 'anger' ? topeEnfado[u.nombre] : topeFavor[u.nombre]
    return (tope ?? 0) < u.n
  })
  const rescatesSinSalir = rescates.filter((x) => !vistas.has(x.id))
  const gatilladasSinSalir = [...new Set(umbrales.map((u) => u.card))].filter((id) => !vistas.has(id))

  return {
    total: cards.length,
    reparto: REPARTO.length,
    citas: citas.length,
    fantasmas,
    sinCartas,
    vocesSueltas,
    sinPleases: REPARTO.filter((p) => !conPleases[p.nombre]).map((p) => p.nombre),
    rescates,
    rescatesSinSalir,
    umbrales,
    inalcanzables,
    gatilladasSinSalir,
    topeEnfado,
    topeFavor,
    turnos,
    FAVOR_PARA_RESCATE,
    meta: ELECTION_INTERVAL * ELECTION_MAX_TERMS,
  }
}, PARTIDAS)

const mal = []

console.log(`${r.total} cartas, ${r.reparto} personajes en el reparto.`)
console.log(`${PARTIDAS} partidas jugadas, ${r.turnos} decisiones.\n`)

console.log('NOMBRES CITADOS EN CONDICIONES')
if (r.citas === 0) {
  // Cero citas no es un aprobado: es que el patron no ha leido nada.
  console.log('  NO HE ENCONTRADO NI UNA CITA. El patron no esta leyendo las condiciones.')
  mal.push('el patron no lee')
} else if (r.fantasmas.length === 0) {
  console.log(`  ${r.citas} citas de enfado/favor, todas con un nombre que existe en el reparto.`)
} else {
  for (const f of r.fantasmas) {
    console.log(`  FANTASMA: "${f.nombre}" (${f.donde}) en ${f.card} no esta en el reparto.`)
  }
  mal.push('nombres')
}

console.log('')
console.log('UMBRALES DECLARADOS')
for (const u of r.umbrales.sort((a, b) => a.nombre.localeCompare(b.nombre))) {
  const tope = (u.tipo === 'anger' ? r.topeEnfado[u.nombre] : r.topeFavor[u.nombre]) ?? 0
  const ok = tope >= u.n
  const pct = (u.partidas * 100) / PARTIDAS
  // Menos de una partida de cada cien es una relacion que existe sobre el
  // papel: el jugador no la vera nunca. No es un error, pero hay que verlo.
  const raro = ok && pct < 1
  console.log(
    `  ${ok ? (raro ? 'raro' : 'ok  ') : 'MAL '} ${u.card.padEnd(26)} ${u.tipo === 'anger' ? 'enfado' : 'favor '} de ${u.nombre.padEnd(22)} >= ${u.n}   sale en el ${pct.toFixed(1)}% de las partidas (maximo visto: ${tope})`
  )
}
if (r.inalcanzables.length > 0) mal.push('umbrales inalcanzables')

console.log('')
console.log('RESCATES  (hace falta favor >= ' + r.FAVOR_PARA_RESCATE + ')')
for (const x of r.rescates) {
  const tope = r.topeFavor[x.quien] ?? 0
  const ok = x.pleases > 0 && tope >= r.FAVOR_PARA_RESCATE
  if (!ok) mal.push('rescate ' + x.id)
  console.log(
    `  ${ok ? 'ok  ' : 'MAL '} ${x.id.padEnd(20)} lo firma ${x.quien.padEnd(22)} con ${String(x.pleases).padStart(2)} cartas de favor  (maximo visto: ${tope}${r.rescatesSinSalir.some((y) => y.id === x.id) ? ', no salio ninguna vez' : ''})`
  )
}

console.log('')
console.log('CARTAS QUE PIDEN UNA RELACION Y NO SALIERON NUNCA')
if (r.gatilladasSinSalir.length === 0) {
  console.log('  ninguna: todas aparecieron al menos una vez.')
} else {
  for (const id of r.gatilladasSinSalir) console.log('  ' + id)
  mal.push('cartas que no salen')
}

console.log('')
console.log('QUIEN NO PUEDE ACUMULAR NADA  (ninguna carta suya dice de que lado se le da la razon)')
console.log(r.sinPleases.length ? '  ' + r.sinPleases.join(', ') : '  nadie')
if (r.sinCartas.length) {
  console.log('PERSONAJES SIN UNA SOLA CARTA: ' + r.sinCartas.join(', '))
  mal.push('personajes sin cartas')
}
if (r.vocesSueltas.length) {
  console.log('\nvoces que no son del reparto (cierres, a proposito): ' + r.vocesSueltas.join(', '))
}

const top = (o) =>
  Object.entries(o)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([n, v]) => `${n} ${v}`)
    .join(' | ')
console.log('')
console.log('ENFADO MAXIMO VISTO: ' + top(r.topeEnfado))
console.log('FAVOR MAXIMO VISTO:  ' + top(r.topeFavor))

if (fallos.length) {
  console.log('\nerrores en la pagina:')
  for (const e of fallos.slice(0, 5)) console.log('  ' + e)
  mal.push('errores')
}
console.log('')
console.log(mal.length ? 'HAY RELACIONES ROTAS: ' + mal.join(', ') : 'Las relaciones estan vivas.')
if (mal.length) process.exitCode = 1

await browser.close()
