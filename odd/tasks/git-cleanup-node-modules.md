# Tarea: Eliminar node_modules del repositorio

## Descripción
Se eliminaron todos los archivos bajo `frontend/node_modules` que habían sido añadidos al control de versiones y se actualizó `.gitignore` para prevenir futuros commits de cualquier `node_modules` dentro del árbol del proyecto.

## Pasos realizados
1. Añadido patrón `**/node_modules` a `.gitignore`.
2. Ejecutado `git rm -r --cached frontend/node_modules` (los archivos fueron marcados para borrado).
3. Commit con mensaje `chore: remove node_modules from repository and update .gitignore`.

## Estado
- ✅ Completado y commit enviado.

## Próximos pasos
- Verificar que el CI pase sin los archivos eliminados.
- Continuar con la corrección de los fallos de pruebas pendientes.
