# Frontend Meter Readings Feature

## Objective
Implement a dedicated page to display the time‑series readings of a selected meter.

### Requirements
- Route: `/meter/[id]/readings`
- Fetch data using `useGetMeterReadingsQuery({ meterId, start?, end? })`.
- Render a line chart with Recharts (`ChartPanel` style) showing `timestamp` vs `value`.
- Display a table (Ant Design `Table`) listing each reading.
- Include a date‑range filter (Ant Design `DatePicker.RangePicker`) that updates the query parameters.
- Ensure the UI is responsive and matches the rest of the product style.
- Write unit/integration tests covering fetch, rendering, and filter behavior.
