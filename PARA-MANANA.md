# Para mañana

Puesto al día el **01/10/2026, por la noche**. Hoy llegó el primer dato real
de gente de fuera, y la mitad de la noche se fue en arreglar el sistema que lo
recoge, porque estaba perdiendo bastante.

## 1. Lo que dicen las 16 primeras partidas de fuera

Todas del 01/10 entre las 17:27 y las 19:09. Lo que se ve, con el aviso de que
son dieciséis:

- **Nadie llega.** Mediana **12 meses**, la mejor 20, y la legislatura son 48.
- **Mueren por pasarse, no por quedarse cortos.** Diez de dieciséis caen con
  una barra arriba del todo. `final_medios_max_alta` solo es **una de cada
  cuatro muertes**, y la más temprana (10,8 meses de media).
- La moralidad se polariza rapidísimo: empieza en 5 y **once de diecisiete**
  partidas acabaron en ≤2 o ≥8, en doce meses.
- De eventos salió uno (registro). De elecciones, ninguna: con 20 meses de
  techo era imposible.

**Lo accionable: las barras suben y no bajan, y los medios son el cuello de
botella.** Está sin mirar qué cartas empujan medios hacia arriba y cuántas hay
para bajarlos. Ahí es donde estaría el arreglo.

Lo que **todavía no se puede** preguntar es nada por carta: la más vista lleva
3 partidas y la consulta de "cartas que nadie duda" pide 8. Eso son jugadores,
no código.

## 2. El sistema de recogida, arreglado hoy

Se midió cuánto se perdía antes de tocar nada. `partida_n` cuenta partidas
TERMINADAS, así que un hueco en la numeración es una partida que se acabó y no
llegó. Agrupando por las respuestas de la encuesta: **21 jugadas, 16
recibidas**. Y las decisiones iban peor: **183 de 213**, y lo perdido no era al
azar — al reanudar solo se mandaba la cola, así que faltaban siempre los turnos
del principio.

Tres cambios, los tres probados contra el sitio en marcha:

- **Cola en `localStorage`** (`src/utils/colaEnvios.ts`). Lo que no sale ahora
  sale al abrir el juego la próxima vez. Tapa los tres agujeros: que no se
  reintentara nunca, que la primera partida de cada jugador esperase en memoria
  a que contestara la encuesta, y que un 400 no se mirase.
- **El log de la partida vive en disco** (`src/utils/pasosPartida.ts`), así que
  matar la app ya no se come los turnos del principio.
- **Se manda la partida SIN TERMINAR**, con `sendBeacon` al ocultarse la
  pestaña. Es el punto ciego que no tenía arreglo posible antes: quien jugaba
  cuatro meses y no volvía no mandaba nada, y **todo lo medido era, por
  construcción, de gente que había llegado a un final**. Caen con
  `final = 'abandonada'`.

Para que una partida mandada dos veces (a medias y luego acabada) sea una fila
y no dos, el móvil manda una `sesion`: aleatoria, **de la partida**, y muere con
ella. No rompe el "nada personal" — une dos envíos de UNA partida, y dos
partidas del mismo móvil siguen sin poderse relacionar.

> **OJO AL CONSULTAR.** `worker/consultas.sql` ya lleva `AND final <>
> 'abandonada'` en todo lo que mide muertes y duración: una partida abandonada
> no es una muerte, y colada ahí dentro hace que las dos mientan hacia abajo.
> Las consultas por carta sí la incluyen a propósito. Hay dos nuevas, la 11 y
> la 12, para mirar cuánta gente lo deja y con qué carta en pantalla.

**Un fallo que se vio probando y conviene no repetir:** la primera versión
miraba con un `SELECT` y luego decidía entre `UPDATE` e `INSERT`. Dos envíos
casi a la vez pasaron los dos por el `SELECT` sin encontrar nada y quedaron
cinco decisiones colgando de una partida inexistente. Ahora va con un
`INSERT ... ON CONFLICT(sesion) ... RETURNING id`: la base dice cuál es el id
de verdad después de resolver el conflicto. Comprobado con nueve envíos
simultáneos de la misma partida — una fila, sin huérfanas.

## 3. Los fondos de carta: más diversidad, mismo look oscuro (02/10)

Venía de "14 de 24 son azules" y de un segundo intento que dejó mucho morado.
Medido con los 27 retratos: **quince cartas caían dentro de 52 grados**
(207-259, que es donde el azul marino se vuelve violeta) y había **157 grados
seguidos sin usar** — ni un verde, ni un turquesa, ni un cian.

La causa de fondo es que el tono casi no lleva información: los políticos
visten todos de azul marino, así que quince retratos distintos devuelven el
mismo número. Ser fiel a un dato idéntico para todos es exactamente lo que
producía quince cartas iguales.

**El cambio** (`scripts/colores-retrato.mjs`, `REPARTO = 0.8`): las 27 se
colocan en una escalera de intervalos iguales (360/27 = 13,3°, que es justo la
separación mínima que ya se pedía) y se mezcla con el tono real. **Del arte se
conserva el ORDEN**: la carta más azul de verdad sigue siendo la más azul del
juego. El arranque de la escalera no se pone a ojo — se prueban los 360 giros y
se elige el que menos mueve el conjunto.

Medido en CIELAB, que es donde "parecido" significa algo:

| | cartas | parejas confundibles (ΔE<10) | peor pareja | mediana |
|---|---|---|---|---|
| antes (abanico) | 24 | **27** | ΔE 3,2 | ΔE 24 |
| ahora (reparto) | 27 | **6** | ΔE 6,3 | ΔE 38 |

