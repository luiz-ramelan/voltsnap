/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PropertyType = 'HDB' | 'Condo' | 'Landed';

export interface Appliance {
  id: string;
  name: string;
  wattage: number;
  count: number;
  dailyUsageHours: number;
  category: 'cooling' | 'kitchen' | 'laundry' | 'entertainment' | 'lighting' | 'other';
}

export interface RetailerPlan {
  id: string;
  providerName: string;
  planName: string;
  rateCentsPerKwh: number;
  dailyCharge: number;
  contractMonths: number;
}

export interface ConsumptionEstimate {
  monthlyKwhCool: number;
  monthlyKwhHot: number;
  monthlyBillRegulatedCool: number;
  monthlyBillRegulatedHot: number;
}

export interface SavingsScenario {
  id: string;
  name: string;
  description: string;
  apply: (appliances: Appliance[]) => Appliance[];
}

export const DEFAULT_WATTAGE: Record<string, number> = {
  '2-door fridge': 120,
  'aircon 1.5HP': 1350,
  'water heater': 1800,
  'LED bulb': 12,
  'Mac mini': 60,
  'monitor': 50,
  '55-inch TV': 120,
  'Wi-Fi router': 15,
  'laptop': 60,
  'microwave': 800,
  'washing machine': 500,
  'gaming console': 200,
  'air purifier': 50,
  'coffee machine': 1000,
};

export const RETAILER_PLANS: RetailerPlan[] = [
  {
    id: 'sp-regulated',
    providerName: 'SP Group',
    planName: 'Regulated Tariff',
    rateCentsPerKwh: 31.27, // Approximate current rate incl GST
    dailyCharge: 0,
    contractMonths: 0,
  },
  {
    id: 'geneco-24',
    providerName: 'Geneco',
    planName: 'Get It Fixed 24',
    rateCentsPerKwh: 28.80,
    dailyCharge: 0,
    contractMonths: 24,
  },
  {
    id: 'senoko-24',
    providerName: 'Senoko Energy',
    planName: 'LifePower24',
    rateCentsPerKwh: 28.87,
    dailyCharge: 0,
    contractMonths: 24,
  },
  {
    id: 'pacificlight-12',
    providerName: 'PacificLight',
    planName: 'Sunny Side Up 12',
    rateCentsPerKwh: 29.10,
    dailyCharge: 0,
    contractMonths: 12,
  },
  {
    id: 'keppel-24',
    providerName: 'Keppel Electric',
    planName: 'Fixed Power 24',
    rateCentsPerKwh: 28.90,
    dailyCharge: 0,
    contractMonths: 24,
  }
];
