import { Router, Request, Response } from 'express';

const router = Router();

const GOOGLE_PLACES_URL = 'https://places.googleapis.com/v1/places:searchNearby';

const GOOGLE_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.formattedAddress',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.rating',
  'places.userRatingCount',
].join(',');

// POST /api/places/nearby
router.post('/nearby', async (req: Request, res: Response): Promise<void> => {
  try {
    const apiKey = process.env.GOOGLE_PLACES_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Google Places API key not configured' });
      return;
    }

    const { lat, lng, radius, includedTypes } = req.body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      res.status(400).json({ error: 'lat and lng are required numbers' });
      return;
    }

    const body = {
      includedTypes: includedTypes || [],
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: Math.min(radius || 5000, 50000),
        },
      },
      languageCode: 'de',
    };

    const response = await fetch(GOOGLE_PLACES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': GOOGLE_FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      res.status(response.status).json({ error: `Google Places error: ${errorText}` });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Places proxy error:', err);
    res.status(500).json({ error: 'Failed to fetch places' });
  }
});

export default router;
