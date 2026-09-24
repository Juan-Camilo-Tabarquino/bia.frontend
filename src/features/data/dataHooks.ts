import { useGetMeterReadingsQuery } from './dataAPI';

export function useMeterReadings(meterId: string, start: string, end: string) {
  const { data, error, isLoading } = useGetMeterReadingsQuery({ meterId, start, end });
  return { data, error, isLoading };
}
