// Re-encuadra TODOS los .png de public/characters/ a un lienzo común, para
// que en la carta se vean todos con el mismo plano (cara arriba, poco aire
// sobre la cabeza, torso sangrando por abajo) sin importar el tamaño del
// hueco de la carta. Sin esto, cada retrato venía con su propio encuadre y
// unos salían "flotando" y otros "cortados".
//
// Uso (hace falta un servidor de dev levantado y npx playwright):
//   1. npm run dev            (en otra terminal)
//   2. node scripts/normalize-portraits.mjs              -> todos
//      node scripts/normalize-portraits.mjs guru.png ... -> solo esos
//
// Es idempotente en la práctica: re-encuadra sobre el bounding box de píxeles
// no transparentes, así que volver a pasarlo apenas cambia nada. Guarda copia
// de los originales antes de tocar nada si quieres poder volver atrás.
//
// Nota técnica: usa un navegador (canvas) porque Node no trae manipulación de
// imágenes. La página se carga desde localhost para que el canvas no quede
// "tainted" por CORS al leer los píxeles.

import { writeFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Playwright no es dependencia del proyecto (solo hace falta para este script
// puntual). Se intenta resolver del proyecto y, si no está, de la caché de
// npx. Si falla, el mensaje dice qué ejecutar.
async function loadChromium() {
  const tries = ['playwright', 'playwright-core']
  for (const mod of tries) {
    try {
      return (await import(mod)).chromium
    } catch {
      /* siguiente */
    }
  }
  const npxCache = process.env.PLAYWRIGHT_PATH
  if (npxCache) return (await import(npxCache)).chromium
  throw new Error(
    'No encuentro playwright. Instálalo con: npm i -D playwright  (o define PLAYWRIGHT_PATH)'
  )
}
const chromium = await loadChromium()

const CHARDIR = fileURLToPath(new URL('../public/characters/', import.meta.url))
const DEV_URL = process.env.DEV_URL || 'http://localhost:5173/'

// LIENZO DESTINO. La proporcion es 17:20 (0,85) y no se negocia: la carta se
// dibuja con exactamente `aspectRatio: 1020/1200` (ver SwipeCard), asi que
// cualquier otra deja franjas o recorta.
//
// EL TAMAÑO SUBE DE 1020 A 1224, y el motivo es que 1020 contradecia al propio
// comprobador. La carta ocupa 384 pixeles CSS de ancho (el marco mide 400 y se
// le quitan 16 de margen), asi que en un movil de densidad 3 son 1152 pixeles
// REALES. A 1020 el navegador agrandaba y se emborronaba, y por eso los
// veinticuatro retratos salian con un "MAL ancho 1020" en comprobar-retrato:
// la tuberia los dejaba por debajo de lo que ella misma exige.
//
// 1224x1440 son 17:20 exactos y pasan de 1152. No se sube mas (1632 cubriria
// densidad 4) porque la pantalla de carga espera a los veinticuatro retratos:
// medido sobre lo que pesan hoy, 1224 lleva el total de 1,9 a 2,8 MB -de 5 a 7
// segundos en 3G- y 1632 lo llevaria a 4,9 MB y trece segundos. No compensa
// por una nitidez que solo se ve en los moviles mas caros.
const TW = 1224
const TH = 1440
const HEADROOM = 0.05 // aire sobre la cabeza, en tanto por uno de la altura
const CONTENT_H = 0.96 // el contenido ocupa este % de la altura del lienzo

// Sin argumentos, todos los .png; con argumentos, solo los indicados (útil
// al añadir un retrato nuevo, para no reescribir los que ya están bien).
const args = process.argv.slice(2)
// Los retratos viven en .webp (ver scripts/to-webp.mjs); se aceptan .png por
// si entra arte nuevo sin convertir todavia.
const files =
  args.length > 0
    ? args
    : readdirSync(CHARDIR).filter((f) => f.endsWith('.webp') || f.endsWith('.png'))

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(DEV_URL, { waitUntil: 'domcontentloaded' })

for (const f of files) {
  const res = await page.evaluate(
    async ({ f, TW, TH, HEADROOM, CONTENT_H }) => {
      const img = new Image()
      img.src = '/characters/' + f
      await img.decode()
      const nw = img.naturalWidth
      const nh = img.naturalHeight

      const c1 = document.createElement('canvas')
      c1.width = nw
      c1.height = nh
      const x1 = c1.getContext('2d')
      x1.drawImage(img, 0, 0)
      const d = x1.getImageData(0, 0, nw, nh).data
      let minX = nw
      let minY = nh
      let maxX = 0
      let maxY = 0
      for (let y = 0; y < nh; y++) {
        for (let px = 0; px < nw; px++) {
          if (d[(y * nw + px) * 4 + 3] > 12) {
            if (px < minX) minX = px
            if (px > maxX) maxX = px
            if (y < minY) minY = y
            if (y > maxY) maxY = y
          }
        }
      }
      const bw = maxX - minX + 1
      const bh = maxY - minY + 1

      // NUNCA AGRANDAR. Con el destino a 1224, volver a pasar esto sobre un
      // retrato viejo de 1020 lo estiraria sin ganar un solo detalle: mismo
      // dibujo, mas peso y mas borroso. Si la figura no da para llenar el
      // lienzo, se queda como esta y se centra igual.
      const scale = Math.min((CONTENT_H * TH) / bh, 1)
      const c2 = document.createElement('canvas')
      c2.width = TW
      c2.height = TH
      const x2 = c2.getContext('2d')
      x2.imageSmoothingQuality = 'high'
      const dx = TW / 2 - (minX + bw / 2) * scale
      const dy = HEADROOM * TH - minY * scale
      x2.drawImage(img, 0, 0, nw, nh, dx, dy, nw * scale, nh * scale)
      // Se reexporta en el MISMO formato que entro: convertir un webp a png
      // al re-encuadrarlo lo devolveria a pesar diez veces mas.
      return c2.toDataURL(f.endsWith('.webp') ? 'image/webp' : 'image/png', 0.9)
    },
    { f, TW, TH, HEADROOM, CONTENT_H }
  )

  writeFileSync(CHARDIR + f, Buffer.from(res.split(',')[1], 'base64'))
  console.log('re-encuadrado:', f)
}

await browser.close()
console.log(`\nHecho. ${files.length} retratos a ${TW}x${TH}.`)
