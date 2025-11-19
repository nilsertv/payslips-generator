import React from 'react';
import { ProcessedRow } from '../types';
import { formatCurrency } from '../utils/helpers';
import { CheckCircle, AlertCircle, Download } from 'lucide-react';

interface PayrollTableProps {
  rows: ProcessedRow[];
  onDownloadSingle: (row: ProcessedRow) => void;
}

const PayrollTable: React.FC<PayrollTableProps> = ({ rows, onDownloadSingle }) => {
  return (
    <div className="mt-8 bg-white shadow-sm border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DNI</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trabajador</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sueldo Básico</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Ingresos</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Neto Pagar</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.slice(0, 50).map((row) => {
              // Calculate quick totals for preview
              const totalIngresos = row.payroll.remuneracionBasica + row.payroll.asignacionFamiliar + row.payroll.horasExtras25 + row.payroll.bonificacionExtra; 
              const totalDescuentos = row.payroll.onp + row.payroll.sppTotal + row.payroll.rentaQuinta;
              const net = totalIngresos - totalDescuentos;

              return (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {row.isValid ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" /> Ok
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800" title={row.errors.join(', ')}>
                        <AlertCircle className="w-3 h-3 mr-1" /> Error
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.employee.dni}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.employee.fullName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.employee.jobTitle}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{formatCurrency(row.employee.monthlyRemuneration)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{formatCurrency(totalIngresos)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-700">{formatCurrency(net)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    {row.isValid && (
                      <button
                        onClick={() => onDownloadSingle(row)}
                        className="text-brand-600 hover:text-brand-900 p-1 rounded hover:bg-brand-50"
                        title="Descargar Boleta"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > 50 && (
        <div className="px-6 py-3 bg-gray-50 text-center text-sm text-gray-500">
          Mostrando 50 de {rows.length} registros
        </div>
      )}
    </div>
  );
};

export default PayrollTable;