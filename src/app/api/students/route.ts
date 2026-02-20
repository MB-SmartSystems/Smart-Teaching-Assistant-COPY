import { NextRequest, NextResponse } from 'next/server'

const BASEROW_BASE_URL = process.env.BASEROW_BASE_URL
const BASEROW_TOKEN = process.env.BASEROW_TOKEN
const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID || "831"

// GET: Alle Schüler laden
export async function GET() {
  if (!BASEROW_TOKEN || !BASEROW_BASE_URL) {
    return NextResponse.json({ error: 'Server-Konfiguration fehlt' }, { status: 500 })
  }

  const headers = {
    'Authorization': `Token ${BASEROW_TOKEN}`,
    'Content-Type': 'application/json'
  }

  try {
    const response = await fetch(
      `${BASEROW_BASE_URL}/api/database/rows/table/${BASEROW_TABLE_ID}/?size=200`,
      { headers, cache: 'no-store' }
    )

    if (!response.ok) {
      throw new Error(`Baserow API Error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data.results)
  } catch (error) {
    console.error('Fehler beim Laden der Schüler:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Schüler' },
      { status: 500 }
    )
  }
}

// PATCH: Schüler-Feld updaten
export async function PATCH(request: NextRequest) {
  if (!BASEROW_TOKEN || !BASEROW_BASE_URL) {
    return NextResponse.json({ error: 'Server-Konfiguration fehlt' }, { status: 500 })
  }

  const headers = {
    'Authorization': `Token ${BASEROW_TOKEN}`,
    'Content-Type': 'application/json'
  }

  // Allowed Baserow field names (Original Database 233, Table 831)
  const ALLOWED_FIELDS = new Set([
    'field_7835', 'field_7836', 'field_7837',
    'field_7838', 'field_7839', 'field_7841',
    'field_7842', 'field_7844', 'field_7845', 'field_7846',
    'field_7849', // Hat Schlagzeug
  ])

  // Fields that accept integer option IDs (single_select)
  const SELECT_FIELDS = new Set(['field_7841', 'field_7849'])

  try {
    const body = await request.json()
    const { studentId, fieldName, value } = body

    // Validate studentId is a positive integer
    if (!Number.isInteger(studentId) || studentId <= 0) {
      return NextResponse.json(
        { error: 'studentId muss eine positive Ganzzahl sein' },
        { status: 400 }
      )
    }

    if (!fieldName || !ALLOWED_FIELDS.has(fieldName)) {
      return NextResponse.json(
        { error: 'Ungueltiges Feld' },
        { status: 400 }
      )
    }

    // Validate value
    if (value !== null && value !== undefined) {
      if (SELECT_FIELDS.has(fieldName)) {
        // single_select fields accept integer option IDs
        if (!Number.isInteger(value) || value <= 0) {
          return NextResponse.json(
            { error: 'Select-Feld erwartet eine gültige Option-ID (Integer)' },
            { status: 400 }
          )
        }
      } else {
        // text fields: must be a string with max 1000 chars
        if (typeof value !== 'string' || value.length > 1000) {
          return NextResponse.json(
            { error: 'Wert muss ein Text mit max. 1000 Zeichen sein' },
            { status: 400 }
          )
        }
      }
    }

    const response = await fetch(
      `${BASEROW_BASE_URL}/api/database/rows/table/${BASEROW_TABLE_ID}/${studentId}/`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ [fieldName]: value })
      }
    )

    if (!response.ok) {
      throw new Error(`Baserow Update Error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Fehler beim Update:', error)
    return NextResponse.json(
      { error: 'Fehler beim Update' },
      { status: 500 }
    )
  }
}
