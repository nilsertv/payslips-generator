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

// Mapeo de nombres de meses en español a números
const MONTH_NAMES: Record<string, number> = {
  'ENERO': 1,
  'FEBRERO': 2,
  'MARZO': 3,
  'ABRIL': 4,
  'MAYO': 5,
  'JUNIO': 6,
  'JULIO': 7,
  'AGOSTO': 8,
  'SEPTIEMBRE': 9,
  'SETIEMBRE': 9, // Variante común en Perú
  'OCTUBRE': 10,
  'NOVIEMBRE': 11,
  'DICIEMBRE': 12
};

export function extractPeriod(periodString: string): { year: number; month: number; isValid: boolean } {
  // Normalizar el string
  const normalized = periodString.trim().toUpperCase();
  
  // Intentar formato de texto: "JULIO 2025", "FEBRERO 2025", etc.
  const textMatch = normalized.match(/([A-Z]+)\s+(\d{4})/);
  if (textMatch) {
    const monthName = textMatch[1];
    const year = parseInt(textMatch[2]);
    const month = MONTH_NAMES[monthName];
    
    if (month && year >= 1900 && year <= 2100) {
      return { month, year, isValid: true };
    }
  }
  
  // Intentar formatos numéricos: "2024-05", "05/2024", "2024/05", "05-2024"
  const numericMatch = periodString.match(/(\d{1,2})[\/\-](\d{4})|(\d{4})[\/\-](\d{1,2})/);
  
  if (numericMatch) {
    if (numericMatch[1] && numericMatch[2]) {
      const month = parseInt(numericMatch[1]);
      const year = parseInt(numericMatch[2]);
      if (month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        return { month, year, isValid: true };
      }
    }
    if (numericMatch[3] && numericMatch[4]) {
      const year = parseInt(numericMatch[3]);
      const month = parseInt(numericMatch[4]);
      if (month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        return { year, month, isValid: true };
      }
    }
  }
  
  // Si no se pudo extraer, retornar fecha actual con flag inválido
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, isValid: false };
}