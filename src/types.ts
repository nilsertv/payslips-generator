export interface EmployeeData {
  fullName: string;
  employeeId: string;
  dni: string;
  jobTitle: string;
  hireDate: string;
  terminationDate?: string;
  birthDate?: string;
  daysWorked: number;
  vacationDays: number;
  absenceDays: number;
  overtimeHours: number;
  area: string;
  monthlyRemuneration: number;
  pensionSystem: string;
  pensionRegime: 'SNP' | 'SPP';
  periodString: string;
}

export interface PayrollData {
  baseSalary: number;
  remuneracionBasica: number;
  remuneracionVacacional: number;
  horasExtras25: number;
  horasExtras35: number;
  horasExtras100: number;
  asignacionFamiliar: number;
  bonificacionExtra: number;
  bonificacionRegular: number;
  otrosIngresos: number;
  sppAporte: number;
  sppPrima: number;
  sppComision: number;
  sppTotal: number;
  onp: number;
  rentaQuinta: number;
  otrosDescuentos: number;
  tardanzas: number;
  essaludRegular: number;
  gratificacion: number;
  bono30334: number;
  adelantos: number;
  pensionSystem: string;
  pensionRegime: 'SNP' | 'SPP';
  periodString: string;
}

export interface ProcessedRow {
  id: string;
  employee: EmployeeData;
  payroll: PayrollData;
  isValid: boolean;
  errors: string[];
}

export interface ColumnMapping {
  [key: string]: string | undefined;
}

export type ProcessingStatus = 'idle' | 'processing' | 'success' | 'error';