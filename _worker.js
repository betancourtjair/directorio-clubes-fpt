// Directorio de Clubes FPT — backend del sitio en Cloudflare Pages.
//
// Rutas:
//   POST   /api/login    valida usuario/contraseña y emite una sesión firmada (8 h)
//   DELETE /api/login    cierra la sesión
//   GET    /api/clubes   devuelve el directorio (KV, o clubes.json mientras KV esté vacío)
//   PUT    /api/clubes   reemplaza el directorio; requiere sesión
//   GET    /api/sesion   dice si esta visita tiene sesión de administrador
//
// Variables de entorno (secretos del proyecto): ADMIN_USER, ADMIN_PASS, SESSION_SECRET
// Binding de KV: DIRECTORIO

const SESSION = "fpt_sesion";
const LLAVE = "clubes";
const HORAS = 8;
const enc = new TextEncoder();

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: Object.assign(
      { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      headers
    )
  });
}

function b64url(bytes) {
  let bin = "";
  new Uint8Array(bytes).forEach(b => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function unb64url(s) {
  return atob(s.replace(/-/g, "+").replace(/_/g, "/"));
}

async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

async function firmar(payload, secret) {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const mac = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(body));
  return body + "." + b64url(mac);
}

async function verificar(token, secret) {
  if (!token || !secret || token.indexOf(".") < 0) return null;
  const partes = token.split(".");
  if (partes.length !== 2) return null;
  let datos;
  try {
    datos = JSON.parse(unb64url(partes[0]));
  } catch (e) {
    return null;
  }
  const esperado = await firmar(datos, secret);
  if (esperado !== token) return null;
  if (!datos.exp || datos.exp < Date.now()) return null;
  return datos;
}

function galleta(request, nombre) {
  const raw = request.headers.get("Cookie") || "";
  const hit = raw.split(/;\s*/).find(c => c.indexOf(nombre + "=") === 0);
  return hit ? decodeURIComponent(hit.slice(nombre.length + 1)) : "";
}

// Comparación en tiempo constante: no filtra la contraseña por tiempos de respuesta.
function igual(a, b) {
  a = String(a == null ? "" : a);
  b = String(b == null ? "" : b);
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

function sesionDe(request, env) {
  return verificar(galleta(request, SESSION), env.SESSION_SECRET || "");
}

const CAMPOS = {
  id: 12, club: 120, ciudad: 60, region: 4, direccion: 400, m2: 20, apertura: 20,
  horario: 400, estacionamiento: 200, telClub: 40, correo: 120, maps: 300,
  gerente: 120, telGerente: 40, subgerente: 120, telSubgerente: 40
};

// Campos que solo se envian al navegador cuando hay sesion iniciada.
// Un visitante anonimo nunca los recibe, ni siquiera en el codigo fuente.
const PRIVADOS = ["telGerente", "telSubgerente"];

function sinPrivados(lista) {
  return lista.map(c => {
    const o = {};
    for (const k in c) if (PRIVADOS.indexOf(k) < 0) o[k] = c[k];
    return o;
  });
}

function limpiar(lista) {
  return lista
    .map(c => {
      const o = {};
      for (const k in CAMPOS) o[k] = String(c && c[k] != null ? c[k] : "").slice(0, CAMPOS[k]);
      return o;
    })
    .filter(c => c.club);
}

// Dos modos:
//   visor  -> solo contraseña (VISOR_PASS). Ve los teléfonos del equipo.
//   admin  -> usuario + contraseña (ADMIN_USER / ADMIN_PASS). Además edita y da de alta clubes.
async function login(request, env) {
  if (!env.SESSION_SECRET || !env.ADMIN_PASS) {
    return json({ error: "El servidor no tiene configuradas las contraseñas de acceso." }, 500);
  }
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "Petición inválida." }, 400);
  }

  const usuario = String(body.usuario == null ? "" : body.usuario).trim();
  const visorPass = env.VISOR_PASS || env.ADMIN_PASS;
  let rol = null;

  if (usuario) {
    if (igual(usuario, env.ADMIN_USER || "Admin") && igual(body.password, env.ADMIN_PASS)) rol = "admin";
  } else if (igual(body.password, visorPass)) {
    rol = "visor";
  }

  if (!rol) {
    await new Promise(r => setTimeout(r, 400));
    return json({ error: usuario ? "Usuario o contraseña incorrectos." : "Contraseña incorrecta." }, 401);
  }

  const token = await firmar({ r: rol, exp: Date.now() + HORAS * 3600 * 1000 }, env.SESSION_SECRET);
  return json({ ok: true, rol: rol }, 200, {
    "Set-Cookie": SESSION + "=" + token + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=" + HORAS * 3600
  });
}

