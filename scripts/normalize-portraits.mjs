// Re-encuadra TODOS los .png de public/characters/ a un lienzo común, para
// que en la carta se vean todos con el mismo plano (cara arriba, poco aire
// sobre la cabeza, torso sangrando por abajo) sin importar el tamaño del
// hueco de la carta. Sin esto, cada retrato venía con su propio encuadre y
// unos salían "flotando" y otros "cortados".
//
// Uso (hace falta un servidor de dev levantado y npx playwright):
//   1. npm run dev            (en otra terminal)
//   2. node scripts/normalize-portraits.mjs
//
// Es idempotente en la práctica: re-encuadra sobre el bounding box de píxeles
// no transparentes, así que volver a pasarlo apenas cambia nada. Guarda copia
// de los originales antes de tocar nada si quieres poder volver atrás.
//
// Nota técnica: usa un navegador (canvas) porque Node no trae manipulación
// de imágenes. Playwright se coge de su caché de npx; ajusta la ruta si hace
// falta. La página se carga desde localhost para que el canvas no quede
// "tainted" por CORS al leer los píxeles.

import { chromium } from 'playwright'
import { writeFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const CHARDIR = fileURLToPath(new URL('../public/characters/', import.meta.url))
const DEV_URL = process.env.DEV_URL || 'http://localhost:5173/'

// Lienzo destino: retrato 0.85 (parecido al hueco de la carta en móvil).
const TW = 1020
const TH = 1200
const HEADROOM = 0.05 // aire sobre la cabeza, en tanto por uno de la altura
const CONTENT_H = 0.96 // el contenido ocupa este % de la altura del lienzo

const files = readdirSync(CHARDIR).filter((f) => f.endsWith('.png'))

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

      const scale = (CONTENT_H * TH) / bh
      const c2 = document.createElement('canvas')
      c2.width = TW
      c2.height = TH
      const x2 = c2.getContext('2d')
      x2.imageSmoothingQuality = 'high'
      const dx = TW / 2 - (minX + bw / 2) * scale
      const dy = HEADROOM * TH - minY * scale
      x2.drawImage(img, 0, 0, nw, nh, dx, dy, nw * scale, nh * scale)
      return c2.toDataURL('image/png')
    },
    { f, TW, TH, HEADROOM, CONTENT_H }
  )

  writeFileSync(CHARDIR + f, Buffer.from(res.split(',')[1], 'base64'))
  console.log('re-encuadrado:', f)
}

await browser.close()
console.log(`\nHecho. ${files.length} retratos a ${TW}x${TH}.`)
