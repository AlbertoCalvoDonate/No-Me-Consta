# Para mañana

Encargo dejado la noche del 28/09/2026. Nada de esto está empezado: es el
plan, no el trabajo.

## 1. Cinco personajes nuevos

Todos son gente de fuera del despacho, que es justo lo que le falta al
reparto: los veinticinco actuales son de dentro (partido, prensa, juzgado,
familia). Lo que define a cada uno es **de qué depende que te apoye**, porque
eso es lo que el jugador tiene que aprender a leer.

| Personaje | Barra | De qué depende |
|---|---|---|
| **El Sindicalista** | calle | Contigo **siempre que le pagues los caprichos**. Si no, intenta tumbarte. |
| **La Vecina** | calle | Súper inculta, solo mira por su ombligo: te apoya **si la decisión le da beneficios a ella**, y le da igual todo lo demás. |
| **El Empresario** | caja | **Contra el gobierno salvo que le apoyen.** |
| **La Funcionaria** | gobierno | **Contigo a muerte, siempre.** |
| **El Tertuliano** | medios | Opina, y **lo que opina mueve la calle**. |

### Lo que hay que respetar al escribirlos

- Ninguna ciudad, ningún país, ninguna marca, ningún nombre real. Lo valida
  `npm run validate-cards`, que ahora mira también las marcas, las siglas y el
  nombre del personaje.
- De usted al jugador. Las dos excepciones que tutean son El Hermano y La
  Primera Dama; estos cinco no.
- Ningún lado gratis: las dos opciones tienen que costar algo. El auditor de
  contenido lo cuenta y ahora mismo hay cero cartas que no sean una decisión.
- `pleases` en casi todas, que es lo que hace que acumulen enfado y favor y lo
  que convierte "de qué depende que te apoye" en algo jugable en vez de en una
  frase de la ficha.
- La mediana del reparto son 19 cartas por personaje. Con menos de una docena
  un personaje se agota: la segunda vez que sale ya te sabes lo que va a decir.

### Lo que hay que hacer además de escribirlas

1. Darlos de alta en `src/data/reparto.ts` con su barra (`dueno`) y su frase.
2. Retratos: **los cinco los dibujas tú**. Hasta que lleguen saldrán con el
   color del hash del nombre, que es feo pero funciona; si quieres un gris
   provisional, se añaden a `SIN_CARA` en `src/utils/color.ts`.
3. Medir después: `node scripts/simular.mjs` (banda: óptimo 14-18%, bueno
   9-13%) y `node scripts/auditar-contenido.mjs` (cartas que no salen nunca,
   cartas que no son una decisión, logros inalcanzables).

## 2. Más cartas para los tres fontaneros

La Fontanera, El Comisario y El Agente tienen **dos cartas cada uno**, y eso
con tres personajes que ahora ya tienen los tres su retrato. Con dos cartas,
la segunda vez que aparece uno ya te la sabes.

Ojo con lo que los hace especiales y no hay que romper: sus cartas llevan
`sinPistas: true`, o sea que **no encienden los puntos sobre los indicadores**.
Es la única grieta deliberada en el trato de "si el punto se enciende, la barra
se mueve": con ellos no sabes qué estás pagando hasta después.

Miden bien: aparecen en el 40% de las partidas, se les dice que sí en el 23%,
se les deja a deber en el 12% y acaban publicando en el 4%. Eso no hay que
tocarlo, solo darles material.

## 3. BUG: una partida puede empezar igual que la anterior

Le pasó a Alberto la noche del 28/09. Está confirmado leyendo el código, no es
mala suerte suya: **la primera carta se elige sin ninguna memoria de la partida
anterior.**

Son dos caminos y los dos repiten:

- `pickIntro()` saca una de las **ocho** cartas de arranque al azar, sin mirar
  cuál salió la última vez. Repetir sale **1 de cada 8**.
- Con herencia (dos de cada tres veces) se coge una de las **tres** variantes
  de la causa por la que caíste. Si mueres dos veces seguidas por lo mismo
  —y es corriente: solo `final_medios_baja` se lleva el 9% de las muertes—
  repetir sale **1 de cada 3**.

Juntando las dos ramas, con la misma causa de muerte sale **en torno al 16%**
de las veces. Uno de cada seis arranques. Se nota enseguida, y es el peor sitio
donde notarlo: la primera carta es la que decide si esta partida se siente
nueva.

**El arreglo:** recordar con qué carta se abrió la partida anterior y
excluirla al elegir. El motor ya hace exactamente eso en otros dos sitios
—los balances y las elecciones filtran por `state.history` antes de sortear—
así que es el mismo patrón. Dónde guardarlo: junto a la herencia
(`src/hooks/persistHerencia.ts`), que ya sobrevive a la muerte y ya se lee en
`estadoNuevo()`, o en el enfriamiento entre partidas (`COOLDOWN_KEY` en
`useGameStore.ts`).

Cuidado con dos cosas: si se excluye la única variante disponible hay que
tener un plan B (el patrón de los balances es `sinVer.length > 0 ? sinVer :
todas`), y conviene comprobar después con `scripts/qa-caos.mjs`, que ya encadena
veinticinco partidas seguidas y podría medir esto.

## 4. Lo que sigue pendiente de arte (tuyo)

- Ilustraciones de los **cuatro finales por evento**: moción, expediente,
  ruptura y registro. Son los únicos finales sin imagen.
- Opcional y cosmético: redibujar retratos para que el torso llegue a las
  esquinas de abajo. Ahora mismo cubren del 37% al 54% del borde (cinco llegan
  al 100%). Resolución del lienzo: **1020 x 1200**.
