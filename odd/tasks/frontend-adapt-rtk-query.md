# Adaptación de componentes a RTK Query

## Descripción
Se actualizan los componentes de la UI para usar los hooks generados por RTK Query en lugar de los thunks asincrónicos existentes.

- **MeterList** ahora usa `useGetMetersQuery`.
- **MeterDetail** usa `useGetMeterDetailQuery`.
- **DashboardPage** usa `useGetAnalysisQuery`.
- Se elimina el thunk `fetchMeters` y su lógica en `metersSlice`.

## Cambios de código
- `frontend/src/components/MeterList.tsx`
- `frontend/src/components/MeterDetail.tsx`
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/features/meters/metersSlice.ts`

## Verificación
Ejecutar la aplicación y confirmar que los componentes renderizan correctamente sin errores y que los datos se cargan mediante RTK Query.
