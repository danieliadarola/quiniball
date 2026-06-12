# Flujo de versiones y backups — QuiniBall

QuiniBall en Android es una **cáscara Capacitor que carga la web de Vercel en
vivo**. Esto define dos tipos de cambio muy distintos:

## 1. Cambios de WEB / lógica (la mayoría)
Ejemplos: nuevas pantallas, reglas de puntuación, textos, estilos, partido
estrella, perfil, etc.

- **Llegan a TODOS (web, iPhone y la app Android) con solo desplegar en Vercel.**
- **NO requieren** regenerar el AAB ni subir nada a Google Play.
- Flujo: commit → `git tag vX.Y` (backup) → push a `main` → Vercel despliega solo.

## 2. Cambios NATIVOS (puntuales)
Ejemplos: icono, splash, permisos, nombre/ID de la app, **notificaciones push**,
plugins de Capacitor.

- **Sí requieren** nuevo AAB y subirlo a Play Console como actualización.
- Hay que subir **versionCode** (entero, +1 cada subida) y **versionName**
  (texto visible) en `android/app/build.gradle`.

### Regenerar el AAB firmado (solo para cambios nativos)
1. Sube versión en `android/app/build.gradle`:
   - `versionCode 2` (cada subida a Play debe ser mayor que la anterior)
   - `versionName "1.1"`
2. Sincroniza y compila:
   ```bash
   npx cap sync android
   # con JAVA_HOME apuntando al JBR de Android Studio:
   android/gradlew -p android bundleRelease
   ```
3. AAB firmado en: `android/app/build/outputs/bundle/release/app-release.aab`
4. Súbelo en Play Console → nueva versión.

> Firma: keystore en `F:\Proyectos\quiniball-upload-key.jks` (alias `quiniball`).
> Credenciales en `android/keystore.properties` (NO se sube a git).

## Backups por versión (git)
- `git tag -a vX.Y -m "..."` marca un estado recuperable.
- Volver a una versión: `git checkout vX.Y` (o `git switch -c fix vX.Y`).
- Historial de tags: `git tag`.

## Numeración de versiones (desde el lanzamiento)

A partir del lanzamiento se usa **versionado semántico `MAYOR.MENOR.PARCHE`**
(p. ej. `1.0.1`), alineado con el `versionName` de la app Android (lo que ve el
público en Google Play). Regla:
- **PARCHE** (`1.0.x`): correcciones sin cambios de funcionalidad.
- **MENOR** (`1.x.0`): funcionalidad nueva compatible.
- **MAYOR** (`x.0.0`): cambios grandes/rupturas.

Los tags antiguos **`v1.0`–`v1.6` son historial de desarrollo PRE-lanzamiento**
(marcadores internos de entregas web). La línea pública real arranca en
**`v1.0.1`** = primer estado listo y estable para lanzar.

## Registro de versiones
- **v1.0** — App Android inicial (Capacitor) + privacidad + assets de tienda.
  Publicada en Google Play (internal testing). `versionCode 1`.
- **v1.1** — Partido estrella por quiniela, perfil editable (nombre de usuario),
  renombrar quiniela, botón 1X2 más claro. *(Cambio de web/lógica: se entrega
  por Vercel; no necesita AAB nuevo.)*
- **v1.2** — Salir de una quiniela por tu cuenta y eliminarla deslizando en el
  dashboard (dueño). RPC `leave_group` (migración 0012). *(Web/lógica; por Vercel.)*
- **v1.3** — El calendario se ordena por fecha de inicio (kickoff) en vez de por
  el número oficial de partido (que no es cronológico), tanto en la vista de
  pronósticos como en el panel de admin. *(Web/lógica; por Vercel.)*
- **v1.4** — Punto de restauración previo al historial de acciones. Incluye:
  contacto de privacidad a rudami2026@gmail.com; footer con privacidad +
  copyright; recordar email en el login; "Volver" de privacidad respeta la
  sesión; botón "Gestionar" en el dashboard; pestaña "Gestionar" en la quiniela
  con co-organizadores (migración 0013) y Ranking solo con puntos; quitada la
  caja de "puntos totales". *(Web/lógica; por Vercel.)*
