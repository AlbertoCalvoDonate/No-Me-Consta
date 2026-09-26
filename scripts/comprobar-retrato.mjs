// Dice si un retrato cumple lo que la carta necesita, ANTES de meterlo.
//
// Se escribio para no tener que ir preguntando: se deja el fichero en
// public/characters/ y esto contesta que esta bien y que no, con el numero al
// lado. Vale para .png y para .webp.
//
// Uso (hace falta un servidor de dev levantado y npx playwright):
//   1. npm run dev
//   2. node scripts/comprobar-retrato.mjs comisario.png
//      node scripts/comprobar-retrato.mjs            -> todos los del reparto
//
// LAS REGLAS, y de donde sale cada numero:
//
//  PROPORCION 0,85 (ancho/alto). No es un gusto: la carta se dibuja con
//  EXACTAMENTE esa proporcion (ver SwipeCard), asi que un retrato con otra o
//  deja franjas o se recorta.
//
//  LADO MAYOR >= 1152 px de ancho. Medido en el juego: la carta llega a ocupar
//  1152x1355 pixeles reales en un movil de los buenos (412 css de ancho por
//  3 de densidad). Por debajo de eso el navegador agranda y se emborrona.
//
//  AIRE ARRIBA 5%. La cabeza empieza ahi en los veintidos retratos actuales.
//  Es lo que hace que todos se vean al mismo plano.
//
//  ABAJO, A SANGRE. El torso tiene que llegar al borde de abajo Y a los dos
//  lados. Si no, quedan margenes: hoy la mitad del reparto tapa menos del 49%
//  del borde inferior y por eso se ve fondo en las esquinas de abajo.
//
//  SIN HALO. Al recortar sobre blanco se queda un filo claro alrededor de la
//  figura que en la carta oscura canta muchisimo.

import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

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

const CHARDIR = fileURLToPath(new URL('../public/characters/', import.meta.url))
const DEV_URL = process.env.DEV_URL || 'http://localhost:5173/'
const NO_SON_RETRATOS = /^(max_|min_|nocheelectoral|comite|espejo)/

const RATIO = 1020 / 1200
const ANCHO_MINIMO = 1152
const AIRE = 0.05

const args = process.argv.slice(2)
const files =
  args.length > 0
    ? args
    : readdirSync(CHARDIR).filter(
        (f) => (f.endsWith('.webp') || f.endsWith('.png')) && !NO_SON_RETRATOS.test(f)
      )

const chromium = await loadChromium()
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(DEV_URL, { waitUntil: 'domcontentloaded' })

const medidas = await page.evaluate(async (files) => {
  const out = []
  for (const f of files) {
    const img = new Image()
    img.src = '/characters/' + f
    try {
      await img.decode()
    } catch {
      out.push({ f, error: 'no se puede abrir' })
      continue
    }
    const w = img.naturalWidth
    const h = img.naturalHeight
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const x = c.getContext('2d', { willReadFrequently: true })
    x.drawImage(img, 0, 0)
    const d = x.getImageData(0, 0, w, h).data

    let figTop = h
    let figBot = -1
    for (let y = 0; y < h; y++) {
      for (let px = 0; px < w; px++) {
        if (d[(y * w + px) * 4 + 3] > 12) {
          if (y < figTop) figTop = y
          figBot = y
          break
        }
      }
    }
    // El borde de abajo: cuanto tapa y cuanto margen queda a cada lado.
    let tapados = 0
    let izq = w
    let der = w
    for (let px = 0; px < w; px++) {
      if (d[((h - 1) * w + px) * 4 + 3] > 12) {
        tapados++
        if (izq === w) izq = px
        der = w - 1 - px
      }
    }
    // Halo: pixeles casi opacos y casi blancos pegados al filo de la figura.
    let halo = 0
    for (let y = 1; y < h - 1; y++) {
      for (let px = 1; px < w - 1; px++) {
        const i = (y * w + px) * 4
        if (d[i + 3] < 200) continue
        if (d[i] < 228 || d[i + 1] < 228 || d[i + 2] < 228) continue
        const vecinos = [
          d[i - 4 + 3], d[i + 4 + 3], d[i - w * 4 + 3], d[i + w * 4 + 3],
        ]
        if (vecinos.some((a) => a < 60)) halo++
      }
    }
    out.push({
      f, w, h,
      ratio: w / h,
      aire: figTop / h,
      llegaAbajo: figBot >= h - 2,
      tapaAbajo: tapados / w,
      margenIzq: izq === w ? w : izq,
      margenDer: tapados === 0 ? w : der,
      halo,
    })
  }
  return out
}, files)

let mal = 0
for (const m of medidas) {
  console.log('')
  if (m.error) {
    console.log(`${m.f}: ${m.error}`)
    mal++
    continue
  }
  console.log(`${m.f}  (${m.w}x${m.h})`)
  const linea = (ok, txt) => {
    if (!ok) mal++
    console.log(`  ${ok ? 'bien' : 'MAL '}  ${txt}`)
  }
  linea(
    Math.abs(m.ratio - RATIO) < 0.005,
    `proporcion ${m.ratio.toFixed(3)} (tiene que ser ${RATIO.toFixed(3)}; a ${m.w} de ancho, el alto son ${Math.round(m.w / RATIO)})`
  )
  linea(m.w >= ANCHO_MINIMO, `ancho ${m.w} px (minimo ${ANCHO_MINIMO} para que no se agrande en un movil bueno)`)
  linea(
    Math.abs(m.aire - AIRE) < 0.02,
    `aire sobre la cabeza ${(m.aire * 100).toFixed(1)}% (tiene que ser ${AIRE * 100}%, o sea ${Math.round(m.h * AIRE)} px)`
  )
  linea(m.llegaAbajo, 'el torso llega al borde de abajo')
  linea(m.tapaAbajo > 0.98, `tapa el ${(m.tapaAbajo * 100).toFixed(0)}% del borde de abajo (tiene que ser el 100%, de lado a lado)`)
  if (m.tapaAbajo <= 0.98) {
    console.log(`        margen que sobra abajo: ${m.margenIzq} px por la izquierda, ${m.margenDer} por la derecha`)
  }
  linea(m.halo < 400, `halo blanco: ${m.halo} pixeles claros pegados al filo`)
}

console.log('')
console.log(mal === 0 ? 'Todo en regla.' : `${mal} cosas que corregir.`)
if (mal > 0) process.exitCode = 1
await browser.close()
