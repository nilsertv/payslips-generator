import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import PayrollTable from './components/PayrollTable';
import { ProcessedRow, ProcessingStatus } from './types';
import { parseCSV } from './utils/csvProcessor';
import { generateSinglePDF, generateBatchZip } from './utils/pdfGenerator';
import { FileText, DownloadCloud, RefreshCw, AlertTriangle } from 'lucide-react';
import JSZip from 'jszip';

const App: React.FC = () => {
  const [processedData, setProcessedData] = useState<ProcessedRow[] | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setStatus('processing');
    setErrorMessage(null);
    
    try {
      const data = await parseCSV(file);
      setProcessedData(data);
      setStatus('success');
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Error al procesar el archivo.");
      setStatus('error');
    }
  };

  const handleReset = () => {
    setProcessedData(null);
    setStatus('idle');
    setErrorMessage(null);
  };

  const handleDownloadSingle = async (row: ProcessedRow) => {
    const doc = await generateSinglePDF(row.employee, row.payroll);
    doc.save(`Boleta_${row.employee.dni}.pdf`);
  };

  const handleDownloadAll = async () => {
    if (!processedData) return;
    const validRows = processedData.filter(r => r.isValid);
    if (validRows.length === 0) return;

    try {
      const blob = await generateBatchZip(validRows);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Boletas_Pago_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generando ZIP", error);
      alert("Error al generar el archivo ZIP");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-brand-600 p-2 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-800">Generador de Boletas</span>
          </div>
          {status === 'success' && (
            <button 
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-brand-600 flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" /> Nueva Carga
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Generación Automática de Boletas
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            Sube tu archivo CSV de planilla administrativa o asistencial y descarga los PDFs listos para enviar.
          </p>
        </div>

        {/* Error Display */}
        {status === 'error' && errorMessage && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 max-w-2xl mx-auto rounded shadow-sm">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error de procesamiento</h3>
                <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                <button onClick={handleReset} className="mt-2 text-sm font-medium text-red-600 hover:text-red-500 underline">
                  Intentar nuevamente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Area */}
        {status !== 'success' && (
          <FileUpload onFileSelect={handleFileSelect} isProcessing={status === 'processing'} />
        )}

        {/* Loading State */}
        {status === 'processing' && (
           <div className="mt-8 text-center">
             <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-600 mb-2"></div>
             <p className="text-gray-500">Procesando datos...</p>
           </div>
        )}

        {/* Results Section */}
        {status === 'success' && processedData && (
          <div className="animate-fade-in-up">
            {/* Stats Bar */}
            <div className="bg-white p-6 rounded-lg shadow-sm border flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex gap-8">
                <div>
                  <span className="block text-sm font-medium text-gray-500">Total Registros</span>
                  <span className="text-2xl font-bold text-gray-900">{processedData.length}</span>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-500">Válidos</span>
                  <span className="text-2xl font-bold text-green-600">{processedData.filter(d => d.isValid).length}</span>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-500">Con Errores</span>
                  <span className="text-2xl font-bold text-red-600">{processedData.filter(d => !d.isValid).length}</span>
                </div>
              </div>
              
              <button
                onClick={handleDownloadAll}
                disabled={processedData.filter(d => d.isValid).length === 0}
                className="flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-lg hover:bg-brand-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <DownloadCloud className="w-5 h-5" />
                Descargar Todo (.ZIP)
              </button>
            </div>

            {/* Data Table */}
            <PayrollTable rows={processedData} onDownloadSingle={handleDownloadSingle} />
          </div>
        )}
      </main>
      
      <footer className="mt-12 py-6 bg-white border-t text-center text-gray-400 text-sm">
        <p>&copy; {new Date().getFullYear()} RRHH System. Compatible con Planillas Administrativas y Asistenciales.</p>
      </footer>
    </div>
  );
};

export default App;