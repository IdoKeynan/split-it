// Vercel serverless function: POST /api/scan-receipt
// Receives base64 image, calls Google Cloud Vision, parses receipt into dishes

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { image, lang = 'he' } = req.body

  if (!image) {
    return res.status(400).json({ error: 'No image provided' })
  }

  const apiKey = process.env.GOOGLE_VISION_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'OCR service not configured' })
  }

  try {
    // Call Google Cloud Vision API
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: image }, // base64 encoded
            features: [{ type: 'TEXT_DETECTION' }],
            imageContext: {
              languageHints: lang === 'he' ? ['he', 'en'] : ['en', 'he'],
            },
          }],
        }),
      }
    )

    if (!visionResponse.ok) {
      const err = await visionResponse.text()
      console.error('Vision API error:', err)
      return res.status(502).json({ error: 'OCR service error' })
    }

    const visionData = await visionResponse.json()
    const fullText = visionData.responses?.[0]?.fullTextAnnotation?.text || ''

    if (!fullText.trim()) {
      return res.status(200).json({ dishes: [], rawText: '' })
    }

    // Parse the OCR text into dishes
    const dishes = parseReceiptText(fullText, lang)

    return res.status(200).json({ dishes, rawText: fullText })
  } catch (err) {
    console.error('Scan error:', err)
    return res.status(500).json({ error: 'Scan failed' })
  }
}

/**
 * Parse raw OCR text from a receipt into dish name + price pairs.
 *
 * Receipt patterns (Hebrew & English):
 * - "המבורגר    58.00"
 * - "58.00    המבורגר"
 * - "Burger ......... 58"
 * - "1 x Pasta  45.00"
 * - Lines with totals/tax/service charge are filtered out
 */
function parseReceiptText(text, lang) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const dishes = []

  // Words that indicate summary/total lines (skip these)
  const skipPatterns = [
    // Hebrew
    /סה["\u201d]?כ/i, /מע["\u201d]?מ/i, /שירות/i, /טיפ/i, /מזומן/i, /אשראי/i,
    /עודף/i, /תשלום/i, /מס/i, /הנחה/i, /ללא מע/i, /כולל מע/i,
    /חשבונית/i, /קבלה/i, /תאריך/i, /מלצר/i, /שולחן/i, /טלפון/i,
    // English
    /\btotal\b/i, /\bsubtotal\b/i, /\btax\b/i, /\bvat\b/i, /\btip\b/i,
    /\bservice\b/i, /\bcharge\b/i, /\bchange\b/i, /\bcash\b/i, /\bcredit\b/i,
    /\bcard\b/i, /\bdiscount\b/i, /\bbalance\b/i, /\breceipt\b/i, /\binvoice\b/i,
    /\bdate\b/i, /\bserver\b/i, /\btable\b/i, /\bphone\b/i, /\bguest/i,
    /\bthank/i, /\bwelcome/i,
  ]

  // Price pattern: matches numbers like 58, 58.00, 58.0, 120.50
  const priceRegex = /(\d{1,4}(?:\.\d{1,2})?)/

  for (const line of lines) {
    // Skip lines that match summary/metadata patterns
    if (skipPatterns.some(p => p.test(line))) continue

    // Skip lines that are just numbers or very short
    if (/^\d+[\s.]*$/.test(line)) continue
    if (line.length < 3) continue

    // Skip lines with multiple prices (likely a total/summary row)
    const priceMatches = line.match(/\d{1,4}\.\d{2}/g)
    if (priceMatches && priceMatches.length > 2) continue

    // Try to extract a price from the line
    const match = line.match(priceRegex)
    if (!match) continue

    const price = parseFloat(match[1])

    // Skip unreasonable prices (too low or too high for a dish)
    if (price < 5 || price > 9999) continue

    // Extract the dish name (everything except the price and surrounding dots/spaces)
    let name = line
      .replace(match[0], '')        // remove the price
      .replace(/[.·…_\-]{2,}/g, '') // remove dot leaders
      .replace(/^\d+\s*[xX×]\s*/, '') // remove quantity prefix like "2 x "
      .replace(/[₪$€]/g, '')        // remove currency symbols
      .replace(/\s{2,}/g, ' ')      // collapse multiple spaces
      .trim()

    // Skip if name is too short or is just numbers/symbols
    if (name.length < 2) continue
    if (/^[\d\s.₪$€%]+$/.test(name)) continue

    dishes.push({ name, price })
  }

  return dishes
}
