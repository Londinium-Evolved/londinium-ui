# Londinium UI

Londinium Evolved Front End repository - A React + THREE.js application for procedural city generation.

## Project Overview

Londinium UI is a web-based application that visualizes the evolution of London from its Roman origins to a futuristic cyberpunk metropolis. The application uses procedural generation techniques to create buildings, terrain, and citizens that transform between eras.

### Key Features

- Procedural generation of buildings and urban layouts
- Era transition system (Roman to Cyberpunk)
- Resource management system
- Performance-optimized THREE.js rendering
- Responsive UI with shadcn/ui components

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **THREE.js** - 3D rendering
- **React Three Fiber** - React bindings for THREE.js
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - UI component library
- **Zustand** - State management
- **Vite** - Build tool
- **Jest** - Testing framework

## Development Setup

### Prerequisites

- Node.js (v18+)
- npm or yarn

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-org/londinium-ui.git
   cd londinium-ui
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run preview` - Preview the production build
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint

## Project Structure

```
londinium-ui/
├── public/              # Static assets
├── src/
│   ├── components/
│   │   ├── ui/          # Pure UI components
│   │   └── game/        # Game-specific components with THREE.js
│   │   └── tests/       # Test files
│   ├── state/           # State management
│   ├── utils/
│   │   └── procedural/  # Procedural generation algorithms
│   ├── workers/         # Web Workers for computation
│   ├── tests/           # Test files
│   ├── App.tsx          # Main application component
│   └── main.tsx         # Application entry point
├── .gitignore           # Git ignore file
├── index.html           # HTML entry point
├── jest.config.ts       # Jest configuration
├── package.json         # Project dependencies
├── postcss.config.js    # PostCSS configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

## Procedural Generation Architecture

The procedural generation system is designed to create historically accurate buildings and urban layouts for both Roman and Cyberpunk eras. The system uses a combination of algorithms to generate:

1. **Buildings** - Procedurally generated based on era-specific parameters
2. **Urban Layout** - Grid patterns for Roman era, corporate-dominated layouts for Cyberpunk
3. **Citizens** - Behavior patterns and appearances that match the current era

The generation process is offloaded to Web Workers to maintain performance on the main thread.

## Contributing

Please read the [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
