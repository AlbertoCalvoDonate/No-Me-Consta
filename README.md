# No Me Consta

Prototipo estilo *Reigns*: sátira política genérica (comisiones, enchufismo,
ERE fantasma, pactos de investidura, guerras de titulares…). Eres el
presidente y tienes que aguantar una legislatura entera a tu propio gabinete
y a la oposición, carta a carta.

El reparto son arquetipos reconocibles —«El Jefe de Comunicación», «La
Presidenta Regional», «El Exiliado», «La Socia Incómoda», «El Hermano», «La
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
  right: { text: 'Opción derecha',   effects: { gobierno: 2 }, moralidad: -1 },
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

### El color de fondo de cada carta

Sale del propio retrato: `scripts/colores-retrato.mjs` lee cada `.webp`,
promedia el color de su franja inferior (la ropa, que es lo que toca los
bordes de la carta), lo oscurece al 42% y escribe
`src/data/coloresRetrato.ts`. Hay que volver a pasarlo al anadir o cambiar un
retrato; lo que no este en el mapa cae al color por defecto y no rompe nada.

Antes salia de un hash del NOMBRE (`hsl(hash % 360, 38%, 22%)`), o sea un tono
al azar sin relacion con el dibujo. A `presi` le tocaba azul marino y, como
lleva traje azul, su carta parecia llena de borde a borde; al resto le tocaba
cualquier cosa y, como los retratos son transparentes y se estrechan al llegar
a los hombros, las dos esquinas de abajo quedaban de un color ajeno al
personaje. Eso era lo que se veia como "huecos" en la carta.

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

Los 22 personajes tienen ya retrato propio en `.webp`. El único SVG que queda
es `nocheelectoral.svg`, y es de las cartas de elecciones, no de un personaje.

`npm run validate-cards` comprueba que el fichero de cada `characterImage`
exista de verdad en `public/characters/`. Sin esa comprobación, escribir mal
el nombre no fallaba en ningún sitio: la carta salía en el juego con un hueco
donde debería estar la cara.

Los retratos están en **.webp** (ver abajo) y **re-encuadrados a un lienzo común** (1020×1200, poco aire
sobre la cabeza, torso sangrando por abajo) con `scripts/normalize-portraits.mjs`,
para que en la carta se vean todos con el mismo plano sin importar la altura
de la ventana. Al añadir un retrato nuevo, pásale ese script (necesita `npm
run dev` levantado). En la carta se muestran con `object-fit: cover` +
`object-position: center top`.

### Peso de los retratos

Estan en **.webp**, no en png: mismo lienzo y misma transparencia, pero
**14,20 MB -> 1,16 MB (92% menos)**. El arte es plano y de pocos colores, que
es justo lo que mejor comprime; a calidad 0.9 no hay diferencia visible ni en
el retrato mas detallado.

    npm run dev                       # en otra terminal
    node scripts/to-webp.mjs          # convierte los .png que haya

### Al traer arte nuevo

Deja el `.png` en `public/characters/` con el nombre que ya usan las cartas y
pasa los cuatro scripts **en este orden**, con `npm run dev` levantado:

    node scripts/recortar-fondo.mjs retrato.png     # quita el fondo liso
    node scripts/normalize-portraits.mjs retrato.png # re-encuadra
    node scripts/to-webp.mjs retrato.png             # a .webp
    node scripts/colores-retrato.mjs                 # color de fondo de carta

El orden importa, y no es el que parece. Lo que sale de ChatGPT trae un fondo
claro **liso pero opaco** (a veces, incluso, el damero de transparencia
rasterizado como píxeles de verdad). Si no se quita primero:

- En la carta se ve un recuadro claro sobre el fondo oscuro, en vez de la
  figura recortada.
- `normalize-portraits` re-encuadra sobre el bounding box del canal alfa, y
  si todo el lienzo es opaco ese bounding box es el lienzo entero: **no
  re-encuadra nada** y la cabeza se queda pequeña y descentrada.

Y ojo con darlo por bueno mirando el bounding box alfa: con el fondo pegado
da `0/60/1020/1200` en todos, que es justo lo que se espera de un retrato
bien encuadrado. La medida que sí distingue es el **porcentaje de píxeles
opacos**: un retrato recortado ronda el 54-73%, y uno con el fondo puesto se
va al 90-95%.

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
- El mazo tiene 426 cartas de contenido + 27 finales + 10 de elecciones (463
  en total), así que toca más pulir contenido que sumar
