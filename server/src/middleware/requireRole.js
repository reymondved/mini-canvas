// Only lets users with the given role through. Use AFTER requireLogin (it needs req.user).
// Example: router.put('/grade', requireLogin, requireRole('instructor'), ...)
export function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'You do not have permission to do this.' });
    }
    next();
  };
}
