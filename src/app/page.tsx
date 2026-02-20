'use client'

import { useEffect, useState } from 'react'
import { SchülerApp } from '@/lib/baserow'
import { getAutoSwitchStatus, getCountdownText, AutoSwitchResult } from '@/lib/autoSwitch'
import { OfflineStorageManager } from '@/lib/offlineSync'
import { authenticate, isAuthenticated as checkAuth, logout as doLogout, refreshSession } from '@/lib/auth'
import SchülerCard from '@/components/SchülerCard'
import SchülerCardCompact from '@/components/SchülerCardCompact'
import BookStats from '@/components/BookStats'
import EarningsOverview from '@/components/EarningsOverview'
import Login from '@/components/Login'
import { getTodayAttendance } from '@/lib/attendance'
import SongManagement from '@/components/SongManagement'
import FlexKartenDashboard from '@/components/FlexKartenDashboard'
import PreiserhoehungsDashboard from '@/components/PreiserhoehungsDashboard'
import AllStudentsModal from '@/components/AllStudentsModal'

export default function Home() {
  const [students, setStudents] = useState<SchülerApp[]>([])
  const [autoSwitchStatus, setAutoSwitchStatus] = useState<AutoSwitchResult | null>(null)
  const [syncStatus, setSyncStatus] = useState<{ status: string; queueLength: number }>({ status: 'loading', queueLength: 0 })
  const [currentTime, setCurrentTime] = useState<Date | null>(null) // Null bis hydrated
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [showSongManagement, setShowSongManagement] = useState(false)
  const [showAllStudents, setShowAllStudents] = useState(false)
  
  // Authentifizierung
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginError, setLoginError] = useState<string | undefined>()
  const [isAuthChecked, setIsAuthChecked] = useState(false)

  // Auth-Initialisierung
  useEffect(() => {
    setIsClient(true)

    // Auth-Status async prüfen
    checkAuth().then(authenticated => {
      setIsAuthenticated(authenticated)
      setIsAuthChecked(true)
    })
  }, [])

  // App-Daten laden wenn authentifiziert
  useEffect(() => {
    if (!isAuthenticated) return

    setCurrentTime(new Date())

    // App-Daten laden
    const storage = OfflineStorageManager.getInstance()
    storage.initialize().then(() => {
      loadStudents()
    })

    // Zeit alle 30 Sekunden aktualisieren (Performance optimiert)
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
      refreshSession()
    }, 30000)
    
    // Auto-Switch Status alle 60 Sekunden neu berechnen (nicht bei jedem Tick)
    const autoSwitchInterval = setInterval(() => {
      if (students.length > 0) {
        const status = getAutoSwitchStatus(students, 5)
        setAutoSwitchStatus(status)
      }
    }, 60000)

    return () => {
      clearInterval(timeInterval)
      clearInterval(autoSwitchInterval)
    }
  }, [isAuthenticated])

  // Auto-Switch Status bei Änderungen sofort aktualisieren
  useEffect(() => {
    if (isClient && currentTime && students.length > 0) {
      updateAutoSwitch()
    }
  }, [students, isClient, currentTime])

  // Schüler laden
  const loadStudents = async () => {
    try {
      const storage = OfflineStorageManager.getInstance()
      const loadedStudents = await storage.getStudents()
      setStudents(loadedStudents)
      
      const status = await storage.getSyncStatus()
      setSyncStatus(status)
    } catch (error) {
      console.error('Fehler beim Laden der Schüler:', error)
    }
  }

  // Auto-Switch Status berechnen
  const updateAutoSwitch = () => {
    if (students.length === 0 || !currentTime) return
    
    const status = getAutoSwitchStatus(students, 5)
    setAutoSwitchStatus(status)
  }

  // Sync-Status Icon
  const getSyncIcon = () => {
    switch (syncStatus.status) {
      case 'synced': return '✅'
      case 'syncing': return '🔄'
      case 'offline': return '⚠️'
      case 'error': return '❌'
      default: return '⏳'
    }
  }

  // Aktueller deutscher Wochentag - nur wenn Zeit verfügbar
  const getCurrentDay = (): string => {
    try {
      if (!currentTime || !isClient) return ''
      const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
      const dayIndex = currentTime.getDay()
      return days[dayIndex] || ''
    } catch (error) {
      console.warn('getCurrentDay error:', error)
      return ''
    }
  }

  // Login-Handler
  const handleLogin = async (password: string) => {
    const success = await authenticate(password)
    if (success) {
      setIsAuthenticated(true)
      setLoginError(undefined)
    } else {
      setLoginError('Falsches Passwort')
    }
  }

  // Logout-Handler
  const handleLogout = async () => {
    await doLogout()
    setIsAuthenticated(false)
    setStudents([])
    setAutoSwitchStatus(null)
    setSelectedStudent(null)
  }

  // Heutige Schüler - nur wenn Client hydrated und Zeit verfügbar, ausschließlich Absagen
  const todaysStudents = isClient && currentTime ? students.filter(s => {
    // Nur Schüler mit heutigem Unterrichtstag
    if (s.unterrichtstag !== getCurrentDay()) return false
    
    // Prüfen ob Schüler heute abgesagt hat
    const todayAttendance = getTodayAttendance(s.id)
    if (todayAttendance && todayAttendance.status !== 'erschienen') {
      return false // Schüler hat abgesagt / schulfrei / nicht erschienen, nicht anzeigen
    }
    
    return true
  }) : []

  // Login-Screen anzeigen wenn nicht authentifiziert
  if (!isAuthChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="w-8 h-8 border-4 border-t-primary rounded-full animate-spin" style={{ 
          borderColor: 'var(--border-medium)',
          borderTopColor: 'var(--primary)' 
        }}></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} error={loginError} />
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }} className="shadow-lg border-b p-6">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Smart Teaching Assistant
            </h1>
            <p className="text-base font-medium" style={{ color: 'var(--text-secondary)' }}>
              {isClient && currentTime ? (
                <>
                  {getCurrentDay()}, {currentTime.toLocaleDateString('de-DE', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                  })} • {currentTime.toLocaleTimeString('de-DE', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </>
              ) : (
                'Laden...'
              )}
            </p>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-4">
              {/* Sync Status */}
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ 
                  backgroundColor: syncStatus.status === 'synced' ? 'var(--status-success)' :
                                 syncStatus.status === 'syncing' ? 'var(--status-warning)' :
                                 syncStatus.status === 'offline' ? 'var(--status-warning)' :
                                 'var(--status-neutral)'
                }}></div>
                <div className="text-sm">
                  <div className="font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                    {syncStatus.status === 'synced' ? 'Synchronisiert' :
                     syncStatus.status === 'syncing' ? 'Synchronisiert...' :
                     syncStatus.status === 'offline' ? 'Offline' :
                     syncStatus.status === 'error' ? 'Fehler' : 'Laden...'}
                  </div>
                  {syncStatus.queueLength > 0 && (
                    <div className="font-medium" style={{ color: 'var(--text-muted)' }}>
                      {syncStatus.queueLength} ausstehend
                    </div>
                  )}
                </div>
              </div>

              {/* Alle Schüler Button */}
              <button
                onClick={() => setShowAllStudents(true)}
                className="btn-primary text-sm"
                title="Komplette Schülerliste anzeigen"
              >
                📋 Alle Schüler
              </button>

              {/* Lieder-Datenbank Button */}
              <button
                onClick={() => setShowSongManagement(true)}
                className="btn-primary text-sm"
                title="Lieder-Datenbank öffnen"
              >
                🎵 Lieder
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="btn-secondary text-sm"
                title="Abmelden"
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        
        {/* Auto-Switch Status Card - Modern Design */}
        {isClient && autoSwitchStatus && (
          <div className="mb-6">
            {autoSwitchStatus.currentStudent ? (
              <div 
                onClick={() => setSelectedStudent(autoSwitchStatus.currentStudent!.id)}
                className="card cursor-pointer group"
                style={{ 
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                  border: 'none'
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-xl text-white flex items-center gap-2">
                      ▶️ Aktuell: {autoSwitchStatus.currentStudent.vorname} {autoSwitchStatus.currentStudent.nachname}
                    </div>
                    <div className="text-white/90 text-sm font-medium mt-2 flex items-center gap-4">
                      <span>⏰ {autoSwitchStatus.currentStudent.unterrichtszeit}</span>
                      {autoSwitchStatus.currentStudent.monatlicherbetrag && (
                        <span>💰 {autoSwitchStatus.currentStudent.monatlicherbetrag}€</span>
                      )}
                    </div>
                  </div>
                  
                  {autoSwitchStatus.nextStudent && autoSwitchStatus.minutesUntilNext > 0 && (
                    <div className="text-right text-white text-sm bg-white/10 rounded-lg p-3">
                      <div className="font-semibold mb-1">Nächster:</div>
                      <div className="font-medium">{autoSwitchStatus.nextStudent.vorname}</div>
                      <div className="text-xs opacity-90">{getCountdownText(autoSwitchStatus.minutesUntilNext)}</div>
                    </div>
                  )}
                </div>
              </div>
            ) : autoSwitchStatus.isWaitingTime && autoSwitchStatus.nextStudent ? (
              <div 
                onClick={() => setSelectedStudent(autoSwitchStatus.nextStudent!.id)}
                className="card cursor-pointer"
                style={{ 
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  border: 'none'
                }}
              >
                <div className="font-bold text-xl text-white flex items-center gap-2">
                  ⏳ Nächster: {autoSwitchStatus.nextStudent.vorname} {autoSwitchStatus.nextStudent.nachname}
                </div>
                <div className="text-white/90 text-sm font-medium mt-2">
                  {getCountdownText(autoSwitchStatus.minutesUntilNext)} • {autoSwitchStatus.nextStudent.unterrichtszeit}
                </div>
              </div>
            ) : (
              <div className="card" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="font-bold text-xl flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  😴 Kein Unterricht zur aktuellen Zeit
                </div>
                <div className="text-sm font-medium mt-2" style={{ color: 'var(--text-muted)' }}>
                  {todaysStudents.length > 0 
                    ? `${todaysStudents.length} Schüler heute geplant`
                    : `Keine Schüler für ${getCurrentDay()} eingetragen`
                  }
                </div>
              </div>
            )}
          </div>
        )}

        {/* Schüler Detail Modal (Kompakt + Manual Save) */}
        {selectedStudent && students.find(s => s.id === selectedStudent) && (
          <SchülerCardCompact
            student={students.find(s => s.id === selectedStudent)!}
            isOpen={true}
            onClose={() => setSelectedStudent(null)}
          />
        )}

        {/* Heutige Termine (ohne aktuellen Schüler) */}
        {isClient && todaysStudents.filter(s => s.id !== autoSwitchStatus?.currentStudent?.id).length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
              Weitere Termine heute ({todaysStudents.filter(s => s.id !== autoSwitchStatus?.currentStudent?.id).length} Schüler)
            </h2>
            
            <div className="grid gap-4">
              {todaysStudents
                .filter(student => student.id !== autoSwitchStatus?.currentStudent?.id) // Aktuellen Schüler ausschließen
                .sort((a, b) => {
                  const timeA = a.unterrichtszeit.split('-')[0] || '00:00'
                  const timeB = b.unterrichtszeit.split('-')[0] || '00:00'
                  return timeA.localeCompare(timeB)
                })
                .map(student => (
                  <div key={student.id} className={`rounded-lg shadow-md border p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${autoSwitchStatus?.currentStudent?.id === student.id ? 'border-l-4' : 'border-gray-200'}`} style={{
                    borderLeftColor: autoSwitchStatus?.currentStudent?.id === student.id ? 'var(--status-active)' : undefined,
                    backgroundColor: autoSwitchStatus?.currentStudent?.id === student.id ? 'var(--status-active-bg)' : '#354F52'
                  }}>
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="font-bold text-xl mb-1" style={{ color: 'var(--text-primary)' }}>
                          {student.vorname} {student.nachname}
                        </div>
                        <div className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                          {student.unterrichtszeit} • {student.buch || 'Kein Buch'}
                        </div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          Zahlung: <span className="font-semibold" style={{
                            color: student.zahlungStatus === 'ja' ? 'var(--status-success)' :
                                   student.zahlungStatus === 'nein' ? 'var(--status-error)' : 'var(--status-warning)'
                          }}>
                            {student.zahlungStatus || 'unbekannt'}
                          </span>
                          {student.monatlicherbetrag && (
                            <> • {student.monatlicherbetrag}€</>
                          )}
                        </div>
                        {student.wichtigerFokus && (
                          <div className="text-sm mt-1 font-medium" style={{ color: 'var(--primary)' }}>
                            Fokus: {student.wichtigerFokus}
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedStudent(student.id)
                        }}
                        className={autoSwitchStatus?.currentStudent?.id === student.id 
                          ? 'btn-primary ml-4' 
                          : 'btn-secondary ml-4'}
                      >
                        {autoSwitchStatus?.currentStudent?.id === student.id ? 'Aktuell' : 'Details'}
                      </button>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* Einnahmen-Übersicht */}
        {isClient && students.length > 0 && (
          <EarningsOverview students={students} />
        )}

        {/* Flex-Karten Dashboard */}
        {isClient && <FlexKartenDashboard />}

        {/* Preiserhöhungs-Tracking */}
        {isClient && <PreiserhoehungsDashboard />}

        {/* Loading State */}
        {(!isClient || students.length === 0) && (
          <div className="text-center py-16">
            <div className="rounded-lg shadow-lg border p-8 max-w-md mx-auto" style={{ 
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-light)' 
            }}>
              <div className="w-8 h-8 mx-auto mb-4 border-4 border-t-primary rounded-full animate-spin" style={{ 
                borderColor: 'var(--border-medium)',
                borderTopColor: 'var(--primary)' 
              }}></div>
              <div className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Schüler werden geladen
              </div>
              <div className="text-base" style={{ color: 'var(--text-secondary)' }}>
                Verbindung zu Baserow wird hergestellt
              </div>
            </div>
          </div>
        )}

        {/* Bücher-Statistiken */}
        {isClient && <BookStats />}

      </main>

      {/* Lieder-Datenbank Modal */}
      <SongManagement 
        isOpen={showSongManagement}
        onClose={() => setShowSongManagement(false)}
      />

      {/* Alle Schüler Modal */}
      {showAllStudents && (
        <AllStudentsModal
          students={students}
          onClose={() => setShowAllStudents(false)}
        />
      )}
    </div>
  )
}