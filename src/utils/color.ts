import { COLOR_RETRATO } from '../data/coloresRetrato'

// Color de fondo de la carta. Sale del retrato del personaje: el tono medio
// de la franja de abajo de su ilustracion, oscurecido (lo genera
// scripts/colores-retrato.mjs).
//
// Antes salia de un hash del NOMBRE — `hsl(hash % 360, 38%, 22%)` — o sea un
// tono al azar sin ninguna relacion con el dibujo. A `presi` le tocaba azul
// marino y, como lleva traje azul, su carta parecia llena de borde a borde;
// al resto le tocaba cualquier cosa y, como los retratos son transparentes y
// se estrechan al llegar a los hombros, las dos esquinas de abajo quedaban de
// un color ajeno al personaje. Eso eran los "huecos".
//
// Con el color sacado de la propia ropa, el hueco deja de leerse como un
// hueco y pasa a leerse como el fondo del retrato, sin tocar ni una carta a
// mano: se anade el .webp, se vuelve a pasar el script y ya esta.
// El unico que no tiene cara y tampoco es una voz colectiva: el expediente.
// Va de un gris azulado sin color propio, y eso es parte de lo que es.
// Dejarlo al hash del nombre daba verdes de chicle, que ademas es el color
// con el que este juego dice "esta eleccion es limpia". Van del MISMO gris azulado, sin color propio, y eso es parte
// de lo que son. Dejarlos al hash del nombre daba verdes de chicle, que ademas
// es el color con el que este juego dice "esta eleccion es limpia".
//
// LOS TRES FONTANEROS YA TIENEN RETRATO, los tres con la misma franja negra
// sobre los ojos: es lo que los hermana y dice lo que son sin necesidad de
// un fondo aparte. Asi que sus cartas cogen el color de su propia ropa como
// las demas y este mapa se ha quedado casi vacio.
//
// La Fontanera sigue apuntada abajo aunque ya no se lea: COLOR_RETRATO se
// mira primero, asi que su linea solo volveria a servir el dia que alguien le
// quitara la imagen. Los otros dos se han ido de la lista.
const SIN_CARA: Record<string, string> = {
  // El espejo del despacho a las siete de la manana: casi negro, sin color
  // propio, porque lo unico que hay dentro es el jugador.
  'El Espejo': '#15151a',
  'La Fontanera': '#1b1e26',
  'El Expediente': '#191b21',
  // LOS DOS QUE QUEDAN DE FUERA, hasta que tengan retrato. Sin esto les tocaria
  // el hash del nombre, que saca verdes y turquesas de chicle -y en este juego
  // el verde significa que una eleccion es limpia, asi que ademas miente.
  // Cada uno va del tono de su barra, apagado: cuando llegue el dibujo, su
  // linea se borra y el color sale de su ropa como en el resto.
  //
  // El Tertuliano, La Funcionaria y El Sindicalista ya tienen retrato
  // (02/10/2026) y por eso ya no estan aqui.
  'La Vecina': '#241f1a',
  'El Empresario': '#1d1f2a',
}

export function characterColor(character: string, characterImage?: string): string {
  const delRetrato = characterImage && COLOR_RETRATO[characterImage]
  if (delRetrato) return delRetrato

  const aPelo = SIN_CARA[character]
  if (aPelo) return aPelo

  // Sin retrato (las voces colectivas que cierran la partida: "La Redaccion",
  // "El Comite Ejecutivo", "La Calle"...) se sigue usando el hash del nombre:
  // ahi no hay ilustracion de la que sacar nada, y lo unico que importa es
  // que cada voz tenga un color propio y estable.
  //
  // Saturacion baja a proposito: con 38% el hash sacaba verdes y turquesas de
  // chicle que no pegan con nada del juego, y ademas MIENTEN, porque en este
  // juego el verde significa que una eleccion es limpia.
  let hash = 0
  for (let i = 0; i < character.length; i++) {
    hash = character.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 22%, 17%)`
}

// El fondo de la carta como DEGRADADO, no como color plano. Ahora que el
// retrato llena la carta, el fondo solo asoma alrededor de la cabeza: un
// plano ahi se lee como un recorte pegado sobre un rectangulo, y un degradado
// se lee como aire detras de la figura. Oscurece hacia abajo, que es donde
// esta el cuerpo.
//
// Multiplicar y no mezclar hacia blanco/negro, que es a lo que se cambio un
// rato el 02/10/2026 mientras se probo una paleta pastel: con colores claros
// multiplicar se sale de rango y devuelve blanco puro, pero con los oscuros de
// aqui no se sale nunca, y ademas mantiene el tono — mezclar hacia blanco lo
// apaga y deja la parte de arriba grisacea.
export function characterBackground(character: string, characterImage?: string): string {
  const base = characterColor(character, characterImage)
  return `linear-gradient(170deg, ${aclarar(base, 1.35)} 0%, ${base} 46%, ${aclarar(base, 0.55)} 100%)`
}

function aclarar(hex: string, k: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = Number.parseInt(m[1], 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(Math.min(255, Math.max(0, v * k)))
  )
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
}
