'use client'

import { SchülerApp } from '@/lib/baserow'
import { useState } from 'react'
import { useOfflineSync } from '@/lib/offlineSync'
import BookDropdown from './BookDropdown'
import EarningsCard from './EarningsCard'
import SongSuggestions from './SongSuggestions'
import { 
  getTodayAttendance, 
  setAttendance, 
  getAttendanceStats, 
  getTodayString,
  AttendanceStatus,
  getStatusText,
  getStatusColor
} from '@/lib/attendance'

interface SchülerCardCompactProps {
  student: SchülerApp
  isOpen: boolean
  onClose: () => void
}

export default function SchülerCardCompact({ student, isOpen, onClose }: SchülerCardCompactProps) {
  const { updateField } = useOfflineSync()

  // Local State für alle Änderungen (Manual Save)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  
  // Lokale Werte (werden erst bei Save übertragen)
  const [localValues, setLocalValues] = useState({
    buch: student.buch,
    seite: student.seite,
    übung: student.übung,
    buch2: student.buch2,
    seite2: student.seite2,
    übung2: student.übung2,
    wichtigerFokus: student.wichtigerFokus,
    aktuelleLieder: student.aktuelleLieder,
    zahlungStatus: student.zahlungStatus,
    hatSchlagzeug: student.hatSchlagzeug
  })

  // Attendance State
  const [attendanceKey, setAttendanceKey] = useState(Date.now())
  const todayAttendance = getTodayAttendance(student.id)
  const attendanceStats = getAttendanceStats(student.id, 30)

  // Helper Functions
  const parseUebungen = (ubungString: string) => {
    if (!ubungString) return { von: '', bis: '' }
    const parts = ubungString.split('-')
    if (parts.length === 2) {
      return { von: parts[0].trim(), bis: parts[1].trim() }
    }
    return { von: ubungString, bis: '' }
  }

  const initialUebungen = parseUebungen(localValues.übung || '')
  const initialUebungen2 = parseUebungen(localValues.übung2 || '')

  // Update lokale Werte (nicht sofort speichern)
  const updateLocalValue = (field: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  // Speichern aller Änderungen
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updates = []
      
      // Vergleiche lokale Werte mit ursprünglichen Werten (3-Parameter API)
      if (localValues.buch !== student.buch) {
        updates.push(updateField(student.id, 'buch', localValues.buch))
      }
      if (localValues.seite !== student.seite) {
        updates.push(updateField(student.id, 'seite', localValues.seite))
      }
      if (localValues.übung !== student.übung) {
        updates.push(updateField(student.id, 'übung', localValues.übung))
      }
      if (localValues.buch2 !== student.buch2) {
        updates.push(updateField(student.id, 'buch2', localValues.buch2))
      }
      if (localValues.seite2 !== student.seite2) {
        updates.push(updateField(student.id, 'seite2', localValues.seite2))
      }
      if (localValues.übung2 !== student.übung2) {
        updates.push(updateField(student.id, 'übung2', localValues.übung2))
      }
      if (localValues.wichtigerFokus !== student.wichtigerFokus) {
        updates.push(updateField(student.id, 'wichtigerFokus', localValues.wichtigerFokus))
      }
      if (localValues.aktuelleLieder !== student.aktuelleLieder) {
        updates.push(updateField(student.id, 'aktuelleLieder', localValues.aktuelleLieder))
      }

      // Select-Felder (mit Option-IDs über updateField)
      if (localValues.zahlungStatus !== student.zahlungStatus) {
        const optionId = ZAHLUNG_OPTIONS[localValues.zahlungStatus]
        if (optionId) {
          updates.push(updateField(student.id, 'zahlungStatus', optionId))
        }
      }
      if (localValues.hatSchlagzeug !== student.hatSchlagzeug) {
        const optionId = SCHLAGZEUG_OPTIONS[localValues.hatSchlagzeug]
        if (optionId) {
          updates.push(updateField(student.id, 'hatSchlagzeug', optionId))
        }
      }

      // Alle Text-Field Updates parallel ausführen
      await Promise.all(updates)
      
      setHasChanges(false)
      // Erfolgs-Toast hier
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
      // Error-Toast hier
    } finally {
      setIsSaving(false)
    }
  }

  // Änderungen verwerfen
  const handleCancel = () => {
    setLocalValues({
      buch: student.buch,
      seite: student.seite,
      übung: student.übung,
      buch2: student.buch2,
      seite2: student.seite2,
      übung2: student.übung2,
      wichtigerFokus: student.wichtigerFokus,
      aktuelleLieder: student.aktuelleLieder,
      zahlungStatus: student.zahlungStatus,
      hatSchlagzeug: student.hatSchlagzeug
    })
    setHasChanges(false)
  }

  // Zahlung-Status Update (mit korrekten Option-IDs)
  const ZAHLUNG_OPTIONS: Record<string, number> = {
    'ja': 3198,
    'nein': 3199, 
    'Paypal': 3200,
    'unbekannt': 3201,
  }

  const SCHLAGZEUG_OPTIONS: Record<string, number> = {
    'Ja': 3572,
    'Nein': 3573,
    'Unbekannt': 3574,
  }

  // Attendance Handler
  const handleAttendanceUpdate = async (status: AttendanceStatus) => {
    setAttendance(student.id, getTodayString(), status)
    setAttendanceKey(Date.now()) // Force re-render
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl" style={{ backgroundColor: 'var(--card-background)' }}>
        
        {/* Header mit Save/Cancel */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--primary)' }}>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#ffffff' }}>
              {student.vorname} {student.nachname}
            </h2>
            <p className="text-base font-semibold" style={{ color: '#ffffff' }}>
              {student.unterrichtstag} {student.unterrichtszeit} • {student.anfrageStatus || 'Aktiv'}
            </p>
            {student.monatlicherbetrag && (
              <p className="text-sm" style={{ color: '#cbd5e1' }}>
                Monatsbeitrag: {student.monatlicherbetrag}€
              </p>
            )}
          </div>
          
          <div className="flex gap-3">
            {hasChanges && (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {isSaving ? '💾 Speichere...' : '💾 Speichern'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  ❌ Abbrechen
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
            >
              ✕ Schließen
            </button>
          </div>
        </div>

        <div className="p-6" style={{ backgroundColor: 'var(--primary)' }}>
          
          {/* Buch 1 */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3" style={{ color: '#ffffff' }}>📖 Buch</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>Buch</label>
                <BookDropdown 
                  currentBook={localValues.buch}
                  onBookChange={(book) => updateLocalValue('buch', book)}
                  isEditing={false}
                  onToggleEdit={() => {}}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>Seite</label>
                <input
                  type="text"
                  value={localValues.seite}
                  onChange={(e) => updateLocalValue('seite', e.target.value)}
                  className="w-full p-2 rounded border text-black"
                  placeholder="z.B. 24"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>Übung</label>
                <input
                  type="text"
                  value={localValues.übung}
                  onChange={(e) => updateLocalValue('übung', e.target.value)}
                  className="w-full p-2 rounded border text-black"
                  placeholder="z.B. 1-5"
                />
              </div>
            </div>
          </div>

          {/* Buch 2 */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3" style={{ color: '#ffffff' }}>📚 Buch 2</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>Buch 2</label>
                <BookDropdown 
                  currentBook={localValues.buch2}
                  onBookChange={(book) => updateLocalValue('buch2', book)}
                  isEditing={false}
                  onToggleEdit={() => {}}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>Seite 2</label>
                <input
                  type="text"
                  value={localValues.seite2}
                  onChange={(e) => updateLocalValue('seite2', e.target.value)}
                  className="w-full p-2 rounded border text-black"
                  placeholder="z.B. 12"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>Übung 2</label>
                <input
                  type="text"
                  value={localValues.übung2}
                  onChange={(e) => updateLocalValue('übung2', e.target.value)}
                  className="w-full p-2 rounded border text-black"
                  placeholder="z.B. 1-3"
                />
              </div>
            </div>
          </div>

          {/* Wichtiger Fokus */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3" style={{ color: '#ffffff' }}>🎯 Wichtiger Fokus</h3>
            <textarea
              value={localValues.wichtigerFokus}
              onChange={(e) => updateLocalValue('wichtigerFokus', e.target.value)}
              className="w-full p-3 rounded border text-black"
              rows={3}
              placeholder="Was ist der wichtigste Fokus für diesen Schüler?"
            />
          </div>

          {/* Aktuelle Lieder */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3" style={{ color: '#ffffff' }}>🎵 Aktuelle Lieder</h3>
            <textarea
              value={localValues.aktuelleLieder}
              onChange={(e) => updateLocalValue('aktuelleLieder', e.target.value)}
              className="w-full p-3 rounded border text-black"
              rows={3}
              placeholder="Welche Lieder werden aktuell geübt?"
            />
          </div>

          {/* Zahlung */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3" style={{ color: '#ffffff' }}>💳 Zahlung</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['ja', 'nein', 'Paypal', 'unbekannt'].map(status => (
                <button
                  key={status}
                  onClick={() => updateLocalValue('zahlungStatus', status)}
                  className={localValues.zahlungStatus === status
                    ? 'font-medium py-3 px-4 rounded-lg shadow-md text-white text-sm'
                    : 'font-medium py-3 px-4 rounded-lg transition-colors text-sm'}
                  style={localValues.zahlungStatus === status
                    ? { 
                        backgroundColor: status === 'ja' ? 'var(--status-success)' :
                                       status === 'nein' ? 'var(--status-error)' :
                                       status === 'Paypal' ? 'var(--primary)' : 'var(--status-warning)',
                        color: 'white' 
                      }
                    : { backgroundColor: 'var(--accent-light)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)' }}
                >
                  {status.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Schlagzeug */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3" style={{ color: '#ffffff' }}>🥁 Hat Schlagzeug</h3>
            <div className="grid grid-cols-3 gap-2">
              {['Ja', 'Nein', 'Unbekannt'].map(status => (
                <button
                  key={status}
                  onClick={() => updateLocalValue('hatSchlagzeug', status)}
                  className={localValues.hatSchlagzeug === status
                    ? 'font-medium py-3 px-4 rounded-lg shadow-md text-white text-sm'
                    : 'font-medium py-3 px-4 rounded-lg transition-colors text-sm'}
                  style={localValues.hatSchlagzeug === status
                    ? { 
                        backgroundColor: status === 'Ja' ? 'var(--status-success)' :
                                       status === 'Nein' ? 'var(--status-error)' : 'var(--status-warning)',
                        color: 'white' 
                      }
                    : { backgroundColor: 'var(--accent-light)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)' }}
                >
                  {status.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Anwesenheit */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3" style={{ color: '#ffffff' }}>📅 Anwesenheit Heute</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(['erschienen', 'krank_abgemeldet', 'schulfrei', 'nicht_erschienen'] as AttendanceStatus[]).map(status => (
                <button
                  key={status}
                  onClick={() => handleAttendanceUpdate(status)}
                  className={todayAttendance?.status === status
                    ? 'font-medium py-2 px-3 rounded-lg shadow-md text-white text-sm'
                    : 'font-medium py-2 px-3 rounded-lg transition-colors text-sm'}
                  style={todayAttendance?.status === status
                    ? { backgroundColor: getStatusColor(status), color: 'white' }
                    : { backgroundColor: 'var(--accent-light)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)' }}
                >
                  {getStatusText(status)}
                </button>
              ))}
            </div>
            {todayAttendance && (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => handleAttendanceUpdate('erschienen')}
                  className="text-sm px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                >
                  → Erschienen
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem(`attendance_${student.id}_${getTodayString()}`)
                    setAttendanceKey(Date.now())
                  }}
                  className="text-sm px-3 py-1 rounded bg-gray-600 text-white hover:bg-gray-700"
                >
                  Zurücksetzen
                </button>
              </div>
            )}
          </div>

          {/* Earnings Card */}
          <EarningsCard student={student} />

        </div>
      </div>
    </div>
  )
}