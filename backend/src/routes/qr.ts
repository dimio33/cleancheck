import { Router, Request, Response } from 'express';
import { query } from '../utils/db';

const router = Router();

// GET /api/restaurants/:id/qr — generate QR code as SVG
router.get('/:id/qr', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(400).json({ error: 'Invalid restaurant ID' });
      return;
    }

    // Check restaurant exists
    const result = await query<{ name: string }>(
      `SELECT name FROM restaurants WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Restaurant not found' });
      return;
    }

    const url = `https://cleancheck.e-findo.de/rate/${id}`;
    const restaurant = result.rows[0];

    // Generate QR code as SVG using a simple QR generation approach
    // We'll return JSON with the URL and restaurant info — frontend generates QR via canvas
    res.json({
      url,
      restaurant_name: restaurant.name,
      restaurant_id: id,
    });
  } catch (err) {
    console.error('QR code error:', err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

export default router;
