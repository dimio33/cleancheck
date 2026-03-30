import { Router, Response } from 'express';
import { query } from '../utils/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { isValidUuid } from '../utils/validate';

const router = Router();

// GET /api/admin/claims — list pending claim requests (admin only)
router.get('/claims', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT cr.*, r.name as restaurant_name, r.address as restaurant_address, u.username as user_username, u.email as user_email
       FROM claim_requests cr
       JOIN restaurants r ON cr.restaurant_id = r.id
       JOIN users u ON cr.user_id = u.id
       WHERE cr.status = 'pending'
       ORDER BY cr.created_at ASC`
    );

    res.json({ claims: result.rows });
  } catch (err) {
    console.error('Get claims error:', err);
    res.status(500).json({ error: 'Failed to get claim requests' });
  }
});

// POST /api/admin/claims/:id/approve — approve a claim request (admin only)
router.post('/claims/:id/approve', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidUuid(id as string)) {
      res.status(400).json({ error: 'Invalid claim ID format' });
      return;
    }

    // Get claim request
    const claimResult = await query<{ id: string; restaurant_id: string; user_id: string; status: string }>(
      `SELECT id, restaurant_id, user_id, status FROM claim_requests WHERE id = $1`,
      [id]
    );

    if (claimResult.rows.length === 0) {
      res.status(404).json({ error: 'Claim request not found' });
      return;
    }

    const claim = claimResult.rows[0];

    if (claim.status !== 'pending') {
      res.status(400).json({ error: `Claim already ${claim.status}` });
      return;
    }

    // Update claim request
    await query(
      `UPDATE claim_requests SET status = 'approved', reviewed_by = $1, reviewed_at = NOW() WHERE id = $2`,
      [req.user!.id, id]
    );

    // Set restaurant ownership
    await query(
      `UPDATE restaurants SET owner_id = $1, claimed_at = NOW(), verified = true WHERE id = $2`,
      [claim.user_id, claim.restaurant_id]
    );

    // Set user role to restaurant_owner
    await query(
      `UPDATE users SET role = 'restaurant_owner' WHERE id = $1`,
      [claim.user_id]
    );

    // Return updated claim
    const updatedClaim = await query(
      `SELECT cr.*, r.name as restaurant_name
       FROM claim_requests cr
       JOIN restaurants r ON cr.restaurant_id = r.id
       WHERE cr.id = $1`,
      [id]
    );

    res.json({ claim: updatedClaim.rows[0] });
  } catch (err) {
    console.error('Approve claim error:', err);
    res.status(500).json({ error: 'Failed to approve claim' });
  }
});

// POST /api/admin/claims/:id/reject — reject a claim request (admin only)
router.post('/claims/:id/reject', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidUuid(id as string)) {
      res.status(400).json({ error: 'Invalid claim ID format' });
      return;
    }

    // Get claim request
    const claimResult = await query<{ status: string }>(
      `SELECT status FROM claim_requests WHERE id = $1`,
      [id]
    );

    if (claimResult.rows.length === 0) {
      res.status(404).json({ error: 'Claim request not found' });
      return;
    }

    if (claimResult.rows[0].status !== 'pending') {
      res.status(400).json({ error: `Claim already ${claimResult.rows[0].status}` });
      return;
    }

    // Update claim request
    await query(
      `UPDATE claim_requests SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW() WHERE id = $2`,
      [req.user!.id, id]
    );

    res.json({ message: 'Claim rejected' });
  } catch (err) {
    console.error('Reject claim error:', err);
    res.status(500).json({ error: 'Failed to reject claim' });
  }
});

export default router;
