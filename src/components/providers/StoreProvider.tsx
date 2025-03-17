import React, { useEffect } from 'react';
import { RootStore, StoreContext } from '../../state/RootStore';

interface StoreProviderProps {
  children: React.ReactNode;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  // Create the store once when the component is mounted
  const store = React.useMemo(() => new RootStore(), []);

  // Initialize the store
  useEffect(() => {
    try {
      store.initialize();

      // Cleanup when the provider is unmounted
      return () => {
        // Dispose of all stores to prevent memory leaks
        if (store.gameState) {
          store.gameState.dispose();
        }
        if (store.buildingState) {
          store.buildingState.dispose();
        }
        if (store.resourceState) {
          store.resourceState.dispose();
        }
        if (store.citizenState) {
          store.citizenState.dispose();
        }
        if (store.timeState) {
          store.timeState.dispose();
        }
      };
    } catch (error) {
      console.error('Failed to initialize store:', error);
    }
  }, [store]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
};
