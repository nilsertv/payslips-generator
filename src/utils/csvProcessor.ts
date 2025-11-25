import Papa from 'papaparse';
import { EmployeeData, PayrollData, ColumnMapping, ProcessedRow } from '../types';
import { parseMoney, safeString, extractPeriod } from './helpers';

// Configuration for column detection based on prompt
const COLUMN_VARIANTS = {
  fullName: ['APELLIDOS Y NOMBRES', 'NOMBRES Y APELLIDOS', 'TRABAJADOR'],
  dni: ['DNI', 'DOCUMENTO'],
  jobTitle: ['CARGO U OCUPACIÓN', 'CARGO', 'OCUPACION'],
  area: ['AREA DE TRABAJO', 'AREA', 'DEPARTAMENTO'],
  hireDate: ['FECHA DE INGRESO', 'F. INGRESO'],
  terminationDate: ['FECHA DE CESE', 'F. CESE'],
  birthDate: ['FECHA DE NACIMIENTO', 'F. NACIMIENTO'],
  period: ['PERIODO DE CÁLCULO', 'PERIODO', 'MES'],
  
  // Income
  baseSalary: ['REMUNERACIÓN O JORNAL BÁSICO', 'BASICO'],
  monthlyRemuneration: ['REM.MENSUAL'],
  vacationRemuneration: ['REMUNERACIÓN VACACIONAL', 'VACACIONES PAGADAS'],
  familyAllowance: ['ASIGNACIÓN FAMILIAR', 'ASIG. FAM.'],
  bonus: ['Bonos', 'BONIFICACIONES'],
  gratificacion: ['GRATIFICACIÓN', 'GRATIFICACION'],
  bono30334: ['BONO TEMPORAL LEY 30334', 'BONO 30334'],
  adelantosIngreso: ['OTROS INGRESOS'], 
  
  // Overtime
  overtimeHours: ['Horas Extras', 'H.Ext.', 'Hrs. Extra'],
  overtime25: ['HORAS EXTRAS 25%', 'H.E. 25%'],
  overtime35: ['HORAS EXTRAS 35%', 'H.E. 35%'],
  overtime100: ['HORAS EXTRAS 100%', 'H.E. 100%'],
  overtime: ['HORAS EXTRAS'],
  
  // Deductions
  afp: ['AFP', 'SISTEMA PENSIONARIO'],
  sppAporte: ['SPP - APORTE OBLIGATORIA', 'AFP APORTE'],
  sppPrima: ['SPP - PRIMA SEGURO', 'AFP PRIMA'],
  sppComision: ['SPP - COMISION PORCENTUAL', 'AFP COMISION'],
  onp: ['SISTEMA NACIONAL DE PENSIONES ONP', 'ONP'],
  incomeTax: ['RENTA DE QUINTA CATEGORIA', 'RENTA 5TA'],
  otherDeductions: ['OTROS DESCUENTOS'],
  tardanzas: ['TARDANZAS', 'DSCTO TARDANZA'],
  adelantos: ['ADELANTOS OTORGADOS', 'ADELANTOS'],
  
  // Contributions
  essalud: ['ESSALUD SEGURO REGULAR', 'ESSALUD'],
  
  // Stats
  daysWorked: ['DIAS LABORADOS', 'DIAS LABORADOS:', 'Dias Lab.', 'Dias Laborados'],
  vacationDays: ['DIAS DE VACACIONES', 'DIAS DE VACACIONES:', 'Días Vac.'],
  absenceDays: ['DIAS DE FALTAS', 'Días de Falta', 'Permisos y Faltas']
};

function findColumn(headers: string[], variants: string[]): string | undefined {
  const normalizedHeaders = headers.map(h => h.trim().toUpperCase());
  for (const variant of variants) {
    const index = normalizedHeaders.indexOf(variant.toUpperCase());
    if (index !== -1) return headers[index];
    
    // Try fuzzy includes if exact match fails
    const found = headers.find(h => h.toUpperCase().includes(variant.toUpperCase()));
    if (found) return found;
  }
  return undefined;
}

function detectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const [key, variants] of Object.entries(COLUMN_VARIANTS)) {
    mapping[key] = findColumn(headers, variants);
  }
  return mapping;
}

