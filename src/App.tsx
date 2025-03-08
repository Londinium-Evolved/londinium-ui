import { useState } from 'react';
import { Scene } from './components/game/Scene';
import { Button } from './components/ui/Button';
import { useGameState } from './state/gameState';
import './App.css';

function App() {
  const { era, setEra, transitionProgress, setTransitionProgress } = useGameState();
  const [showUI, setShowUI] = useState(true);

  const toggleEra = () => {
    const newEra = era === 'roman' ? 'cyberpunk' : 'roman';
    setEra(newEra);
  };

  const handleTransitionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTransitionProgress(parseFloat(e.target.value));
  };

  return (
    <div className='relative w-full h-screen'>
      {/* 3D Scene */}
      <Scene>{/* 3D content will be added here */}</Scene>

      {/* UI Overlay */}
      {showUI && (
        <div className='absolute top-0 left-0 p-4 bg-black/50 text-white'>
          <h1 className='text-2xl font-bold mb-4'>Londinium Evolved</h1>

          <div className='mb-4'>
            <p>Current Era: {era}</p>
            <Button onClick={toggleEra} className='mt-2'>
              Switch Era
            </Button>
          </div>

          <div className='mb-4'>
            <p>Era Transition: {Math.round(transitionProgress * 100)}%</p>
            <input
              type='range'
              min='0'
              max='1'
              step='0.01'
              value={transitionProgress}
              onChange={handleTransitionChange}
              className='w-full'
            />
          </div>

          <Button variant='outline' onClick={() => setShowUI(false)} className='mt-4'>
            Hide UI
          </Button>
        </div>
      )}

      {!showUI && (
        <Button
          variant='outline'
          onClick={() => setShowUI(true)}
          className='absolute top-4 left-4 bg-black/50 text-white'>
          Show UI
        </Button>
      )}
    </div>
  );
}

export default App;