- **v1.5** — Historial de actividad (pestaña "Historial", tabla `group_events`,
  migración 0014) y **arreglo del bug de visualización de pronósticos**: la
  consulta de `predictions` no filtraba por usuario, así que cada jugador veía
  el pick de otro en las tarjetas (marcado "Acierto/Fallo" contra los puntos
  reales del encabezado). Corregido con `.eq("profile_id", session.sub)`. La
  tarjeta de partido finalizado se reescribió para que el verde/rojo marque la
  elección del usuario ("Acierto"/"Fallo"), señale el ganador real como
  "Resultado" y distinga "No pronosticaste" de "Fallaste". **Los puntos del
  ranking siempre fueron correctos** (auditoría: 30/30, 0 discrepancias); el
  fallo era solo de visualización. *(Web/lógica; por Vercel.)*
- **v1.6** — Herramientas de ADMINISTRADOR (fundador) y recuperación de PIN:
  - **Editar pronósticos ajenos**: engranaje (solo `is_admin`) en la quiniela
    para corregir el pick de cualquier jugador en cualquier partido, incluido uno
    ya finalizado (recalcula puntos con el motor puro). Vista previa de impacto
    (puntos y cambio de ranking) y confirmación. Oculto y sin rastro en el
    Historial. Aditivo: no toca `savePrediction`, `MatchCard` ni el motor.
  - **Dashboard + acceso a quinielas ajenas**: el admin ve un apartado "Otras
    quinielas" (creadas por otros) y puede entrar a cualquiera (lectura con
    `service_role`) para editar/gestionar — co-organizador, transferir, eliminar
    (las RPC ya autorizaban `is_app_admin`). El flujo de los miembros no cambia.
  - **Reset de PIN olvidado** (migración **0015** `profiles.must_reset_pin`):
    solo el admin genera un PIN temporal de un solo uso (botón de llave en
    Gestionar); al entrar con él, la app obliga a elegir un PIN nuevo
    (`/cambiar-pin`, claim `mrp` en el JWT, guard en el layout `(app)`). El PIN
    definitivo lo elige siempre el usuario. *(Web/lógica + migración; por Vercel.)*
- **v1.0.1 — LANZAMIENTO (reinicio de numeración a semver).** Estado listo y
  estable para lanzar: equivale a todo lo anterior (v1.0–v1.6) **más el arreglo
  de `/cambiar-pin`**, que rompía en Vercel ("Could not find the module … in the
  React Client Manifest") por un cruce estático/dinámico del módulo de server
  actions; se reescribió como componente de servidor puro (formulario nativo, sin
  componente cliente). `versionName` de Android pasa a `1.0.1`. *(Web/lógica +
  build.gradle; el cambio web va por Vercel, el `versionName` aplica al próximo
  AAB, que subirá `versionCode` a 2.)*
- **v1.1.0** — Ranking y avatares (funcionalidad nueva):
  - **Ranking renovado**: podio Top 3 (oro/plata/bronce), buscador de
    participantes, botón "Ir a mi posición" y filas con avatar + puntos +
    desglose "exactos · aciertos 1X2"; resalta tu fila.
  - **Avatares de perfil** (migración **0016** `profiles.avatar_style/seed`):
    cada jugador elige un avatar generado con DiceBear (MIT) desde "Tu perfil";
    el SVG se genera en el servidor (ruta cacheada `/api/avatar`), sin fotos ni
    almacenamiento. Set de estilos con tono gracioso/meme. Se ve en ranking,
    cabecera y Gestionar. Respaldo: inicial sobre círculo de color.
  - **Aviso "Novedades"**: pop-up minimalista al entrar, una vez por dispositivo
    (localStorage); reaparece al subir `WHATS_NEW.version`.
  `versionName` de Android pasa a `1.1.0`. *(Web/lógica + migración; por Vercel.)*
