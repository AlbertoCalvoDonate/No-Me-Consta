// LA PROSA DEL MAZO, MEDIDA. Cómo se escribe aquí, no cómo se debería.
//
// Existe porque al reescribir cartas se iba el tono: cada arreglo salía un poco
// distinto, y sin un patrón que mirar no había forma de saber si el texto nuevo
// pegaba o no. Esto saca el patrón de las 634 que ya están escritas.
//
// NO ES UN VALIDADOR. Es una regla de medir. Un texto que se salga de la banda
// no está mal: está fuera de lo habitual, y eso puede ser a propósito.
//
// Uso:  npm run qa-prosa            -> el patrón del mazo
//       npm run qa-prosa <id>       -> una carta contra el patrón

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const CONTENT = fileURLToPath(new URL('../src/data/cards.content.ts', import.meta.url))
const fuente = readFileSync(CONTENT, 'utf8')
const marca = 'export const contentCards: Card[] = ['
const abre = fuente.indexOf(marca) + marca.length - 1
let nivel = 0
let cartas = []
for (let i = abre; i < fuente.length; i++) {
  if (fuente[i] === '[') nivel++
  else if (fuente[i] === ']') {
    nivel--
    // eslint-disable-next-line no-new-func
    if (nivel === 0) {
      cartas = new Function(`return ${fuente.slice(abre, i + 1)}`)()
      break
    }
  }
}

const frasesDe = (t) => t.split(/(?<=[.?!…])\s+/).filter((f) => f.trim().length > 2)
const palabrasDe = (t) => t.match(/\S+/g) ?? []

function medir(t) {
  const frases = frasesDe(t)
  const pal = palabrasDe(t)
  const largos = pal.filter((p) => p.replace(/[^a-záéíóúñüA-ZÁÉÍÓÚÑÜ]/g, '').length >= 11).length
  return {
    palabras: pal.length,
    frases: frases.length,
    porFrase: pal.length / Math.max(1, frases.length),
    // Frases de menos de cinco palabras: el golpe seco, que es lo que da ritmo.
    cortas: frases.filter((f) => palabrasDe(f).length <= 5).length,
    comas: (t.match(/,/g) ?? []).length / Math.max(1, frases.length),
    // Palabras de once letras o más. Es el termómetro del tono: cuanto más
    // sube, más suena a nota de prensa y menos a alguien hablando.
    largas: (100 * largos) / Math.max(1, pal.length),
    subordinadas: (t.match(/\b(que|porque|aunque|cuando|si|mientras|donde)\b/gi) ?? []).length /
      Math.max(1, frases.length),
  }
}

const uno = process.argv[2]
if (uno) {
  const c = cartas.find((x) => x.id === uno)
  if (!c) {
    console.log(`No encuentro la carta "${uno}".`)
    process.exit(1)
  }
  const m = medir(c.text)
  const todas = cartas.map((x) => medir(x.text))
  const mediana = (k) => {
    const v = todas.map((x) => x[k]).sort((a, b) => a - b)
    return v[Math.floor(v.length / 2)]
  }
  console.log(`\n${c.id}  [${c.character}]`)
  console.log(`  ${c.text}\n`)
  const linea = (etiq, valor, med, unidad = '') =>
    console.log(
      `  ${etiq.padEnd(26)}${valor.toFixed(1).padStart(6)}${unidad}   (mazo ${med.toFixed(1)}${unidad})`
    )
  linea('palabras', m.palabras, mediana('palabras'))
  linea('frases', m.frases, mediana('frases'))
  linea('palabras por frase', m.porFrase, mediana('porFrase'))
  linea('frases de golpe (<=5 pal)', m.cortas, mediana('cortas'))
  linea('comas por frase', m.comas, mediana('comas'))
  linea('palabras largas', m.largas, mediana('largas'), '%')
  linea('nexos por frase', m.subordinadas, mediana('subordinadas'))
  console.log()
  process.exit(0)
}

const todas = cartas.map((c) => medir(c.text))
const stat = (k) => {
  const v = todas.map((x) => x[k]).sort((a, b) => a - b)
  return {
    p10: v[Math.floor(v.length * 0.1)],
    med: v[Math.floor(v.length / 2)],
    p90: v[Math.floor(v.length * 0.9)],
  }
}

console.log(`EL PATRÓN DE LAS ${cartas.length} CARTAS\n`)
console.log('                            p10   mediana   p90')
const fila = (etiq, k, u = '') => {
  const s = stat(k)
  console.log(
    `  ${etiq.padEnd(26)}${s.p10.toFixed(1).padStart(5)}${u}${s.med.toFixed(1).padStart(9)}${u}${s.p90.toFixed(1).padStart(7)}${u}`
  )
}
fila('palabras por carta', 'palabras')
fila('frases por carta', 'frases')
fila('palabras por frase', 'porFrase')
fila('frases de golpe (<=5 pal)', 'cortas')
fila('comas por frase', 'comas')
fila('palabras largas', 'largas', '%')
fila('nexos por frase', 'subordinadas')

const conGolpe = todas.filter((m) => m.cortas >= 1).length
console.log(
  `\n${Math.round((100 * conGolpe) / todas.length)}% de las cartas tienen al menos una frase de cinco palabras o menos.`
)
console.log('Ese golpe seco al final es la forma de la casa: se cuenta la situación y se remata corto.')