export function parseCSV(file: File): Promise<ProcessedRow[]> {
  return new Promise((resolve, reject) => {
    file.text().then((text) => {
      Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: (results: Papa.ParseResult<Record<string, string>>) => {
          try {
            if (!results.meta.fields) {
              throw new Error("No se encontraron columnas en el archivo CSV.");
            }

            const columns = detectColumns(results.meta.fields);
            
            // Basic validation: Need at least Name and DNI
            if (!columns.fullName || !columns.dni) {
               throw new Error("No se detectaron columnas obligatorias (Nombres, DNI). Verifique el formato del archivo.");
            }

            const processedRows: ProcessedRow[] = results.data.map((row: Record<string, string>, index: number) => {
              const errors: string[] = [];
              
              // --- Extraction & Logic ---
              const fullName = safeString(row[columns.fullName!]);
              const dni = safeString(row[columns.dni!]);
              const periodString = safeString(columns.period ? row[columns.period] : '');
              
              if (!fullName) errors.push("Falta Nombre");
              if (!dni) errors.push("Falta DNI");
              
              // Validar periodo obligatorio
              if (!periodString || periodString.trim() === '') {
                errors.push("Falta periodo de cálculo");
              }

              const periodResult = extractPeriod(periodString);
              if (!periodResult.isValid && periodString.trim() !== '') {
                errors.push("Formato de periodo inválido");
              }
              const { month } = periodResult;

              // Money Parsing
              const baseSalary = parseMoney(columns.baseSalary ? row[columns.baseSalary] : 0);
              const monthlyRemuneration = parseMoney(columns.monthlyRemuneration ? row[columns.monthlyRemuneration] : 0);
              const vacationRemuneration = parseMoney(columns.vacationRemuneration ? row[columns.vacationRemuneration] : 0);
              const familyAllowance = parseMoney(columns.familyAllowance ? row[columns.familyAllowance] : 0);
              const bonus = parseMoney(columns.bonus ? row[columns.bonus] : 0);
              const gratificacion = (month === 7 || month === 12) ? parseMoney(columns.gratificacion ? row[columns.gratificacion] : 0) : 0;
              const bono30334 = (month === 7 || month === 12) ? parseMoney(columns.bono30334 ? row[columns.bono30334] : 0) : 0;
              const adelantos = (month === 7 || month === 12) ? parseMoney(columns.adelantos ? row[columns.adelantos] : 0) : 0;

              const overtime25 = parseMoney(columns.overtime25 ? row[columns.overtime25] : 0);
              const overtime35 = parseMoney(columns.overtime35 ? row[columns.overtime35] : 0);
              const overtime100 = parseMoney(columns.overtime100 ? row[columns.overtime100] : 0);
              const overtimeGeneric = parseMoney(columns.overtime ? row[columns.overtime] : 0);

              const horasExtras25 = overtime25 || overtimeGeneric; 
              const horasExtras35 = overtime35;
              const horasExtras100 = overtime100;
              
              // Parse overtime hours from CSV column (for employee info display)
              const overtimeHoursValue = parseMoney(columns.overtimeHours ? row[columns.overtimeHours] : 0);

              // Deductions
              const sppAporte = parseMoney(columns.sppAporte ? row[columns.sppAporte] : 0);
              const sppPrima = parseMoney(columns.sppPrima ? row[columns.sppPrima] : 0);
              const sppComision = parseMoney(columns.sppComision ? row[columns.sppComision] : 0);
              const sppTotal = sppAporte + sppPrima + sppComision;
              
              const onp = parseMoney(columns.onp ? row[columns.onp] : 0);
              const incomeTax = parseMoney(columns.incomeTax ? row[columns.incomeTax] : 0);
              const otherDeductions = parseMoney(columns.otherDeductions ? row[columns.otherDeductions] : 0);
              const tardanzas = parseMoney(columns.tardanzas ? row[columns.tardanzas] : 0);

              // Contributions
              const essalud = parseMoney(columns.essalud ? row[columns.essalud] : 0);

              // Metadata
              const afpName = safeString(columns.afp ? row[columns.afp] : '');
              let pensionRegime: 'SNP' | 'SPP' = 'SNP';
              if (afpName.toUpperCase().includes('ONP') || onp > 0) {
                pensionRegime = 'SNP';
              } else if (sppTotal > 0 || afpName.toUpperCase().includes('INTEGRA') || afpName.toUpperCase().includes('PRIMA') || afpName.toUpperCase().includes('PROFUTURO') || afpName.toUpperCase().includes('HABITAT')) {
                pensionRegime = 'SPP';
              }

              const daysWorked = parseInt(safeString(columns.daysWorked ? row[columns.daysWorked] : 30)) || 30;
              const vacationDays = parseInt(safeString(columns.vacationDays ? row[columns.vacationDays] : 0)) || 0;
              const absenceDays = parseInt(safeString(columns.absenceDays ? row[columns.absenceDays] : 0)) || 0;

              const otrosIngresos = 0; // Placeholder, as per requirements


              const employeeData: EmployeeData = {
                fullName,
                employeeId: dni,
                dni,
                jobTitle: safeString(columns.jobTitle ? row[columns.jobTitle] : 'EMPLEADO'),
                hireDate: safeString(columns.hireDate ? row[columns.hireDate] : ''),
                terminationDate: safeString(columns.terminationDate ? row[columns.terminationDate] : ''),
                birthDate: safeString(columns.birthDate ? row[columns.birthDate] : ''),
                daysWorked,
                vacationDays,
                absenceDays,
                overtimeHours: overtimeHoursValue, // From CSV column "Horas Extras"
                area: safeString(columns.area ? row[columns.area] : 'GENERAL'),
                monthlyRemuneration: monthlyRemuneration,
                pensionSystem: afpName || pensionRegime,
                pensionRegime,
                periodString: periodString || "MENSUAL"
              };

              const payrollData: PayrollData = {
                baseSalary,
                remuneracionBasica: baseSalary,
                remuneracionVacacional: vacationRemuneration,
                horasExtras25,
                horasExtras35,
                horasExtras100,
                asignacionFamiliar: familyAllowance,
                bonificacionExtra: bonus,
                bonificacionRegular: 0,
                otrosIngresos,
                sppAporte,
                sppPrima,
                sppComision,
                sppTotal: pensionRegime === 'SPP' ? sppTotal : 0,
                onp: pensionRegime === 'SNP' ? onp : 0,
                rentaQuinta: incomeTax,
                otrosDescuentos: otherDeductions,
                tardanzas,
                essaludRegular: essalud,
                gratificacion,
                bono30334,
                adelantos,
                pensionSystem: afpName,
                pensionRegime,
                periodString
              };

              return {
                id: `${dni}-${index}`,
                employee: employeeData,
                payroll: payrollData,
                isValid: errors.length === 0,
                errors
              };
            });

            resolve(processedRows);

          } catch (err: any) {
            reject(err);
          }
        },
        error: (err: any) => {
          reject(err);
        }
      });
    }).catch(reject);
  });
}