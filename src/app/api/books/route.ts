import { NextResponse } from 'next/server'

export async function GET() {
  const BASEROW_TOKEN = process.env.BASEROW_TOKEN
  const BASEROW_BASE_URL = process.env.BASEROW_BASE_URL
  const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID || '831'
  if (!BASEROW_TOKEN || !BASEROW_BASE_URL) {
    return NextResponse.json({ success: false, error: 'Server-Konfiguration fehlt', books: [] }, { status: 500 })
  }

  try {
    // Alle Schüler aus Baserow laden
    const response = await fetch(
      `${BASEROW_BASE_URL}/api/database/rows/table/${BASEROW_TABLE_ID}/`,
      {
        headers: {
          'Authorization': `Token ${BASEROW_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const data = await response.json()
    
    // Alle verwendeten Bücher extrahieren
    const books = data.results
      .map((student: any) => student.field_7835) // Buch-Feld (Original DB 233)
      .filter((book: string) => book && book.trim()) // Nur gefüllte Bücher
      .filter((book: string, index: number, array: string[]) => 
        array.indexOf(book) === index // Duplikate entfernen
      )
      .sort() // Alphabetisch sortieren
    
    return NextResponse.json({ 
      success: true,
      books,
      count: books.length 
    })
    
  } catch (error) {
    console.error('Fehler beim Laden der Bücher:', error)
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Laden der Bücher',
      books: []
    }, { status: 500 })
  }
}