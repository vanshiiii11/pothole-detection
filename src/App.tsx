/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LayoutDashboard, FileUp, Database, Trash2, ChevronRight, Video, FileText } from 'lucide-react';
import { FileUpload } from './components/FileUpload';
import { VideoAnalysis } from './components/VideoAnalysis';
import { Dashboard } from './components/Dashboard';
import { PotholeData, VideoAnalysisResult } from './types';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Dataset {
  id: string;
  name: string;
  data: PotholeData[];
  timestamp: Date;
  type: 'csv' | 'video';
  videoUrl?: string;
}

export default function App() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [mode, setMode] = useState<'csv' | 'video'>('csv');

  const handleDataLoaded = (data: PotholeData[], fileName: string) => {
    const newDataset: Dataset = {
      id: Math.random().toString(36).substr(2, 9),
      name: fileName,
      data,
      timestamp: new Date(),
      type: 'csv',
    };
    setDatasets(prev => [...prev, newDataset]);
    setSelectedDatasetId(newDataset.id);
  };

  const handleVideoAnalysisComplete = (result: VideoAnalysisResult) => {
    const newDataset: Dataset = {
      id: result.id,
      name: result.fileName,
      data: result.data,
      timestamp: new Date(),
      type: 'video',
      videoUrl: result.videoUrl,
    };
    setDatasets(prev => [...prev, newDataset]);
    setSelectedDatasetId(newDataset.id);
  };

  const removeDataset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDatasets(prev => prev.filter(d => d.id !== id));
    if (selectedDatasetId === id) {
      setSelectedDatasetId(null);
    }
  };

  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900 font-sans">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-gray-200 z-20 hidden lg:flex flex-col">
        <div className="p-6 border-bottom border-gray-100">
          <div className="flex items-center gap-3 text-blue-600">
            <div className="p-2 bg-blue-600 text-white rounded-xl">
              <LayoutDashboard size={24} />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-gray-900">PotholeAI</h1>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="px-3 mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Datasets</p>
            {datasets.length > 0 && (
              <button 
                onClick={() => {
                  if (confirm('Are you sure you want to clear all datasets?')) {
                    setDatasets([]);
                    setSelectedDatasetId(null);
                  }
                }}
                className="text-[10px] text-red-500 hover:text-red-600 font-bold uppercase tracking-tight"
              >
                Clear All
              </button>
            )}
          </div>
          
          {datasets.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <Database size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No data uploaded yet</p>
            </div>
          ) : (
            datasets.map((dataset) => (
              <button
                key={dataset.id}
                onClick={() => setSelectedDatasetId(dataset.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                  selectedDatasetId === dataset.id
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={cn(
                    "p-1.5 rounded-lg shrink-0",
                    dataset.type === 'video' ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
                  )}>
                    {dataset.type === 'video' ? <Video size={14} /> : <FileText size={14} />}
                  </div>
                  <span className="truncate">{dataset.name}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 
                    size={14} 
                    className="text-gray-400 hover:text-red-500" 
                    onClick={(e) => removeDataset(dataset.id, e)}
                  />
                </div>
              </button>
            ))
          )}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500">System Status</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-gray-700">Online</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 p-4 md:p-8 lg:p-12">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {!selectedDataset ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center min-h-[70vh] text-center"
              >
                <div className="mb-8">
                  <div className="inline-flex p-4 bg-blue-50 text-blue-600 rounded-3xl mb-6">
                    <LayoutDashboard size={48} />
                  </div>
                  <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Welcome to PotholeAI</h2>
                  <p className="text-lg text-gray-500 mt-4 max-w-lg mx-auto">
                    Upload your detection data or videos to begin analyzing road conditions with precise graphical insights.
                  </p>
                </div>

                <div className="flex items-center gap-4 mb-8 bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm">
                  <button
                    onClick={() => setMode('csv')}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                      mode === 'csv' ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    <FileUp size={18} />
                    CSV Data
                  </button>
                  <button
                    onClick={() => setMode('video')}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                      mode === 'video' ? "bg-purple-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    <Video size={18} />
                    Video Analysis
                  </button>
                </div>

                {mode === 'csv' ? (
                  <FileUpload onDataLoaded={handleDataLoaded} />
                ) : (
                  <VideoAnalysis onAnalysisComplete={handleVideoAnalysisComplete} />
                )}
              </motion.div>
            ) : (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setSelectedDatasetId(null)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                    >
                      <ChevronRight className="rotate-180" size={24} />
                    </button>
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setMode('csv');
                        setSelectedDatasetId(null);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                    >
                      <FileUp size={18} />
                      Upload CSV
                    </button>
                    <button
                      onClick={() => {
                        setMode('video');
                        setSelectedDatasetId(null);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                    >
                      <Video size={18} />
                      Analyze Video
                    </button>
                  </div>
                </div>

                <Dashboard 
                  data={selectedDataset.data} 
                  fileName={selectedDataset.name} 
                  videoUrl={selectedDataset.videoUrl}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
