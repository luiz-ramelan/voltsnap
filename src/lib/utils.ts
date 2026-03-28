import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
  }).format(amount);
}

export function calculateMonthlyKwh(appliances: any[]) {
  const dailyWh = appliances.reduce((acc, app) => {
    return acc + (app.wattage * app.count * app.dailyUsageHours);
  }, 0);
  return (dailyWh / 1000) * 30;
}
