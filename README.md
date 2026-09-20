# Directorio de Clubes — FPT (Cloudflare Pages)

Sitio del directorio de clubes con modo administrador que guarda del lado del servidor:
la contraseña se valida en una Function y los datos viven en Cloudflare KV. El navegador
nunca recibe credenciales ni tokens.

## Estructura

| Ruta | Qué es |
|---|---|
| `index.html` | El sitio (búsqueda, filtros, fichas, tabla, CSV y modo admin) |
| `clubes.json` | Semilla inicial del directorio; se usa mientras KV esté vacío |
| `mapa-mx.json` | Trazos de las 32 entidades para el mapa (se carga solo al abrir esa vista) |
| `logo.png` | Marca FPT |
| `_worker.js` | Backend: login con sesión firmada (8 h), lectura y escritura del directorio |

## Configuración en Cloudflare Pages

**Variables de entorno** (Settings → Environment variables, marcadas como *Secret*):

- `ADMIN_USER` — usuario del administrador
- `ADMIN_PASS` — contraseña del administrador
- `SESSION_SECRET` — cadena larga y aleatoria para firmar la sesión

**Binding de KV** (Settings → Functions → KV namespace bindings):

- Variable: `DIRECTORIO` → namespace: `directorio-clubes`

Sin el binding el sitio funciona en modo lectura y avisa al intentar guardar.

## Dominio

Custom domain `directorio.fpt.com.mx`, con un CNAME en Akky apuntando al subdominio
`.pages.dev` del proyecto.

## Alcance de los datos

Solo información del club como establecimiento: dirección, horario, estacionamiento,
teléfono y correo del club, mapa, superficie y apertura. Sin nombres ni teléfonos
personales de gerentes, subgerentes, técnicos o administradores de plaza, y sin
identificadores de sistemas internos.
