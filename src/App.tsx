import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Link, BrowserRouter, Routes, Route } from 'react-router-dom';
import { GameWorld } from './components/game/GameWorld';
import { Button } from './components/ui/Button';
import { useStore } from './state/RootStore';
import { StoreProvider } from './components/providers/StoreProvider';
import './App.css';
import RomanBuildingShowcase from './components/game/RomanBuildingShowcase';

const AppContent = observer(() => {
  const { gameState } = useStore();
  const [showUI, setShowUI] = useState(true);

  const toggleEra = () => {
    const newEra = gameState.currentEra === 'roman' ? 'cyberpunk' : 'roman';
    gameState.setEra(newEra);
  };

  const handleTransitionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    gameState.setEraProgress(parseFloat(e.target.value));
  };

  return (
    <BrowserRouter>
      <div className='App'>
        <nav className='bg-gray-800 text-white p-4'>
          <ul className='flex space-x-4'>
            <li>
              <Link to='/' className='hover:text-gray-300'>
                Home
              </Link>
            </li>
            <li>
              <Link to='/roman-buildings' className='hover:text-gray-300'>
                Roman Buildings
              </Link>
            </li>
          </ul>
        </nav>

        <Routes>
          <Route
            path='/'
            element={
              <div className='relative w-full h-screen'>
                {/* 3D Scene */}
                <GameWorld />

                {/* UI Overlay */}
                {showUI && (
                  <div className='absolute top-0 left-0 p-4 bg-black/50 text-white'>
                    <h1 className='text-2xl font-bold mb-4'>Londinium Evolved</h1>

                    <div className='mb-4'>
                      <p>Current Era: {gameState.currentEra}</p>
                      <Button onClick={toggleEra} className='mt-2'>
                        Switch Era
                      </Button>
                    </div>

                    <div className='mb-4'>
                      <p>Era Transition: {Math.round(gameState.eraProgress * 100)}%</p>
                      <input
                        type='range'
                        min='0'
                        max='1'
                        step='0.01'
                        value={gameState.eraProgress}
                        onChange={handleTransitionChange}
                        className='w-full'
                      />
                    </div>

                    <div className='mb-4'>
                      <Link to='/demo' className='text-blue-300 underline block mb-2'>
                        View Demo
                      </Link>
                      <Link to='/building-generator' className='text-blue-300 underline block mb-2'>
                        Building Generator
                      </Link>
                      <Link to='/shader-demo' className='text-blue-300 underline block'>
                        Shader Transition Demo
                      </Link>
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
            }
          />
          <Route path='/roman-buildings' element={<RomanBuildingShowcase />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
});

// Main App component with StoreProvider
function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}

export default App;
