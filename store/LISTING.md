# Ficha de Google Play — QuiniBall

Textos y datos listos para copiar/pegar en Play Console. Todo en español (es-ES).

> ⚠️ **Clave anti-rechazo:** QuiniBall NO maneja dinero ni apuestas reales. Hay
> que dejarlo explícito en la ficha para no caer en la política de juego/azar de
> Google. Por eso la categoría recomendada es **Deportes**, no "Casino/Apuestas".

---

## Identidad

- **Nombre de la app (máx. 30):** `QuiniBall`
- **Categoría:** Deportes
- **Etiquetas sugeridas:** fútbol, quiniela, mundial, porra, predicciones

## Descripción corta (máx. 80 caracteres)

```
Quinielas del Mundial 2026 con tus amigos. Solo puntos y ranking, sin dinero.
```

## Descripción larga (máx. 4000 caracteres)

```
QuiniBall es la forma más fácil de vivir el Mundial 2026 con tus amigos, tu familia o tus compañeros de oficina.

Pronostica el resultado de cada partido (1·X·2), suma puntos por tus aciertos y sube en la clasificación de tu grupo. Sin complicaciones y sin dinero de por medio: aquí solo se juega por la gloria.

⚽ TODO EL MUNDIAL EN TU MÓVIL
· Las 48 selecciones y los 104 partidos, del 11 de junio al 19 de julio.
· Calendario siempre actualizado con horarios y sedes reales.
· Resultados que se actualizan automáticamente: tus puntos se calculan solos.

🏆 COMPITE EN GRUPOS
· Crea un grupo privado para tu oficina, tu peña o tu familia.
· Invita a quien quieras con un enlace o un código.
· Ranking en vivo: mira quién manda después de cada jornada.

🎯 FÁCIL Y RÁPIDO
· Regístrate en segundos con tu nombre y un PIN.
· Haz tus pronósticos antes de cada partido.
· Diseñado para el móvil: limpio, claro y directo.

🔒 SIN DINERO, SOLO DIVERSIÓN
QuiniBall NO es una app de apuestas. No se ingresa, no se apuesta y no se gana dinero. Compites únicamente por puntos y por el orgullo de ganar a los tuyos.

Crea tu grupo, reta a tus amigos y demuestra quién sabe más de fútbol. ¡Que gane el mejor pronosticador del Mundial 2026!
```

---

## Recursos gráficos (en esta carpeta `store/` y en el proyecto)

| Recurso Play | Tamaño | Archivo |
|---|---|---|
| Icono hi-res | 512×512 PNG | `store/icon-512.png` |
| Gráfico destacado (feature) | 1024×500 PNG | `store/feature-graphic-1024x500.png` |
| Capturas de teléfono | 2–8, mín. 320px lado | **pendiente** (las sacamos del móvil/emulador) |
| Icono de la app (launcher) | varios | ya generados en `android/` |

> Capturas: cuando la app corra en el emulador/móvil, hacemos 3–5 (inicio, grupo,
> calendario/pronóstico, ranking). Play exige mínimo 2.

---

## Formulario "Seguridad de los datos" (borrador de respuestas)

- ¿Recopila o comparte datos de usuario? **Sí** (correo, nombre, datos de juego).
- Datos recopilados:
  - **Correo electrónico** → para gestión de la cuenta. Obligatorio. No se comparte. No para publicidad.
  - **Nombre/alias** → identidad en el ranking. Obligatorio. Visible para el grupo.
  - **Otros (pronósticos/puntos)** → funcionamiento de la app. Obligatorio.
- ¿Cifrado en tránsito? **Sí (HTTPS).**
- ¿Se puede solicitar la eliminación de datos? **Sí**, por correo al contacto de privacidad.
- ¿Datos compartidos con terceros? **No** (Supabase/Vercel son proveedores que procesan por cuenta de la app, no "compartir").
- Publicidad / IDs de seguimiento: **No.**

## Clasificación de contenido (cuestionario IARC)

- Sin violencia, sin contenido sexual, sin lenguaje soez.
- ¿Juego con dinero real / apuestas? **NO.** (Importante responder NO: no hay dinero.)
- Interacción entre usuarios: solo dentro de grupos privados (ranking/nombre).
- Resultado esperado: apto para todos los públicos (PEGI 3 / Everyone) o similar.

## Otros campos obligatorios

- **URL Política de privacidad:** `https://<tu-dominio>/privacidad` (página ya creada).
- **Correo de contacto:** danieliadarola@gmail.com (cámbialo si quieres otro público).
- **Público objetivo:** mayores de 14 (no dirigida a menores).
