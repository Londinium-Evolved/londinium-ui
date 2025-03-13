import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App';
import Demo from './demo/demo';
import ConfigurableBuildingGenerator from './components/game/ConfigurableBuildingGenerator';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<App />} />
        <Route path='/demo' element={<Demo />} />
        <Route path='/building-generator' element={<ConfigurableBuildingGenerator />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
