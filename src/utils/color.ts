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
export function characterColor(character: string, characterImage?: string): string {
  const delRetrato = characterImage && COLOR_RETRATO[characterImage]
  if (delRetrato) return delRetrato

  // Sin retrato (las voces colectivas que cierran la partida: "La Redaccion",
  // "El Comite Ejecutivo", "La Calle"...) se sigue usando el hash del nombre:
  // ahi no hay ilustracion de la que sacar nada, y lo unico que importa es
  // que cada voz tenga un color propio y estable.
  let hash = 0
  for (let i = 0; i < character.length; i++) {
    hash = character.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 38%, 22%)`
}
