// Offline-Support und Synchronisation für Smart Teaching Assistant

import { SchülerApp, BaserowAPI, convertToAppFormat } from './baserow'

// Update Queue für Offline-Änderungen
export interface UpdateQueueItem {
  id: string // Eindeutige Update-ID
  studentId: number
  fieldName: string // Baserow field_name (z.B. "field_8191")
  value: string | number
  timestamp: number
  attempts: number
}

// Sync Status
export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error'

// Offline Storage Schema
interface OfflineStorage {
  students: SchülerApp[]
  updateQueue: UpdateQueueItem[]
  lastSync: number
  syncStatus: SyncStatus
}

// LocalStorage Keys
const STORAGE_KEY = 'teaching_assistant_data'
const SYNC_INTERVAL = 30000 // 30 Sekunden

// Offline Storage Manager
export class OfflineStorageManager {
  private static instance: OfflineStorageManager
  private syncInterval: ReturnType<typeof setInterval> | null = null
  private isOnline = true

  static getInstance(): OfflineStorageManager {
    if (!this.instance) {
      this.instance = new OfflineStorageManager()
    }
    return this.instance
  }

  // Initialisierung
  async initialize(): Promise<void> {
    if (typeof window !== 'undefined') {
      this.setupOnlineDetection()
      await this.loadFromStorage()
      this.startSyncInterval()
    }
  }

  // Online/Offline Detection
  private setupOnlineDetection(): void {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine
      
      window.addEventListener('online', () => {
        this.isOnline = true
        this.setSyncStatus('syncing')
        this.syncPendingUpdates()
      })
      
      window.addEventListener('offline', () => {
        this.isOnline = false
        this.setSyncStatus('offline')
      })
    }
  }

  // Daten aus localStorage laden
  private async loadFromStorage(): Promise<OfflineStorage> {
    if (typeof window === 'undefined') {
      return this.getEmptyStorage()
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored) as OfflineStorage
      }
    } catch (error) {
      console.warn('Fehler beim Laden aus localStorage:', error)
    }
    
    return this.getEmptyStorage()
  }

  // Daten in localStorage speichern
  private saveToStorage(data: OfflineStorage): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Fehler beim Speichern in localStorage:', error)
    }
  }

  // Leeres Storage-Objekt
  private getEmptyStorage(): OfflineStorage {
    return {
      students: [],
      updateQueue: [],
      lastSync: 0,
      syncStatus: 'offline' as SyncStatus
    }
  }

  // Alle Schüler laden (Cache-first)
  async getStudents(): Promise<SchülerApp[]> {
    const storage = await this.loadFromStorage()
    
    // Wenn offline oder Cache zu alt, versuche fresh data
    if (this.isOnline && (Date.now() - storage.lastSync > SYNC_INTERVAL)) {
      try {
        const freshData = await BaserowAPI.getAllStudents()
        const convertedStudents = freshData.map(convertToAppFormat)
        
        storage.students = convertedStudents
        storage.lastSync = Date.now()
        storage.syncStatus = 'synced'
        this.saveToStorage(storage)
        
        return convertedStudents
      } catch (error) {
        console.warn('Fehler beim Laden frischer Daten, verwende Cache:', error)
        storage.syncStatus = 'error'
        this.saveToStorage(storage)
      }
    }
    
    return storage.students
  }

  // Schüler-Feld update (optimistic)
  async updateStudentField(
    studentId: number,
    fieldName: string,
    value: string | number,
    appFieldName: keyof SchülerApp
  ): Promise<void> {
    const storage = await this.loadFromStorage()
    
    // Optimistic Update im lokalen Cache
    const studentIndex = storage.students.findIndex(s => s.id === studentId)
    if (studentIndex !== -1) {
      (storage.students[studentIndex] as any)[appFieldName] = value
    }
    
    // Update zur Queue hinzufügen
    const updateId = `${studentId}_${fieldName}_${Date.now()}`
    const queueItem: UpdateQueueItem = {
      id: updateId,
      studentId,
      fieldName,
      value,
      timestamp: Date.now(),
      attempts: 0
    }
    
    storage.updateQueue.push(queueItem)
    storage.syncStatus = this.isOnline ? 'syncing' : 'offline'
    this.saveToStorage(storage)
    
    // Sofortiger Sync-Versuch wenn online
    if (this.isOnline) {
      this.syncPendingUpdates()
    }
  }

  // Pending Updates synchronisieren
  private async syncPendingUpdates(): Promise<void> {
    const storage = await this.loadFromStorage()
    if (storage.updateQueue.length === 0) {
      storage.syncStatus = 'synced'
      this.saveToStorage(storage)
      return
    }
    
    storage.syncStatus = 'syncing'
    this.saveToStorage(storage)
    
    const successfulUpdates: string[] = []
    
    for (const update of storage.updateQueue) {
      try {
        await BaserowAPI.updateStudentField(
          update.studentId,
          update.fieldName,
          update.value
        )
        
        successfulUpdates.push(update.id)
        console.log(`✅ Sync erfolgreich: ${update.fieldName} = ${update.value}`)
        
      } catch (error) {
        update.attempts += 1
        console.warn(`❌ Sync fehlgeschlagen (${update.attempts}x):`, error)
        
        // Nach 3 Versuchen entfernen
        if (update.attempts >= 3) {
          successfulUpdates.push(update.id)
          console.error(`🗑️ Update entfernt nach 3 Versuchen:`, update)
        }
      }
    }
    
    // Erfolgreich synchronisierte Updates entfernen
    storage.updateQueue = storage.updateQueue.filter(
      update => !successfulUpdates.includes(update.id)
    )
    
    storage.syncStatus = storage.updateQueue.length === 0 ? 'synced' : 'error'
    storage.lastSync = Date.now()
    this.saveToStorage(storage)
  }

  // Sync-Status setzen
  private setSyncStatus(status: SyncStatus): void {
    this.loadFromStorage().then(storage => {
      storage.syncStatus = status
      this.saveToStorage(storage)
    })
  }

  // Aktueller Sync-Status
  async getSyncStatus(): Promise<{ status: SyncStatus; queueLength: number }> {
    const storage = await this.loadFromStorage()
    return {
      status: storage.syncStatus,
      queueLength: storage.updateQueue.length
    }
  }

  // Sync-Interval starten
  private startSyncInterval(): void {
    if (this.syncInterval) return
    
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncPendingUpdates()
      }
    }, SYNC_INTERVAL)
  }

  // Cleanup
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }
}

