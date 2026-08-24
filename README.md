# No Me Consta

Prototipo estilo *Reigns*: sátira genérica sobre corrupción política española
(comisiones, enchufismo, ERE fantasma, etc. — sin apuntar a un partido
concreto).

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
    cards.ts                # Solo los 13 finales (llevan código) + ensamblaje del mazo
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

Las 4 stats (`medios`, `partido`, `votantes`, `caja`) van de 0 a 10. Si una
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

### Ideas para las siguientes cartas
- El mazo ya tiene 127 cartas (bien por encima de las 40-60 iniciales), así
  que toca más pulir contenido que sumar cantidad
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