- **El chiste tiene que nacer de la situación, no pegarse encima.** Se
  quitaron 24 cartas `meme_` que existían solo para colocar una coletilla
  ("¡Fistro!", "relaxing cup", "menos lobos Caperucita"): en un juego que
  quiere ser cómico pero serio, eso canta. Las 27 que se quedaron son
  escenas de verdad aunque el id empiece por `meme_`
- **Ánclalo en política española real y, a poder ser, en figuras concretas**
  (el Tamayazo, la convalidación de decretos, la cátedra a medida, Eurostat
  contra el dato cocinado, la filtración de un sumario). No es una regla
  rígida, pero es de donde sale el chiste que se entiende solo
- El reparto está desigual: El Ministro Caído tiene 53 cartas y Mopongo 10.
  Al escribir, mira el reparto antes de elegir quién habla
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

Las mecánicas que sostienen la dificultad están en `src/hooks/useGameStore.ts`
y salieron de simular miles de partidas:

- **Amortiguación** (`damp`): un efecto que empuja hacia un extremo pierde
  fuerza cuando ya estás cerca de él. El margen lo fija el modo (`dampZone`).
- **Desgaste** (`applyDrift`): las stats alejadas del centro vuelven hacia él
  cada X turnos. Es lo que hacía imposible morir, así que ahora depende del
  modo: no existe en «Gobierno en minoría» y se desvanece en «Con mayoría
  absoluta». Ver *Dificultad* más abajo.
- **Turno de gracia** (`extremeStreak`): tocar 0 o el máximo no mata al
  instante, da un turno para rectificar.
- **Suerte** (`jitter`): ±1 sobre cada efecto no nulo, para que no se pueda
  "resolver" la partida con una estrategia perfecta.

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

## Sonido

Todo SINTETIZADO con Web Audio (`src/utils/sfx.ts`): no hay un solo archivo de
audio en el proyecto, son osciladores creados al vuelo. Pesa cero en el bundle
y encaja con la estetica pixel, que ya es medio chiptune.

| cuando | suena |
|---|---|
| empiezas a arrastrar | un toque seco |
| eliges la opcion turbia | la moneda de toda la vida, dos notas hacia arriba |
| eliges la opcion honesta | una campanita limpia |
| eliges una opcion neutra | papeles |
| una barra entra en rojo | dos pitidos de alarma barata |
| balance de fin de ano | campanita de calendario |
| noche electoral | fanfarria de telediario con murmullo |
| alguien te debe un favor | dos notas que suben, cortitas |
| salta un logro | arpegio de cuatro notas y un brillo |
| **cae el gobierno** | **el trombon triste** |
| aguantas las tres legislaturas | fanfarria buena y aplausos |

La cadena no es un oscilador suelto por sonido: todo pasa por un bus
(`mezcla → master → compresor → salida`) con un envío a una reverb de sala
corta generada al vuelo (`salaCorta`, ~0.9s). El compresor evita que dos
sonidos a la vez saturen, y cada nota lleva un desafinado aleatorio de ±0.7%
(`pizcaDeAzar`) para que repetir la misma no suene a copia pegada. El
trombón además barre su filtro paso bajo de 1400 a 260 Hz mientras cae, que
es lo que le da el desinfle.

Los logros suenan de uno en uno, según va saliendo cada pop-up (lo dispara
`LogroToast`), no todos de golpe al morir.

El botón de volumen (`src/components/SoundButton.tsx`) recorre un ciclo de
pasos: 25 → 50 → 75 → 100 % → mudo → 25... El paso elegido se recuerda entre
sesiones (`nomeconsta.volumen`) y ajusta la ganancia del bus principal. Vive
en la barra de abajo mientras juegas y arriba a la derecha en la pantalla de
inicio (ahí no tapa nada). El AudioContext no se crea hasta el primer sonido,
porque los navegadores bloquean el audio que no viene detrás de un gesto del
usuario; en mudo se cierra y se libera.

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

### Ninguna carta se repite en la misma partida

`pickRegularCard` descarta todo lo que ya ha salido (`state.history` entero),
no solo lo reciente. Antes bloqueaba unicamente las cinco ultimas
(`history.slice(-5)`), asi que la misma situacion podia volver seis meses
despues — y eso rompe justo la ilusion que sostiene el juego, que es que el
pais reacciona a lo que TU haces.

Con 463 cartas sobra mazo para una partida larga. Si aun asi se agotara
(condiciones muy estrechas), hay un escalon que permite repetir pero nunca
algo de los ultimos 25 meses. Comprobado jugando de verdad: 70 meses, 70
cartas distintas, 0 repetidas.