// Baserow Field Mappings für Updates (Original Database 233)
export const FIELD_MAPPINGS = {
  buch: 'field_7835',              // Buch (Original)
  seite: 'field_7836',             // Seite (Nummer)
  übung: 'field_7837',             // Übung (Nummer)
  buch2: 'field_7844',             // Buch 2 (Original)
  seite2: 'field_7845',            // Seite 2 (Original)
  übung2: 'field_7846',            // Übung 2 (Original)
  aktuelleLieder: 'field_7838',    // Aktuelle Lieder (Original)
  wichtigerFokus: 'field_7839',    // Technikübungen/Fokus (Original)
  zahlungStatus: 'field_7841',     // Zahlung läuft? (Original)
  hatSchlagzeug: 'field_7849'      // Hat Schlagzeug (Original)
} as const

// Helper Hook für React Components
export function useOfflineSync() {
  const storage = OfflineStorageManager.getInstance()
  
  return {
    updateField: (
      studentId: number,
      appField: keyof SchülerApp,
      value: string | number
    ) => {
      const baserowField = FIELD_MAPPINGS[appField as keyof typeof FIELD_MAPPINGS]
      if (!baserowField) {
        console.warn(`Kein Baserow-Mapping für Feld: ${appField}`)
        return Promise.reject('Unbekanntes Feld')
      }
      
      return storage.updateStudentField(studentId, baserowField, value, appField)
    },
    
    getSyncStatus: () => storage.getSyncStatus(),
    getStudents: () => storage.getStudents()
  }
}