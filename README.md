# Directorio de Clubes — Fitness Para Todos

Sitio estático con el directorio público de los clubes Planet Fitness operados por
Fitness Para Todos en México: ciudad, dirección, horario, costo de estacionamiento,
teléfono y correo del club, superficie y fecha de apertura.

## Contenido

| Archivo | Qué es |
|---|---|
| `index.html` | El sitio completo (búsqueda, filtro por ciudad, fichas, tabla y descarga CSV) |
| `clubes.json` | La fuente de datos. Editar aquí actualiza el sitio |
| `logo.png` | Marca FPT |

## Actualizar el directorio

1. Edita `clubes.json` (un objeto por club).
2. Haz commit en `main`. GitHub Pages republica el sitio en menos de un minuto.

Campos por club: `id`, `club`, `ciudad`, `direccion`, `m2`, `apertura`, `horario`,
`estacionamiento`, `telClub`, `correo`, `maps`.

## Alcance de los datos

Este repositorio es público y contiene **únicamente información del club como
establecimiento comercial**. No incluye nombres ni teléfonos personales de gerentes,
subgerentes, técnicos o administradores de plaza, ni identificadores de sistemas
internos (Zenoti, Planet Fitness). Esa información vive en el directorio interno
y no debe agregarse aquí.

## Publicar en GitHub Pages

Settings → Pages → Source: `Deploy from a branch` → rama `main`, carpeta `/ (root)`.
