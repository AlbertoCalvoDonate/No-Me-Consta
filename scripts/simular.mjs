// Juega miles de partidas con EL MOTOR DE VERDAD y cuenta cómo acaban.
//
// La trampa de un simulador de balance es copiarse el motor: los que habia
// antes llevaban su propia version de `jitter`, con un fallo que anulaba uno
// de cada cinco efectos, asi que reproducian el error y contestaban que todo
// estaba bien. Este no copia nada. Abre el juego en un navegador, importa el
// store de zustand tal cual lo carga la pagina y llama a `choose` como
// llamaria un dedo. Si el motor cambia, esto cambia con el.
//
// Uso (hace falta un servidor de dev levantado y npx playwright):
//   1. npm run dev
//   2. node scripts/simular.mjs             -> 600 partidas por estrategia
//      node scripts/simular.mjs 2000        -> 2000
//
// Las cuatro estrategias son escalones de habilidad, no jugadores reales:
//   azar     decide a cara o cruz. El suelo.
//   prudente esquiva el extremo: no elige un lado que reviente una barra.
//   bueno    ademas tira al centro, que es donde no te mata nada.
//   optimo   mira las dos salidas y se queda con la que deja mejor el tablero,
//            contando ya el desgaste de las barras que tiene lejos del centro.
// El jugador humano decente anda entre "prudente" y "bueno": ve los puntos,
// pero no sabe si suben o bajan hasta que se aprende a cada personaje.


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
const ESTRATEGIAS = ['azar', 'prudente', 'bueno', 'optimo']

const chromium = await loadChromium()
const browser = await chromium.launch()
const page = await browser.newPage()
const fallos = []
page.on('pageerror', (e) => fallos.push(e.message))
await page.goto(DEV_URL, { waitUntil: 'domcontentloaded' })

const resultados = await page.evaluate(
  async ({ PARTIDAS, ESTRATEGIAS }) => {
    // El store de verdad, el mismo modulo que usa la pagina.
    const mod = await import('/src/hooks/useGameStore.ts')
    const datos = await import('/src/data/cards.ts')
    const store = mod.useGameStore
    const META = datos.ELECTION_INTERVAL * datos.ELECTION_MAX_TERMS
    const MAX = datos.STAT_MAX
    const CENTRO = datos.STAT_START
    const CLAVES = ['medios', 'gobierno', 'calle', 'caja']

    // Lo unico que sabe una estrategia es lo que sabria el jugador: los
    // efectos declarados en la carta. Ni la suerte ni la amortiguacion.
    const tras = (stats, efectos) => {
      const n = { ...stats }
      for (const k of CLAVES) n[k] = Math.max(0, Math.min(MAX, n[k] + (efectos[k] ?? 0)))
      return n
    }
    const revienta = (n) => CLAVES.some((k) => n[k] <= 0 || n[k] >= MAX)
    const distancia = (n) => CLAVES.reduce((a, k) => a + Math.abs(n[k] - CENTRO), 0)
    // Cuanto mas cerca del borde, mas caro cada paso: perder un punto cuando
    // estas a 1 del final no cuesta lo mismo que perderlo estando en 5.
    const riesgo = (n) =>
      CLAVES.reduce((a, k) => {
        const margen = Math.min(n[k], MAX - n[k])
        return a + (margen <= 1 ? 8 : margen === 2 ? 3 : margen === 3 ? 1 : 0)
      }, 0)

    const decidir = (estrategia, stats, card) => {
      const izq = tras(stats, card.left.effects)
      const der = tras(stats, card.right.effects)
      if (estrategia === 'azar') return Math.random() < 0.5 ? 'left' : 'right'
      if (estrategia === 'prudente') {
        const mi = revienta(izq)
        const md = revienta(der)
        if (mi !== md) return mi ? 'right' : 'left'
        return Math.random() < 0.5 ? 'left' : 'right'
      }
      if (estrategia === 'bueno') {
        const pi = (revienta(izq) ? 100 : 0) + distancia(izq)
        const pd = (revienta(der) ? 100 : 0) + distancia(der)
        if (pi === pd) return Math.random() < 0.5 ? 'left' : 'right'
        return pi < pd ? 'left' : 'right'
      }
      const pi = (revienta(izq) ? 100 : 0) + distancia(izq) + riesgo(izq)
      const pd = (revienta(der) ? 100 : 0) + distancia(der) + riesgo(der)
      if (pi === pd) return Math.random() < 0.5 ? 'left' : 'right'
      return pi < pd ? 'left' : 'right'
    }

    const salida = {}
    const fontaneros = { vistos: 0, aceptados: 0, carpetaSuelta: 0, finalExpediente: 0 }
    const NOMBRES = ['La Fontanera', 'El Comisario', 'El Agente']
    for (const estrategia of ESTRATEGIAS) {
      let ganadas = 0
      let turnos = 0
      const muertes = {}
      for (let p = 0; p < PARTIDAS; p++) {
        store.getState().restart()
        let vioFontanero = false
        let aceptoFontanero = false
        let vueltas = 0
        for (;;) {
          const s = store.getState()
          if (s.gameOver || vueltas > 400) break
          const card = s.currentCard
          if (NOMBRES.includes(card.character)) vioFontanero = true
          const lado = decidir(estrategia, s.stats, card)
          if (NOMBRES.includes(card.character) && card.id.endsWith('_oferta') && lado === 'right') {
            aceptoFontanero = true
          }
          s.choose(lado)
          vueltas++
        }
        const fin = store.getState()
        turnos += fin.turn
        if (fin.turn >= META) ganadas++
        const causa = fin.deathReason || 'sin causa'
        muertes[causa] = (muertes[causa] || 0) + 1
        if (vioFontanero) fontaneros.vistos++
        if (aceptoFontanero) fontaneros.aceptados++
        if (fin.flagsVistos.includes('carpeta_suelta')) fontaneros.carpetaSuelta++
        if (/expediente|grabaci/i.test(fin.lastEpilogue || '')) fontaneros.finalExpediente++
      }
      salida[estrategia] = {
        ganadas,
        tasa: (ganadas * 100) / PARTIDAS,
        turnosMedios: turnos / PARTIDAS,
        muertes: Object.entries(muertes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5),
      }
    }
    return { salida, fontaneros, total: PARTIDAS * ESTRATEGIAS.length, META }
  },
  { PARTIDAS, ESTRATEGIAS }
)

console.log(`${PARTIDAS} partidas por estrategia. Ganar = llegar al mes ${resultados.META}.\n`)
for (const [nombre, r] of Object.entries(resultados.salida)) {
  console.log(
    `${nombre.padEnd(9)} gana ${r.tasa.toFixed(1).padStart(5)}%   duran ${r.turnosMedios.toFixed(1).padStart(5)} meses`
  )
  for (const [causa, n] of r.muertes) {
    console.log(`            ${String(n).padStart(4)}  ${causa.slice(0, 68)}`)
  }
}
const f = resultados.fontaneros
const t = resultados.total
console.log('')
console.log(`fontaneros: aparecen en el ${((f.vistos * 100) / t).toFixed(1)}% de las partidas`)
console.log(`            se les dice que si en el ${((f.aceptados * 100) / t).toFixed(1)}%`)
console.log(`            se les deja a deber en el ${((f.carpetaSuelta * 100) / t).toFixed(1)}%`)
console.log(`            acaban publicando en el ${((f.finalExpediente * 100) / t).toFixed(1)}%`)
if (fallos.length) {
  console.log('')
  console.log('errores en la pagina:')
  for (const e of fallos.slice(0, 5)) console.log('  ' + e)
  process.exitCode = 1
}

await browser.close()
