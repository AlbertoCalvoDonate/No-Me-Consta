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

## 3. Demasiadas cartas azules

**Lo que se ve:** 14 de los 24 fondos de carta son azules.

**Por qué, medido:** el color sale del tono dominante de la franja inferior del
retrato (la ropa), y los políticos visten de azul marino. El dato es correcto;
lo que falla es que la realidad es monocroma. Se miró si había de dónde sacar
variedad sin inventarla y **no la hay**: aparte del azul solo salen tonos de
piel, que el algoritmo descarta a propósito.

Las salidas son de diseño, no de código: repintar ropa en los retratos,
abanicar los tonos a propósito (rompe el principio de "el fondo sale del
arte"), o variar la luminosidad (hoy fija a 0,19 para que ninguna carta pese
más que otra). Sin decidir.

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

## 5. Arte que falta

- **Cinco personajes sin cara**: El Tertuliano, La Funcionaria, El Sindicalista,
  La Vecina, El Empresario. Salen rotulados con el nombre en grande.
- **Ilustraciones de los cuatro finales por evento**: moción, expediente,
  ruptura y registro. El del registro es ~7 % de las muertes.

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
