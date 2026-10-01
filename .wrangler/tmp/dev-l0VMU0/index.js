var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/index.ts
var MAX_BYTES = 64 * 1024;
var MAX_DECISIONES = 400;
var JUEGA = ["a-menudo", "a-veces", "casi-nunca"];
var REIGNS = ["jugado", "suena", "no"];
var deLista = /* @__PURE__ */ __name((v, lista) => typeof v === "string" && lista.includes(v) ? v : null, "deLista");
var entero = /* @__PURE__ */ __name((v, min, max) => {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  return n >= min && n <= max ? n : null;
}, "entero");
var texto = /* @__PURE__ */ __name((v, max) => typeof v === "string" && v.length > 0 && v.length <= max ? v : null, "texto");
function leerPartida(x) {
  if (!x || typeof x !== "object") return null;
  const o = x;
  const version = texto(o.version, 20);
  const final = texto(o.final, 60);
  const meses = entero(o.meses, 0, 1e3);
  const moralidad = entero(o.moralidad, 0, 10);
  const medios = entero(o.medios, 0, 10);
  const gobierno = entero(o.gobierno, 0, 10);
  const calle = entero(o.calle, 0, 10);
  const caja = entero(o.caja, 0, 10);
  if (version === null || final === null || meses === null || moralidad === null || medios === null || gobierno === null || calle === null || caja === null) {
    return null;
  }
  if (!Array.isArray(o.decisiones) || o.decisiones.length > MAX_DECISIONES) return null;
  const juega = deLista(o.juega, JUEGA);
  const reigns = deLista(o.reigns, REIGNS);
  const decisiones = [];
  for (const d of o.decisiones) {
    if (!d || typeof d !== "object") return null;
    const e = d;
    const turno = entero(e.turno, 0, 1e3);
    const carta = texto(e.carta, 60);
    const lado = e.lado === "I" || e.lado === "D" ? e.lado : null;
    const m = entero(e.medios, 0, 10);
    const g = entero(e.gobierno, 0, 10);
    const c = entero(e.calle, 0, 10);
    const b = entero(e.caja, 0, 10);
    const mo = entero(e.moralidad, 0, 10);
    if (turno === null || carta === null || lado === null || m === null || g === null || c === null || b === null || mo === null) {
      return null;
    }
    decisiones.push({ turno, carta, lado, medios: m, gobierno: g, calle: c, caja: b, moralidad: mo });
  }
  return { version, final, meses, moralidad, medios, gobierno, calle, caja, juega, reigns, decisiones };
}
__name(leerPartida, "leerPartida");
async function guardar(env, p) {
  const id = crypto.randomUUID();
  const cuando = Date.now();
  const sentencias = [
    env.nomeconsta_partidas.prepare(
      "INSERT INTO partidas (id, cuando, version, final, meses, moralidad, medios, gobierno, calle, caja, juega, reigns) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(id, cuando, p.version, p.final, p.meses, p.moralidad, p.medios, p.gobierno, p.calle, p.caja, p.juega, p.reigns)
  ];
  for (const d of p.decisiones) {
    sentencias.push(
      env.nomeconsta_partidas.prepare(
        "INSERT OR IGNORE INTO decisiones (partida, turno, carta, lado, medios, gobierno, calle, caja, moralidad) VALUES (?,?,?,?,?,?,?,?,?)"
      ).bind(id, d.turno, d.carta, d.lado, d.medios, d.gobierno, d.calle, d.caja, d.moralidad)
    );
  }
  await env.nomeconsta_partidas.batch(sentencias);
  return new Response(null, { status: 204 });
}
__name(guardar, "guardar");
async function leer(env, url) {
  if (!env.CLAVE_LECTURA) return new Response("no hay nada aqui", { status: 404 });
  if (url.searchParams.get("clave") !== env.CLAVE_LECTURA) {
    return new Response("no hay nada aqui", { status: 404 });
  }
  const limite = Math.min(Number(url.searchParams.get("limite") ?? 200) || 200, 2e3);
  const { results } = await env.nomeconsta_partidas.prepare(
    "SELECT p.*, (SELECT json_group_array(json_object('turno', d.turno, 'carta', d.carta, 'lado', d.lado,'medios', d.medios, 'gobierno', d.gobierno, 'calle', d.calle,'caja', d.caja, 'moralidad', d.moralidad)) FROM decisiones d WHERE d.partida = p.id ORDER BY d.turno) AS decisiones FROM partidas p ORDER BY p.cuando DESC LIMIT ?"
  ).bind(limite).all();
  return new Response(JSON.stringify(results, null, 1), {
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
__name(leer, "leer");
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/partida" && request.method === "POST") {
        const largo = Number(request.headers.get("content-length") ?? 0);
        if (largo > MAX_BYTES) return new Response("demasiado grande", { status: 413 });
        const cuerpo = await request.text();
        if (cuerpo.length > MAX_BYTES) return new Response("demasiado grande", { status: 413 });
        let datos;
        try {
          datos = JSON.parse(cuerpo);
        } catch {
          return new Response("no es json", { status: 400 });
        }
        const partida = leerPartida(datos);
        if (!partida) return new Response("no cuadra", { status: 400 });
        return await guardar(env, partida);
      }
      if (url.pathname === "/api/partidas" && request.method === "GET") {
        return await leer(env, url);
      }
      if (url.pathname.startsWith("/api/")) {
        return new Response("no", { status: 404 });
      }
    } catch (e) {
      console.error("fallo en /api:", e instanceof Error ? e.message : e);
      if (url.pathname.startsWith("/api/")) {
        return new Response("ha fallado algo", { status: 500 });
      }
    }
    return env.ASSETS.fetch(request);
  }
};

// ../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-EtGd6O/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-EtGd6O/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
