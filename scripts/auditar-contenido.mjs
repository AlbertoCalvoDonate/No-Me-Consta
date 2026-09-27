// Busca CONTENIDO MUERTO: lo que esta escrito en el mazo y el jugador no ve
// nunca. Es el desperdicio mas caro que hay, porque no falla, no sale en
// ningun error y nadie lo echa de menos: simplemente no existe.
//
// Cinco preguntas, todas contestadas jugando de verdad con el motor real (ver
// simular.mjs para el porque de no copiarlo):
//
//   1. Cartas que no salen NUNCA. Una carta escrita que no se reparte es
//      trabajo tirado, y suele significar que su `condition` pide algo
//      imposible o que su `weight` es 0 por error.
//   2. Finales que no se alcanzan. Peor todavia: un final es el pago de una
//      partida entera.
//   3. Flags que nunca se encienden, o que se encienden y nadie lee. Los dos
//      lados de lo mismo: trama a medias.
//   4. Cartas REPETIDAS en la misma partida. Lo contrario del problema, y se
//      nota mucho mas: nada rompe mas una partida que reconocer una carta.
//   5. Logros que nadie consigue en mil partidas.
//
// Uso (hace falta un servidor de dev levantado y npx playwright):
//   node scripts/auditar-contenido.mjs        -> 600 partidas
//   node scripts/auditar-contenido.mjs 2000

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
const PARTIDAS = Number(process.argv[2] || 600)

const chromium = await loadChromium()
const browser = await chromium.launch()
const page = await browser.newPage()
const fallos = []
page.on('pageerror', (e) => fallos.push(e.message))
await page.goto(DEV_URL, { waitUntil: 'domcontentloaded' })