### Flags (estado narrativo)

Cualquier elección puede encender o apagar flags con `addFlags` /
`removeFlags`, y cualquier carta puede consultarlos en `condition` vía
`ctx.flags`. Con eso se montan arcos de varias cartas que se van abriendo unos
a otros. Ejemplo completo en el mazo: la **trama del hermano**
(`trama_hermano_*`), que va de colocarle a dedo → diligencias → prensa →
imputación → juicio, y en la que cada paso sube el peso de la trama.

**Lo que tapaste sigue ahí.** Las bombas de relojería apagan su flag *solo* en
la opción decente: si eliges taparlo, el flag se queda encendido el resto de
la partida. Durante un tiempo eso no lo leía nadie y mentir salía gratis a
partir del segundo asalto. Ahora hay segundo asalto: las cartas `secuela_*`
están condicionadas a `ctx.flagAge('<flag>') >= N`, con la N por encima del
`scheduleIn` original, así que llegan doce o diecisiete meses después de que
estallara la bomba y te ofrecen una última salida cara. Medido en 20.000
partidas con un jugador medio, cada una sale entre el 9% y el 35% de las
veces.

Ojo al escribirlas: una condición que no se pueda cumplir nunca es contenido
muerto y no falla en ningún sitio. `acreedor_unico` habla de un solo acreedor
porque `ya_te_salvaron` solo permite **un rescate por partida** — escrita en
plural ("cuando te reclaman dos") no habría salido jamás. La forma de
cazarlo es medir el alcance en simulación, no leer el código y suponer.

`npm run validate-cards` avisa de flags que se encienden y no lee nadie.

### Enfado por personaje

Reigns lleva un nivel de "stress" por personaje según cuántas veces le
rechazas. Aquí: cada carta puede marcar con `pleases: 'left' | 'right'` qué
lado le da la razón a quien habla. Elegir el contrario le suma enfado;
contentarle se lo baja. Las cartas `anger_*` saltan al pasar el umbral y su
peso crece con el enfado, así que cuanto más ignoras a alguien, más probable
es que te lo eche en cara.

Medido en simulación: jugando al azar, el 8% de las partidas ve una carta de
enfado; jugando a decir que no a todo, el 48%.

**Y ahora se ve.** Debajo del nombre del personaje aparece en que punto esta
con usted: "Harto de usted", "No le perdona una", "Le debe una", "De su lado".
Sin numeros a proposito — no es un marcador que optimizar, es lo que notarias
de alguien con quien tratas a diario. Antes el sistema existia pero era
invisible: te caia una carta de enfado sin saber por que, o te salvaba alguien
sin que supieras que le caias bien.

**Un personaje sin `pleases` no existe para este sistema.** Durante un tiempo
El Juez tenía 24 cartas y ninguna con `pleases`: no podía enfadarse nunca, así
que obstruirle no costaba nada. Lo mismo La Oposición, El Encuestador y
Mopongo. Al repasarlo se repartieron 47 `pleases` y se añadió una rama a
`final_evento_registro` para que taparle el sumario al juez con la caja llena
acabe en registro. Si añades un personaje, asegúrate de que sus cartas dicen
de qué lado está — la auditoría del mazo lista cuántas tiene cada uno.

Y al revés: el enfado de **quien no te sostiene** no debería tumbarte el
gobierno. `final_evento_ruptura` solo cuenta el enfado de los socios de
coalición; que el juez o el periodista te odien es otra cosa, y tiene su
propio final.

### Leer los indicadores

Cada indicador tiene **icono con relleno** (bonito, pero no comparable entre
ellos: cada silueta tiene una forma distinta y el mismo nivel ocupa áreas muy
distintas) y debajo una **barra de 10 segmentos**, uno por punto, que sí se
lee igual en los cuatro y dice cuánto queda.

Al arrastrar una carta, sobre el icono de cada indicador que va a moverse se
encienden **puntos**: uno, dos o tres según la magnitud del efecto, pero **sin
decir si sube o baja**. Es como Reigns: sabes que algo cambia y cuánto, y te
toca aprender qué hace cada personaje. `SHOW_EFFECT_PIPS = false` en
`src/components/StatBars.tsx` los esconde del todo (modo aún más a ciegas).

Importante al mirarlos: el **rojo salta a 1 punto** (o a 9, por arriba), pero
**se muere a 0** (o a 10) y con un turno de gracia por medio. "Todo rojo" no
significa muerto, significa a un paso.

