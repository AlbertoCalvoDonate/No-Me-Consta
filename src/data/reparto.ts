import type { StatKey } from '../types'
import { cards } from './cards'

// QUIEN ES QUIEN. Con 23 personajes y una partida mediana de ~40 cartas, un
// personaje concreto te sale unas 6 veces: no da tiempo a aprenderse el
// reparto jugando, y saber quien mueve que ES la habilidad central de un
// Reigns (ves quien habla y ya sabes que te juegas).
//
// Hasta ahora esta informacion vivia solo en comentarios sueltos (types.ts,
// StatBars.tsx y el README), que ademas se quedaron desactualizados cuando se
// renombraron personajes. Aqui esta una sola vez y como DATO, no como prosa.

export interface Personaje {
  nombre: string
  // Retrato en public/characters/. Los fontaneros no tienen: son gente sin
  // cara publica, y en la carta salen rotulados con el nombre en grande (ver
  // SwipeCard). Si algun dia hay arte, basta con ponerlo aqui.
  imagen?: string
  // El indicador que encarna: sus cartas lo tocan casi siempre.
  // `undefined` = no encarna ninguno en concreto (voces de cierre, el propio
  // presidente, un aliado generico).
  dueno?: StatKey
  // Una linea de quien es. Sin destripar tramas.
  quien: string
  // COMO HABLA. No es lo mismo que `quien`: eso dice que quiere, esto dice con
  // que boca lo pide.
  //
  // No esta inventado, esta medido sobre sus propias cartas con
  // `npm run qa-habla`: longitud de frase, si trata de usted o tutea, si abre
  // pidiendo algo, si discute con cifras, si cita, y las palabras que usa el y
  // casi nadie mas. Si alguna vez suena raro, se vuelve a medir antes de
  // reescribirlo.
  //
  // Para que sirve: escribirle una carta nueva sin tener que leerse las
  // cincuenta anteriores. El criterio entero, en la skill `voz-de-las-cartas`.
  habla?: string
}

