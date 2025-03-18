import { useStore } from '../state/RootStore';

/**
 * Hook for accessing the root store
 * This is just a re-export of useStore for better semantics
 */
export const useRootStore = useStore;
