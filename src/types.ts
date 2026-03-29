/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DetectionType = 'İnsan' | 'Taşıt';
export type GroundType = 'Asfalt' | 'Toprak' | 'Çim' | 'Su';
export type Severity = 'low' | 'medium' | 'high';

export interface Detection {
  id: string;
  type: DetectionType;
  confidence: number;
  timestamp: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Alert {
  id: string;
  message: string;
  severity: Severity;
  timestamp: number;
}

export interface SystemStats {
  humanCount: number;
  vehicleCount: number;
  groundType: GroundType;
  battery: number;
  altitude: number;
  speed: number;
}
