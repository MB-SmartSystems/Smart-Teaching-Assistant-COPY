'use client'

import { useState } from 'react'
import { SchülerApp, BaserowAPI } from '@/lib/baserow'
import { 
  calculateEarnings, 
  formatCurrency, 
  formatMonths,
  setStudentStartDate,
  getStudentStartDate,
  EarningsData
} from '@/lib/earnings'

interface EarningsCardProps {
  student: SchülerApp
}

export default function EarningsCard({ student }: EarningsCardProps) {
  // Sync Baserow startdatum to localStorage if not set locally
  if (!getStudentStartDate(student.id) && student.startdatum) {
    setStudentStartDate(student.id, student.startdatum)
  }

  const [showStartDateEdit, setShowStartDateEdit] = useState(false)
  const [newStartDate, setNewStartDate] = useState(getStudentStartDate(student.id) || student.startdatum || '')
  const [earningsData, setEarningsData] = useState<EarningsData | null>(() =>
    calculateEarnings(student)
  )

  const handleStartDateSave = async () => {
    if (newStartDate) {
      setStudentStartDate(student.id, newStartDate)
      const updatedEarnings = calculateEarnings(student)
      setEarningsData(updatedEarnings)
      setShowStartDateEdit(false)
      // Sync to Baserow field_7842 (Startdatum_Unterrichtsvertrag - Original DB)
      try {
        await BaserowAPI.updateStudentField(student.id, 'field_7842', newStartDate)
      } catch (error) {
        console.error('Fehler beim Sync des Startdatums zu Baserow:', error)
      }
    }
  }

  const handleStartDateCancel = () => {
    setNewStartDate(getStudentStartDate(student.id) || '')
    setShowStartDateEdit(false)
  }

  // Wenn kein Monatsbeitrag oder Startdatum, zeige Setup
  if (!student.monatlicherbetrag || parseFloat(student.monatlicherbetrag) <= 0) {
    return (
      <div className="rounded-lg p-5 border-l-4" style={{ 
        backgroundColor: 'var(--bg-secondary)', 
        borderLeftColor: 'var(--border-medium)',
        borderColor: 'var(--border-light)'
      }}>
        <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>💰 Einnahmen</h3>
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Kein Monatsbeitrag eingetragen
        </div>
      </div>
    )
  }

  if (!earningsData) {
    return (
      <div className="rounded-lg p-5 border-l-4" style={{ 
        backgroundColor: 'var(--bg-secondary)', 
        borderLeftColor: 'var(--status-warning)',
        borderColor: 'var(--border-light)'
      }}>
        <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>💰 Einnahmen</h3>
        <div className="space-y-3">
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Startdatum noch nicht gesetzt
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setShowStartDateEdit(true) }}
            className="btn-primary text-sm"
            style={{ position: 'relative', zIndex: 10 }}
          >
            Startdatum festlegen
          </button>
        </div>
      </div>
    )
  }

  // Startdatum bearbeiten
  if (showStartDateEdit) {
    return (
      <div className="rounded-lg p-5 border-l-4" style={{ 
        backgroundColor: 'var(--bg-secondary)', 
        borderLeftColor: 'var(--primary)',
        borderColor: 'var(--border-light)'
      }}>
        <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>💰 Unterrichts-Startdatum</h3>
        <div className="space-y-3">
          <input
            type="date"
            value={newStartDate}
            onChange={(e) => setNewStartDate(e.target.value)}
            className="w-full p-3 border rounded-lg font-medium bg-transparent focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ 
              borderColor: 'var(--border-medium)',
              color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-primary)'
            }}
            autoFocus
          />
          
          <div className="flex gap-2">
            <button
              onClick={handleStartDateSave}
              disabled={!newStartDate}
              className="btn-primary text-sm"
              style={{
                opacity: !newStartDate ? 0.5 : 1,
                cursor: !newStartDate ? 'not-allowed' : 'pointer'
              }}
            >
              Speichern
            </button>
            <button
              onClick={handleStartDateCancel}
              className="btn-secondary text-sm"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Einnahmen-Übersicht
  return (
    <div className="rounded-lg p-5 border-l-4" style={{ 
      backgroundColor: 'var(--bg-secondary)', 
      borderLeftColor: 'var(--primary)',
      borderColor: 'var(--border-light)'
    }}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>💰 Einnahmen</h3>
        <button
          onClick={() => setShowStartDateEdit(true)}
          className="text-sm px-2 py-1 rounded transition-colors"
          style={{ 
            backgroundColor: 'var(--border-light)', 
            color: 'var(--text-secondary)'
          }}
          title="Startdatum bearbeiten"
        >
          ✏️ Startdatum
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">

        {/* Bisher bezahlt */}
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--accent-light)' }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--status-success)' }}>
            {formatCurrency(earningsData.paidAmount)}
          </div>
          <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Bisher bezahlt
          </div>
        </div>

        {/* Gesamteinnahmen */}
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--accent-light)' }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
            {formatCurrency(earningsData.totalEarnings)}
          </div>
          <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Gesamt erwartet
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span style={{ color: 'var(--text-secondary)' }}>Monatlicher Beitrag:</span>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(earningsData.monthlyRate)}
          </span>
        </div>

        <div className="flex justify-between">
          <span style={{ color: 'var(--text-secondary)' }}>Anwesenheitsrate:</span>
          <span className="font-semibold" style={{ 
            color: earningsData.attendanceRate >= 80 ? 'var(--primary)' : 'var(--status-warning)'
          }}>
            {earningsData.attendanceRate}%
          </span>
        </div>

        {earningsData.outstandingAmount > 0 && (
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-secondary)' }}>Ausstehend:</span>
            <span className="font-semibold" style={{ color: 'var(--status-warning)' }}>
              {formatCurrency(earningsData.outstandingAmount)}
            </span>
          </div>
        )}

        <div className="pt-2 border-t" style={{ borderColor: 'var(--border-light)' }}>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Unterricht seit {new Date(earningsData.startDate).toLocaleDateString('de-DE')}
          </div>
        </div>
      </div>
    </div>
  )
}