# HomeTab - Frontend (Vue 3 SPA)

Este directorio contiene el código fuente de la aplicación frontend para el proyecto HomeTab, desarrollada con Vue 3, Vite, PrimeVue y Vue Router.

## Requisitos
- Node.js 20.19+ o 22.12+
- NPM

## Instalación
```bash
npm ci
```

## Entorno Local
Para configurar el entorno local, crea un archivo `.env.local` basado en `.env`:
```
VITE_API_URL=http://localhost:8000/api
VITE_ASSET_URL=http://localhost:8000
```

## Scripts Disponibles
- `npm run dev`: Inicia el servidor de desarrollo en modo hot-reload.
- `npm run build`: Compila la aplicación para producción en la carpeta `dist/`.
- `npm run preview`: Sirve la carpeta `dist/` localmente para previsualizar la compilación.
- `npm run lint`: Ejecuta ESLint sobre el código.

## Estructura Principal
- `src/views/`: Vistas y páginas principales (TabHub, HouseholdLayout, Dashboard, etc.).
- `src/components/`: Componentes reutilizables.
- `src/services/http.js`: Cliente HTTP (Axios) configurado con el interceptor para inyectar el token JWT.
- `src/router/`: Configuración de rutas y guardias de navegación.
- `src/i18n/`: Configuración de internacionalización (ES, CA, EN).

## Decisiones Técnicas y Estado Actual
- **Drag & Drop**: Recientemente implementado en TabHub (para reordenar casas) y en la vista de Tareas (para reordenar y cambiar de estado pendiente a completado). El orden se guarda enviando peticiones a la API del backend.
- **Autenticación**: Basada en JWT. El token se guarda en `localStorage` y se añade automáticamente a cada petición. También está integrado un flujo de doble factor de autenticación (2FA).