const r = await page.evaluate(async (PARTIDAS) => {
  const { cards, STAT_MAX, STAT_START } = await import('/src/data/cards.ts')
  const { useGameStore } = await import('/src/hooks/useGameStore.ts')
  const s = useGameStore

  // Se juega con TRES cabezas distintas y se reparten las partidas entre
  // ellas. Con una sola, media baraja no sale nunca y el informe miente: el
  // que siempre busca el centro no ve jamas una carta de barra reventada, y
  // el que va al azar no llega a la tercera legislatura.
  const K = ['medios', 'gobierno', 'calle', 'caja']
  const tras = (st, ef) => {
    const n = { ...st }
    for (const k of K) n[k] = Math.max(0, Math.min(STAT_MAX, n[k] + (ef[k] ?? 0)))
    return n
  }
  const rev = (n) => K.some((k) => n[k] <= 0 || n[k] >= STAT_MAX)
  const dist = (n) => K.reduce((a, k) => a + Math.abs(n[k] - STAT_START), 0)
  const cabezas = {
    azar: () => (Math.random() < 0.5 ? 'left' : 'right'),
    centro: (st, c) => {
      const i = tras(st.stats, c.left.effects)
      const d = tras(st.stats, c.right.effects)
      const pi = (rev(i) ? 100 : 0) + dist(i)
      const pd = (rev(d) ? 100 : 0) + dist(d)
      return pi === pd ? (Math.random() < 0.5 ? 'left' : 'right') : pi < pd ? 'left' : 'right'
    },
    // El que siempre tira a lo turbio: es el unico que ve las tramas de caja,
    // los fontaneros y los finales por corrupcion.
    turbio: (st, c) => {
      const mi = c.left.moralidad ?? 0
      const md = c.right.moralidad ?? 0
      if (mi === md) return Math.random() < 0.5 ? 'left' : 'right'
      return mi < md ? 'left' : 'right'
    },
    // El ambicioso: no apunta al centro sino ARRIBA, a tenerlo todo en verde.
    // Hace falta porque hay contenido que solo existe ahi -la noche electoral
    // de mayoria absoluta pide los cuatro indicadores en 6 o mas- y las otras
    // tres cabezas, que buscan el 5, no lo alcanzan jamas. Sin esta, el
    // informe acusaba de muerto contenido que solo estaba fuera de su alcance.
    ambicioso: (st, c) => {
      const meta = 8
      const puntos = (n) =>
        (rev(n) ? 100 : 0) + K.reduce((a, k) => a + Math.abs(n[k] - meta), 0)
      const i = tras(st.stats, c.left.effects)
      const d = tras(st.stats, c.right.effects)
      const pi = puntos(i)
      const pd = puntos(d)
      return pi === pd ? (Math.random() < 0.5 ? 'left' : 'right') : pi < pd ? 'left' : 'right'
    },
  }

  const { LOGROS } = await import('/src/data/logros.ts')
  const conseguidos = new Map()
  const rotos = new Set()
  const vistas = new Map()
  const finales = new Map()
  const flagsEncendidos = new Map()
  let repetidasEnPartida = 0
  let partidasConRepetida = 0
  const ejemplosRepetidas = []
  let turnos = 0

  const nombres = Object.keys(cabezas)
  for (let p = 0; p < PARTIDAS; p++) {
    const cabeza = cabezas[nombres[p % nombres.length]]
    s.getState().restart()
    const enEstaPartida = new Set()
    let repitio = false
    let v = 0
    for (;;) {
      const st = s.getState()
      if (st.gameOver || v++ > 500) break
      const c = st.currentCard
      vistas.set(c.id, (vistas.get(c.id) ?? 0) + 1)
      if (enEstaPartida.has(c.id)) {
        repetidasEnPartida++
        repitio = true
        if (ejemplosRepetidas.length < 10) ejemplosRepetidas.push(c.id)
      }
      enEstaPartida.add(c.id)
      turnos++
      st.choose(cabeza(st, c))
    }
    if (repitio) partidasConRepetida++
    const fin = s.getState()
    finales.set(fin.currentCard.id, (finales.get(fin.currentCard.id) ?? 0) + 1)
    for (const f of fin.flagsVistos) flagsEncendidos.set(f, (flagsEncendidos.get(f) ?? 0) + 1)
    // Los logros se evaluan con los MISMOS datos que pasa la partida de
    // verdad (ver el registrarPartida de App), pero sin tocar lo guardado:
    // solo se corre el `check` de cada uno.
    const datos = {
      meses: fin.turn - 1,
      moralidad: fin.moralidad,
      epitetoIndex: Math.round(fin.moralidad),
      stats: fin.stats,
      endingId: fin.currentCard.id,
      esEleccion: Boolean(fin.currentCard.isElection),
      porEvento: Boolean(fin.currentCard.byEvent),
      deathStat: fin.deathStat,
      gano:
        Boolean(fin.currentCard.isElection) &&
        !fin.currentCard.id.includes('derrota') &&
        !fin.currentCard.id.includes('repeticion'),
      aguantoLasTres: fin.currentCard.id.endsWith('_final'),
      cartas: [...fin.history, fin.currentCard.id],
      flags: fin.flagsVistos,
      // Los acumulados de toda la vida se dan generosos a proposito: aqui se
      // pregunta si el logro es ALCANZABLE jugando, no si se consigue en la
      // primera partida. Un logro que pide cien partidas no es un logro roto.
      partidasJugadas: 500,
      finalesDistintos: 31,
      mesesRecord: Math.max(144, fin.turn),
      epitetosVistos: 11,
      cartasColeccionadas: cards.length,
    }
    for (const l of LOGROS) {
      let ok = false
      try {
        ok = Boolean(l.check(datos))
      } catch {
        rotos.add(l.id)
      }
      if (ok) conseguidos.set(l.id, (conseguidos.get(l.id) ?? 0) + 1)
    }
  }

  // Lo que el mazo DECLARA, para cruzarlo con lo que de verdad ha salido.
  const todasLasCartas = cards.map((c) => c.id)
  const todosLosFinales = cards.filter((c) => c.isEnding).map((c) => c.id)
  const fuente = cards
    .map((c) =>
      [c.condition, c.weight].map((f) => (typeof f === 'function' ? String(f) : '')).join(' ')
    )
    .join(' ')
  // Quien LEE un flag no siempre lo hace con flags.has('x'): hay una carta que
  // comprueba cuatro de golpe con un array y un .some(), el motor lee
  // 'ya_te_salvaron' por su cuenta y los logros leen los suyos al terminar.
  // Buscando solo el patron flags.has(...) salian cinco falsas alarmas, y una
  // herramienta que grita en falso acaba en el cajon.
  const masFuentes = await Promise.all(
    ['/src/hooks/useGameStore.ts', '/src/data/logros.ts', '/src/data/cards.content.ts'].map((u) =>
      fetch(u).then((r) => r.text())
    )
  )
  const todoElCodigo = fuente + masFuentes.join(' ')
  const lee = (f) => {
    // Se busca el nombre del flag en cualquier sitio MENOS donde se enciende
    // o se apaga, que eso es escribir, no leer.
    const sinEscrituras = todoElCodigo.replace(
      /(?:addFlags|removeFlags|flagsVistos)\s*:\s*\[[^\]]*\]/g,
      ''
    )
    return sinEscrituras.includes(`'${f}'`) || sinEscrituras.includes(`"${f}"`)
  }
  const declarados = new Set()
  for (const m of fuente.matchAll(/(?:flags\.has|flagAge)\(\s*['"]([^'"]+)['"]/g)) {
    declarados.add(m[1])
  }
  const puestos = new Set()
  for (const c of cards) {
    for (const lado of [c.left, c.right]) {
      for (const f of lado?.addFlags ?? []) puestos.add(f)
    }
  }

  return {
    turnos,
    cartasMuertas: todasLasCartas.filter((id) => !vistas.has(id)),
    totalCartas: todasLasCartas.length,
    finalesMuertos: todosLosFinales.filter((id) => !finales.has(id)),
    totalFinales: todosLosFinales.length,
    finalesTop: [...finales.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
    // Flags que alguien pone y nadie lee, y al reves.
    flagsSinLector: [...puestos].filter((f) => !declarados.has(f) && !lee(f)),
    flagsSinAutor: [...declarados].filter((f) => !puestos.has(f)),
    flagsNuncaEncendidos: [...puestos].filter((f) => !flagsEncendidos.has(f)),
    repetidasEnPartida,
    partidasConRepetida,
    ejemplosRepetidas: [...new Set(ejemplosRepetidas)],
    logrosTotal: LOGROS.length,
    logrosNadie: LOGROS.filter((l) => !conseguidos.has(l.id)).map((l) => `${l.id}  (${l.nombre})`),
    logrosRaros: [...conseguidos.entries()]
      .filter(([, n]) => n <= 2)
      .map(([id, n]) => `${id}  ${n} de ${PARTIDAS}`),
    logrosRotos: [...rotos],
  }
}, PARTIDAS)

const pct = (n, t) => `${((n * 100) / t).toFixed(1)}%`
let mal = 0

console.log(`${PARTIDAS} partidas, ${r.turnos} cartas repartidas, tres cabezas distintas.\n`)

console.log(`CARTAS QUE NO SALEN NUNCA: ${r.cartasMuertas.length} de ${r.totalCartas}`)
for (const id of r.cartasMuertas) console.log('  ' + id)
if (r.cartasMuertas.length) mal++

console.log('')
console.log(`FINALES QUE NO SE ALCANZAN: ${r.finalesMuertos.length} de ${r.totalFinales}`)
for (const id of r.finalesMuertos) console.log('  ' + id)
if (r.finalesMuertos.length) mal++

console.log('')
console.log('LOS FINALES MAS FRECUENTES')
for (const [id, n] of r.finalesTop) console.log(`  ${String(n).padStart(4)}  ${id}`)

console.log('')
console.log('FLAGS')
if (r.flagsSinLector.length) {
  console.log(`  se encienden y NADIE los lee (${r.flagsSinLector.length}):`)
  for (const f of r.flagsSinLector) console.log('    ' + f)
  mal++
} else console.log('  todos los que se encienden los lee alguien.')
if (r.flagsSinAutor.length) {
  console.log(`  se leen y NADIE los enciende (${r.flagsSinAutor.length}):`)
  for (const f of r.flagsSinAutor) console.log('    ' + f)
  mal++
}
if (r.flagsNuncaEncendidos.length) {
  console.log(`  no se encendieron en ninguna partida (${r.flagsNuncaEncendidos.length}):`)
  for (const f of r.flagsNuncaEncendidos) console.log('    ' + f)
}

console.log('')
console.log(`LOGROS QUE NO CONSIGUE NADIE: ${r.logrosNadie.length} de ${r.logrosTotal}`)
for (const l of r.logrosNadie) console.log('  ' + l)
if (r.logrosNadie.length) mal++
if (r.logrosRotos.length) {
  console.log(`  y ${r.logrosRotos.length} que REVIENTAN al comprobarse: ${r.logrosRotos.join(', ')}`)
  mal++
}
if (r.logrosRaros.length) {
  console.log(`  al filo (2 partidas o menos): ${r.logrosRaros.join(' | ')}`)
}

console.log('')
console.log('CARTAS REPETIDAS EN LA MISMA PARTIDA')
console.log(
  `  ${r.repetidasEnPartida} repeticiones, en ${r.partidasConRepetida} partidas (${pct(r.partidasConRepetida, PARTIDAS)})`
)
for (const id of r.ejemplosRepetidas) console.log('    ' + id)

if (fallos.length) {
  console.log('')
  console.log('errores en la pagina:')
  for (const e of fallos.slice(0, 5)) console.log('  ' + e)
  mal++
}

console.log('')
console.log(mal === 0 ? 'Nada muerto. Todo lo escrito se juega.' : `${mal} cosas que mirar.`)
if (mal > 0) process.exitCode = 1
await browser.close()
