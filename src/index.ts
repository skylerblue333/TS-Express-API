import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', uptime: process.uptime() });
});

app.post('/api/data', (req, res) => {
    const { payload } = req.body;
    if (!payload) return res.status(400).json({ error: 'Missing payload' });
    res.status(201).json({ received: payload, timestamp: new Date().toISOString() });
});

if (require.main === module) {
    app.listen(3000, () => console.log('API running on port 3000'));
}

export default app;
