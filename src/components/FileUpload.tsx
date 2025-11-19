import React, { useCallback } from 'react';
import { UploadCloud, FileType } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isProcessing }) => {
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isProcessing) return;
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === "text/csv" || file.name.endsWith('.csv')) {
        onFileSelect(file);
      } else {
        alert("Por favor sube un archivo CSV válido.");
      }
    }
  }, [onFileSelect, isProcessing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div 
      className={`w-full max-w-2xl mx-auto mt-8 border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
        isProcessing ? 'opacity-50 cursor-not-allowed border-gray-300' : 'border-brand-300 hover:border-brand-500 hover:bg-brand-50 cursor-pointer'
      }`}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-brand-100 rounded-full">
          <UploadCloud className="w-10 h-10 text-brand-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-700">Sube tu archivo de Planilla (CSV)</h3>
          <p className="text-sm text-gray-500 mt-1">Arrastra y suelta o selecciona un archivo</p>
        </div>
        <label className="relative">
          <span className={`px-6 py-2 bg-brand-600 text-white rounded-lg shadow-sm text-sm font-medium transition hover:bg-brand-700 ${isProcessing ? 'pointer-events-none' : 'cursor-pointer'}`}>
            Seleccionar Archivo
          </span>
          <input 
            type="file" 
            accept=".csv" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleChange}
            disabled={isProcessing}
          />
        </label>
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-4">
          <FileType className="w-4 h-4" />
          <span>Soporta CSV UTF-8 (Máx 10MB)</span>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;