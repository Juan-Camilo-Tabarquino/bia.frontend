## Feature: Reorganizar proyecto – mover código frontend a la raíz

Este feature tiene como objetivo trasladar todo el contenido de la carpeta `frontend/` al nivel raíz del repositorio, manteniendo la misma estructura interna (`src/`, `public/`, etc.). Se actualizarán los imports y configuraciones que dependan de la ruta `frontend/`.

### Tareas
| ID | Título | Descripción | Estado |
|----|--------|-------------|--------|
| 1 | Mover todo el contenido de `frontend/` a la raíz | Utilizar `git mv` para mover cada archivo y carpeta, actualizar `package.json` scripts si fuera necesario, y ajustar cualquier referencia a `frontend/` en la base de código. | pending |
| 2 | Actualizar imports y rutas en archivos afectados | Revisar y corregir imports que incluyan la ruta `frontend/` (p. ej., en tests, configuraciones, documentación). | pending |
| 3 | Actualizar configuraciones de Jest, TSConfig y CI | Cambiar referencias a `frontend/` en `jest.config.js`, `tsconfig.json`, `.github/workflows/ci.yml` y otros archivos de configuración. | pending |
| 4 | Verificar que la aplicación compila y los tests pasan | Ejecutar `npm run lint`, `npm run build` y `npm test` para asegurar que todo funciona después del movimiento. | pending |

Una vez completado, el proyecto tendrá la siguiente estructura simplificada:
```
/ (raíz)
├─ src/
├─ public/
├─ styles/
├─ ... (otros archivos de configuración)
```