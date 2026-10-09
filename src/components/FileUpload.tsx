import React, { useCallback, useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { PotholeData } from '../types';
import { cn } from '../lib/utils';

interface FileUploadProps {
  onDataLoaded: (data: PotholeData[], fileName: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a valid CSV file.');
      return;
    }

    setError(null);
    setIsParsing(true);

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.toLowerCase().trim().replace(/[\s\W]+/g, '_'),
      complete: (results) => {
        setIsParsing(false);
        if (results.errors.length > 0) {
          console.error('CSV Parsing Errors:', results.errors);
          setError(`Error parsing CSV: ${results.errors[0].message}`);
          return;
        }

        if (!results.data || results.data.length === 0) {
          setError('The CSV file appears to be empty.');
          return;
        }

        // Check if we found at least some recognizable headers
        const firstRow = results.data[0] as any;
        const foundHeaders = Object.keys(firstRow);
        
        const expectedBaseKeys = [
          'altitude', 'longitude', 'gps_status', 'pothole_count', 
          'severity', 'average_confidence', 'frames_with_detection', 
          'time_processing', 'timestamp'
        ];

        const validData: PotholeData[] = results.data
          .filter((row: any) => row && typeof row === 'object' && Object.keys(row).length > 1)
          .map((row: any) => {
            const getVal = (keys: string[], fallback: any = 0) => {
              for (const key of keys) {
                // Try exact match
                if (row[key] !== undefined && row[key] !== null) return row[key];
                
                // Try transformed match
                const transformedKey = key.toLowerCase().replace(/[\s\W]+/g, '_');
                if (row[transformedKey] !== undefined && row[transformedKey] !== null) return row[transformedKey];
                
                // Try fuzzy match (contains)
                const fuzzyMatch = Object.keys(row).find(k => 
                  k.toLowerCase().includes(key.toLowerCase()) || 
                  key.toLowerCase().includes(k.toLowerCase())
                );
                if (fuzzyMatch && row[fuzzyMatch] !== undefined && row[fuzzyMatch] !== null) return row[fuzzyMatch];
              }
              return fallback;
            };

            const toNum = (val: any) => {
              if (typeof val === 'number') return val;
              if (!val) return 0;
              const n = parseFloat(String(val).replace(/[^\d.-]/g, ''));
              return isNaN(n) ? 0 : n;
            };

            return {
              altitude: toNum(getVal(['altitude', 'alt', 'height', 'z', 'elevation', 'elev'], 0)),
              latitude: toNum(getVal(['latitude', 'lat', 'y', 'pos_y'], 0)),
              longitude: toNum(getVal(['longitude', 'long', 'lon', 'x', 'pos_x', 'lng'], 0)),
              gps_status: String(getVal(['gps_status', 'gps', 'status', 'fix', 'gps_fix', 'signal'], 'Unknown')),
              pothole_count: toNum(getVal(['pothole_count', 'count', 'potholes', 'detections', 'num_potholes', 'pothole'], 0)),
              severity: toNum(getVal(['severity', 'sev', 'level', 'grade', 'pothole_severity', 'impact'], 0)),
              average_confidence: toNum(getVal(['average_confidence', 'confidence', 'conf', 'score', 'accuracy', 'prob'], 0)),
              frames_with_detection: toNum(getVal(['frames_with_detection', 'frames', 'detected_frames', 'detection_frames', 'frame_count'], 0)),
              time_processing: toNum(getVal(['time_processing', 'processing_time', 'time', 'latency', 'proc_time', 'duration'], 0)),
              timestamp: getVal(['timestamp', 'time_stamp', 'date', 'recorded_at', 'time', 'dt'], new Date().toISOString()),
            };
          });

        // Heuristic check: if all numeric values are 0, maybe headers are wrong
        const allZeros = validData.every(d => 
          d.pothole_count === 0 && d.severity === 0 && d.average_confidence === 0
        );

        if (validData.length === 0) {
          setError('No valid data rows found. Please check the CSV format.');
        } else if (allZeros && validData.length > 0) {
          setError('Data extracted but all values are zero. This usually means the CSV headers do not match our expected format. Please use the sample CSV as a guide.');
          onDataLoaded(validData, file.name); // Still load it but show warning
        } else {
          onDataLoaded(validData, file.name);
          setError(null);
        }
      },
      error: (err) => {
        setError(`Error reading file: ${err.message}`);
      },
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(processFile);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(processFile);
  };

  const downloadSampleCSV = () => {
    const headers = ['timestamp', 'altitude', 'latitude', 'longitude', 'gps_status', 'pothole_count', 'severity', 'average_confidence', 'frames_with_detection', 'time_processing'];
    const sampleData = [
      ['2024-03-29T10:00:00Z', '1.5', '34.0522', '-118.2437', 'Fixed', '2', '4', '0.95', '45', '32'],
      ['2024-03-29T10:00:02Z', '1.6', '34.0523', '-118.2438', 'Fixed', '0', '0', '0.98', '0', '28'],
      ['2024-03-29T10:00:04Z', '1.5', '34.0524', '-118.2439', 'Searching', '1', '3', '0.82', '30', '41'],
    ];
    const csvContent = [headers, ...sampleData].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "pothole_sample_data.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-12 transition-all duration-200 flex flex-col items-center justify-center gap-4 cursor-pointer",
          isDragging 
            ? "border-blue-500 bg-blue-50/50" 
            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        )}
      >
        <input
          type="file"
          multiple
          accept=".csv"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="p-4 bg-blue-100 rounded-full text-blue-600">
          <Upload size={32} />
        </div>
        
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">
            Drop your CSV files here
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Accepts multiple files for batch processing
          </p>
        </div>

        <button 
          disabled={isParsing}
          className={cn(
            "px-6 py-2 rounded-lg font-medium transition-colors",
            isParsing ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"
          )}
        >
          {isParsing ? 'Processing...' : 'Select Files'}
        </button>
      </div>

      {isParsing && (
        <div className="flex items-center justify-center gap-2 text-blue-600 animate-pulse">
          <div className="w-2 h-2 bg-blue-600 rounded-full" />
          <div className="w-2 h-2 bg-blue-600 rounded-full" />
          <div className="w-2 h-2 bg-blue-600 rounded-full" />
          <span className="text-sm font-medium">Parsing large dataset...</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <FileText size={16} className="text-blue-500" />
            Expected CSV Format
          </h4>
          <button 
            onClick={downloadSampleCSV}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 underline flex items-center gap-1"
          >
            Download Sample
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
          {[
            { label: 'altitude', desc: 'Camera height (m)' },
            { label: 'longitude', desc: 'Relative position' },
            { label: 'gps_status', desc: 'Fixed / Searching' },
            { label: 'pothole_count', desc: 'Number detected' },
            { label: 'severity', desc: 'Scale 1-5' },
            { label: 'confidence', desc: '0.0 - 1.0' },
            { label: 'processing_time', desc: 'Latency (ms)' },
            { label: 'timestamp', desc: 'ISO Date/Time' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
              <code className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-blue-700 font-bold">{item.label}</code>
              <span className="text-[10px] text-gray-400">{item.desc}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-4 italic">
          * Headers are case-insensitive and support common aliases (e.g., "alt" for "altitude").
        </p>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
    </div>
  );
};
