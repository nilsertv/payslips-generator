export function parseMoney(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  // Normalize input to string and remove currency symbol and whitespace
  let s = String(value).replace(/S\/\s*/i, '').trim();

  // Remove any non-digit, non-separators characters (letters, currency, etc.)
  s = s.replace(/[^0-9.,\-]/g, '');

  // Heuristic: decide decimal separator by position of last separator
  // If both comma and dot exist, assume the right-most symbol is the decimal separator
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');

  if (lastComma === -1 && lastDot === -1) {
    // no separators, parse as integer
    const p = parseFloat(s);
    return isNaN(p) ? 0 : p;
  }

  if (lastComma !== -1 && lastDot !== -1) {
    // both exist -> the rightmost is decimal separator, remove thousands separators
    if (lastComma > lastDot) {
      // comma decimal, remove dots
      s = s.replace(/\./g, '');
      s = s.replace(/,/g, '.');
    } else {
      // dot decimal, remove commas
      s = s.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    // only comma present -> could be decimal or thousands; assume decimal if there are 1-2 digits after comma
    const after = s.length - lastComma - 1;
    if (after === 3) {
      // likely thousands separator like 1,400 -> remove commas
      s = s.replace(/,/g, '');
    } else {
      // treat comma as decimal separator
      s = s.replace(/,/g, '.');
    }
  } else if (lastDot !== -1) {
    // only dot present -> similar logic
    const after = s.length - lastDot - 1;
    if (after === 3) {
      // likely thousands separator 1.400 -> remove dots
      s = s.replace(/\./g, '');
    } else {
      // dot is decimal separator, keep it
    }
  }

  const parsed = parseFloat(s);
  return isNaN(parsed) ? 0 : parsed;
}

export function safeString(value: any): string {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2
  }).format(amount);
}

export function extractPeriod(periodString: string): { year: number; month: number } {
  // Try to parse formats like "2024-05", "05/2024", "Mayo 2024"
  // Defaulting to current date if fail, but trying regex first
  const matches = periodString.match(/(\d{1,2})[\/\-](\d{4})|(\d{4})[\/\-](\d{1,2})/);
  
  if (matches) {
    if (matches[1] && matches[2]) {
      return { month: parseInt(matches[1]), year: parseInt(matches[2]) };
    }
    if (matches[3] && matches[4]) {
      return { year: parseInt(matches[3]), month: parseInt(matches[4]) };
    }
  }
  
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}