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

## Demo

The project includes an interactive demo that showcases the procedural generation capabilities:

![Demo Screenshot](/public/screenshots/demo.png)

### Demo Features

- **Procedural Terrain Generation**: Simulates historical London topography with height variations and a River Thames-like feature
- **Roman-Era City Layout**:
  - Circular city wall following Roman London outline
  - Buildings placed according to district zoning with varying sizes and colors
  - Different building types (temples, insulae, domus) with appropriate architectural styles
  - Roman road grid with cardo and decumanus pattern
- **Era Transition**: Slider to morph between Roman and Cyberpunk eras (currently disabled in demo)

### Running the Demo

You can access the demo in three ways:

1. **Through the main app**: Run `npm run dev` and click on the "View Demo" link in the UI
2. **Direct access**: Run `npm run demo` to launch just the demo page
3. **Browser URL**: Visit `http://localhost:5178/demo` when the dev server is running

```bash
# Start the main application with demo access
npm run dev

# Or run just the demo
npm run demo
```

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **THREE.js** - 3D rendering
- **React Three Fiber** - React bindings for THREE.js
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - UI component library
- **MobX** - State management
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

```plaintext
londinium-ui/
├── public/              # Static assets
├── src/
│   ├── components/
│   │   ├── ui/          # Pure UI components
│   │   ├── game/        # Game-specific components with THREE.js
│   │   ├── providers/   # Context providers and wrappers
│   │   └── tests/       # Test files
│   ├── state/           # MobX state management
│   │   ├── RootStore.ts # Central state store
│   │   ├── GameState.ts # Game state and era management
│   │   ├── BuildingState.ts # Building management
│   │   └── ResourceState.ts # Resource management
│   ├── utils/
│   │   ├── procedural/  # Procedural generation algorithms
│   │   └── three/       # THREE.js utility functions
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

## Architecture Guidelines

### File Extension Conventions

- **`.ts`** - Pure TypeScript files (no JSX)
  - State management
  - Utility functions
  - Type definitions
- **`.tsx`** - TypeScript files with JSX/React components
  - Any file containing JSX elements
  - React component definitions
  - Provider components with JSX

### State Management with MobX

We use MobX for state management with a store-based architecture:

- **RootStore** - Central store that holds references to all domain stores
- **Domain Stores** - Specialized stores for specific domains (GameState, BuildingState, etc.)
- **Context Provider** - React context for accessing stores throughout the component tree

### Component Organization

- **React.memo()** - Applied to rendering-intensive components (rendering >20 instances)
- **Provider separation** - JSX-based providers are kept in dedicated components
- **Component factoring** - Complex components are split into smaller, focused components

## Procedural Generation Architecture

The procedural generation system uses a custom `RandomGenerator` class to ensure deterministic and seed-based generation across different eras.

The system generates:

1. **Buildings** - Procedurally generated based on era-specific parameters
2. **Urban Layout** - Grid patterns for Roman era, corporate-dominated layouts for Cyberpunk
3. **Citizens** - Behavior patterns and appearances that match the current era

The generation process is offloaded to Web Workers to maintain performance on the main thread.

### THREE.js Best Practices

- **Resource Disposal** - All THREE.js resources (geometries, materials, textures) are properly disposed using the `useThreeDisposal` hook to prevent memory leaks
- **Type Safety** - Type assertions with proper guards when working with dynamic THREE.js object properties
- **Performance** - Instanced meshes for repeated geometry, object pooling, and frustum culling

#### Memory Management with `useThreeDisposal`

The `useThreeDisposal` hook provides a robust solution for managing THREE.js object disposal:

```tsx
// Example usage
const MyComponent = () => {
  // Get the hook functions
  const [registerDisposable, manuallyDispose] = useThreeDisposal();

  useEffect(() => {
    // Create THREE.js objects
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });

    // Register for automatic disposal on component unmount
    registerDisposable(geometry);
    registerDisposable(material);

    // The hook returns the registered object for easy chaining
    const mesh = registerDisposable(new THREE.Mesh(geometry, material));

    // Objects will be automatically disposed when component unmounts
    // No manual cleanup required in the useEffect return function
  }, [registerDisposable]);

  return <mesh />;
};
```

**Key Features:**

- Automatically disposes objects when component unmounts
- Supports all THREE.js disposable types (geometries, materials, textures, etc.)
- Handles edge cases like objects with invalid dispose methods
- Catches and logs errors during disposal without interrupting the process
- Returns registered objects for convenient method chaining
- Provides a manual disposal function for custom cleanup scenarios
- Exposes a read-only set of tracked disposables for debugging

This hook is critical for maintaining performance and preventing memory leaks, especially in applications with dynamic scene generation.

## Testing Requirements

The project enforces strict testing requirements to ensure reliability and performance:

### Coverage Requirements

- **State management**: 80% coverage
- **Utility functions**: 90% coverage (THREE.js utilities require 100% coverage)
- **React hooks**: 75% coverage
- **Components**: Unit tests for core functionality

### THREE.js Utility Testing

THREE.js utilities, especially those related to memory management, require thorough testing:

- **Disposal utilities**: 100% test coverage, including edge cases
- **Error handling**: Tests must verify graceful handling of failures
- **Performance impact**: Critical utilities should include performance benchmarks

Example test scenarios for `useThreeDisposal`:

- Automatic disposal on component unmount
- Manual disposal trigger
- Error handling for faulty objects
- Proper cleanup of complex object hierarchies
- Memory leak verification

### Running Tests

```bash
# Run all tests
npm run test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Contributing

Please read the [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
