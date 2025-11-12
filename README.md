# Prueba técnica - Ionic/Angular/Cordova/Firebase

Aplicación **To-Do Híbrida** construida con Ionic + Angular siguiendo principios de *Clean Architecture*, programación reactiva con RxJS y almacenamiento local. El proyecto incluye administración de categorías, feature flags con Firebase Remote Config, pruebas unitarias y artefactos para contenerización (Docker) e Infrastructure as Code.

## 🚀 Funcionalidades clave
- **Gestión completa de tareas**: crear, completar, eliminar y asignar categorías.
- **Gestión de categorías**: crear, editar y eliminar categorías con soporte de color.
- **Filtrado avanzado**: filtra por categoría específica o tareas sin categoría.
- **Feature flag remoto**: Firebase Remote Config habilita/inhabilita acciones masivas (completar todas, revertir y limpiar completadas).
- **Sincronización con Firebase mejorada**: caché local con reintentos y chip de estado en la UI para conocer si los cambios ya
  se enviaron a la nube o se mantienen en modo offline.
- **Optimización de rendimiento**:
  - `ChangeDetectionStrategy.OnPush` + `provideZoneChangeDetection` con `event/run coalescing`.
  - Derivación reactiva memoizada (`shareReplay`) y `trackBy` para listas extensas.
  - Persistencia local eficiente sobre `@ionic/storage` y caché de Firestore para cargas inmediatas.
- **Clean Architecture**: capas `presentation`, `core`, `domain`, `data`, `infrastructure`.
- **Docker & IaC**: `Dockerfile`, `docker-compose.yml` y plantilla de Remote Config (`firebase.json` + `remoteconfig.template.json`).
- **Pruebas unitarias** con Karma/Jasmine (`npm run test:ci`).

## 🧱 Arquitectura de carpetas
```
src/
  app/
    presentation/       # UI (páginas Ionic standalone)
    core/               # Modelos, repositorios y store reactivo
    domain/             # Casos de uso (aplicación)
    data/               # Implementaciones (local storage)
    infrastructure/     # Servicios externos (Firebase Remote Config, Storage)
```

## ⚙️ Requisitos previos
- Node.js 20+
- npm 10+
- Ionic CLI 7 (`npm install -g @ionic/cli`)
- Capacitor & Cordova (`npm install -g cordova @capacitor/cli`)
- Firebase CLI (`npm install -g firebase-tools`) para despliegues de Remote Config

## ▶️ Ejecución local
```bash
npm install
npm start
# Navega a http://localhost:4200
```

### Usando Docker
```bash
docker compose up --build
# La aplicación queda disponible en http://localhost:4200
```
El contenedor monta el código en caliente (`CHOKIDAR_USEPOLLING`) para desarrollo.

## 🧪 Pruebas unitarias
```bash
npm run test        # modo interactivo
npm run test:ci     # ChromeHeadless, usado en CI o dentro de Docker
```
Los tests cubren el `TodoStore` (filtrado, estadísticas y resúmenes) y los nuevos casos de uso de categorías/tareas.

## 📱 Builds móviles (Cordova / Capacitor)
1. Instalar plataformas:
   ```bash
   ionic cordova platform add android
   ionic cordova platform add ios
   ```
2. Generar artefactos:
   ```bash
   ionic cordova build android --prod
   ionic cordova build ios --prod
   ```
   Los binarios (`.apk`/`.ipa`) quedan en `platforms/<platform>/build`. Para iOS se requiere macOS + Xcode para la firma final.
3. Capacitor (alternativa moderna):
   ```bash
   npm run build
   npx cap add android
   npx cap add ios
   npx cap open android   # abre Android Studio para generar el APK
   npx cap open ios       # abre Xcode para exportar el IPA
   ```

