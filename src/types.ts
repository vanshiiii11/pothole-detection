export interface PotholeData {
  altitude: number;
  latitude: number;
  longitude: number;
  gps_status: string;
  pothole_count: number;
  severity: number;
  average_confidence: number;
  frames_with_detection: number;
  time_processing: number;
  timestamp?: string;
}

export interface VideoAnalysisResult {
  id: string;
  fileName: string;
  videoUrl: string;
  status: 'processing' | 'completed' | 'error';
  data: PotholeData[];
  summary?: DashboardStats;
}

export interface DashboardStats {
  totalPotholes: number;
  avgConfidence: number;
  avgSeverity: number;
  totalFrames: number;
  avgProcessingTime: number;
  maxAltitude: number;
  minAltitude: number;
}
