import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/analytics';

const ANALYTICS_KEYS = {
  enrollmentsSummary: (filters?: Record<string, string>) => ['analytics', 'enrollments-summary', filters] as const,
  successRates: (filters?: Record<string, string>) => ['analytics', 'success-rates', filters] as const,
  teacherStats: (filters?: Record<string, string>) => ['analytics', 'teacher-stats', filters] as const,
  formationStats: (filters?: Record<string, string>) => ['analytics', 'formation-stats', filters] as const,
  eventStats: (filters?: Record<string, string>) => ['analytics', 'event-stats', filters] as const,
  mappings: () => ['analytics', 'mappings'] as const,
  insertionRates: (filters?: Record<string, string>) => ['analytics', 'insertion-rates', filters] as const,
  insertionDelays: (filters?: Record<string, string>) => ['analytics', 'insertion-delays', filters] as const,
  insertionSectors: (filters?: Record<string, string>) => ['analytics', 'insertion-sectors', filters] as const,
  insertionContracts: (filters?: Record<string, string>) => ['analytics', 'insertion-contracts', filters] as const,
};

const STALE_10_MIN = 1000 * 60 * 10;
const STALE_30_MIN = 1000 * 60 * 30;

export function useEnrollmentsSummary(filters?: { annee?: string; filiere?: string; niveau?: string; genre?: string }) {
  return useQuery({
    queryKey: ANALYTICS_KEYS.enrollmentsSummary(filters as Record<string, string> | undefined),
    queryFn: () => analyticsApi.getEnrollmentsSummary(filters),
    staleTime: STALE_10_MIN,
    select: (res) => res.success ? res.data : null,
  });
}

export function useSuccessRates(filters?: { annee?: string; filiere?: string; niveau?: string; genre?: string }) {
  return useQuery({
    queryKey: ANALYTICS_KEYS.successRates(filters as Record<string, string> | undefined),
    queryFn: () => analyticsApi.getSuccessRates(filters),
    staleTime: STALE_10_MIN,
    select: (res) => res.success ? res.data : null,
  });
}

export function useTeacherStats(filters?: { annee?: string; genre?: string }) {
  return useQuery({
    queryKey: ANALYTICS_KEYS.teacherStats(filters as Record<string, string> | undefined),
    queryFn: () => analyticsApi.getTeacherStats(filters),
    staleTime: STALE_10_MIN,
    select: (res) => res.success ? res.data : null,
  });
}

export function useFormationStats(filters?: { annee?: string }) {
  return useQuery({
    queryKey: ANALYTICS_KEYS.formationStats(filters as Record<string, string> | undefined),
    queryFn: () => analyticsApi.getFormationStats(filters),
    staleTime: STALE_10_MIN,
    select: (res) => res.success ? res.data : null,
  });
}

export function useEventStats(filters?: { annee?: string }) {
  return useQuery({
    queryKey: ANALYTICS_KEYS.eventStats(filters as Record<string, string> | undefined),
    queryFn: () => analyticsApi.getEventStats(filters),
    staleTime: STALE_10_MIN,
    select: (res) => res.success ? res.data : null,
  });
}

export function useMappings() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.mappings(),
    queryFn: () => analyticsApi.getMappings(),
    staleTime: STALE_30_MIN,
    select: (res) => res.success ? res.data : null,
  });
}

export function useInsertionRates(filters?: { promotion?: string; filiere?: string; anneeDebut?: string; anneeFin?: string }) {
  return useQuery({
    queryKey: ANALYTICS_KEYS.insertionRates(filters as Record<string, string> | undefined),
    queryFn: () => analyticsApi.getInsertionRates(filters),
    staleTime: STALE_10_MIN,
    select: (res) => res.success ? res.data : null,
  });
}

export function useInsertionDelays(filters?: { promotion?: string; filiere?: string; anneeDebut?: string; anneeFin?: string }) {
  return useQuery({
    queryKey: ANALYTICS_KEYS.insertionDelays(filters as Record<string, string> | undefined),
    queryFn: () => analyticsApi.getInsertionDelays(filters),
    staleTime: STALE_10_MIN,
    select: (res) => res.success ? res.data : null,
  });
}

export function useInsertionSectors(filters?: { promotion?: string; filiere?: string; anneeDebut?: string; anneeFin?: string }) {
  return useQuery({
    queryKey: ANALYTICS_KEYS.insertionSectors(filters as Record<string, string> | undefined),
    queryFn: () => analyticsApi.getInsertionSectors(filters),
    staleTime: STALE_10_MIN,
    select: (res) => res.success ? res.data : null,
  });
}

export function useInsertionContracts(filters?: { promotion?: string; filiere?: string; anneeDebut?: string; anneeFin?: string }) {
  return useQuery({
    queryKey: ANALYTICS_KEYS.insertionContracts(filters as Record<string, string> | undefined),
    queryFn: () => analyticsApi.getInsertionContracts(filters),
    staleTime: STALE_10_MIN,
    select: (res) => res.success ? res.data : null,
  });
}

export { ANALYTICS_KEYS };
