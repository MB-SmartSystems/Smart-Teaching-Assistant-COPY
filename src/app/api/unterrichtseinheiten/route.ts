import { NextRequest, NextResponse } from 'next/server'

const BASEROW_BASE_URL = process.env.BASEROW_BASE_URL
const BASEROW_TOKEN = process.env.BASEROW_TOKEN
const EINHEITEN_TABLE_ID = process.env.BASEROW_UNTERRICHTSEINHEITEN_ID || "857"

// GET: Unterrichtseinheiten laden (optional: ?flexkarte_id=123)
export async function GET(request: NextRequest) {
  if (!BASEROW_TOKEN || !BASEROW_BASE_URL) {
    return NextResponse.json({ error: 'Server-Konfiguration fehlt' }, { status: 500 })
  }

  try {
    let url = `${BASEROW_BASE_URL}/api/database/rows/table/${EINHEITEN_TABLE_ID}/?user_field_names=true&size=200`

    // Optional: Filter nach Flex-Karte
    const flexkarteId = request.nextUrl.searchParams.get('flexkarte_id')
    if (flexkarteId) {
      // Baserow filter: Flexkarte_Link enthält die ID
      url += `&filter__Flexkarte_Link__link_row_has=${encodeURIComponent(flexkarteId)}`
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Token ${BASEROW_TOKEN}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error(`Baserow API Error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data.results)
  } catch (error) {
    console.error('Fehler beim Laden der Unterrichtseinheiten:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Unterrichtseinheiten' },
      { status: 500 }
    )
  }
}

// POST: Neue Unterrichtseinheit anlegen
export async function POST(request: NextRequest) {
  if (!BASEROW_TOKEN || !BASEROW_BASE_URL) {
    return NextResponse.json({ error: 'Server-Konfiguration fehlt' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { datum, uhrzeit, dauer, unterrichtsinhalte, fortschritt, notizen, schueler_id, flexkarte_id, status } = body

    // Validierung
    if (!datum || !dauer || !flexkarte_id) {
      return NextResponse.json(
        { error: 'Datum, Dauer und Flex-Karte sind Pflichtfelder' },
        { status: 400 }
      )
    }

    if (typeof dauer !== 'string' || isNaN(parseFloat(dauer)) || parseFloat(dauer) <= 0) {
      return NextResponse.json(
        { error: 'Dauer muss eine positive Zahl sein' },
        { status: 400 }
      )
    }

    // Baserow-Payload mit user_field_names
    const payload: Record<string, unknown> = {
      Datum: datum,
      Dauer_Stunden: dauer,
      Flexkarte_Link: [flexkarte_id],
    }

    if (uhrzeit) payload.Uhrzeit = uhrzeit
    if (unterrichtsinhalte) payload.Unterrichtsinhalte = unterrichtsinhalte
    if (notizen) payload.Notizen = notizen
    if (schueler_id) payload.Schueler_Link = [schueler_id]
    if (status) payload.Status = status
    if (fortschritt) payload.Fortschritt = fortschritt

    const response = await fetch(
      `${BASEROW_BASE_URL}/api/database/rows/table/${EINHEITEN_TABLE_ID}/?user_field_names=true`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${BASEROW_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Baserow POST Error:', errorText)
      throw new Error(`Baserow API Error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Fehler beim Erstellen der Unterrichtseinheit:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Unterrichtseinheit' },
      { status: 500 }
    )
  }
}