**Se probó pastel y se descartó** (no es el juego). Si alguna vez se vuelve a
intentar, hay dos cosas que se rompen y no se ven venir, las dos apuntadas en
el propio script: el degradado de `utils/color.ts` multiplica, y con colores
claros se sale de rango y devuelve blanco puro; y el cartel "NUEVA" es dorado,
que contra pastel se queda en 1,03:1 de contraste.

## 4. Homogeneizar el estilo del arte: cerrado, no se puede con filtros

Se preguntó si el LoRA podía igualar los retratos que salen más realistas. **No**,
y está medido:

- La propia carpeta del LoRA ya lo concluyó en su día: *"para el personaje
  final, ChatGPT con la plantilla maestra, no el estudio"*. Reentrenar con el
  arte nuevo sería peor: 24 imágenes es el mismo techo que 22, y le estarías
  enseñando el estilo con el arte que precisamente no es homogéneo.
- `facetar.py` en "medio" sobre los 24: la dispersión de planitud baja de 24,9
  a 19,0 puntos, se come un tercio de los colores, **y las imágenes quedan
  indistinguibles a ojo**. El orden no cambia.

La diferencia real es la **geometría de las facetas**, y eso no lo inventa un
filtro. Los cinco que se salen, por medida: `primeradama` (52,9),
`ministraincompetente` (54,1), `guru` (57,0), `presidentaregional` (60,0),
`fontanera` (60,8). La mediana del reparto es 66,6. Solo se arreglan
redibujando, con la plantilla maestra de `no-me-consta-lora`.

## 4b. Pasada de coherencia de efectos (02/10)

Encargo: "alguna carta debería obviamente mejorar calle y sin embargo la baja".

**El primer intento fue por mal camino y conviene no repetirlo.** Cruzaba
`pleases` (el lado que le da la razón al personaje) con el indicador que ese
personaje encarna, y daba por mala toda carta donde contentarle le bajara lo
suyo: señaló **150 de 428**. Al leerlas se ve el error de razonamiento:
`pleases` es lo que el personaje quiere PARA ÉL, no lo que le conviene a su
indicador. El Hermano encarna la caja y quiere el puesto a dedo; dárselo cuesta
dinero. Es coherente.

El segundo intento fue un vocabulario de frases ("subir las pensiones",
"recortar") contra el signo del efecto: **1 sospecha de 1268 opciones, y falsa**.
Las opciones están escritas cortas e idiomáticas ("Puesto a dedo", "Seguirle el
rollo"), no como un programa electoral.

**Lo que sí funcionó fue leerlas.** Se revisaron a mano las **310 opciones que
bajan `calle`**, con la carta entera delante. Casi todas son coherentes: el club
que desaparece se lleva treinta mil aficionados, al sindicato sin su plaza le
sale una huelga. Dos no lo eran:

- **`empre_cotizaciones`** — la carta dice literalmente "el coste lo asume la
  caja", y los signos de caja estaban invertidos en las dos opciones: aceptar
  daba +1 y negarse −1. Arreglado.
- **`gob_financiacion_campana`** — "Cuentas claras y auditadas" llevaba
  `calle: -1`: tener las cuentas limpias costaba apoyo popular, mientras que
  aceptar el dinero sucio no costaba ninguno, y la calle ni se entera de esa
  conversación. Quitado el castigo.

`scripts/auditar-efectos.mjs` (`npm run auditar-efectos`) queda con el
vocabulario, pero **es una lista de sospechas, no un validador**: no bloquea
nada, porque a veces la contradicción es el chiste. Lo que falta por mirar con
el mismo criterio son las opciones que bajan `medios`, `gobierno` y `caja`.

## 5. Arte que falta

- **Dos personajes sin cara**: La Vecina y El Empresario. Salen rotulados con
  el nombre en grande. (El Tertuliano, La Funcionaria y El Sindicalista
  entraron el 02/10/2026.)
- **Ilustraciones de los cuatro finales por evento**: moción, expediente,
  ruptura y registro. El del registro es ~7 % de las muertes.

Dos cosas sueltas de la importación del 02/10, por si alguna vez molestan:

- Los tres nuevos son los que más **aire sobre la cabeza** tienen del reparto
  (10,8 % y 12,6 % frente a un máximo anterior de 10,3 %), y `tertuliano` es
  además el de cabeza más estrecha. En la carta no canta, pero si alguna vez se
  retocan, es por ahí. La regla de `comprobar-retrato.mjs` que pedía un 5 % fijo
  estaba desfasada —la incumplían 16 de los 24 ya publicados— y ahora es un tope
  del 14 %, que es lo que dice `arte-fuentes/LEEME.md`: el aire puede variar, la
  cara no.
- `fontanera.webp` tapa el 90 % del borde de abajo y debería tapar el 100 %. Es
  el único fallo que queda en todo el reparto, y venía de antes.

Todo lo de arte, con medidas y pasos, en `arte-fuentes/LEEME.md`.

## 6. Cloudflare dejó de desplegar solo

Workers Builds no recogió ningún push desde las **15:38 UTC del 01/10**. No es
el código: desde un clon limpio, `npm ci && npm run build` funciona. Mientras no
vuelva solo, cada cambio necesita:

```bash
npx wrangler@4.145.0 deploy
```

(El `@4.145.0` es a propósito: sin fijar versión, npx intenta instalar una más
nueva y choca con un bloqueo de caché de Windows.)

## 7. Suelto, de la auditoría de logros

`coleccion_todas` (ver las 672 cartas) es *posible* pero durísimo: en 2.500
partidas se ven 666. Las seis que faltan están nombradas en
`scripts/auditar-logros.mjs`.
