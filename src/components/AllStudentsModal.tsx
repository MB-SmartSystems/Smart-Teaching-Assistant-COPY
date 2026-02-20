'use client'

import { SchülerApp } from '@/lib/baserow'
import { useState } from 'react'

interface AllStudentsModalProps {
  students: SchülerApp[]
  onClose: () => void
}

export default function AllStudentsModal({ students, onClose }: AllStudentsModalProps) {
  const [sortBy, setSortBy] = useState<'name' | 'day' | 'payment' | 'drums'>('name')
  const [filterBy, setFilterBy] = useState<'all' | 'drums-yes' | 'drums-no' | 'drums-unknown'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Sortierung
  const sortedStudents = [...students].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return `${a.vorname} ${a.nachname}`.localeCompare(`${b.vorname} ${b.nachname}`)
      case 'day':
        return (a.unterrichtstag || '').localeCompare(b.unterrichtstag || '')
      case 'payment':
        return (a.zahlungStatus || '').localeCompare(b.zahlungStatus || '')
      case 'drums':
        return (a.hatSchlagzeug || 'Unbekannt').localeCompare(b.hatSchlagzeug || 'Unbekannt')
      default:
        return 0
    }
  })

  // Filter
  const filteredStudents = sortedStudents.filter(student => {
    // Suchfilter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const fullName = `${student.vorname} ${student.nachname}`.toLowerCase()
      if (!fullName.includes(searchLower)) return false
    }

    // Schlagzeug-Filter
    switch (filterBy) {
      case 'drums-yes':
        return student.hatSchlagzeug === 'Ja'
      case 'drums-no':
        return student.hatSchlagzeug === 'Nein'
      case 'drums-unknown':
        return student.hatSchlagzeug === 'Unbekannt' || !student.hatSchlagzeug
      default:
        return true
    }
  })

  // Schlagzeug-Status Farbe
  const getDrumsColor = (status: string) => {
    switch (status) {
      case 'Ja': return 'var(--status-success)'
      case 'Nein': return 'var(--status-error)'
      default: return 'var(--status-warning)'
    }
  }

  // WhatsApp Link (direkt zu Nummer, nicht zu App)
  const getWhatsAppLink = (nummer: string) => {
    if (!nummer) return '#'
    let cleanNumber = nummer.replace(/[^0-9+]/g, '')
    
    // Deutsche Nummern: 017x, 016x, 015x → +49
    if (cleanNumber.match(/^01[567]/)) {
      cleanNumber = '49' + cleanNumber.slice(1)
    } else if (cleanNumber.startsWith('+')) {
      cleanNumber = cleanNumber.slice(1)
    }
    
    return `https://wa.me/${cleanNumber}`
  }

  // Email Link (mailto)
  const getEmailLink = (email: string) => {
    if (!email) return '#'
    return `mailto:${email}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
      <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-xl" style={{ backgroundColor: 'var(--card-background)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--background)' }}>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            📋 Alle Schüler ({filteredStudents.length})
          </h2>
          <button
            onClick={onClose}
            className="text-2xl font-bold hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b flex flex-wrap gap-4 items-center" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--accent-light)' }}>
          {/* Suche */}
          <input
            type="text"
            placeholder="Nach Namen suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 rounded border flex-1 min-w-[200px]"
            style={{ 
              backgroundColor: 'var(--background)', 
              borderColor: 'var(--border-medium)',
              color: 'var(--text-primary)'
            }}
          />

          {/* Sortierung */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded border"
            style={{ 
              backgroundColor: 'var(--background)', 
              borderColor: 'var(--border-medium)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="name">Sortieren: Name</option>
            <option value="day">Sortieren: Unterrichtstag</option>
            <option value="payment">Sortieren: Zahlung</option>
            <option value="drums">Sortieren: Schlagzeug</option>
          </select>

          {/* Filter */}
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as any)}
            className="px-3 py-2 rounded border"
            style={{ 
              backgroundColor: 'var(--background)', 
              borderColor: 'var(--border-medium)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="all">Alle Schüler</option>
            <option value="drums-yes">🥁 Hat Schlagzeug</option>
            <option value="drums-no">❌ Kein Schlagzeug</option>
            <option value="drums-unknown">❓ Schlagzeug unbekannt</option>
          </select>
        </div>

        {/* Tabelle */}
        <div className="overflow-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          <table className="w-full">
            <thead className="sticky top-0" style={{ backgroundColor: 'var(--background)', borderBottom: '2px solid var(--border-color)' }}>
              <tr>
                <th className="text-left p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Name</th>
                <th className="text-left p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Unterricht</th>
                <th className="text-left p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>🥁</th>
                <th className="text-left p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Zahlung</th>
                <th className="text-left p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Kontakt</th>
                <th className="text-left p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Buch/Übung</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr
                  key={student.id}
                  className="border-b hover:opacity-80 transition-opacity"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <td className="p-3" style={{ color: 'var(--text-primary)' }}>
                    <div className="font-semibold">{student.vorname} {student.nachname}</div>
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {student.ansprechpartner || 'Kein Ansprechpartner'}
                    </div>
                  </td>
                  <td className="p-3" style={{ color: 'var(--text-primary)' }}>
                    <div>{student.unterrichtstag || 'Nicht gesetzt'}</div>
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{student.unterrichtszeit || 'Keine Zeit'}</div>
                  </td>
                  <td className="p-3">
                    <div
                      className="px-2 py-1 rounded text-xs font-semibold text-center min-w-[80px]"
                      style={{
                        backgroundColor: getDrumsColor(student.hatSchlagzeug),
                        color: 'white'
                      }}
                    >
                      {student.hatSchlagzeug === 'Ja' ? '✅ Ja' : 
                       student.hatSchlagzeug === 'Nein' ? '❌ Nein' : '❓ Unbekannt'}
                    </div>
                  </td>
                  <td className="p-3" style={{ color: 'var(--text-primary)' }}>
                    <div className={student.zahlungStatus === 'ja' ? 'text-green-600 font-semibold' : 'text-red-500'}>
                      {student.zahlungStatus === 'ja' ? '✅ Läuft' : 
                       student.zahlungStatus === 'nein' ? '❌ Nein' : 
                       student.zahlungStatus === 'Paypal' ? '💳 PayPal' : '❓ Offen'}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {student.monatlicherbetrag ? `${student.monatlicherbetrag}€` : 'Kein Betrag'}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {student.handynummer && (
                        <a
                          href={getWhatsAppLink(student.handynummer)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800 text-sm font-semibold"
                          title={`WhatsApp: ${student.handynummer}`}
                        >
                          📱
                        </a>
                      )}
                      {student.email && (
                        <a
                          href={getEmailLink(student.email)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                          title={`Email: ${student.email}`}
                        >
                          ✉️
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                    <div>{student.buch || 'Kein Buch'}</div>
                    <div>S.{student.seite || '?'} Ü.{student.übung || '?'}</div>
                    {student.buch2 && (
                      <div className="mt-1 text-xs">
                        Buch 2: S.{student.seite2 || '?'} Ü.{student.übung2 || '?'}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredStudents.length === 0 && (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
              Keine Schüler gefunden
            </div>
          )}
        </div>
      </div>
    </div>
  )
}