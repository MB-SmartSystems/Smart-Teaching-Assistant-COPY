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
  
  // Parse Übungen-String zu von/bis Zahlen
  const parseUebungen = (ubungString: string): { von: number; bis: number } => {
    if (!ubungString) return { von: 1, bis: 1 }
    
    const dashMatch = ubungString.match(/(\d+)-(\d+)/)
    if (dashMatch) {
      return { von: parseInt(dashMatch[1]), bis: parseInt(dashMatch[2]) }
    }
    
    const singleMatch = ubungString.match(/(\d+)/)
    if (singleMatch) {
      const num = parseInt(singleMatch[1])
      return { von: num, bis: num }
    }
    
    return { von: 1, bis: 1 }
  }

  const initialUebungen = parseUebungen(student.übung || '')
  const initialUebungen2 = parseUebungen(student.übung2 || '')

  // Lokale Werte (werden erst bei Save übertragen)
  const [localValues, setLocalValues] = useState({
    buch: student.buch,
    seite: student.seite,
    übung: student.übung,
    übungVon: initialUebungen.von as number | string,
    übungBis: initialUebungen.bis as number | string,
    buch2: student.buch2,
    seite2: student.seite2,
    übung2: student.übung2,
    übung2Von: initialUebungen2.von as number | string,
    übung2Bis: initialUebungen2.bis as number | string,
    wichtigerFokus: student.wichtigerFokus,
    aktuelleLieder: student.aktuelleLieder,
    zahlungStatus: student.zahlungStatus,
    hatSchlagzeug: student.hatSchlagzeug
  })

  // Attendance State
  const [attendanceKey, setAttendanceKey] = useState(Date.now())
  const todayAttendance = getTodayAttendance(student.id)
  const attendanceStats = getAttendanceStats(student.id, 30)

  // Update lokale Werte (nicht sofort speichern)
  const updateLocalValue = (field: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  // Seiten +/- Handler 
  const handleSeiteUpdate = (change: number) => {
    const currentValue = parseInt(localValues.seite || '1')
    const newValue = Math.max(1, currentValue + change)
    updateLocalValue('seite', newValue.toString())
  }

  const handleSeite2Update = (change: number) => {
    const currentValue = parseInt(localValues.seite2 || '1')
    const newValue = Math.max(1, currentValue + change)
    updateLocalValue('seite2', newValue.toString())
  }

  // Übungen +/- Handler mit Smart Logic
  const handleUebungUpdate = (field: 'übungVon' | 'übungBis', change: number) => {
    const currentVon = typeof localValues.übungVon === 'string' ? parseInt(localValues.übungVon) || 1 : localValues.übungVon
    const currentBis = typeof localValues.übungBis === 'string' ? parseInt(localValues.übungBis) || 1 : localValues.übungBis
    
    let newVon = currentVon
    let newBis = currentBis
    
    if (field === 'übungVon') {
      newVon = Math.max(1, currentVon + change)
      // Smart Logic: Wenn "von" über "bis" erhöht wird, setze "bis" = "von"
      if (newVon > currentBis) {
        newBis = newVon
      } else {
        newBis = currentBis // "bis" bleibt unverändert
      }
    } else {
      // "bis" kann unabhängig geändert werden, aber nie unter "von"
      newBis = Math.max(currentVon, currentBis + change)
    }
    
    // Format: "von-bis" oder nur "von" wenn gleich
    const ubungString = newVon === newBis ? newVon.toString() : `${newVon}-${newBis}`
    
    setLocalValues(prev => ({ 
      ...prev, 
      übungVon: newVon,
      übungBis: newBis,
      übung: ubungString
    }))
    setHasChanges(true)
  }

  // Übungen 2 Handler 
  const handleUebung2Update = (field: 'übung2Von' | 'übung2Bis', change: number) => {
    const currentVon = typeof localValues.übung2Von === 'string' ? parseInt(localValues.übung2Von) || 1 : localValues.übung2Von
    const currentBis = typeof localValues.übung2Bis === 'string' ? parseInt(localValues.übung2Bis) || 1 : localValues.übung2Bis
    
    let newVon = currentVon
    let newBis = currentBis
    
    if (field === 'übung2Von') {
      newVon = Math.max(1, currentVon + change)
      if (newVon > currentBis) newBis = newVon
    } else {
      newBis = Math.max(currentVon, currentBis + change)
    }
    
    const ubungString = newVon === newBis ? newVon.toString() : `${newVon}-${newBis}`
    
    setLocalValues(prev => ({ 
      ...prev, 
      übung2Von: newVon,
      übung2Bis: newBis,
      übung2: ubungString
    }))
    setHasChanges(true)
  }

  // Speichern aller Änderungen
  const handleSave = async () => {
    setIsSaving(true)
    console.log('🔄 Save gestartet für Schüler:', student.id)
    console.log('🔄 Lokale Werte:', localValues)
    console.log('🔄 Original Werte:', { 
      zahlungStatus: student.zahlungStatus, 
      hatSchlagzeug: student.hatSchlagzeug,
      buch2: student.buch2,
      seite2: student.seite2,
      übung2: student.übung2
    })
    
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
        console.log('💳 Zahlung Update:', localValues.zahlungStatus, '→ Option-ID:', optionId)
        if (optionId) {
          updates.push(updateField(student.id, 'zahlungStatus', optionId))
        } else {
          console.error('❌ Keine Option-ID für Zahlung-Status:', localValues.zahlungStatus)
        }
      }
      if (localValues.hatSchlagzeug !== student.hatSchlagzeug) {
        const optionId = SCHLAGZEUG_OPTIONS[localValues.hatSchlagzeug]
        console.log('🥁 Schlagzeug Update:', localValues.hatSchlagzeug, '→ Option-ID:', optionId)
        if (optionId) {
          updates.push(updateField(student.id, 'hatSchlagzeug', optionId))
        } else {
          console.error('❌ Keine Option-ID für Schlagzeug-Status:', localValues.hatSchlagzeug)
        }
      }

      // Alle Text-Field Updates parallel ausführen
      console.log('🔄 Führe', updates.length, 'Updates aus...')
      await Promise.all(updates)
      
      console.log('✅ Save erfolgreich!')
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
    const resetUebungen = parseUebungen(student.übung || '')
    const resetUebungen2 = parseUebungen(student.übung2 || '')
    
    setLocalValues({
      buch: student.buch,
      seite: student.seite,
      übung: student.übung,
      übungVon: resetUebungen.von as number | string,
      übungBis: resetUebungen.bis as number | string,
      buch2: student.buch2,
      seite2: student.seite2,
      übung2: student.übung2,
      übung2Von: resetUebungen2.von as number | string,
      übung2Bis: resetUebungen2.bis as number | string,
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
    'unbekannt': 3200,
    'Paypal': 3241,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}>
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}>
        
        {/* Header - Modern Design */}
        <div className="flex items-center justify-between p-6 border-b" style={{ 
          borderColor: 'var(--border-light)', 
          background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))'
        }}>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {student.vorname} {student.nachname}
            </h2>
            <div className="flex items-center gap-4 mt-2 text-white/90">
              <span>📅 {student.unterrichtstag} {student.unterrichtszeit}</span>
              {student.anfrageStatus && (
                <span className="badge badge-success">{student.anfrageStatus}</span>
              )}
            </div>
            {student.monatlicherbetrag && (
              <p className="text-white/80 text-sm mt-1">
                💰 {student.monatlicherbetrag}€ / Monat
              </p>
            )}
          </div>
          
          <div className="flex gap-3">
            {hasChanges && (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn-primary bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? '💾 Speichere...' : '💾 Speichern'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="btn-secondary"
                >
                  ❌ Abbrechen
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="btn-secondary bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-600/30"
            >
              ✕ Schließen
            </button>
          </div>
        </div>

        <div className="p-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          
          {/* Buch 1 - Modern Card */}
          <div className="card-compact mb-6">
            <h3 className="font-semibold mb-4 text-lg flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              📖 Buch
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Buch</label>
                <BookDropdown 
                  currentBook={localValues.buch}
                  onBookChange={(book) => updateLocalValue('buch', book)}
                  isEditing={true}
                  onToggleEdit={() => {}}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Seite</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSeiteUpdate(-1)}
                    className="btn-secondary w-10 h-10 p-0 text-lg font-bold"
                  >
                    −
                  </button>
                  <input
                    type="text"
                    value={localValues.seite}
                    onChange={(e) => {
                      updateLocalValue('seite', e.target.value)
                    }}
                    onBlur={(e) => {
                      const value = Math.max(1, parseInt(e.target.value) || 1)
                      updateLocalValue('seite', value.toString())
                    }}
                    className="flex-1 text-center font-semibold text-lg py-2 rounded-lg border-none outline-none"
                    style={{ 
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      border: `1px solid var(--border-light)`
                    }}
                  />
                  <button
                    onClick={() => handleSeiteUpdate(1)}
                    className="btn-secondary w-10 h-10 p-0 text-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Übung</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {/* Von */}
                    <div className="flex-1">
                      <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Von</div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUebungUpdate('übungVon', -1)}
                          className="btn-secondary w-8 h-8 p-0 text-sm font-bold"
                        >
                          −
                        </button>
                        <input
                          type="text"
                          value={localValues.übungVon}
                          onChange={(e) => {
                            setLocalValues(prev => ({ 
                              ...prev, 
                              übungVon: e.target.value === '' ? '' : (parseInt(e.target.value) || prev.übungVon)
                            }))
                            setHasChanges(true)
                          }}
                          onBlur={(e) => {
                            const newVon = Math.max(1, parseInt(e.target.value) || 1)
                            const currentBis = typeof localValues.übungBis === 'string' ? parseInt(localValues.übungBis) || 1 : localValues.übungBis
                            const newBis = Math.max(newVon, currentBis)
                            const ubungString = newVon === newBis ? newVon.toString() : `${newVon}-${newBis}`
                            
                            setLocalValues(prev => ({ 
                              ...prev, 
                              übungVon: newVon,
                              übungBis: newBis,
                              übung: ubungString
                            }))
                            setHasChanges(true)
                          }}
                          className="flex-1 text-center font-semibold py-1 rounded border-none outline-none"
                          style={{ 
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            border: `1px solid var(--border-light)`
                          }}
                        />
                        <button
                          onClick={() => handleUebungUpdate('übungVon', 1)}
                          className="btn-secondary w-8 h-8 p-0 text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Bis */}
                    <div className="flex-1">
                      <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Bis</div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUebungUpdate('übungBis', -1)}
                          className="btn-secondary w-8 h-8 p-0 text-sm font-bold"
                        >
                          −
                        </button>
                        <input
                          type="text"
                          value={localValues.übungBis}
                          onChange={(e) => {
                            setLocalValues(prev => ({ 
                              ...prev, 
                              übungBis: e.target.value === '' ? '' : (parseInt(e.target.value) || prev.übungBis)
                            }))
                            setHasChanges(true)
                          }}
                          onBlur={(e) => {
                            const currentVon = typeof localValues.übungVon === 'string' ? parseInt(localValues.übungVon) || 1 : localValues.übungVon
                            const newBis = Math.max(currentVon, parseInt(e.target.value) || currentVon)
                            const ubungString = currentVon === newBis ? currentVon.toString() : `${currentVon}-${newBis}`
                            
                            setLocalValues(prev => ({ 
                              ...prev, 
                              übungBis: newBis,
                              übung: ubungString
                            }))
                            setHasChanges(true)
                          }}
                          className="flex-1 text-center font-semibold py-1 rounded border-none outline-none"
                          style={{ 
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            border: `1px solid var(--border-light)`
                          }}
                        />
                        <button
                          onClick={() => handleUebungUpdate('übungBis', 1)}
                          className="btn-secondary w-8 h-8 p-0 text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                    💡 Ergebnis: Übungen {localValues.übungVon === localValues.übungBis ? localValues.übungVon : `${localValues.übungVon} bis ${localValues.übungBis}`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Buch 2 - Modern Card */}
          <div className="card-compact mb-6">
            <h3 className="font-semibold mb-4 text-lg flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              📚 Buch 2
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Buch 2</label>
                <BookDropdown 
                  currentBook={localValues.buch2}
                  onBookChange={(book) => updateLocalValue('buch2', book)}
                  isEditing={true}
                  onToggleEdit={() => {}}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Seite 2</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSeite2Update(-1)}
                    className="btn-secondary w-10 h-10 p-0 text-lg font-bold"
                  >
                    −
                  </button>
                  <input
                    type="text"
                    value={localValues.seite2}
                    onChange={(e) => {
                      updateLocalValue('seite2', e.target.value)
                    }}
                    onBlur={(e) => {
                      const value = Math.max(1, parseInt(e.target.value) || 1)
                      updateLocalValue('seite2', value.toString())
                    }}
                    className="flex-1 text-center font-semibold text-lg py-2 rounded-lg border-none outline-none"
                    style={{ 
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      border: `1px solid var(--border-light)`
                    }}
                  />
                  <button
                    onClick={() => handleSeite2Update(1)}
                    className="btn-secondary w-10 h-10 p-0 text-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Übung 2</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {/* Von */}
                    <div className="flex-1">
                      <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Von</div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUebung2Update('übung2Von', -1)}
                          className="btn-secondary w-8 h-8 p-0 text-sm font-bold"
                        >
                          −
                        </button>
                        <input
                          type="text"
                          value={localValues.übung2Von}
                          onChange={(e) => {
                            setLocalValues(prev => ({ 
                              ...prev, 
                              übung2Von: e.target.value === '' ? '' : (parseInt(e.target.value) || prev.übung2Von)
                            }))
                            setHasChanges(true)
                          }}
                          onBlur={(e) => {
                            const newVon = Math.max(1, parseInt(e.target.value) || 1)
                            const currentBis = typeof localValues.übung2Bis === 'string' ? parseInt(localValues.übung2Bis) || 1 : localValues.übung2Bis
                            const newBis = Math.max(newVon, currentBis)
                            const ubungString = newVon === newBis ? newVon.toString() : `${newVon}-${newBis}`
                            
                            setLocalValues(prev => ({ 
                              ...prev, 
                              übung2Von: newVon,
                              übung2Bis: newBis,
                              übung2: ubungString
                            }))
                            setHasChanges(true)
                          }}
                          className="flex-1 text-center font-semibold py-1 rounded border-none outline-none"
                          style={{ 
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            border: `1px solid var(--border-light)`
                          }}
                        />
                        <button
                          onClick={() => handleUebung2Update('übung2Von', 1)}
                          className="btn-secondary w-8 h-8 p-0 text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Bis */}
                    <div className="flex-1">
                      <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Bis</div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUebung2Update('übung2Bis', -1)}
                          className="btn-secondary w-8 h-8 p-0 text-sm font-bold"
                        >
                          −
                        </button>
                        <input
                          type="text"
                          value={localValues.übung2Bis}
                          onChange={(e) => {
                            setLocalValues(prev => ({ 
                              ...prev, 
                              übung2Bis: e.target.value === '' ? '' : (parseInt(e.target.value) || prev.übung2Bis)
                            }))
                            setHasChanges(true)
                          }}
                          onBlur={(e) => {
                            const currentVon = typeof localValues.übung2Von === 'string' ? parseInt(localValues.übung2Von) || 1 : localValues.übung2Von
                            const newBis = Math.max(currentVon, parseInt(e.target.value) || currentVon)
                            const ubungString = currentVon === newBis ? currentVon.toString() : `${currentVon}-${newBis}`
                            
                            setLocalValues(prev => ({ 
                              ...prev, 
                              übung2Bis: newBis,
                              übung2: ubungString
                            }))
                            setHasChanges(true)
                          }}
                          className="flex-1 text-center font-semibold py-1 rounded border-none outline-none"
                          style={{ 
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            border: `1px solid var(--border-light)`
                          }}
                        />
                        <button
                          onClick={() => handleUebung2Update('übung2Bis', 1)}
                          className="btn-secondary w-8 h-8 p-0 text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                    💡 Ergebnis: Übungen {localValues.übung2Von === localValues.übung2Bis ? localValues.übung2Von : `${localValues.übung2Von} bis ${localValues.übung2Bis}`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Wichtiger Fokus */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3" style={{ color: '#ffffff' }}>🎯 Wichtiger Fokus</h3>
            <textarea
              value={localValues.wichtigerFokus}
              onChange={(e) => updateLocalValue('wichtigerFokus', e.target.value)}
              className="w-full p-3 rounded border text-white bg-gray-800 border-gray-600 focus:border-blue-500"
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
              className="w-full p-3 rounded border text-white bg-gray-800 border-gray-600 focus:border-blue-500"
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
                        backgroundColor: status === 'ja' ? '#10b981' :
                                       status === 'nein' ? '#ef4444' :
                                       status === 'Paypal' ? '#3b82f6' : '#f59e0b',
                        color: 'white' 
                      }
                    : { backgroundColor: '#374151', color: '#ffffff', border: '1px solid #4b5563' }}
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
                        backgroundColor: status === 'Ja' ? '#10b981' :
                                       status === 'Nein' ? '#ef4444' : '#f59e0b',
                        color: 'white' 
                      }
                    : { backgroundColor: '#374151', color: '#ffffff', border: '1px solid #4b5563' }}
                >
                  {status.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Anwesenheit - Vereinfacht */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3" style={{ color: '#ffffff' }}>📅 Anwesenheit Heute</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {(['krank_abgemeldet', 'schulfrei', 'nicht_erschienen'] as AttendanceStatus[]).map(status => (
                <button
                  key={status}
                  onClick={() => handleAttendanceUpdate(status)}
                  className={todayAttendance?.status === status
                    ? 'font-medium py-3 px-4 rounded-lg shadow-md text-white text-sm'
                    : 'font-medium py-3 px-4 rounded-lg transition-colors text-sm'}
                  style={todayAttendance?.status === status
                    ? { backgroundColor: getStatusColor(status), color: 'white' }
                    : { backgroundColor: '#374151', color: '#ffffff', border: '1px solid #4b5563' }}
                >
                  {getStatusText(status)}
                </button>
              ))}
            </div>
            <div className="mt-3 text-sm" style={{ color: '#9ca3af' }}>
              💡 Standard: Erschienen (keine Auswahl nötig)
            </div>
          </div>

          {/* Earnings Card */}
          <EarningsCard student={student} />

        </div>
      </div>
    </div>
  )
}