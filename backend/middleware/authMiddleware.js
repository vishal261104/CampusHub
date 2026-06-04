import jwt from 'jsonwebtoken';

export default function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      const err = new Error('Not authorized');
      err.statusCode = 401;
      err.code = 'AUTH_REQUIRED';
      return next(err);
    }

    const token = header.slice('Bearer '.length);
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not set');
    }

    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    return next();
  } catch (err) {
    err.statusCode = 401;
    err.code = 'AUTH_INVALID';
    return next(err);
  }
}
