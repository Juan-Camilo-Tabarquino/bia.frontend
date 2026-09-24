// Hook for analysis queries
import { useGetAnalysisQuery } from './dashboardAPI';

export function useAnalysis(start: string, end: string) {
  const { data, error, isLoading } = useGetAnalysisQuery({ start, end });
  return { data, error, isLoading };
}
