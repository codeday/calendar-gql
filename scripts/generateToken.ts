import jwt from 'jsonwebtoken';

const [, , eventId = 'event-test', role = 'admin'] = process.argv;
const secret = process.env.JWT_SECRET || 'dev-secret';

const payload = {
    sub: 'test-user',
    role,
    event: eventId,
    iat: Math.floor(Date.now() / 1000),
};

const token = jwt.sign(payload as any, secret, { expiresIn: '7d' });
console.log(token);
