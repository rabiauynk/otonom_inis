/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const DETECTION_CLASSES = {
  HUMAN: 'İnsan',
  VEHICLE: 'Taşıt',
} as const;

export const GROUND_TYPES = {
  ASPHALT: 'Asfalt',
  SOIL: 'Toprak',
  GRASS: 'Çim',
  WATER: 'Su',
} as const;

export const COLORS = {
  PRIMARY: '#F27D26',
  HUMAN: '#3B82F6',
  VEHICLE: '#F97316',
  BG_DARK: '#0A0A0B',
  CARD_DARK: '#0F0F12',
  BORDER: '#1F1F23',
} as const;