### El comodin de verano

`vacaciones_tecnicas` sale a mitad de ano (turnos 6, 18, 30...) y no siempre:
compite en el sorteo con peso 90, asi que cae en un tercio de los veranos.
Aceptarla no suma ni resta cantidades fijas: usa `rebalance: true`, que acerca
TODAS las barras un punto al centro (las que estan a 7 o mas bajan, las que
estan a 3 o menos suben, el resto se queda). Sin suerte ni amortiguacion de
por medio: es un respiro y tiene que ser fiable.

Medido: recorta la desviacion media respecto al centro de 4,6 a 3,4 puntos.
Es la carta a la que agarrarse cuando algo se ha ido de madre, y la que
estorba cuando ibas lanzado.

### El epíteto final

Al acabar la partida se enseña la **moralidad** acumulada, que durante el
juego es invisible. No como número, sino como el apodo que la historia les
colgaba a los reyes: El Sabio, El Felón, El Trincón... Hay uno por cada valor
posible (0 a 10) en `src/data/epitetos.ts`, así que dos partidas parecidas
pero no iguales acaban con títulos distintos.

El botón de reiniciar vive FUERA de la zona con scroll del panel de fin, para
que no pueda salirse de pantalla por mucho que crezca el texto. Comprobado con
los 64 epílogos del juego en cuatro resoluciones, hasta 320x568.

### Puntos de efecto

Al arrastrar la carta se enciende un **punto** sobre el icono de cada stat que
va a moverse. Dice QUÉ indicador cambia y CUÁNTO —un solo círculo, pequeño /
mediano / gordo según la magnitud (±1, ±2, ±3 o más)— pero **no** hacia dónde,
igual que en Reigns: la dirección se aprende jugando. El tamaño se ajusta en
`pipSize()` de `src/components/EffectPips.tsx`; para esconder también la
magnitud, `SHOW_EFFECT_PIPS = false` en `src/components/StatBars.tsx`.

### Qué persiste entre legislaturas

Al pasar unas elecciones (turno 48, 96) la partida **continúa**: se conservan
las 4 stats, la moralidad, los flags de trama y el enfado de cada personaje.
No hay reinicio ni pantalla intermedia — la legislatura siguiente arranca con
las consecuencias de la anterior encima de la mesa.

### Guardar y reanudar (`src/hooks/persistPartida.ts`)

El estado completo de la partida en curso se vuelca a `localStorage`
(`nomeconsta.partida`) tras cada decisión: barras, turno, moralidad, flags,
bombas programadas, enfado/favor, historial y qué carta toca. Se borra al
morir y al empezar de cero. La pantalla de inicio ofrece **Continuar · mes N**
si hay un guardado válido (la carta guardada tiene que seguir existiendo en el
mazo — entre despliegues puede cambiar). Es lo que hace que cerrar la pestaña
o bloquear el móvil a mitad no cueste la partida.

### La "puntuación" (o por qué no hay)

**Reigns no tiene puntos.** Lo que registra es: años de reinado, el museo de
muertes (todos los finales que has visto) y las quests. Aquí igual — no hay
score que optimizar. Lo que se guarda y se enseña en el inicio es un
**historial**: tu legislatura más larga y su epíteto, cuántos de los 11
epítetos has sacado, cuántos logros llevas. El "compartir" del final
(`src/utils/compartir.ts`) va en la misma línea: meses aguantados, una tira de
bloques con cómo quedó cada barra, y el epíteto con su frase. Ningún número
que sirva para picarse en una tabla.

### Ritmo visual y carta de favor

Las cartas de hito no se leen igual que un turno de trámite: el banner cambia
de color y saca una etiqueta —dorado en la noche electoral, azul en el balance
de fin de año, verde en la carta de favor (ver `BannerKind` en
`SituationBanner`)—.

La carta `favor_ganado` la fuerza `useGameStore` la primera vez que te ganas a
alguien lo bastante como para que pueda aparecer a salvarte (favor >=
`FAVOR_PARA_RESCATE`). Es genérica: `App` le pone el nombre y el color del
personaje que ahora te debe una. Existe para que el favor, que es un contador
invisible, se note — y para que el rescate, cuando pasa, tenga sentido.

### Ilustraciones de la pantalla de fin

