import * as THREE from 'three';
import { initializeConfigurationLoader } from '../../utils/procedural/configurationLoader';
import { BuildingConfig } from '../../utils/procedural/buildingGenerator';
import { BuildingType } from '../../state/BuildingState';

// Define the input type locally for the test file
type ConfigLoaderInput = Record<BuildingType, { roman: BuildingConfig; cyberpunk: BuildingConfig }>;

// Mock fetch for testing
global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    json: () =>
      Promise.resolve({
        buildingTypes: {
          domus: {
            roman: {
              widthRange: [5, 7],
              depthRange: [7, 10],
              heightRange: [3, 4],
              material: {
                color: '#c9b18f',
                roughness: 0.6,
                metalness: 0.1,
              },
            },
            cyberpunk: {
              widthRange: [5, 7],
              depthRange: [7, 10],
              heightRange: [10, 15],
              material: {
                color: '#333344',
                roughness: 0.4,
                metalness: 0.6,
                emissive: '#3377ff',
                emissiveIntensity: 0.2,
              },
            },
          },
          insula: {
            roman: {
              widthRange: [8, 12],
              depthRange: [8, 15],
              heightRange: [5, 8],
              material: {
                color: '#d2c0a0',
                roughness: 0.7,
                metalness: 0.1,
              },
            },
            cyberpunk: {
              widthRange: [8, 12],
              depthRange: [8, 15],
              heightRange: [15, 25],
              material: {
                color: '#444455',
                roughness: 0.5,
                metalness: 0.7,
                emissive: '#ff5533',
                emissiveIntensity: 0.3,
              },
            },
          },
          forum: {
            roman: {
              widthRange: [20, 30],
              depthRange: [20, 30],
              heightRange: [8, 12],
              material: {
                color: '#e5d9c3',
                roughness: 0.5,
                metalness: 0.2,
              },
            },
            cyberpunk: {
              widthRange: [20, 30],
              depthRange: [20, 30],
              heightRange: [30, 40],
              material: {
                color: '#555566',
                roughness: 0.3,
                metalness: 0.8,
                emissive: '#22ffaa',
                emissiveIntensity: 0.4,
              },
            },
          },
          temple: {
            roman: {
              widthRange: [15, 25],
              depthRange: [20, 35],
              heightRange: [10, 15],
              material: {
                color: '#f0e6d2',
                roughness: 0.4,
                metalness: 0.3,
              },
            },
            cyberpunk: {
              widthRange: [15, 25],
              depthRange: [20, 35],
              heightRange: [25, 35],
              material: {
                color: '#666677',
                roughness: 0.2,
                metalness: 0.9,
                emissive: '#ff22aa',
                emissiveIntensity: 0.5,
              },
            },
          },
          bath: {
            roman: {
              widthRange: [18, 28],
              depthRange: [18, 28],
              heightRange: [6, 10],
              material: {
                color: '#e0d5c0',
                roughness: 0.6,
                metalness: 0.2,
              },
            },
            cyberpunk: {
              widthRange: [18, 28],
              depthRange: [18, 28],
              heightRange: [20, 30],
              material: {
                color: '#777788',
                roughness: 0.4,
                metalness: 0.7,
                emissive: '#33aaff',
                emissiveIntensity: 0.3,
              },
            },
          },
          'megacorp-tower': {
            roman: {
              widthRange: [10, 15],
              depthRange: [10, 15],
              heightRange: [5, 8],
              material: {
                color: '#d5c5a5',
                roughness: 0.6,
                metalness: 0.1,
              },
            },
            cyberpunk: {
              widthRange: [10, 15],
              depthRange: [10, 15],
              heightRange: [40, 60],
              material: {
                color: '#222233',
                roughness: 0.2,
                metalness: 0.9,
                emissive: '#00ffff',
                emissiveIntensity: 0.6,
              },
            },
          },
          'residential-stack': {
            roman: {
              widthRange: [8, 12],
              depthRange: [8, 12],
              heightRange: [4, 6],
              material: {
                color: '#c9b18f',
                roughness: 0.7,
                metalness: 0.1,
              },
            },
            cyberpunk: {
              widthRange: [8, 12],
              depthRange: [8, 12],
              heightRange: [30, 45],
              material: {
                color: '#333344',
                roughness: 0.5,
                metalness: 0.6,
                emissive: '#ff3300',
                emissiveIntensity: 0.4,
              },
            },
          },
          'market-hub': {
            roman: {
              widthRange: [15, 20],
              depthRange: [15, 20],
              heightRange: [5, 7],
              material: {
                color: '#d2c0a0',
                roughness: 0.6,
                metalness: 0.1,
              },
            },
            cyberpunk: {
              widthRange: [15, 20],
              depthRange: [15, 20],
              heightRange: [15, 25],
              material: {
                color: '#444455',
                roughness: 0.4,
                metalness: 0.7,
                emissive: '#ffaa00',
                emissiveIntensity: 0.5,
              },
            },
          },
          'data-center': {
            roman: {
              widthRange: [10, 15],
              depthRange: [10, 15],
              heightRange: [4, 6],
              material: {
                color: '#e0d5c0',
                roughness: 0.5,
                metalness: 0.2,
              },
            },
            cyberpunk: {
              widthRange: [10, 15],
              depthRange: [10, 15],
              heightRange: [10, 20],
              material: {
                color: '#555566',
                roughness: 0.3,
                metalness: 0.8,
                emissive: '#00ff99',
                emissiveIntensity: 0.7,
              },
            },
          },
          'entertainment-complex': {
            roman: {
              widthRange: [20, 25],
              depthRange: [20, 25],
              heightRange: [8, 12],
              material: {
                color: '#f0e6d2',
                roughness: 0.4,
                metalness: 0.3,
              },
            },
            cyberpunk: {
              widthRange: [20, 25],
              depthRange: [20, 25],
              heightRange: [20, 30],
              material: {
                color: '#666677',
                roughness: 0.2,
                metalness: 0.9,
                emissive: '#ff00ff',
                emissiveIntensity: 0.8,
              },
            },
          },
        },
        version: '1.0.0',
        lastUpdated: '2025-03-12T12:00:00Z',
      }),
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: function () {
      return this;
    },
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    text: () => Promise.resolve(''),
  } as Response)
);

