import { 
  resourceAdjustments,
  updateRatesUnified,
  calculateTransitionPeak,
  AdjustmentConfig
} from '../../config/resourceAdjustments';
import { Resources } from '../../state/types';

describe('Resource Adjustments Configuration', () => {
  test('resourceAdjustments should have entries for all resources', () => {
    // Define all expected resources
    const expectedResources: (keyof Resources)[] = [
      'food', 'wood', 'stone', 'metal', 
      'coal', 'electronics', 
      'energy', 'cyberneticComponents', 'data'
    ];
    
    // Ensure all expected resources are defined in adjustments
    expectedResources.forEach(resource => {
      expect(resourceAdjustments).toHaveProperty(resource);
      expect(resourceAdjustments[resource]).toHaveProperty('production');
      expect(resourceAdjustments[resource]).toHaveProperty('consumption');
    });
  });

  test('calculateTransitionPeak should peak at 0.5 progress', () => {
    // Test at various points
    expect(calculateTransitionPeak(0)).toBeCloseTo(0);
    expect(calculateTransitionPeak(0.25)).toBeCloseTo(0.7071, 4); // sin(π/4)
    expect(calculateTransitionPeak(0.5)).toBeCloseTo(1);
    expect(calculateTransitionPeak(0.75)).toBeCloseTo(0.7071, 4); // sin(3π/4)
    expect(calculateTransitionPeak(1)).toBeCloseTo(0);
  });

  test('updateRatesUnified should calculate rates correctly', () => {
    // Create a rates object for testing
    const rates: Partial<Resources> = {
      food: 0,
      stone: 0
    };

    // Test with default operation
    const defaultOp = (base: number, factor: number, progress: number) => base + progress * factor;
    
    // Food production with 0.5 progress
    updateRatesUnified(
      rates,
      'food',
      0.5,
      'production',
      defaultOp
    );
    
    // Food should use its custom operation from config (base * (1 - progress * 0.5))
    // With base = 2 and progress = 0.5, this should be 2 * (1 - 0.5 * 0.5) = 1.5
    expect(rates.food).toBeCloseTo(1.5);

    // Stone production with 0.5 progress
    updateRatesUnified(
      rates, 
      'stone',
      0.5,
      'production',
      defaultOp
    );
    
    // Stone should use its custom operation from config
    // With base = 0.5 and progress = 0.5, this should be 0.5 * (1 - 0.5 * 0.6) = 0.35
    expect(rates.stone).toBeCloseTo(0.35);
  });

  test('all resource configurations should have valid properties', () => {
    // For each resource entry
    Object.entries(resourceAdjustments).forEach(([resourceName, config]) => {
      // Check production config
      expect(config.production).toHaveProperty('base');
      expect(typeof config.production.base).toBe('number');
      
      expect(config.production).toHaveProperty('factor');
      expect(typeof config.production.factor).toBe('number');
      
      // Check consumption config
      expect(config.consumption).toHaveProperty('base');
      expect(typeof config.consumption.base).toBe('number');
      
      expect(config.consumption).toHaveProperty('factor');
      expect(typeof config.consumption.factor).toBe('number');
    });
  });
});