# No Me Consta

Prototipo estilo *Reigns*: sátira política genérica (comisiones, enchufismo,
ERE fantasma, pactos de investidura, guerras de titulares…). Eres el
presidente y tienes que aguantar una legislatura entera a tu propio gabinete
y a la oposición, carta a carta.

El reparto son arquetipos reconocibles —«El Jefe de Comunicación», «La
Presidenta Regional», «El Exiliado», «La Comunista Woke», «El Hermano», «La
Primera Dama»…— sin nombres reales ni lugares concretos (nada de países,
capitales ni instituciones con nombre). El tono busca reírse de todos por
igual: los efectos de cada carta van del coste político, no de si la medida
es "buena" o "mala". Algunos personajes se llevan mal entre sí y a veces
toca elegir bando.

## Poner en marcha

```bash
npm install
npm run dev
```

Abre lo que te indique la terminal (normalmente `http://localhost:5173`).

## Estructura

```
src/
  types.ts                # Tipos: Card, Stats, GameState
  data/
    cards.content.ts       # EL MAZO — edita aquí para añadir/cambiar cartas normales
    cards.ts                # Solo los finales (llevan código) + ensamblaje del mazo
  hooks/useGameStore.ts    # Lógica de juego (Zustand): elegir, aplicar efectos, elegir siguiente carta
  components/
    SwipeCard.tsx           # Carta con gesto de swipe (Framer Motion)
    StatBars.tsx            # Barras de los 4 indicadores
  App.tsx                   # Composición general + pantalla de game over
public/
  characters/               # Retratos de personaje (ver más abajo)
```

## Cómo añadir contenido

Para el 99% de los casos, el único archivo que hace falta tocar es
**`src/data/cards.content.ts`**. Tiene una plantilla copiar-pegar al
principio del archivo. Cada carta es un objeto `Card`:

```ts
{
  id: 'mi_carta',
  phase: 1,
  character: 'El Personaje',
  text: 'Texto de la situación...',
  left:  { text: 'Opción izquierda', effects: { medios: -1, caja: 1 }, moralidad: 1 },
  right: { text: 'Opción derecha',   effects: { partido: 2 }, moralidad: -1 },
}
```

Las 4 stats (`medios`, `gobierno`, `calle`, `caja`) van de 0 a 10. Si una
llega a 0 (o a 10, por arriba), se dispara la carta de "final"
correspondiente. Esas cartas de final (`final_*`) están aparte, en
`src/data/cards.ts`, porque llevan una condición en código — no hace falta
tocarlas para añadir cartas normales.

`moralidad` es un campo opcional en cada elección (`left`/`right`): un
número pequeño (normalmente -2 a 2) que indica si esa opción es honesta
(positivo) o corrupta (negativo). Es una quinta variable oculta (0-10,
empieza en 5) que **no** se ve en ninguna barra durante la partida — solo
influye en qué variante de final sale al tocar fondo o techo con alguna
stat: cada final tiene 3 versiones (alta/media/baja moralidad) que cuentan
"cómo se llegó hasta ahí", no solo "qué se rompió". Omite el campo si la
elección es moralmente neutra (la mayoría de cartas de humor/memes lo son).

Después de editar, corre esto para comprobar que todo está bien antes de
abrir el juego (te dice exactamente qué carta y qué campo está mal, en
español):

```bash
npm run validate-cards
```

### Retratos de personaje

Para ponerle cara a un personaje (ej. `presi_intro` en `cards.content.ts`,
que usa `public/characters/presi.png` como ejemplo):

1. Guarda la imagen **cuadrada** (mismo ancho que alto — `presi.png` es
   1000x1000, referencia a seguir) en `public/characters/`.
2. En la carta, añade `characterImage: 'nombre-del-archivo.png'`.

La carta la muestra con `object-fit: cover`, recortando por los lados para
llenar el hueco alto y estrecho de la carta — con una imagen cuadrada y el
personaje centrado (como `presi.png`) el recorte queda bien; una imagen no
cuadrada o descentrada puede acabar con la cabeza cortada.