describe('ConfigurationLoader', () => {
  // Create default configs for testing
  const defaultConfigs = {
    domus: {
      roman: {
        widthRange: [1, 2],
        depthRange: [1, 2],
        heightRange: [1, 2],
        material: new THREE.MeshStandardMaterial({ color: '#ffffff' }),
      },
      cyberpunk: {
        widthRange: [1, 2],
        depthRange: [1, 2],
        heightRange: [1, 2],
        material: new THREE.MeshStandardMaterial({ color: '#000000' }),
      },
    },
    insula: {
      roman: {
        widthRange: [1, 2],
        depthRange: [1, 2],
        heightRange: [1, 2],
        material: new THREE.MeshStandardMaterial({ color: '#ffffff' }),
      },
      cyberpunk: {
        widthRange: [1, 2],
        depthRange: [1, 2],
        heightRange: [1, 2],
        material: new THREE.MeshStandardMaterial({ color: '#000000' }),
      },
    },
    forum: {
      roman: {
        widthRange: [1, 2],
        depthRange: [1, 2],
        heightRange: [1, 2],
        material: new THREE.MeshStandardMaterial({ color: '#ffffff' }),
      },
      cyberpunk: {
        widthRange: [1, 2],
        depthRange: [1, 2],
        heightRange: [1, 2],
        material: new THREE.MeshStandardMaterial({ color: '#000000' }),
      },
    },
    temple: {
      roman: {
        widthRange: [1, 2],
        depthRange: [1, 2],
        heightRange: [1, 2],
        material: new THREE.MeshStandardMaterial({ color: '#ffffff' }),
      },
      cyberpunk: {
        widthRange: [1, 2],
        depthRange: [1, 2],
        heightRange: [1, 2],
        material: new THREE.MeshStandardMaterial({ color: '#000000' }),
      },
    },
    bath: {
      roman: {
        widthRange: [1, 2],
        depthRange: [1, 2],
        heightRange: [1, 2],
        material: new THREE.MeshStandardMaterial({ color: '#ffffff' }),
      },
      cyberpunk: {
        widthRange: [1, 2],
        depthRange: [1, 2],
        heightRange: [1, 2],
        material: new THREE.MeshStandardMaterial({ color: '#000000' }),
      },
    },
    'megacorp-tower': {
      roman: {
        widthRange: [1, 2],
        depthRange: [1, 2],
        heightRange: [1, 2],
        material: new THREE.MeshStandardMaterial({ color: '#ffffff' }),
      },
      cyberpunk: {
        widthRange: [1, 2],
        depthRange: [1, 2],
        heightRange: [1, 2],
        material: new THREE.MeshStandardMaterial({ color: '#000000' }),
      },
    },
    'residential-stack': {
      roman: {
        widthRange: [1, 2],
        depthRange: [1, 2],
        heightRange: [1, 2],
        material: new THREE.MeshStandardMaterial({ color: '#ffffff' }),
      },
      cyberpunk: {
        widthRange: [1, 2],
        depthRange: [1, 2],
        heightRange: [1, 2],
        material: new THREE.MeshStandardMaterial({ color: '#000000' }),
      },
    },
    'data-center': {
      roman: {
        widthRange: [1, 2],
        depthRange: [1, 2],
        heightRange: [1, 2],
        material: new THREE.MeshStandardMaterial({ color: '#ffffff' }),
      },
      cyberpunk: {
        widthRange: [1, 2],
        depthRange: [1, 2],
        heightRange: [1, 2],
        material: new THREE.MeshStandardMaterial({ color: '#000000' }),
      },
    },
    amphitheater: {
      roman: {
        widthRange: [1, 2],
        depthRange: [1, 2],
        heightRange: [1, 2],
        material: new THREE.MeshStandardMaterial({ color: '#ffffff' }),
      },
      cyberpunk: {
        widthRange: [1, 2],
        depthRange: [1, 2],
        heightRange: [1, 2],
        material: new THREE.MeshStandardMaterial({ color: '#000000' }),
      },
    },
    'nano-fabricator': {
      roman: {
        widthRange: [1, 2],
        depthRange: [1, 2],
        heightRange: [1, 2],
        material: new THREE.MeshStandardMaterial({ color: '#ffffff' }),
      },
      cyberpunk: {
        widthRange: [1, 2],
        depthRange: [1, 2],
        heightRange: [1, 2],
        material: new THREE.MeshStandardMaterial({ color: '#000000' }),
      },
    },
    'entertainment-hub': {
      roman: {
        widthRange: [1, 2],
        depthRange: [1, 2],
        heightRange: [1, 2],
        material: new THREE.MeshStandardMaterial({ color: '#ffffff' }),
      },
      cyberpunk: {
        widthRange: [1, 2],
        depthRange: [1, 2],
        heightRange: [1, 2],
        material: new THREE.MeshStandardMaterial({ color: '#000000' }),
      },
    },
  } as Record<BuildingType, { roman: BuildingConfig; cyberpunk: BuildingConfig }>;

  beforeEach(() => {
    // Reset the module between tests
    jest.resetModules();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should initialize with default configurations', () => {
    const loader = initializeConfigurationLoader(defaultConfigs as ConfigLoaderInput);
    const config = loader.getConfiguration('domus', 'roman');

    expect(config.widthRange).toEqual([1, 2]);
    expect(config.material).toBeInstanceOf(THREE.MeshStandardMaterial);
  });

  it('should load configurations from JSON', async () => {
    const loader = initializeConfigurationLoader(defaultConfigs as ConfigLoaderInput);
    await loader.loadConfigurationsFromJSON('/test/path.json');

    expect(global.fetch).toHaveBeenCalledWith('/test/path.json');

    const config = loader.getConfiguration('domus', 'roman');
    expect(config.widthRange).toEqual([5, 7]);
    expect(config.material).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect((config.material as THREE.MeshStandardMaterial).color).toBeDefined();
  });

  it('should fall back to default configurations on error', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() => Promise.reject('Network error'));

    const loader = initializeConfigurationLoader(defaultConfigs as ConfigLoaderInput);
    await loader.loadConfigurationsFromJSON('/test/path.json');

    const config = loader.getConfiguration('domus', 'roman');
    expect(config.widthRange).toEqual([1, 2]);
  });

  it('should serialize configurations to JSON format', () => {
    const loader = initializeConfigurationLoader(defaultConfigs as ConfigLoaderInput);
    const serialized = loader.serializeConfigurations();

    expect(serialized.version).toBeDefined();
    expect(serialized.lastUpdated).toBeDefined();
    expect(serialized.buildingTypes.domus.roman.widthRange).toEqual([1, 2]);
    expect(serialized.buildingTypes.domus.roman.material.color).toBeDefined();
  });

  it('should handle invalid building types by falling back to defaults', () => {
    // Spy on console.warn to verify warning is logged
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const loader = initializeConfigurationLoader(defaultConfigs as ConfigLoaderInput);

    // Use a type assertion to pass an invalid building type
    const invalidType = 'invalid-building' as BuildingType;

    // Ensure this doesn't throw an error
    const config = loader.getConfiguration(invalidType, 'roman');

    // Verify a warning was logged
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(`No configuration found for building type ${invalidType}`)
    );

    // Verify it returned the default config for the first available building type
    expect(config).toBeDefined();
    expect(config.widthRange).toBeDefined();
    expect(config.material).toBeInstanceOf(THREE.MeshStandardMaterial);

    // Clean up spy
    warnSpy.mockRestore();
  });

  it('should handle non-existent building types gracefully', () => {
    const loader = initializeConfigurationLoader(defaultConfigs as ConfigLoaderInput);

    // Create a custom object without all building types
    const partialConfigs = {
      domus: defaultConfigs.domus,
      insula: defaultConfigs.insula,
    } as unknown as ConfigLoaderInput;

    // Override the internal configs with our partial set
    // Using a type assertion to enable test access to private field
    (loader as unknown as { configs: ConfigLoaderInput }).configs = partialConfigs;

    // Try to get a building type that exists in defaults but not in our partial set
    const config = loader.getConfiguration('temple', 'roman');

    // Should fall back to default
    expect(config).toBeDefined();
    expect(config).toEqual(defaultConfigs.temple.roman);
  });

  it('should handle undefined or null building types', () => {
    const loader = initializeConfigurationLoader(defaultConfigs as ConfigLoaderInput);

    // Spy on console.warn
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Using type assertions instead of ts-expect-error
    expect(() =>
      loader.getConfiguration(undefined as unknown as BuildingType, 'roman')
    ).not.toThrow();
    expect(() => loader.getConfiguration(null as unknown as BuildingType, 'roman')).not.toThrow();

    // Verify warnings were logged
    expect(warnSpy).toHaveBeenCalledTimes(2);

    warnSpy.mockRestore();
  });

  // Add specific tests for nano-fabricator building type
  describe('nano-fabricator building type', () => {
    it('should successfully load nano-fabricator default configurations', () => {
      const loader = initializeConfigurationLoader(defaultConfigs as ConfigLoaderInput);
      const romanConfig = loader.getConfiguration('nano-fabricator', 'roman');
      const cyberpunkConfig = loader.getConfiguration('nano-fabricator', 'cyberpunk');

      // Verify the configs were loaded
      expect(romanConfig).toBeDefined();
      expect(cyberpunkConfig).toBeDefined();

      // Check basic properties
      expect(romanConfig.widthRange).toEqual([1, 2]);
      expect(romanConfig.material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(cyberpunkConfig.material).toBeInstanceOf(THREE.MeshStandardMaterial);
    });

    it('should load nano-fabricator configurations from JSON', async () => {
      // Override fetch mock to include nano-fabricator specific data
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          json: () =>
            Promise.resolve({
              buildingTypes: {
                'nano-fabricator': {
                  roman: {
                    widthRange: [12, 18],
                    depthRange: [12, 18],
                    heightRange: [5, 8],
                    material: {
                      color: '#d0c0a8',
                      roughness: 0.6,
                      metalness: 0.2,
                    },
                  },
                  cyberpunk: {
                    widthRange: [12, 18],
                    depthRange: [12, 18],
                    heightRange: [15, 22],
                    material: {
                      color: '#334455',
                      roughness: 0.3,
                      metalness: 0.8,
                      emissive: '#00ffcc',
                      emissiveIntensity: 0.6,
                    },
                    features: {
                      windows: {
                        enabled: true,
                        density: 0.7,
                        size: [1, 1.5],
                        style: 'cyberpunk',
                      },
                    },
                  },
                },
              },
              version: '1.0.0',
              lastUpdated: '2025-03-15T12:00:00Z',
            }),
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          redirected: false,
          type: 'basic',
          url: '',
          clone: function () {
            return this;
          },
          body: null,
          bodyUsed: false,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          blob: () => Promise.resolve(new Blob()),
          formData: () => Promise.resolve(new FormData()),
          text: () => Promise.resolve(''),
        } as Response)
      );

      const loader = initializeConfigurationLoader(defaultConfigs as ConfigLoaderInput);
      await loader.loadConfigurationsFromJSON('/test/nano-fabricator.json');

      // Get the loaded configuration
      const cyberpunkConfig = loader.getConfiguration('nano-fabricator', 'cyberpunk');

      // Verify expected properties from the JSON
      expect(cyberpunkConfig.widthRange).toEqual([12, 18]);
      expect(cyberpunkConfig.heightRange).toEqual([15, 22]);
      expect(cyberpunkConfig.material).toBeInstanceOf(THREE.MeshStandardMaterial);
    });
  });

  // Add specific tests for entertainment-hub building type
  describe('entertainment-hub building type', () => {
    it('should successfully load entertainment-hub default configurations', () => {
      const loader = initializeConfigurationLoader(defaultConfigs as ConfigLoaderInput);
      const romanConfig = loader.getConfiguration('entertainment-hub', 'roman');
      const cyberpunkConfig = loader.getConfiguration('entertainment-hub', 'cyberpunk');

      // Verify the configs were loaded
      expect(romanConfig).toBeDefined();
      expect(cyberpunkConfig).toBeDefined();

      // Check basic properties
      expect(romanConfig.widthRange).toEqual([1, 2]);
      expect(romanConfig.material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(cyberpunkConfig.material).toBeInstanceOf(THREE.MeshStandardMaterial);
    });

    it('should load entertainment-hub configurations from JSON', async () => {
      // Override fetch mock to include entertainment-hub specific data
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          json: () =>
            Promise.resolve({
              buildingTypes: {
                'entertainment-hub': {
                  roman: {
                    widthRange: [20, 30],
                    depthRange: [20, 30],
                    heightRange: [8, 12],
                    material: {
                      color: '#e8d8b8',
                      roughness: 0.5,
                      metalness: 0.2,
                    },
                  },
                  cyberpunk: {
                    widthRange: [20, 30],
                    depthRange: [20, 30],
                    heightRange: [25, 35],
                    material: {
                      color: '#223344',
                      roughness: 0.2,
                      metalness: 0.9,
                      emissive: '#ff33cc',
                      emissiveIntensity: 0.7,
                    },
                    features: {
                      doors: {
                        width: 3,
                        height: 4,
                        position: 'center',
                        style: 'cyberpunk',
                      },
                      decoration: {
                        level: 0.8,
                        style: 'cyberpunk',
                      },
                    },
                  },
                },
              },
              version: '1.0.0',
              lastUpdated: '2025-03-15T12:00:00Z',
            }),
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          redirected: false,
          type: 'basic',
          url: '',
          clone: function () {
            return this;
          },
          body: null,
          bodyUsed: false,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          blob: () => Promise.resolve(new Blob()),
          formData: () => Promise.resolve(new FormData()),
          text: () => Promise.resolve(''),
        } as Response)
      );

      const loader = initializeConfigurationLoader(defaultConfigs as ConfigLoaderInput);
      await loader.loadConfigurationsFromJSON('/test/entertainment-hub.json');

      // Get the loaded configuration
      const cyberpunkConfig = loader.getConfiguration('entertainment-hub', 'cyberpunk');

      // Verify expected properties from the JSON
      expect(cyberpunkConfig.widthRange).toEqual([20, 30]);
      expect(cyberpunkConfig.heightRange).toEqual([25, 35]);
      expect(cyberpunkConfig.material).toBeInstanceOf(THREE.MeshStandardMaterial);
    });
  });

  // Test both new building types together
  describe('combined new building types', () => {
    it('should load and handle both nano-fabricator and entertainment-hub together', async () => {
      // Mock fetch to return both building types
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          json: () =>
            Promise.resolve({
              buildingTypes: {
                'nano-fabricator': {
                  roman: {
                    widthRange: [10, 15],
                    depthRange: [10, 15],
                    heightRange: [4, 6],
                    material: {
                      color: '#d8c8b0',
                      roughness: 0.5,
                      metalness: 0.2,
                    },
                  },
                  cyberpunk: {
                    widthRange: [10, 15],
                    depthRange: [10, 15],
                    heightRange: [12, 18],
                    material: {
                      color: '#445566',
                      roughness: 0.3,
                      metalness: 0.8,
                      emissive: '#00aa77',
                      emissiveIntensity: 0.5,
                    },
                  },
                },
                'entertainment-hub': {
                  roman: {
                    widthRange: [18, 25],
                    depthRange: [18, 25],
                    heightRange: [7, 10],
                    material: {
                      color: '#e0d0b5',
                      roughness: 0.4,
                      metalness: 0.3,
                    },
                  },
                  cyberpunk: {
                    widthRange: [18, 25],
                    depthRange: [18, 25],
                    heightRange: [22, 30],
                    material: {
                      color: '#334455',
                      roughness: 0.2,
                      metalness: 0.9,
                      emissive: '#dd44ff',
                      emissiveIntensity: 0.6,
                    },
                  },
                },
              },
              version: '1.0.0',
              lastUpdated: '2025-03-15T12:00:00Z',
            }),
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          redirected: false,
          type: 'basic',
          url: '',
          clone: function () {
            return this;
          },
          body: null,
          bodyUsed: false,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          blob: () => Promise.resolve(new Blob()),
          formData: () => Promise.resolve(new FormData()),
          text: () => Promise.resolve(''),
        } as Response)
      );

      const loader = initializeConfigurationLoader(defaultConfigs as ConfigLoaderInput);
      await loader.loadConfigurationsFromJSON('/test/new-building-types.json');

      // Test that both configurations were loaded correctly
      const nanoFabRoman = loader.getConfiguration('nano-fabricator', 'roman');
      const nanoFabCyberpunk = loader.getConfiguration('nano-fabricator', 'cyberpunk');
      const entertainmentRoman = loader.getConfiguration('entertainment-hub', 'roman');
      const entertainmentCyberpunk = loader.getConfiguration('entertainment-hub', 'cyberpunk');

      // Verify all configurations are loaded
      expect(nanoFabRoman.widthRange).toEqual([10, 15]);
      expect(nanoFabCyberpunk.heightRange).toEqual([12, 18]);
      expect(entertainmentRoman.widthRange).toEqual([18, 25]);
      expect(entertainmentCyberpunk.heightRange).toEqual([22, 30]);

      // Check that materials were created correctly for all configs
      expect(nanoFabRoman.material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(nanoFabCyberpunk.material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(entertainmentRoman.material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(entertainmentCyberpunk.material).toBeInstanceOf(THREE.MeshStandardMaterial);

      // Verify we can switch between types without issues
      expect(nanoFabCyberpunk.widthRange).not.toEqual(entertainmentCyberpunk.widthRange);
      expect(entertainmentRoman.heightRange).not.toEqual(nanoFabRoman.heightRange);
    });
  });
});