function logout() {
  return json({ ok: true }, 200, {
    "Set-Cookie": SESSION + "=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"
  });
}

async function leerClubes(request, env) {
  const guardado = env.DIRECTORIO ? await env.DIRECTORIO.get(LLAVE) : null;
  let lista;
  if (guardado) {
    try { lista = JSON.parse(guardado); } catch (e) { lista = []; }
  } else {
    const semilla = await env.ASSETS.fetch(new Request(new URL("/clubes.json", request.url)));
    try { lista = await semilla.json(); } catch (e) { lista = []; }
  }
  if (!Array.isArray(lista)) lista = [];

  const s = await sesionDe(request, env);
  const salida = s ? lista : sinPrivados(lista);

  return new Response(JSON.stringify(salida), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store, private" }
  });
}

async function escribirClubes(request, env) {
  const s = await sesionDe(request, env);
  if (!s) return json({ error: "Tu sesión expiró. Vuelve a entrar." }, 401);
  if (s.r !== "admin") return json({ error: "El modo visor no puede editar el directorio." }, 403);
  if (!env.DIRECTORIO) return json({ error: "Falta conectar el almacén de datos (KV) al proyecto." }, 500);

  let datos;
  try {
    datos = await request.json();
  } catch (e) {
    return json({ error: "Datos inválidos." }, 400);
  }
  if (!Array.isArray(datos) || !datos.length) return json({ error: "El directorio no puede quedar vacío." }, 400);
  if (datos.length > 500) return json({ error: "Demasiados registros." }, 400);

  const limpio = limpiar(datos);
  if (!limpio.length) return json({ error: "Ningún registro tiene nombre de club." }, 400);

  // Si el navegador no recibio los telefonos (o los omite), no se pierden:
  // se conservan los que ya estaban guardados para ese club.
  const previo = env.DIRECTORIO ? await env.DIRECTORIO.get(LLAVE) : null;
  if (previo) {
    let antes = [];
    try { antes = JSON.parse(previo); } catch (e) { antes = []; }
    const porId = {};
    (Array.isArray(antes) ? antes : []).forEach(c => { if (c && c.id) porId[c.id] = c; });
    limpio.forEach(c => {
      const viejo = porId[c.id];
      if (!viejo) return;
      PRIVADOS.forEach(k => {
        const enviado = datos.find(d => d && d.id === c.id);
        const traeCampo = enviado && Object.prototype.hasOwnProperty.call(enviado, k);
        if (!traeCampo && viejo[k]) c[k] = viejo[k];
      });
    });
  }

  await env.DIRECTORIO.put(LLAVE, JSON.stringify(limpio, null, 1));
  return json({ ok: true, total: limpio.length });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const ruta = url.pathname;

    if (ruta === "/api/login") {
      if (request.method === "POST") return login(request, env);
      if (request.method === "DELETE") return logout();
      return json({ error: "Método no permitido." }, 405);
    }

    if (ruta === "/api/clubes") {
      if (request.method === "GET") return leerClubes(request, env);
      if (request.method === "PUT") return escribirClubes(request, env);
      return json({ error: "Método no permitido." }, 405);
    }

    if (ruta === "/api/sesion") {
      const s = await sesionDe(request, env);
      return json({ rol: s ? s.r : null });
    }

    return env.ASSETS.fetch(request);
  }
};
