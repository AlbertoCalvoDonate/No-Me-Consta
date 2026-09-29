// QA de PERSONALIDAD: ¿es cada personaje alguien, o es un generador de
// dilemas con nombre encima?
//
// El auditor de coherencia mira la mecánica (que una carta no salga cuando no
// toca). Este mira lo otro: que lo que un personaje QUIERE sea siempre lo
// mismo, que hable distinto a los demás y que la ficha del reparto no mienta.
//
// Cinco cosas, todas medidas sobre el mazo entero:
//
//   1. QUÉ LE GUSTA. `pleases` dice de qué lado se pone. Cruzándolo con la
//      moralidad de ese lado sale el carácter: quien siempre prefiere lo sucio
//      es un corrupto, quien siempre prefiere lo limpio es un honesto, y quien
//      va cambiando no tiene carácter ninguno. Un personaje al 50% es alguien
//      a quien el jugador no puede aprenderse, que es justo la habilidad que
//      este juego pide.
//
//   2. SU BARRA. El reparto promete que cada uno "empuja" un indicador. Si
//      apenas lo toca, la promesa es falsa y saber quién habla no sirve.
//
//   3. CÓMO HABLA. Longitud de frase, preguntas y comillas. No hay un valor
//      bueno: lo que se busca es que no sean todos iguales.
//
//   4. PALABRAS SUYAS. Las que usa mucho más que el resto del mazo. Un
//      personaje sin ninguna es un personaje sin voz.
//
//   5. QUIÉN NOMBRA A QUIÉN. Para ver de un vistazo si el reparto se conoce
//      entre sí o cada uno habla solo.
//
// Uso:  node scripts/qa-personalidad.mjs

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const CONTENT = fileURLToPath(new URL('../src/data/cards.content.ts', import.meta.url))
const REPARTO = fileURLToPath(new URL('../src/data/reparto.ts', import.meta.url))
const fuente = readFileSync(CONTENT, 'utf8')
const repSrc = readFileSync(REPARTO, 'utf8')

const BARRAS = ['medios', 'gobierno', 'calle', 'caja']

// Ficha del reparto: nombre -> indicador que dice empujar.
const duenoDe = {}
for (const m of repSrc.matchAll(/nombre: '([^']+)'[^\n]*?dueno: '(\w+)'/g)) duenoDe[m[1]] = m[2]

// Cartas, con lo que hace falta para medir.
const cartas = []
for (const b of fuente.split('\n  {').slice(1)) {
  const id = /id: '([^']+)'/.exec(b)
  const quien = /character: '([^']+)'/.exec(b)
  const texto = /text: '((?:[^'\\]|\\.)*)'/.exec(b)
  if (!id || !quien) continue
  const efectos = [...b.matchAll(/effects: \{([^}]*)\}/g)].map((m) => {
    const d = {}
    for (const k of BARRAS) {
      const v = new RegExp(k + ': (-?\\d+)').exec(m[1])
      if (v) d[k] = Number(v[1])
    }
    return d
  })
  const morales = [...b.matchAll(/moralidad: (-?\d+)/g)].map((m) => Number(m[1]))
  const pleases = /pleases: '(\w+)'/.exec(b)
  cartas.push({
    id: id[1],
    quien: quien[1],
    texto: texto ? texto[1] : '',
    efectos,
    morales,
    pleases: pleases ? pleases[1] : null,
  })
}

const porQuien = new Map()
for (const c of cartas) {
  if (!porQuien.has(c.quien)) porQuien.set(c.quien, [])
  porQuien.get(c.quien).push(c)
}