Los finales por barra (`ilustracionFin` en `App.tsx`) tienen una escena propia
por indicador y dirección — techo o fondo, `max_medios.webp` / `min_cajab.webp`
etc. — más unas específicas: las 5 variantes de noche electoral comparten
`nocheelectoral.webp`, y "el partido te echa en comité" usa `comite.webp` en
vez de la genérica de gobierno porque encaja literal con su texto. Los finales
por evento (moción, registro, ruptura) y los de rechazar un rescate se quedan
sin ilustración — no hay arte para esos todavía.

Con un epílogo largo se prescinde de la imagen: prioriza que la pantalla siga
cabiendo sin scroll (ver el punto siguiente) antes que la decoración.

### Que la pantalla de fin no obligue a hacer scroll

Tiene bastante "chrome" fijo (título, indicador roto, "duró X meses", epíteto,
a veces la ilustración de arriba) además del propio epílogo. En móviles bajitos
(iPhone SE 375×667, Android 360×640) los epílogos largos no cabían sin
scroll — medido, hasta 108px de sobra en el peor caso (292 caracteres). A
partir de cierta longitud el texto y los márgenes se hacen más compactos
(`modoCompacto` en `App.tsx`), y el umbral baja más si hay ilustración de por
medio, para dejarle sitio. Medido con los 74 lados de los 37 finales del
juego: 0 necesitan scroll a 360×640 y 375×667. Por debajo de eso (320×568)
sigue habiendo scroll de último recurso — para eso está.

### Vibración (`src/utils/haptics.ts`)

Un toque al elegir, un doble al entrar una barra en rojo, uno largo al caer el
gobierno. Solo Android (iOS Safari no tiene `navigator.vibrate`) y atada al
volumen: si está en mudo, tampoco vibra.

### Logros

Lista de metas en `src/data/logros.ts`: supervivencia incremental (12 / 24 /
36 / 48 / 96 / 140 meses), los 11 epítetos de moral, por dónde caes (cada
barra, el techo, moción / registro / ruptura), coleccionar finales distintos,
elecciones, las tramas (hermano, Gurú, Fiscal...) y algunas rarezas. Cada uno
es un `check(r)` que mira el `ResultadoPartida` —lo que se sabe al terminar,
más los totales acumulados de todas las partidas (`nomeconsta.logros` en
localStorage)—.

Se comprueban todos al morir (`registrarPartida` en `src/hooks/useLogros.ts`);
los recién conseguidos saltan de uno en uno como un pop-up estilo Xbox
(`LogroToast`) y se tachan de la lista, que se abre desde el botón **Logros**
del inicio (`LogrosPanel`). Los `oculto: true` no enseñan su descripción hasta
desbloquearlos, para no destripar tramas y finales; los epítetos sí se ven
desde el principio (marcan que existe un espectro moral, no cómo se recorre).

Para añadir uno: una entrada más en `LOGROS` con un `id` estable (es la clave
en localStorage) y su `check`. Nada más — el total y el panel se actualizan
solos.

### El reparto (quién es quién)

Botón en la pantalla de inicio. Lista los 22 personajes con su retrato, quién
es cada uno en una línea, **qué indicador encarna** y cuántas de sus cartas
llevas descubiertas. Los que aún no te has cruzado salen como silueta y con
`¿?` en vez del nombre: descubrir el reparto es parte del juego.

Existe porque saber quién mueve qué ES la habilidad central de un Reigns (ves
quién habla y ya sabes qué te juegas), pero medido en simulación, una partida
mediana dura 38 meses y un personaje concreto te sale unas **6 veces**: no da
tiempo a aprendérselo jugando.

El dato vive en `src/data/reparto.ts`, que además es ahora la ÚNICA fuente de
"quién encarna qué indicador". Antes esa información estaba duplicada en tres
sitios en forma de comentario (`types.ts`, `StatBars.tsx` y este README) y los
tres se quedaron desactualizados cuando se renombraron personajes. El recuento
de cartas por personaje se calcula del propio mazo, así que no se desactualiza
al añadir cartas.

### La colección de cartas

El mazo tiene casi 500 cartas y en una partida buena se ven ochenta. Los ids
vistos se acumulan en `nomeconsta.logros` (`cartasVistas`) entre partidas, y
la pantalla de inicio dice **"has visto 137 de 487 cartas"**, con cuatro
logros detrás (100 / 200 / 350 / todas). Es lo que hace Reigns, y es la razón
de volver a jugar cuando ya sabes durar: lo que queda no es más puntuación,
son situaciones que no has visto.

Al contar se descartan los ids que ya no existen en el mazo, para que
renombrar una carta no infle el contador para siempre.

### La marca a batir

