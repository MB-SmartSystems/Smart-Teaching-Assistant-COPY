import { NextResponse } from 'next/server'

const BASEROW_BASE_URL = process.env.BASEROW_BASE_URL
const BASEROW_TOKEN = process.env.BASEROW_TOKEN
const PREIS_TABLE_ID = process.env.BASEROW_PREISERHOEHUNGEN_ID || "854"

export async function GET() {
  if (!BASEROW_TOKEN || !BASEROW_BASE_URL) {
    return NextResponse.json({ error: 'Server-Konfiguration fehlt' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `${BASEROW_BASE_URL}/api/database/rows/table/${PREIS_TABLE_ID}/?user_field_names=true&size=200`,
      {
        headers: {
          'Authorization': `Token ${BASEROW_TOKEN}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      }
    )

    if (!response.ok) {
      throw new Error(`Baserow API Error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data.results)
  } catch (error) {
    console.error('Fehler beim Laden der Preiserhöhungen:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Preiserhöhungen' },
      { status: 500 }
    )
  }
}
