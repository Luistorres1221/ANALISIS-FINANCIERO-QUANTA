/**
 * Configuración central del router de la aplicación.
 *
 * Usa TanStack Router con el árbol de rutas generado automáticamente por el
 * plugin Vite (TanStackRouterVite) a partir de los archivos en src/rutas/.
 * El router se crea dentro de una función para facilitar pruebas y SSR futuro.
 *
 * Opciones clave:
 *   - routeTree: estructura de rutas auto-generada en routeTree.gen.ts
 *   - context.queryClient: instancia de React Query compartida por todas las rutas
 *   - scrollRestoration: restaura la posición de scroll al navegar hacia atrás
 *   - defaultPreloadStaleTime: 0 → siempre refrescar datos al hacer prefetch de rutas
 */
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/**
 * Crea y retorna una instancia del router con su propio QueryClient.
 * Se llama una sola vez en main.tsx al montar la aplicación.
 */
export const getRouter = () => {
  // QueryClient gestiona el caché de datos asíncronos en toda la app
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,          // Recuerda la posición al usar el historial del navegador
    defaultPreloadStaleTime: 0,       // Sin caché de prefetch: siempre datos frescos al navegar
  });

  return router;
};
