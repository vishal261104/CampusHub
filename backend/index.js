import express from 'express';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';

import 'dotenv/config';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'API is running',
    routes: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        ping: 'GET /api/auth',
      },
    },
  });
});

app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('Server link: http://localhost:' + PORT);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err?.message || err);
    if (err && typeof err === 'object') {
      console.error('Error name:', err.name);
      if ('code' in err) console.error('Error code:', err.code);
      if ('codeName' in err) console.error('Error codeName:', err.codeName);
    }
    process.exit(1);
  });
