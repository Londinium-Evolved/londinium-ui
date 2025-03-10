import { create } from 'zustand';

export type Era = 'roman' | 'cyberpunk';

interface GameState {
  era: Era;
  transitionProgress: number; // 0 = roman, 1 = cyberpunk
  resources: {
    food: number;
    wood: number;
    stone: number;
    metal: number;
    coal: number;
    electronics: number;
    energy: number;
    cyberneticComponents: number;
    data: number;
  };
  setEra: (era: Era) => void;
  setTransitionProgress: (progress: number) => void;
  addResource: (resource: keyof GameState['resources'], amount: number) => void;
}

export const useGameState = create<GameState>((set) => ({
  era: 'roman',
  transitionProgress: 0,
  resources: {
    food: 100,
    wood: 100,
    stone: 100,
    metal: 50,
    coal: 0,
    electronics: 0,
    energy: 0,
    cyberneticComponents: 0,
    data: 0,
  },
  setEra: (era) => set({ era }),
  setTransitionProgress: (progress) => set({ transitionProgress: progress }),
  addResource: (resource, amount) =>
    set((state) => ({
      resources: {
        ...state.resources,
        [resource]: state.resources[resource] + amount,
      },
    })),
}));
