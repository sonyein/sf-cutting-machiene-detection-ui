export type PointId = 'blade' | 'hydraulic' | 'motor' | 'feed'
export type HealthStatus = 'normal' | 'watch' | 'warning' | 'danger'
export type TrendPeriod = '8h' | '24h' | '7d'

export interface Reading {
  timestamp: number
  value: number
}

export interface DiagnosticPoint {
  id: PointId
  number: number
  name: string
  shortName: string
  hi: number
  summary: string
  evidence: string[]
  sensors: string[]
  anchor: { x: number; y: number }
  metrics: { label: string; value: string; unit: string; note: string }[]
  lastInspection: { date: string; action: string; hiAfter: number }
}

export interface EquipmentSnapshot {
  id: string
  name: string
  location: string
  capturedAt: string
  points: DiagnosticPoint[]
  source: 'mock'
}

export type InspectionOutcome = 'resolved' | 'improved' | 'monitoring'
export interface InspectionDraft {
  pointId: PointId
  cause: string
  action: string
  result: string
  outcome: InspectionOutcome
  inspectedOn: string
  notes: string
  hiAfter: number | null
}
export interface InspectionRecord extends InspectionDraft {
  id: string
  createdAt: string
  hiBefore: number
  source: 'mock' | 'user'
}