// El Presidente NO esta aqui, y es a proposito. Estuvo, con su retrato, y sus
// cartas salian como si usted se sentara enfrente de si mismo a negociar. Lo
// que son esas quince cartas es otra cosa: narracion en tercera persona sobre
// usted, y dos de ellas transcurren literalmente delante de un espejo. Asi que
// no se le busco un personaje nuevo que las heredara: se les quito el
// personaje. Ahora las firma El Espejo, que no tiene cara porque la cara es la
// suya, y no esta en el reparto porque el reparto es quien es quien y esto no
// es un quien.
export const REPARTO: Personaje[] = [
  // MEDIOS, el relato, lo que se publica y lo que se calla
  { nombre: 'El Periodista', imagen: 'periodista.webp', dueno: 'medios', quien: 'Decide qué es noticia, a qué hora y con qué titular.', habla: 'Le trata de usted y le pone el dato delante antes de la pregunta. No grita: ya sabe que va a salir publicado.'},
  { nombre: 'El Jefe de Comunicación', imagen: 'jefecomunicacion.webp', dueno: 'medios', quien: 'Escribe lo que usted dice. Y lo que no dice.', habla: 'Le habla de usted, en corto, y siempre con un plan ya montado. Dice "esto se puede gestionar" y no detalla cómo.'},
  { nombre: 'El Escudero', imagen: 'escudero.webp', dueno: 'medios', quien: 'Sale a defender lo indefendible cada mañana.', habla: 'De usted y a la defensiva. Habla de lo que le mandan defender, no de lo que piensa.'},
  { nombre: 'El Juez', imagen: 'juez.webp', dueno: 'medios', quien: 'Preside la sala. Y sabe lo que se dijo de él cuando le pusieron ahí.', habla: 'De usted, frase larga y término exacto: auto, diligencia, nombramiento. Nunca amenaza, informa.'},
  { nombre: 'El Tertuliano', imagen: 'tertuliano.webp', dueno: 'medios', quien: 'No investiga ni pregunta: tiene minutos, y con eso basta.', habla: 'Declara un principio, gira con un "dicho lo cual" y entonces pide. Niega el favor mientras lo pide: lo hace en el 37% de sus cartas, contra el 1% del resto del mazo.'},

  // GOBIERNO, que la coalicion no se rompa
  { nombre: 'La Vicepresidenta', imagen: 'vicepresi.webp', dueno: 'gobierno', quien: 'Su socia de gobierno. Y su rival por el mismo hueco.', habla: 'Frases largas y una sonrisa al final. Cita lo que han dicho otros para no decirlo ella.'},
  { nombre: 'La Socia Incómoda', imagen: 'sociaincomoda.webp', dueno: 'gobierno', quien: 'Le sostiene la mayoría y se lo recuerda a diario.', habla: 'De usted, con atril. Todo lo que pide es "poner a la gente en el centro" y todo lo que avisa es una linea roja.'},
  { nombre: 'El Exiliado', imagen: 'exiliadopesado.webp', dueno: 'gobierno', quien: 'Negocia desde fuera y exige como si estuviera dentro.', habla: 'Abre pidiendo, desde lejos y con condiciones. "Cueste lo que cueste" y "le pese a quien le pese".'},
  { nombre: 'El Independentista', imagen: 'independentista.webp', dueno: 'gobierno', quien: 'Su voto decide. Se lo lee todo antes de darlo.', habla: 'De usted y con la factura escrita. Habla de lo que afecta a su territorio y de lo que se lleva la capital.'},
  { nombre: 'El Expresidente', imagen: 'expresidentecompetente.webp', dueno: 'gobierno', quien: 'Ya estuvo ahí y no piensa dejar de contárselo.', habla: 'La frase más larga del reparto y una cita en casi todas: lo que él habría hecho, lo que se hacia en sus tiempos.'},
  { nombre: 'La Ministra', imagen: 'ministraincompetente.webp', dueno: 'gobierno', quien: 'Un desastre con título. "Yo soy médica y madre", y ahí se acaba la discusión.', habla: 'Abre pidiendo. "Yo soy médica y madre", y de ahi no se la mueve.'},
  { nombre: 'La Ministra de Igualdad', imagen: 'feminista.webp', dueno: 'gobierno', quien: 'Hace mucho ruido y no piensa bajar el volumen.', habla: 'Alto y con cifra, aunque la cifra no tenga fuente. No baja el volumen ni cuando le dan la razón.'},
  { nombre: 'La Funcionaria', imagen: 'funcionaria.webp', dueno: 'gobierno', quien: 'Cinco gobiernos en el mismo despacho. Avisa una vez y firma.', habla: 'De usted, en seco, y hablando de trámites. Avisa una vez, apunta la fecha y firma.'},

  // CALLE, lo que piensa la gente
  { nombre: 'El Encuestador', imagen: 'encuestador.webp', dueno: 'calle', quien: 'Trae el dato. Le guste o no le guste.', habla: 'De usted y con números en una de cada tres cartas: puntos, escaños, el corte de hoy. El dato primero, la opinion nunca.'},
  { nombre: 'El Cruzado', imagen: 'cruzado.webp', dueno: 'calle', quien: 'Convierte cualquier asunto en una cruzada.', habla: 'De usted, sin citar a nadie y sin un solo número. Convierte cualquier cosa en una cuestión de dignidad.'},
  { nombre: 'La Presidenta Regional', imagen: 'presidentaregional.webp', dueno: 'calle', quien: 'Gobierna su región y le hace oposición desde ella.', habla: 'De usted, con retranca y citándose a sí misma. Habla de "mi región" y de lo que a usted no le sale.'},
  { nombre: 'La Oposición', imagen: 'oposicionsuave.webp', dueno: 'calle', quien: 'Cuenta los votos de la moción. Tres veces.', habla: 'De usted, despacio y sin levantar la voz. Pide comparecencias, cuenta votos y repite que esto no es serio.'},
  { nombre: 'El Sindicalista', imagen: 'sindicalista.webp', dueno: 'calle', quien: 'Le sostiene mientras le lleve algo a casa. El día que no, saca a la gente.', habla: 'La frase más larga después del Expresidente, porque explica. Convenio, mesa, afiliados: nunca amenaza sin dar antes una salida.'},
  { nombre: 'La Vecina', imagen: 'vecina.webp', dueno: 'calle', quien: 'No sabe cómo funciona nada. Sabe lo que le ha pasado a ella.', habla: 'De usted, corto y concreto. No sabe cómo funciona nada: sabe el recibo, la acera y el ambulatorio.'},

  // CAJA B, el dinero opaco
  { nombre: 'El Ministro Caído', imagen: 'ministrocorrupto.webp', dueno: 'caja', quien: 'Cayó, pero sigue sabiendo dónde está todo.', habla: 'Le llama presi y le tutea. Lo cuenta todo como si fuera normal, porque para él lo es.'},
  { nombre: 'El Empresario', imagen: 'empresario.webp', dueno: 'caja', quien: 'En contra, salvo que le arrimen el hombro. Nunca grita: enseña cifras.', habla: 'De usted, con cifras y sin levantar la voz nunca. No pide favores: enseña la resta.'},
  { nombre: 'El Hermano', imagen: 'hermano.webp', dueno: 'caja', quien: 'Su familia. Siempre con un plan y una servilleta.', habla: 'Te tutea, el único junto a la Primera Dama. Mamá, el primo, el chaval, y siempre una servilleta con un plan.'},
  { nombre: 'El Gurú', imagen: 'guru.webp', dueno: 'caja', quien: 'El faro moral que acabó montando una fundación.', habla: 'Dice el chanchullo entero y le pone la justificación detrás. Cifras, estructura, legado. Nunca lo esconde: lo reformula.'},
  { nombre: 'La Primera Dama', imagen: 'primeradama.webp', dueno: 'caja', quien: 'Su casa. Y una cátedra que apareció sola.', habla: 'Te tutea y casi siempre entrecomillada: lo suyo se cita, no se cuenta. Cátedra, memorias, vestido.'},

  // Sin indicador propio
  { nombre: 'El Fiscal', imagen: 'fiscal.webp', quien: 'Le debe el puesto. Eso es exactamente el problema.', habla: 'De usted, con una cita en dos de cada tres. Le debe el puesto y se nota en que nunca termina la frase.'},
  { nombre: 'Mopongo', imagen: 'mopongo.webp', quien: 'Nadie la toma en serio. Ese es su superpoder.', habla: 'La frase más corta del juego. Casi todo lo suyo va entrecomillado porque lo suyo es lo que dice, no lo que hace.'},

  // LOS FONTANEROS, no encarnan ningun indicador porque los tocan todos, y
  // sus cartas no ensenan cuales (ver sinPistas). Aparecen solos, cuando
  // huelen sangre: una barra en apuros o la caja demasiado llena. Son tres
  // personas distintas haciendo exactamente el mismo trabajo, que es como
  // funciona de verdad: cuando cae uno, ya hay otro.
  { nombre: 'La Fontanera', imagen: 'fontanera.webp', quien: 'Fue periodista. Ahora hace gestiones que nadie le ha encargado por escrito.', habla: 'De usted, y cuanto menos quede por escrito, mejor. Esto no es una reunión y ustedes no se conocen.'},
  { nombre: 'El Comisario', imagen: 'comisario.webp', quien: 'Cuarenta años en la casa y un armario que no cabe en el despacho.', habla: 'De usted y abre pidiendo. Cuarenta años en la casa y un armario del que habla sin abrirlo.'},
  { nombre: 'El Agente', imagen: 'agente.webp', quien: 'Habla un español de manual, mejor que el suyo. Tiene rey, y no es el de usted.', habla: 'De usted, en un castellano de manual, mejor que el suyo. Nunca dice para quien trabaja.'},
]

