export default function errorHandler(err, req, res, next) {
    const isDev = process.env.NODE_ENV === 'development';
    console.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  return res.status(err.statusCode || 500).json({
    error: {
      message: isDev ? err.message : 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
    }
  });
}
