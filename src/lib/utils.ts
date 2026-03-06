import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(amount);
};

export const sortNames = (rowA: any, rowB: any, _columnId: string) => {
  const nameA = (rowA.original.full_name || '').toLowerCase();
  const nameB = (rowB.original.full_name || '').toLowerCase();
  return nameA.localeCompare(nameB);
};

export const sortReceipts = (rowA: any, rowB: any, _columnId: string) => {
  const receiptA = rowA.original.receipt_number || '';
  const receiptB = rowB.original.receipt_number || '';
  return receiptA.localeCompare(receiptB, undefined, { numeric: true, sensitivity: 'base' });
};
