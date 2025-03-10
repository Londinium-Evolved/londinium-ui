import '@testing-library/jest-dom';
import React from 'react';

// Mock THREE.js
jest.mock('three', () => {
  const originalModule = jest.requireActual('three');

  return {
    ...originalModule,
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      setSize: jest.fn(),
      render: jest.fn(),
      setPixelRatio: jest.fn(),
      setClearColor: jest.fn(),
      domElement: document.createElement('canvas'),
      dispose: jest.fn(),
    })),
  };
});

// Mock react-three-fiber
jest.mock('@react-three/fiber', () => {
  const originalModule = jest.requireActual('@react-three/fiber');

  return {
    ...originalModule,
    Canvas: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', null, children),
    useFrame: jest.fn(),
    useThree: jest.fn().mockReturnValue({
      camera: {},
      scene: {},
      gl: {
        domElement: document.createElement('canvas'),
      },
    }),
  };
});

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
