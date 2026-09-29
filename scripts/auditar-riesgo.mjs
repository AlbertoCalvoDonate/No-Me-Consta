// Busca en el mazo lo que podria convertir una satira en un disgusto.
//
// AVISO, y va en serio: esto NO es asesoramiento legal, y quien lo escribe no
// es abogado. Es una herramienta de lectura que marca frases para que las
// mire una persona. Si el juego crece o se monetiza, esa persona deberia ser
// un abogado de verdad.
//
// QUE BUSCA Y POR QUE. En Espana la satira de cargos publicos esta muy
// protegida (libertad de expresion, asunto de interes publico, caricatura de
// personaje publico). Lo que estrecha esa proteccion es una combinacion
// concreta: que se identifique a una persona real Y que se le impute un
// DELITO como si fuera un hecho. Este juego ya hace lo mas importante para
// quedarse del lado bueno -ningun nombre real, ninguna ciudad, personajes que
// son arquetipos-, pero los retratos si son reconocibles, y ahi es donde el
// texto tiene que pisar con cuidado.
//
// Por eso mira tres cosas distintas:
//
//   1. IMPUTACION DIRECTA: el texto afirma que alguien cometio un delito.
//      "Cobro una mordida", "blanqueo el dinero". Es lo mas delicado.
//   2. AFIRMADO vs ATRIBUIDO: lo mismo dicho entre comillas por un personaje,
//      o en condicional, o como sospecha, pesa mucho menos que dicho por el
//      narrador en indicativo. La misma frase cambia de sitio segun quien la
//      diga.
//   3. MENORES Y FAMILIA no publica: donde mas rapido se acaba la proteccion
//      del interes publico.
//
// Uso:  node scripts/auditar-riesgo.mjs

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const CONTENT = fileURLToPath(new URL('../src/data/cards.content.ts', import.meta.url))
const CARDS = fileURLToPath(new URL('../src/data/cards.ts', import.meta.url))
const fuente = readFileSync(CONTENT, 'utf8') + readFileSync(CARDS, 'utf8')

// Verbos y sustantivos que nombran un delito. No son palabras prohibidas: son
// palabras que piden mirar como estan dichas.
const DELITO = [
  'cohecho', 'soborn', 'mordida', 'blanque', 'malversa', 'prevaricar', 'prevaricacion',
  'prevaricación', 'amañ', 'amano', 'trafico de influencias', 'tráfico de influencias',
  'financiacion ilegal', 'financiación ilegal', 'caja b', 'sobresueldo', 'comision ilegal',
  'comisión ilegal', 'evasion', 'evasión', 'defraud', 'estafa', 'chantaje', 'extorsion',
  'extorsión', 'falsific',
]
// Lo que convierte una acusacion en una cita, una sospecha o una broma.
const AMORTIGUA = ['"', '«', 'dicen', 'dicen que', 'parece', 'sospech', 'presunt', 'si ', 'podria', 'podría', '¿']

// Familia y menores: donde antes se acaba el interes publico.
const FAMILIA = ['su hijo', 'sus hijos', 'su hija', 'sus hijas', 'menor de edad', 'su madre', 'su mujer', 'su marido']

function cartas(src) {
  const out = []
  for (const bloque of src.split('\n  {')) {
    const id = /id: '([^']+)'/.exec(bloque)
    if (!id) continue
    const texto = /text: '((?:[^'\\]|\\.)*)'/.exec(bloque)
    const quien = /character: '([^']+)'/.exec(bloque)
    if (texto) out.push({ id: id[1], quien: quien ? quien[1] : '?', texto: texto[1] })
  }
  return out
}

const todas = cartas(fuente)
const marcadas = []
for (const c of todas) {
  const t = c.texto.toLowerCase()
  // Como PRINCIPIO DE PALABRA, no como subcadena suelta. Con includes() a
  // secas, la raiz "ama\u00f1" casaba dentro de "tama\u00f1o" y marcaba como
  // acusacion toda carta que dijera "del mismo tama\u00f1o": tres falsos
  // positivos de cuatro. Un auditor legal que grita de mas deja de leerse.
  const delitos = DELITO.filter((d) =>
    new RegExp('(^|[^a-z\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1\u00fc])' + d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(t)
  )
  if (delitos.length === 0) continue
  // Se mira si la frase que contiene el delito viene entrecomillada o
  // matizada: es la diferencia entre afirmar y atribuir.
  const amortiguado = AMORTIGUA.some((a) => t.includes(a))
  marcadas.push({ ...c, delitos, amortiguado })
}
const familia = todas.filter((c) => FAMILIA.some((f) => c.texto.toLowerCase().includes(f)))

console.log(`${todas.length} cartas con texto.\n`)
console.log('PALABRAS QUE NOMBRAN UN DELITO')
console.log(`  aparecen en ${marcadas.length} cartas`)
const crudas = marcadas.filter((c) => !c.amortiguado)
console.log(`  de esas, ${crudas.length} lo dicen SIN comillas, condicional ni "presunto":\n`)
for (const c of crudas) {
  console.log(`  ${c.id}  [${c.quien}]  (${c.delitos.join(', ')})`)
  console.log(`      ${c.texto.slice(0, 150)}`)
}

console.log('')
console.log(`FAMILIA NO PUBLICA: ${familia.length} cartas`)
for (const c of familia) console.log(`  ${c.id}  [${c.quien}]`)

console.log('')
console.log('Recordatorio: esto marca frases para que las lea una persona.')
console.log('No es asesoramiento legal y quien lo escribio no es abogado.')
