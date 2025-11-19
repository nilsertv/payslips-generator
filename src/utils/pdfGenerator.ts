import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { EmployeeData, PayrollData, ProcessedRow } from '../types';
import { formatCurrency } from './helpers';
import logoUrl from '../assets/logo.png';

// Helper to draw right-aligned text
const drawRightText = (doc: jsPDF, text: string, x: number, y: number) => {
  const textWidth = doc.getTextWidth(text);
  doc.text(text, x - textWidth, y);
};

// Carga una imagen como HTMLImageElement a partir de una URL
const loadImageElement = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
};

export const generateSinglePDF = async (employee: EmployeeData, payroll: PayrollData): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // --- HEADER ---
  // Logo: usar la URL generada por Vite (importada como `logoUrl`) y cargarla como Image
  try {
    const imgEl = await loadImageElement(logoUrl as string);
    const logoX = 10;
    const logoY = 8;
    const maxLogoW = 24; // mm
    const maxLogoH = 24; // mm
    let logoW = maxLogoW;
    let logoH = maxLogoH;
    try {
      // Calcular dimensiones manteniendo el aspect ratio de la imagen
      const ratio = (imgEl.naturalWidth && imgEl.naturalHeight) ? (imgEl.naturalWidth / imgEl.naturalHeight) : 1;
      // Empezar con el ancho máximo y ajustar la altura
      logoW = maxLogoW;
      logoH = logoW / ratio;
      // Si la altura resultante excede el máximo, ajustar por la altura máxima
      if (logoH > maxLogoH) {
        logoH = maxLogoH;
        logoW = logoH * ratio;
      }
      // Redondear a 2 decimales para evitar valores raros
      logoW = Math.round(logoW * 100) / 100;
      logoH = Math.round(logoH * 100) / 100;

      // jsPDF acepta HTMLImageElement; forzamos any si hay incompatibilidades de tipos
      (doc as any).addImage(imgEl, 'PNG', logoX, logoY, logoW, logoH);
      const logoBottom = logoY + logoH;
      if (yPos < logoBottom + 2) yPos = logoBottom + 2;
    } catch (e) {
      // noop si addImage o cálculo falla
    }
  } catch (e) {
    // ignore fallos de carga de imagen
  }
  // Company info centered
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('SERVICIOS ASISTENCIALES SANTA BEATRIZ SAC', pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const addrLine = 'JR.RAMON DAGNINO 227 - JESÚS MARIA (ALT.CUADRA 6 AV. ARENALES) RUC:20566148006 Telefonos :4800-535';
  doc.text(addrLine, pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('BOLETA DE PAGO', pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  doc.setLineWidth(0.6);
  doc.line(10, yPos, 200, yPos);
  // Dar más espacio para evitar solapamientos con la sección de employee info
  yPos += 8;

  // --- EMPLOYEE INFO ---
  const w1 = 40, w2 = 70, w3 = 40;
  doc.setFontSize(8);

  const labelsCol1 = [
    'APELLIDOS Y NOMBRES :',
    'CARGO U OCUPACIÓN:',
    'FECHA DE NACIMIENTO:',
    'DNI:',
    'DIAS LABORADOS:',
    'DIAS DE VACACIONES:',
    'LICENCIAS O SUBSIDIOS:',
    'Horas Extras:',
    'AREA DE TRABAJO:',
  ];

  const valuesCol2 = [
    employee.fullName,
    employee.jobTitle,
    employee.birthDate || '',
    employee.dni,
    employee.daysWorked.toString(),
    employee.vacationDays.toString(),
    employee.absenceDays.toString(),
    '', // Horas Extras empty
    employee.area,
  ];

  const labelsCol3 = [
    'FECHA DE INGRESO:',
    'FECHA DE CESE:',
    'REM.MENSUAL:',
    'CARNET ESSALUD:',
    'DIAS DE FALTAS:',
    'PERIODO DE CÁLCULO:',
    'REGIMEN PENSIÓN:',
    'Horas Ordinarias:',
    'Minutos Ordinarios:',
  ];

  const valuesCol4 = [
    employee.hireDate,
    employee.terminationDate || '',
    formatCurrency(employee.monthlyRemuneration),
    '', // Essalud card
    employee.absenceDays.toString(),
    employee.periodString,
    employee.pensionRegime,
    '', // Ordinary hours
    '', // Ordinary minutes
  ];

  const rows = Math.max(labelsCol1.length, labelsCol3.length);
  for (let i = 0; i < rows; i++) {
    const label1 = labelsCol1[i] || '';
    const val1 = valuesCol2[i] || '';
    const label3 = labelsCol3[i] || '';
    const val3 = valuesCol4[i] || '';

    // Col1 label
    doc.setFont('helvetica', 'bold');
    doc.text(label1, 10, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(val1, 10 + w1, yPos);

    // Col3 label
    doc.setFont('helvetica', 'bold');
    doc.text(label3, 10 + w1 + w2, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(val3, 10 + w1 + w2 + w3, yPos);

    yPos += 6;
  }

  yPos += 5;
  doc.setLineWidth(0.6);
  doc.line(10, yPos, 200, yPos);
  
  // Espacio adicional antes de la tabla de pagos para evitar que la línea divisoria se sobreponga
  yPos += 8;

  // --- PAYMENT DETAILS ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setFillColor(230, 230, 230);
  // Column X coordinates (tuned to match Python layout)
  const col1LabelX = 12; // ingresos label
  const col1ValueRightX = 72; // ingresos value right-aligned end
  const col2LabelX = 80; // descuentos label
  const col2ValueRightX = 140; // descuentos value right-aligned end
  const col3LabelX = 148; // aportaciones label
  const col3ValueRightX = pageWidth - 12; // aportaciones value right-aligned end
  // Draw header background boxes (aligned with column blocks)
  const boxHeight = 7;
  const box1X = col1LabelX - 2;
  const box1W = Math.max(0, col1ValueRightX - box1X);
  const box2X = col2LabelX - 2;
  const box2W = Math.max(0, col2ValueRightX - box2X);
  const box3X = col3LabelX - 2;
  const box3W = Math.max(0, col3ValueRightX - box3X);
    // Draw each header box with explicit fill color to avoid renderer state issues
    doc.setDrawColor(0);
    doc.setTextColor(0, 0, 0);
    if (box1W > 0) {
      doc.setFillColor(230, 230, 230);
      doc.rect(box1X, yPos, box1W, boxHeight, 'F');
      doc.setFillColor(255, 255, 255);
    }
    doc.text('INGRESOS', (col1LabelX + col1ValueRightX) / 2, yPos + 5, { align: 'center' });

    if (box2W > 0) {
      doc.setFillColor(230, 230, 230);
      doc.rect(box2X, yPos, box2W, boxHeight, 'F');
      doc.setFillColor(255, 255, 255);
    }
    doc.text('DESCUENTOS', (col2LabelX + col2ValueRightX) / 2, yPos + 5, { align: 'center' });

    if (box3W > 0) {
      doc.setFillColor(230, 230, 230);
      doc.rect(box3X, yPos, box3W, boxHeight, 'F');
      doc.setFillColor(255, 255, 255);
    }
    doc.text('APORTACIONES', (col3LabelX + col3ValueRightX) / 2, yPos + 5, { align: 'center' });

    // Ensure fill is back to white and text color black
    doc.setFillColor(255, 255, 255);
    doc.setTextColor(0, 0, 0);
    yPos += boxHeight + 4; // space after header

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  const ingresos = [
    { label: 'REMUNERACIÓN O JORNAL BÁSICO', value: payroll.remuneracionBasica },
    { label: 'REMUNERACIÓN VACACIONAL', value: payroll.remuneracionVacacional },
    { label: 'HORAS EXTRAS 25%', value: payroll.horasExtras25 },
    { label: 'HORAS EXTRAS 35%', value: payroll.horasExtras35 },
    { label: 'HORAS EXTRAS 100%', value: payroll.horasExtras100 },
    { label: 'ASIGNACIÓN FAMILIAR', value: payroll.asignacionFamiliar },
    { label: 'GRATIFICACIÓN', value: payroll.gratificacion },
    { label: 'BONO TEMPORAL LEY 30334', value: payroll.bono30334 },
    { label: 'BONIFICACION EXTRAORDINARIA', value: payroll.bonificacionExtra },
    { label: 'BONIFICACION REGULAR', value: payroll.bonificacionRegular },
    { label: 'OTROS INGRESOS', value: payroll.otrosIngresos },
  ];

  const descuentos = [
    { label: 'ADELANTOS OTORGADOS', value: payroll.adelantos },
    { label: 'DESCUENTO JUDICIAL', value: 0 }, // Not in data
    { label: 'ESSALUD VIDA', value: 0 },
    { label: 'SPP - APORTE OBLIGATORIA', value: payroll.sppAporte },
    { label: 'SPP - PRIMA SEGURO', value: payroll.sppPrima },
    { label: 'SPP - COMISION PORCENTUAL', value: payroll.sppComision },
    { label: 'SISTEMA NACIONAL DE PENSIONES ONP', value: payroll.onp },
    { label: 'RENTA DE QUINTA CATEGORIA', value: payroll.rentaQuinta },
    { label: 'OTROS DESCUENTOS', value: payroll.otrosDescuentos },
    { label: 'TARDANZAS / PERMISOS / FALTAS', value: payroll.tardanzas },
  ];

  const aportes = [
    { label: 'ESSALUD SEGURO REGULAR', value: payroll.essaludRegular },
  ];

  const maxRows = Math.max(ingresos.length, descuentos.length, aportes.length);

  for (let i = 0; i < maxRows; i++) {
    const ing = ingresos[i] || { label: '', value: 0 };
    const desc = descuentos[i] || { label: '', value: 0 };
    const apor = aportes[i] || { label: '', value: 0 };

    // Ingresos: label then right-aligned value at col1ValueRightX
    // Truncate long labels if necessary (keep layout tight)
    const maxLabelWidth = col1ValueRightX - col1LabelX - 4;
    let ingLabel = ing.label;
    if (doc.getTextWidth(ingLabel) > maxLabelWidth) {
      // simple truncation with ellipsis
      while (doc.getTextWidth(ingLabel + '...') > maxLabelWidth && ingLabel.length > 3) {
        ingLabel = ingLabel.slice(0, -1);
      }
      ingLabel = ingLabel + '...';
    }
    doc.text(ingLabel, col1LabelX, yPos);
    drawRightText(doc, ing.value.toFixed(2), col1ValueRightX, yPos);

    // Descuentos
    let descLabel = desc.label;
    const maxDescLabelWidth = col2ValueRightX - col2LabelX - 4;
    if (doc.getTextWidth(descLabel) > maxDescLabelWidth) {
      while (doc.getTextWidth(descLabel + '...') > maxDescLabelWidth && descLabel.length > 3) {
        descLabel = descLabel.slice(0, -1);
      }
      descLabel = descLabel + '...';
    }
    doc.text(descLabel, col2LabelX, yPos);
    drawRightText(doc, desc.value.toFixed(2), col2ValueRightX, yPos);

    // Aportaciones
    // Solo dibujar etiqueta/valor si existe una etiqueta (evita mostrar 0.00 en filas vacías)
    if (apor.label && apor.label.trim() !== '') {
      let aporLabel = apor.label;
      const maxAporLabelWidth = col3ValueRightX - col3LabelX - 4;
      if (doc.getTextWidth(aporLabel) > maxAporLabelWidth) {
        while (doc.getTextWidth(aporLabel + '...') > maxAporLabelWidth && aporLabel.length > 3) {
          aporLabel = aporLabel.slice(0, -1);
        }
        aporLabel = aporLabel + '...';
      }
      doc.text(aporLabel, col3LabelX, yPos);
      drawRightText(doc, apor.value.toFixed(2), col3ValueRightX, yPos);
    }

    yPos += 5; // interlineado reducido para modo landscape
  }

  // Line after rows
  doc.line(10, yPos, 200, yPos);
  yPos += 7;

  // Totals
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const totalIng = ingresos.reduce((sum, item) => sum + item.value, 0);
  const totalDesc = descuentos.reduce((sum, item) => sum + item.value, 0);
  const totalApor = aportes.reduce((sum, item) => sum + item.value, 0);

  doc.text('TOTAL INGRESOS', col1LabelX, yPos);
  drawRightText(doc, totalIng.toFixed(2), col1ValueRightX, yPos);
  doc.text('TOTAL DESCUENTOS', col2LabelX, yPos);
  drawRightText(doc, totalDesc.toFixed(2), col2ValueRightX, yPos);
  doc.text('TOTAL APORTACIONES', col3LabelX, yPos);
  drawRightText(doc, totalApor.toFixed(2), col3ValueRightX, yPos);
  yPos += 7;

  // Line after totals
  doc.line(10, yPos, 200, yPos);
  yPos += 6;

  // Neto
  const neto = totalIng - totalDesc;
  doc.setFillColor(200, 220, 255);
  doc.rect(10, yPos, col2ValueRightX, 10, 'F');
  doc.text('NETO A PAGAR', 15, yPos + 7);
  drawRightText(doc, neto.toFixed(2), col2ValueRightX, yPos + 7);
  yPos += 26;

  // Fecha de emisión
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Lima, ${employee.periodString}`, pageWidth - 10, yPos, { align: 'right' });
  yPos += 24;

  // --- SIGNATURES ---
  doc.setLineWidth(0.5);
  doc.line(20, yPos, 90, yPos);
  doc.setFontSize(8);
  doc.text('Firma y Sello del Empleador', 55, yPos + 5, { align: 'center' });

  doc.line(120, yPos, 190, yPos);
  doc.text('Firma del Trabajador', 155, yPos + 5, { align: 'center' });
  doc.text(`DNI: ${employee.dni}`, 155, yPos + 9, { align: 'center' });

  return doc;
};

export const generateBatchZip = async (rows: ProcessedRow[]) => {
  const zip = new JSZip();
  const folder = zip.folder("Boletas");

  for (const row of rows) {
    if (!row.isValid) continue;
    const doc = await generateSinglePDF(row.employee, row.payroll);
    const pdfData = doc.output('arraybuffer');
    const fileName = `Boleta_${row.employee.dni}_${row.employee.periodString.replace(/\//g, '-')}.pdf`;
    folder?.file(fileName, pdfData);
  }

  return await zip.generateAsync({ type: 'blob' });
};