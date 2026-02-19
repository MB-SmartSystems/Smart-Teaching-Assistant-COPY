import { NextRequest, NextResponse } from 'next/server'

const BASEROW_BASE_URL = process.env.BASEROW_BASE_URL
const BASEROW_TOKEN = process.env.BASEROW_TOKEN
const FLEX_TABLE_ID = process.env.BASEROW_FLEXKARTEN_ID || "856"

export async function GET() {
  if (!BASEROW_TOKEN || !BASEROW_BASE_URL) {
    return NextResponse.json({ error: 'Server-Konfiguration fehlt' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `${BASEROW_BASE_URL}/api/database/rows/table/${FLEX_TABLE_ID}/?user_field_names=true&size=200`,
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
    console.error('Fehler beim Laden der Flex-Karten:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Flex-Karten' },
      { status: 500 }
    )
  }
}

// PATCH: Flex-Karte updaten (z.B. Verbrauchte_Stunden)
export async function PATCH(request: NextRequest) {
  if (!BASEROW_TOKEN || !BASEROW_BASE_URL) {
    return NextResponse.json({ error: 'Server-Konfiguration fehlt' }, { status: 500 })
  }

  const ALLOWED_FIELDS = new Set([
    'Verbrauchte_Stunden',
    'Rest_Stunden',
    'Status',
    'Notizen',
  ])

  try {
    const body = await request.json()
    const { karteId, updates } = body

    // Validate karteId
    if (!Number.isInteger(karteId) || karteId <= 0) {
      return NextResponse.json(
        { error: 'karteId muss eine positive Ganzzahl sein' },
        { status: 400 }
      )
    }

    // Validate updates
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'updates-Objekt fehlt' },
        { status: 400 }
      )
    }

    // Filter nur erlaubte Felder
    const safeUpdates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(updates)) {
      if (ALLOWED_FIELDS.has(key)) {
        safeUpdates[key] = value
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json(
        { error: 'Keine gültigen Felder zum Updaten' },
        { status: 400 }
      )
    }

    const response = await fetch(
      `${BASEROW_BASE_URL}/api/database/rows/table/${FLEX_TABLE_ID}/${karteId}/?user_field_names=true`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Token ${BASEROW_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(safeUpdates)
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Baserow PATCH Error:', errorText)
      throw new Error(`Baserow Update Error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Fehler beim Update der Flex-Karte:', error)
    return NextResponse.json(
      { error: 'Fehler beim Update der Flex-Karte' },
      { status: 500 }
    )
  }
}
