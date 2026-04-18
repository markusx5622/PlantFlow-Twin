// ─── PlantFlow Twin — Golden Scenario Fixtures ───
// Three canonical scenarios per spec v1.1.

import { Scenario } from '../engine/types.js';

/**
 * Golden Scenario 1 — Bottling Line
 * 4 stations: Fill → Cap → Label → Package
 * Bottleneck expected at Package (highest effective CT due to low availability).
 */
export const bottlingLine: Scenario = {
  id: 'golden-1-bottling',
  name: 'Bottling Line',
  description: 'A 4-station bottling line with filling, capping, labeling, and packaging.',
  lineModel: {
    id: 'lm-bottling',
    name: 'Bottling Line Model',
    stations: [
      {
        id: 's-fill',
        name: 'Fill',
        cycleTime: 3,
        availability: 0.95,
        defectRate: 0.01,
        maxReworkAttempts: 1,
        capacity: 1,
      },
      {
        id: 's-cap',
        name: 'Cap',
        cycleTime: 2,
        availability: 0.98,
        defectRate: 0.005,
        maxReworkAttempts: 1,
        capacity: 1,
      },
      {
        id: 's-label',
        name: 'Label',
        cycleTime: 2.5,
        availability: 0.97,
        defectRate: 0.02,
        maxReworkAttempts: 2,
        capacity: 1,
      },
      {
        id: 's-package',
        name: 'Package',
        cycleTime: 4,
        availability: 0.90,
        defectRate: 0.005,
        maxReworkAttempts: 0,
        capacity: 1,
      },
    ],
    buffers: [
      { id: 'b-fill-cap', name: 'Fill→Cap', capacity: 10 },
      { id: 'b-cap-label', name: 'Cap→Label', capacity: 8 },
      { id: 'b-label-pkg', name: 'Label→Package', capacity: 12 },
    ],
    shifts: [
      {
        id: 'shift-8h',
        name: '8-hour shift',
        duration: 28800, // 8h
        breaks: [
          { startOffset: 7200, duration: 900 },   // 15 min break at 2h
          { startOffset: 14400, duration: 1800 },  // 30 min lunch at 4h
          { startOffset: 21600, duration: 900 },   // 15 min break at 6h
        ],
      },
    ],
  },
  config: {
    totalDuration: 28800, // 8h
    warmupDuration: 1800,  // 30 min
    numberOfShifts: 1,
  },
};

/**
 * Golden Scenario 2 — Electronic Assembly Cell
 * 5 stations: SMT Place → Reflow Solder → AOI Inspect → ICT Test → Conformal Coat
 * Bottleneck expected at Reflow Solder (long CT = 45s).
 */
export const electronicAssembly: Scenario = {
  id: 'golden-2-electronics',
  name: 'Electronic Assembly Cell',
  description: 'A 5-station PCB assembly cell with SMT, soldering, inspection, testing, and coating.',
  lineModel: {
    id: 'lm-electronics',
    name: 'Electronic Assembly Model',
    stations: [
      {
        id: 's-smt',
        name: 'SMT Place',
        cycleTime: 12,
        availability: 0.92,
        defectRate: 0.03,
        maxReworkAttempts: 2,
        capacity: 1,
      },
      {
        id: 's-reflow',
        name: 'Reflow Solder',
        cycleTime: 45,
        availability: 0.99,
        defectRate: 0.01,
        maxReworkAttempts: 0,
        capacity: 1,
      },
      {
        id: 's-aoi',
        name: 'AOI Inspect',
        cycleTime: 8,
        availability: 0.95,
        defectRate: 0.005,
        maxReworkAttempts: 0,
        capacity: 1,
      },
      {
        id: 's-ict',
        name: 'ICT Test',
        cycleTime: 15,
        availability: 0.93,
        defectRate: 0.02,
        maxReworkAttempts: 1,
        capacity: 1,
      },
      {
        id: 's-coat',
        name: 'Conformal Coat',
        cycleTime: 10,
        availability: 0.97,
        defectRate: 0.005,
        maxReworkAttempts: 0,
        capacity: 1,
      },
    ],
    buffers: [
      { id: 'b-smt-reflow', name: 'SMT→Reflow', capacity: 5 },
      { id: 'b-reflow-aoi', name: 'Reflow→AOI', capacity: 3 },
      { id: 'b-aoi-ict', name: 'AOI→ICT', capacity: 8 },
      { id: 'b-ict-coat', name: 'ICT→Coat', capacity: 5 },
    ],
    shifts: [
      {
        id: 'shift-12h',
        name: '12-hour shift',
        duration: 43200, // 12h
        breaks: [
          { startOffset: 10800, duration: 900 },   // 15 min at 3h
          { startOffset: 21600, duration: 3600 },   // 1h lunch at 6h
          { startOffset: 32400, duration: 900 },   // 15 min at 9h
        ],
      },
    ],
  },
  config: {
    totalDuration: 43200, // 12h
    warmupDuration: 3600,  // 1h
    numberOfShifts: 1,
  },
};

/**
 * Golden Scenario 3 — Pharmaceutical Packaging Line
 * 4 stations: Fill → Seal → Label → Box
 * Fast line with short CTs; bottleneck expected at Box (highest effective CT).
 */
export const pharmaPackaging: Scenario = {
  id: 'golden-3-pharma',
  name: 'Pharmaceutical Packaging Line',
  description: 'A 4-station pharmaceutical packaging line for tablet bottles.',
  lineModel: {
    id: 'lm-pharma',
    name: 'Pharma Packaging Model',
    stations: [
      {
        id: 's-pfill',
        name: 'Fill',
        cycleTime: 1.5,
        availability: 0.96,
        defectRate: 0.005,
        maxReworkAttempts: 0,
        capacity: 1,
      },
      {
        id: 's-seal',
        name: 'Seal',
        cycleTime: 1.8,
        availability: 0.94,
        defectRate: 0.01,
        maxReworkAttempts: 1,
        capacity: 1,
      },
      {
        id: 's-plabel',
        name: 'Label',
        cycleTime: 1.2,
        availability: 0.98,
        defectRate: 0.008,
        maxReworkAttempts: 1,
        capacity: 1,
      },
      {
        id: 's-box',
        name: 'Box',
        cycleTime: 2.0,
        availability: 0.92,
        defectRate: 0.003,
        maxReworkAttempts: 0,
        capacity: 1,
      },
    ],
    buffers: [
      { id: 'b-fill-seal', name: 'Fill→Seal', capacity: 20 },
      { id: 'b-seal-label', name: 'Seal→Label', capacity: 15 },
      { id: 'b-label-box', name: 'Label→Box', capacity: 25 },
    ],
    shifts: [
      {
        id: 'shift-8h-pharma',
        name: '8-hour shift',
        duration: 28800, // 8h
        breaks: [
          { startOffset: 7200, duration: 600 },    // 10 min at 2h
          { startOffset: 14400, duration: 1800 },   // 30 min lunch at 4h
          { startOffset: 21600, duration: 600 },    // 10 min at 6h
        ],
      },
    ],
  },
  config: {
    totalDuration: 28800, // 8h
    warmupDuration: 1200,  // 20 min
    numberOfShifts: 1,
  },
};

export const goldenScenarios = [bottlingLine, electronicAssembly, pharmaPackaging];
