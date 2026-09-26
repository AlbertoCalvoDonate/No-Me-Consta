// GENERADO POR scripts/encuadrar-cara.mjs --acercar. No editar a mano.
//
// Cuanto acerca la CARTA cada retrato al pintarlo. No se toca la imagen:
// el fichero sigue igual y esto es un transform de CSS, asi que no hay
// perdida de calidad y deshacerlo es poner 1.
//
// Sale de llevar el ancho de cara de cada uno a la MEDIANA del reparto,
// con dos topes: no mas de un 15% y nunca tanto como
// para que la cabeza se salga por los lados de la carta.
export const ACERCAMIENTO: Record<string, number> = {
  'cruzado.webp': 1.15,
  'feminista.webp': 1.15,
  'guru.webp': 1.15,
  'ministrocorrupto.webp': 1.15,
  'mopongo.webp': 1.15,
  'oposicionsuave.webp': 1.15,
  'presidentaregional.webp': 1.15,
  'sociaincomoda.webp': 1.15,
  'jefecomunicacion.webp': 1.067,
  'juez.webp': 1.023,
  'hermano.webp': 1.01,
}