## 🔥 Firebase Remote Config
1. Configura tu proyecto Firebase y actualiza `src/app/firebase.config.ts`.
2. Autentícate: `firebase login` y `firebase use <project-id>`.
3. Sincroniza la plantilla:
   ```bash
   firebase remoteconfig:get --project <project-id> > rc-live.json
   firebase remoteconfig:versions:list
   firebase deploy --only remoteconfig
   ```
   La plantilla `remoteconfig.template.json` define:
   - `feature_enableBulkActions`: habilita acciones masivas.
   - `ui_welcome`: mensaje mostrado cuando el flag está activo.
4. **Demo**: al activar `feature_enableBulkActions = true`, aparecerá en la UI la tarjeta con botones para completar/reabrir todas las tareas y limpiar completadas.

## ☁️ Firebase Firestore
1. Crea o selecciona un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Entra a **Firestore Database** → **Create database** y habilítala (modo de prueba es válido durante el desarrollo).
3. Desde la misma consola copia la configuración Web y reemplaza los valores en `src/app/firebase.config.ts` (hay un ejemplo en `firebase-sdk.txt`).
4. Publica las reglas incluidas en `firestore.rules` para habilitar la lectura/escritura desde la aplicación (validan estructura y tipos de los documentos):
   ```bash
   firebase deploy --only firestore:rules
   ```
   Si prefieres el modo "test" desde la consola recuerda que expira a los 30 días; con estas reglas la app puede funcionar indefinidamente sin abrir la base de datos a datos inválidos.
   > ¿Necesitas reglas adicionales (por ejemplo, `posts` o perfiles)? Añádelas en el mismo archivo sin eliminar los bloques `tasks` y `categories`, tal como se muestra en el repositorio, para que la app conserve permisos sobre sus colecciones.
5. Las colecciones `tasks` y `categories` se crean automáticamente al usar la aplicación; no hace falta preconfigurarlas.
6. Si la app no puede conectarse, activará el modo offline: verás un chip indicando que los cambios quedan en caché y se reintentará cuando la conexión vuelva.

> **Importante:** esta app utiliza **Cloud Firestore**. Revisa esta sección de la consola (no Realtime Database) para visualizar los documentos generados.

## ♻️ Infrastructure as Code
- `Dockerfile` + `docker-compose.yml`: reproducen la infraestructura local/CI.
- `firebase.json` + `remoteconfig.template.json`: definen Remote Config como código, versionable y desplegable con Firebase CLI.

## 📸 Capturas / demo
En `docs/screenshots/` puedes almacenar evidencias (imágenes o GIFs). Añade tus capturas generadas con `ionic serve` o los binarios móviles antes de la entrega final.

## ❓ Preguntas técnicas
- **Desafíos principales:**
  - Integrar categorías en toda la app manteniendo Clean Architecture y sincronización reactiva.
  - Diseñar acciones masivas controladas por feature flag sin romper la persistencia local.
  - Optimizar la UI para listas largas combinando `OnPush`, `provideZoneChangeDetection` y cálculos memoizados en el store.
- **Técnicas de optimización aplicadas:**
  - Memoización con `shareReplay` en el store para estadísticas y filtros.
  - Coalescencia de eventos/cambios en Angular para reducir ciclos de detección.
  - `trackBy` y manipulación inmutable para minimizar renders en listas extensas.
  - Almacenamiento local con cargas iniciales asincrónicas, caché de Firestore y sincronización optimista con reintentos.
- **Calidad y mantenibilidad:**
  - Separación estricta de capas (domain/data/presentation).
  - Casos de uso dedicados para cada acción; fácil de testear y reutilizar.
  - Cobertura unitaria de store y casos de uso críticos.
  - Documentación detallada (README) y scripts de automatización (`test:ci`, Docker, Firebase).

## 📁 Otros recursos
- `resources/`: íconos y splash para Android/iOS (Cordova).
- `config.xml` y `capacitor.config.ts`: configuraciones móviles listas para personalización.
- `firebase-sdk.txt`: credenciales de muestra (reemplazar por las tuyas en producción).

---
**Entrega sugerida:** publica este repositorio, adjunta los APK/IPA generados y las capturas solicitadas. Sigue las instrucciones anteriores para que el evaluador pueda reproducir la demo y validar los feature flags.
