export default function errorHandler(err, req, res, next) {
    const isDev = process.env.NODE_ENV === 'development';
    
    
    const status = err.statusCode || err.status || err.raw?.statusCode || 500;
    
    console.error(`[${req.method}] ${req.path} → ${status}:`, err.message);

    
    const isClientError = status >= 400 && status < 500;
    const message = isClientError || isDev ? err.message : 'Internal server error';

    return res.status(status).json({
        message,
        code: err.code || 'INTERNAL_ERROR',
    });
}