Al morir, debajo de "duró X meses", una línea te enfrenta a tu propio récord:
*"Nuevo récord. Antes eran 47 meses."*, *"A 3 meses de su récord."* o *"Su
récord sigue siendo 47 meses."* En la primera partida no hay con qué comparar
y si lo clavas tampoco hay nada que decir, así que se calla.

Por eso `registrarPartida` devuelve `{ nuevos, recordPrevio }`: hace falta el
récord de **antes** de esta partida. Leerlo del guardado después no sirve, ya
incluiría la partida que acaba de terminar y la comparación diría siempre
cero.

Cuidado al tocarla: la pantalla de fin va justa. Esta línea, con los tamaños
normales, hacía desbordar quince de los setenta y cuatro lados a 360×640 (por
5px exactos). Por eso en modo compacto va a 12px/1.2 y con márgenes negativos.
Y no puede partirse en dos líneas — medido, el peor caso posible (tres
dígitos) cabe en una sola a 360px.

## Los cuatro indicadores (y por qué son esos)

En Reigns cada pilar **tiene dueño**: el cardenal es la iglesia, el general
es el ejército. Ves quién habla y ya sabes qué te juegas. Aquí igual:

| Indicador | Qué mide | Quién lo encarna |
|---|---|---|
| **Medios** | el relato, lo que se publica | Periodista, Jefe de Comunicación, Escudero, Juez |
| **Gobierno** | que la coalición no se rompa | Vicepresidenta, Socia Incómoda, Exiliado, Independentista, Expresidente, Ministra, Ministra de Igualdad |
| **Calle** | lo que piensa la gente | Encuestador, Cruzado, Presidenta Regional, Oposición |
| **Caja B** | el dinero opaco | Ministro Caído, Hermano, Gurú, Primera Dama |

**Regla al escribir cartas:** la carta de un personaje debería tocar *siempre*
su indicador, en al menos una de las dos opciones. Ahora mismo lo cumplen 291
de 305.

En el juego, tocar cualquiera de las cuatro barras baja un panel con esta
misma info (qué mide y quién la mueve). El mapa está duplicado en `INFO`
dentro de `src/components/StatBars.tsx` — si se renombra un personaje, hay que
tocarlo ahí también.

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

### Una sola dificultad

Hubo dos modos, y se quitaron. Medidos con jugadores de distinta pericia, los
dos mataban a más del 79%: lo único que cambiaba de verdad no era el reto sino
la DURACIÓN de la partida (83 turnos frente a 37 para el jugador medio). Un
selector que promete «más fácil o más difícil½ y entrega «más larga o más
corta» no vale lo que cuesta mantener, y además obliga a elegir antes de haber
visto una sola carta.

La curva ya existe sin modos: un novato dura 29 turnos y un experto 48, un 65%
más, solo por jugar mejor. Reigns tampoco tiene dificultades.

### El reajuste: de "no se puede ganar" a "es difícil"

Sin desgaste y con amortiguación 2, el juego se pasó de frenada: simulando
partidas completas, hasta un jugador que lo hacía todo bien **ganaba el ~4%**
(mediana: 47 meses, ni una legislatura). Se aflojó en tres puntos, medido para
que el que juega al azar siga sin ganar nunca:

- **`DAMP_ZONE` 2 → 3** — la amortiguación empieza a notarse desde 8/2, no solo
  en 9/1.
- **Turno de gracia: 1 → 2** (`extremeStreak < 3`) — tocar 0 o el máximo da dos
  turnos para rectificar, no uno.
- **`elecciones_derrota`: `<= 2` → `<= 1`** (y `elecciones_apretada` a `>= 2`) —
  solo pierdes la noche electoral si llegas con algo prácticamente muerto.

| jugador | gana | mediana |
|---|---|---|
| al azar | 0 % | 17 m |
| medio | 6 % | 49 m |
| bueno | 10 % | 62 m |
| óptimo (bot, siempre al centro) | 15 % | 73 m |

El bot "óptimo" es codicioso a un turno; un humano que planifica y se sabe los
personajes llega a ~20 %, que es la diana. La mediana del jugador competente
sube de una legislatura a una y media: da tiempo a ver el mediojuego.

Vuelve a medirlo cada vez que añadas cartas o toques una condición de final:
el script de simulación está en el scratchpad y juega 5.000 partidas por
modelo de jugador. Las últimas tandas (29 cartas del personaje nuevo, luego
10 cartas más y 47 `pleases`) no movieron la aguja — 1,7 / 5,0 / 10,6 / 16,3 —
pero eso hay que comprobarlo, no suponerlo.

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