// Cuantas cartas tiene cada personaje en el mazo. Se calcula del propio mazo,
// asi que nunca se desactualiza al anadir cartas.
// Que barra "posee" cada personaje, en busqueda directa por nombre. Lo usa el
// motor para el clima del sorteo: cuando una barra esta en apuros, la gente de
// esa barra aparece mas.
// NO son reparto, pero el jugador las ve y merece saber que son. De momento
// una: El Espejo, que firma las quince cartas que antes firmaba El Presidente
// (ver el comentario de arriba). Va aparte y no dentro de REPARTO porque el
// contador del panel dice "has conocido a X de Y" y eso cuenta PERSONAS: el
// espejo no es alguien a quien conocer, es usted.
export const VOCES: Personaje[] = [
  {
    nombre: 'El Espejo',
    imagen: 'espejo.svg',
    quien: 'Usted, a solas. Las cartas en las que no hay nadie enfrente.',
  },
]

export const DUENO_DE_PERSONAJE: Record<string, StatKey | undefined> = Object.fromEntries(
  REPARTO.map((p) => [p.nombre, p.dueno])
)

export const CARTAS_POR_PERSONAJE: Record<string, string[]> = (() => {
  const mapa: Record<string, string[]> = {}
  for (const c of cards) {
    if (c.isEnding || c.isElection || c.isRecap) continue
    ;(mapa[c.character] ??= []).push(c.id)
  }
  return mapa
})()

// Los que son GENTE, y no una voz. El Espejo es usted a solas y La Calle es un
// ruido de fondo: a esos no se les "conoce" por primera vez, así que ni salen
// con el cartel de nueva ni cuentan para el logro de conocer al reparto.
const SON_GENTE = new Set(REPARTO.map((p) => p.nombre))

// A quién has conocido ya, a partir de las cartas que has visto alguna vez.
// Lo necesitan el panel del reparto (para el contador y las siluetas) y la
// carta (para el cartel de "nueva"), y tenerlo en dos sitios era pedir que se
// separaran: el panel diría que ya le conoces y la carta seguiría anunciándolo.
export function conocidosEntre(idsVistos: Set<string>): Set<string> {
  const fuera = new Set<string>()
  for (const nombre of SON_GENTE) {
    if ((CARTAS_POR_PERSONAJE[nombre] ?? []).some((id) => idsVistos.has(id))) fuera.add(nombre)
  }
  return fuera
}

export function esGente(nombre: string): boolean {
  return SON_GENTE.has(nombre)
}

export const ETIQUETA_INDICADOR: Record<StatKey, string> = {
  medios: 'Medios',
  gobierno: 'Gobierno',
  calle: 'Calle',
  caja: 'Caja B',
}
