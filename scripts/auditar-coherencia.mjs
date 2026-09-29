// Busca en el mazo lo que el jugador leeria como un error del juego.
//
// No mira si una carta esta bien escrita: mira si puede SALIR CUANDO NO TOCA.
// Una carta que dice "aquello que hablamos en enero" y sale sin que hubiera
// enero no es una carta mala, es un juego roto: el jugador no piensa "vaya
// texto", piensa "esto no lo he vivido yo".
//
// Cuatro cosas, todas mecanicas y comprobables sin ejecutar el juego:
//
//   1. APAGA UNA BANDERA QUE NO EXIGE. Si una carta hace removeFlags: ['x']
//      pero su condicion no pide 'x', puede salir sin que 'x' este encendida.
//      Y si apaga esa bandera es porque su texto habla de lo que la encendio.
//
//   2. PROGRAMADA Y ADEMAS SORTEABLE. Una carta que llega por scheduleCardId
//      es la segunda mitad de algo; si ademas tiene peso, el sorteo normal
//      puede sacarla sola, sin la primera mitad.
//
//   3. HABLA DEL PASADO SIN PEDIRLO. Texto con "aquel", "lo que hablamos",
//      "se acuerda", "volvio"... y ninguna condicion. Esto es un AVISO, no un
//      error: a veces el pasado es generico ("aquella epoca") y se puede
//      escribir asi a proposito.
//
//   4. ENCADENA A UNA CARTA QUE NO EXISTE o se encadena a si misma.
//
// Uso:  node scripts/auditar-coherencia.mjs

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const CONTENT = fileURLToPath(new URL('../src/data/cards.content.ts', import.meta.url))
const fuente = readFileSync(CONTENT, 'utf8')

// Se parte por cartas. Cada bloque es el texto en crudo de una carta, que es
// todo lo que hace falta: aqui se busca la FORMA, no el valor.
const bloques = fuente.split('\n  {').slice(1)
const cartas = []
for (const b of bloques) {
  const id = /id: '([^']+)'/.exec(b)
  if (!id) continue
  const texto = /text: '((?:[^'\\]|\\.)*)'/.exec(b)
  cartas.push({
    id: id[1],
    cuerpo: b,
    texto: texto ? texto[1] : '',
    condicion: b.includes('condition:'),
  })
}
const ids = new Set(cartas.map((c) => c.id))

const errores = []
const avisos = []

for (const c of cartas) {
  // 1. Apaga una bandera que no exige.
  //
  // Solo cuenta si la carta PUEDE SALIR SOLA. Una con weight: 0 que unicamente
  // llega por scheduleCardId es la segunda mitad de algo: su bandera la
  // encendio la primera mitad y esta garantizada, asi que pedirla otra vez en
  // la condicion no anade nada. Sin esta salvedad salian veinte avisos falsos
  // -todas las bombas y todos los cobros- y un auditor que grita veinte veces
  // por nada deja de leerse.
  const soloProgramada =
    /weight: 0,/.test(c.cuerpo) && cartas.some((o) => o.cuerpo.includes(`scheduleCardId: '${c.id}'`))
  const apaga = soloProgramada
    ? []
    : [...c.cuerpo.matchAll(/removeFlags: \[([^\]]*)\]/g)]
        .flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]))
  for (const f of new Set(apaga)) {
    // Basta con que la bandera se nombre en la condicion: puede ser
    // flags.has('x') o flagAge('x') >= n, las dos valen.
    const trozoCondicion = c.cuerpo.slice(c.cuerpo.indexOf('condition:'))
    const laPide = c.condicion && trozoCondicion.includes(`'${f}'`)
    if (!laPide) {
      errores.push(
        `"${c.id}": apaga la bandera "${f}" pero no la exige en su condición. ` +
          'Puede salir sin que haya pasado lo que esa bandera recuerda.'
      )
    }
  }

  // 2. Programada y ademas sorteable.
  const esProgramada = cartas.some((o) => o.cuerpo.includes(`scheduleCardId: '${c.id}'`))
  const pesoCero = /weight: 0\b/.test(c.cuerpo)
  if (esProgramada && !pesoCero && !c.condicion) {
    errores.push(
      `"${c.id}": llega programada por otra carta y además puede salir en el sorteo ` +
        '(no tiene weight: 0 ni condición). Saldría sin su primera mitad.'
    )
  }

  // 4. Encadena a una carta que no existe, o a si misma.
  const siguientes = [...c.cuerpo.matchAll(/(?:nextCardId|scheduleCardId): '([^']+)'/g)].map((m) => m[1])
  for (const n of siguientes) {
    if (!ids.has(n)) errores.push(`"${c.id}": encadena con "${n}", que no existe.`)
    if (n === c.id) errores.push(`"${c.id}": se encadena consigo misma.`)
  }

  // 3. Habla del pasado sin pedirlo.
  const PASADO = /\b(aquel|aquella|aquello|lo que hablamos|se acuerda|te acuerdas|otra vez|volvió|de nuevo|como le dije|como le prometí|lo de enero|desde aquel)\b/i
  if (!c.condicion && PASADO.test(c.texto)) {
    const m = PASADO.exec(c.texto)
    avisos.push(`"${c.id}": el texto dice "${m[0]}" y la carta no pide nada. ¿Habla de algo que pudo no pasar?`)
  }
}

console.log(`${cartas.length} cartas revisadas.\n`)
if (errores.length) {
  console.log(`COSAS QUE PUEDEN SALIR CUANDO NO TOCA (${errores.length}):`)
  errores.forEach((e) => console.log('  - ' + e))
} else {
  console.log('Ninguna carta puede salir fuera de su sitio.')
}
if (avisos.length) {
  console.log(`\nPARA MIRAR A MANO (${avisos.length}):`)
  avisos.forEach((a) => console.log('  - ' + a))
  console.log(
    '\n  Los que había el 29/09/2026 se miraron uno a uno y estaban bien: son\n' +
      '  pasado genérico -un "otra vez" de algo que ese personaje hace siempre,\n' +
      '  "aquella cena" que cuenta la propia carta- o cartas que solo llegan\n' +
      '  programadas, donde lo que recuerdan está garantizado. El único que sí\n' +
      '  estaba mal era "sind_campana": pedía por escrito "lo que hablamos en\n' +
      '  enero" sin que hubiera habido ningún enero.'
  )
}
if (errores.length) process.exit(1)