No hace falta importar nada ni tocar código — Vite sirve todo lo que hay en
`public/` directamente. Si una carta no tiene `characterImage`, se ve como
hasta ahora (solo el nombre en texto), así que puedes ir añadiendo retratos
poco a poco.

El reparto usa retratos `.png` propios salvo cinco personajes con SVG
provisional a la espera de arte nuevo (`cunado.svg` — ahora "El Hermano" —,
`encuestador.svg`, `juez.svg`, `periodista.svg`, `primeradama.svg`).

Los `.png` están **re-encuadrados a un lienzo común** (1020×1200, poco aire
sobre la cabeza, torso sangrando por abajo) con `scripts/normalize-portraits.mjs`,
para que en la carta se vean todos con el mismo plano sin importar la altura
de la ventana. Al añadir un retrato nuevo, pásale ese script (necesita `npm
run dev` levantado). En la carta se muestran con `object-fit: cover` +
`object-position: center top`.

### Cartas de arranque

`useGameStore` elige al azar una de las cartas `presi_intro*` como primera
carta de la partida (y otra al reiniciar), así la primera decisión no es
siempre la misma. Todas llevan a `inicio` después vía `nextCardId`.

### Cartas de reacción y enemistades

Algunas elecciones "jugosas" encadenan a una **carta de reacción**: colocas
al hermano a dedo y al turno siguiente salta El Juez ("ese nombramiento ya
tiene una denuncia encima de mi mesa..."). Y hay cartas de **enemistad**
(`feud_*`) donde dos personajes se pelean y te toca elegir bando. Se montan
así:

1. En la carta que dispara, añade `nextCardId: 'react_xxx'` a la opción
   concreta (`left` o `right`).
2. Crea la carta `react_xxx` en la sección "CARTAS DE REACCIÓN" del final de
   `cards.content.ts`, con `maxTurn: 0` y `weight: 0` para que **solo**
   aparezca forzada y nunca salga en el sorteo normal.

`pickNextCard` además evita repetir el **personaje** de la carta anterior
(dos cartas seguidas del mismo se leen como un bug); las cadenas por
`nextCardId` sí pueden repetirlo, para eso están.

### Ideas para las siguientes cartas
- El mazo tiene ~292 cartas de contenido + finales + elecciones, así que
  toca más pulir contenido que sumar
- Añade `condition` a algunas cartas para que solo aparezcan en rangos
  concretos de stats (ej. una carta de "escándalo mediático" solo si
  `medios < 3`)
- Usa `nextCardId` para encadenar mini-arcos narrativos de 2-3 cartas
  (`presi_intro` ya lo usa para llevar siempre a `inicio` después)
- Juega con `weight` para que ciertas cartas aparezcan más o menos a menudo

## Despliegue

Mismo flujo que tu otro proyecto: build + Cloudflare Pages.

```bash
npm run build
```

Sube la carpeta `dist/` a Cloudflare Pages (o conecta el repo de GitHub para
despliegue automático).

## Balance del juego

Las tres mecánicas que sostienen la dificultad están en `src/hooks/useGameStore.ts`
y salieron de simular miles de partidas (`scripts/` no las incluye; ver historial):

- **Amortiguación** (`damp`): un efecto que empuja hacia un extremo pierde
  fuerza cuando ya estás cerca de él. Sin esto la partida media duraba 12
  turnos.
- **Desgaste** (`applyDrift`): cada 3 turnos, las stats alejadas del centro
  vuelven 1 punto hacia él. Evita que acumular en una dirección sea gratis;
  sin esto, jugar siempre honesto reventaba por *techo* en 9 turnos.
- **Turno de gracia** (`extremeStreak`): tocar 0 o el máximo no mata al
  instante, da un turno para rectificar.

Con eso, jugando al azar la mediana es ~96 turnos (8 años de gobierno) y un
jugador bueno gana ~10% de las partidas.

### Elecciones (el hito de la partida)

Cada `ELECTION_INTERVAL` turnos (48 = 4 años) toca renovar legislatura. La
carta que sale depende de cómo llegues (derrota, apretada, sorpresa,
abstención, triunfo). A la tercera convocatoria (12 años) el juego termina
siempre, con la carta `_final` que corresponda.

Las cartas de elecciones llevan `isElection: true`, viven en `cards.ts` (usan
`condition`) y **nunca** salen por sorteo normal: las fuerza `pickNextCard`.
Ojo: las de la última convocatoria son `isEnding` **y** `isElection`, así que
el filtro de finales normales tiene que excluir `isElection` — si no, se
cuelan en cualquier turno.

## Narrativa adaptativa (el modelo de Reigns)

Reigns describe su selección de cartas como una **bolsa**: coges todas, quitas
las que no encajan con el estado, quitas las recién vistas, das a cada una un
"tamaño" (peso) y sorteas. Eso ya es lo que hace `pickRegularCard`. Encima de
eso hay tres piezas que permiten que la partida se cuente sola:

### Pesos dinámicos

`weight` puede ser un número **o una función** `(stats, moralidad, ctx)`. Así
una trama se vuelve más frecuente mientras está viva y se apaga sola (peso 0)
cuando deja de tener sentido — igual que las cartas de guerra de Reigns, que
entran en la baraja al empezar la guerra y salen al acabarla.

### Flags (estado narrativo)

Cualquier elección puede encender o apagar flags con `addFlags` /
`removeFlags`, y cualquier carta puede consultarlos en `condition` vía
`ctx.flags`. Con eso se montan arcos de varias cartas que se van abriendo unos
a otros. Ejemplo completo en el mazo: la **trama del hermano**
(`trama_hermano_*`), que va de colocarle a dedo → diligencias → prensa →
imputación → juicio, y en la que cada paso sube el peso de la trama.

### Enfado por personaje

Reigns lleva un nivel de "stress" por personaje según cuántas veces le
rechazas. Aquí: cada carta puede marcar con `pleases: 'left' | 'right'` qué
lado le da la razón a quien habla. Elegir el contrario le suma enfado;
contentarle se lo baja. Las cartas `anger_*` saltan al pasar el umbral y su
peso crece con el enfado, así que cuanto más ignoras a alguien, más probable
es que te lo eche en cara.

Medido en simulación: jugando al azar, el 8% de las partidas ve una carta de
enfado; jugando a decir que no a todo, el 48%.

### Flechas de efecto (temporal)

Las flechas ▲▼ sobre los iconos adelantan qué stat sube o baja con cada
opción. Están para poder probar el mazo cómodamente, pero la intención es
quitarlas: Reigns muestra la magnitud del cambio pero **no** la dirección, a
propósito, para que el jugador aprenda qué hace cada personaje. Se apagan con
`SHOW_EFFECT_ARROWS = false` en `src/components/StatBars.tsx`, sin tocar nada
más.

### Qué persiste entre legislaturas

Al pasar unas elecciones (turno 48, 96) la partida **continúa**: se conservan
las 4 stats, la moralidad, los flags de trama y el enfado de cada personaje.
No hay reinicio ni pantalla intermedia — la legislatura siguiente arranca con
las consecuencias de la anterior encima de la mesa.

## Los cuatro indicadores (y por qué son esos)

En Reigns cada pilar **tiene dueño**: el cardenal es la iglesia, el general
es el ejército. Ves quién habla y ya sabes qué te juegas. Aquí igual:

| Indicador | Qué mide | Quién lo encarna |
|---|---|---|
| **Medios** | el relato, lo que se publica | Periodista, Jefe de Comunicación, Escudero, Juez |
| **Gobierno** | que la coalición no se rompa | Vicepresidenta, Comunista Woke, Exiliado, Independentista, Expresidente, Ministra |
| **Calle** | lo que piensa la gente | Encuestador, Ultraderecha, Presidenta Regional, Oposición |
| **Caja B** | el dinero opaco | Ministro Caído, Hermano, Gurú, Primera Dama |

**Regla al escribir cartas:** la carta de un personaje debería tocar *siempre*
su indicador, en al menos una de las dos opciones. Ahora mismo lo cumplen 291
de 305.

### Por qué se renombraron

Antes eran `medios / partido / votantes / caja` y no se entendía por qué una
respuesta subía o bajaba. Midiendo el mazo salieron tres cosas:

- **`partido` hacía de dos cosas opuestas**: tu aparato interno *y* tus socios
  de coalición. Ceder al Exiliado subía "partido", cuando el Exiliado no es de
  tu partido — de hecho cabrea a los tuyos. Ese era el fallo de fondo.
  `gobierno` es una sola pregunta: ¿te sigue sosteniendo la coalición?
- **`partido` y `votantes` eran un balancín**: 93 de 106 opciones que tocaban
  ambos los movían en sentido opuesto. Un solo eje disfrazado de dos.
- **`medios` era el comodín**: dominante en 13 de los 20 personajes. Cuando no
  se sabía qué tocar, se tocaba medios.

Los iconos también cambiaron: Gobierno es un edificio con columnas (si se
caen, se cae) y Calle son tres siluetas de gente (la urna se confundía con el
evento de elecciones).

## Dificultad: por qué morir era imposible

Jugando de forma competente se moría en el **1%** de las partidas: el 99%
agotaba las tres legislaturas. El culpable no era el mazo sino el **desgaste**
(*drift*): cada 3 turnos, toda barra alejada del centro volvía sola un punto
hacia él, así que **no compensar salía gratis**. Medido quitando cada
mecanismo por separado (jugando al azar, mediana de meses):

| | mediana | muere |
|---|---|---|
| como estaba | 96 | 58% |
| sin turno de gracia | 48 | 89% |
| sin amortiguación | 38 | 94% |
| **sin desgaste** | **18** | **99%** |

El mazo, en cambio, está bien equilibrado: la suma de todos sus efectos ronda
cero. Lo que sí está sesgado es cada estrategia pura, y eso es deliberado —
te obliga a alternar:

| Si juegas siempre… | medios | gobierno |
|---|---|---|
| honesto | **+166** | −104 |
| corrupto | **−247** | +121 |

En Reigns no existe nada parecido al desgaste: los medidores solo se mueven
por las cartas, y las que hacen *drift* con el tiempo son un **peligro** del
que avisan las guías, no una ayuda.

### Los dos modos

Se elige al empezar (`src/data/modes.ts`). Mismo mazo, distinta red de
seguridad. Medido jugando de forma competente:

| Modo | Desgaste | Muere | Mediana | Llega a 4 años | A 8 años |
|---|---|---|---|---|---|
| **Gobierno en minoría** | ninguno | 89% | 48 meses | 51% | 18% |
| **Con mayoría absoluta** | se desvanece | 70% | 108 meses | 94% | 66% |

En «Con mayoría absoluta» el desgaste actúa cada 3 turnos en la primera
legislatura, cada 6 en la segunda y desaparece en la tercera: la primera hace
de tutorial y a partir de ahí aprieta.

### Muertes por evento

Además de por barra, se puede caer por una situación que has ido construyendo
tú. Se comprueban en todos los turnos y llevan `byEvent: true`:

- **Moción de censura** — el hermano imputado y sin un medio que te defienda.
- **Ruptura de la coalición** — dos socios hartos de verdad, o cuatro bastante.
- **Registro y detención** — caja llena, prensa encima y la moralidad por los
  suelos.

Saltan en torno al 4% de las partidas: son caídas que se ven venir y se pueden
esquivar, no trampas. Al escribir una nueva, la condición tiene que ser
exigente por eso mismo. En estas muertes la pantalla de fin no señala ningún
indicador, porque la causa fue la situación y no una barra.