// --- 1 y 2: carácter e indicador ---
console.log(`${cartas.length} cartas, ${porQuien.size} voces.\n`)
console.log('PERSONAJE                    n   le gusta lo sucio   su barra   frase   ¿?   ""')
const sinCaracter = []
const sinBarra = []
const filas = []
for (const [quien, suyas] of porQuien) {
  const conPleases = suyas.filter((c) => c.pleases && c.morales.length === 2)
  let sucio = 0
  for (const c of conPleases) {
    // `morales` va en orden: primero el de la izquierda, luego el de la
    // derecha. Se mira la moralidad del lado que le gusta.
    const m = c.pleases === 'left' ? c.morales[0] : c.morales[1]
    if (m < 0) sucio++
  }
  const pct = conPleases.length ? Math.round((sucio / conPleases.length) * 100) : null

  let propio = 0
  let total = 0
  for (const c of suyas) {
    for (const e of c.efectos) {
      for (const k of BARRAS) {
        const v = Math.abs(e[k] || 0)
        total += v
        if (k === duenoDe[quien]) propio += v
      }
    }
  }
  const pctBarra = duenoDe[quien] && total ? Math.round((propio / total) * 100) : null

  const textos = suyas.map((c) => c.texto).filter(Boolean)
  const palabras = textos.join(' ').split(/\s+/).length
  const frases = textos.join(' ').split(/[.!?]+/).filter((x) => x.trim()).length
  const largo = frases ? Math.round(palabras / frases) : 0
  const preg = Math.round((textos.filter((t) => t.includes('?')).length / (textos.length || 1)) * 100)
  const cita = Math.round((textos.filter((t) => t.includes('"')).length / (textos.length || 1)) * 100)

  filas.push({ quien, n: suyas.length, pct, pctBarra, largo, preg, cita, conPleases: conPleases.length })
  // Un personaje con pocas cartas con pleases no se puede juzgar.
  // LA VECINA NO CUENTA, y no es un descuido. Ella no elige entre limpio y
  // sucio: elige lo que le beneficia a ella, que unas veces cae de un lado y
  // otras del otro. Estar en la zona turbia ES su retrato, y "arreglarla"
  // seria convertirla en otra persona.
  const excepcion = quien === 'La Vecina'
  if (!excepcion && pct !== null && conPleases.length >= 6 && pct >= 35 && pct <= 65)
    sinCaracter.push({ quien, pct })
  if (pctBarra !== null && pctBarra < 25) sinBarra.push({ quien, pctBarra })
}
filas.sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1))
for (const f of filas) {
  console.log(
    `${f.quien.padEnd(26)} ${String(f.n).padStart(3)}   ${(f.pct === null ? '  -' : String(f.pct) + '%').padStart(15)}   ` +
      `${(f.pctBarra === null ? '  -' : String(f.pctBarra) + '%').padStart(8)}   ${String(f.largo).padStart(5)}  ${String(f.preg).padStart(3)}%  ${String(f.cita).padStart(3)}%`
  )
}

// --- 4: palabras propias ---
const limpiar = (t) =>
  t
    .toLowerCase()
    .replace(/[^a-záéíóúñü ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4)
const global = new Map()
for (const c of cartas) for (const w of limpiar(c.texto)) global.set(w, (global.get(w) || 0) + 1)
const totalGlobal = [...global.values()].reduce((a, b) => a + b, 0)

console.log('\nPALABRAS PROPIAS (las que dice mucho más que el resto del mazo)')
const mudos = []
for (const [quien, suyas] of porQuien) {
  if (suyas.length < 8) continue
  const mio = new Map()
  for (const c of suyas) for (const w of limpiar(c.texto)) mio.set(w, (mio.get(w) || 0) + 1)
  const totalMio = [...mio.values()].reduce((a, b) => a + b, 0)
  const propias = []
  for (const [w, n] of mio) {
    if (n < 3) continue
    const ratio = n / totalMio / ((global.get(w) || 1) / totalGlobal)
    if (ratio >= 2.5) propias.push([w, ratio])
  }
  propias.sort((a, b) => b[1] - a[1])
  const lista = propias.slice(0, 6).map(([w]) => w).join(', ')
  console.log(`  ${quien.padEnd(26)} ${lista || '(ninguna: habla como el mazo)'}`)
  if (!lista) mudos.push(quien)
}

// --- 5: quién nombra a quién ---
const nombres = [...porQuien.keys()].filter((n) => n.startsWith('El ') || n.startsWith('La '))
console.log('\nSE NOMBRAN ENTRE ELLOS')
let citas = 0
for (const c of cartas) {
  for (const n of nombres) {
    if (n === c.quien) continue
    if (c.texto.includes(n)) citas++
  }
}
console.log(`  ${citas} veces una carta nombra a otro personaje del reparto.`)

// --- Resumen ---
console.log('\n========================================')
if (sinCaracter.length) {
  console.log(`SIN CARÁCTER DEFINIDO (${sinCaracter.length}): le gusta lo sucio tantas veces como lo limpio,`)
  console.log('  así que el jugador no puede aprenderse de qué lado se pone.')
  for (const x of sinCaracter) console.log(`  - ${x.quien}: ${x.pct}%`)
} else {
  console.log('Todos tienen un lado claro: se les puede aprender.')
  console.log('  (La Vecina queda fuera de la cuenta a proposito: ella elige lo que le')
  console.log('   conviene a ella, no entre limpio y sucio, asi que su zona turbia es')
  console.log('   justo su personaje.)')
}
if (sinBarra.length) {
  console.log(`\nNO EMPUJAN SU INDICADOR (${sinBarra.length}): el reparto promete algo que no cumplen.`)
  for (const x of sinBarra) console.log(`  - ${x.quien}: ${x.pctBarra}%`)
}
if (mudos.length) {
  console.log(`\nSIN VOZ PROPIA (${mudos.length}): no hay una sola palabra que digan más que el resto.`)
  for (const q of mudos) console.log(`  - ${q}`)
}
