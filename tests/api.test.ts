import request from 'supertest';
import app from '../src/index';

describe('Express API', () => {
    it('GET /health returns 200', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('healthy');
    });

    it('POST /api/data returns 201 for valid payload', async () => {
        const res = await request(app)
            .post('/api/data')
            .send({ payload: 'test_data' });
        expect(res.status).toBe(201);
        expect(res.body.received).toBe('test_data');
    });

    it('POST /api/data returns 400 for missing payload', async () => {
        const res = await request(app).post('/api/data').send({});
        expect(res.status).toBe(400);
    });
});
