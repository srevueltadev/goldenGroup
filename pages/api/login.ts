import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

const SECRET_KEY = process.env.AUTH_SECRET || 'infoGold-secret-key-2024';
const VALID_USER = 'infoGold';
const VALID_PASS = 'Qweas123*/';

function generateToken(username: string): string {
    const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    const payload = `${username}:${expiry}`;
    const signature = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
    return Buffer.from(`${payload}:${signature}`).toString('base64');
}

export function verifyToken(token: string): { valid: boolean; username?: string } {
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [username, expiry, signature] = decoded.split(':');

        // Check expiry
        if (Date.now() > parseInt(expiry)) {
            return { valid: false };
        }

        // Verify signature
        const payload = `${username}:${expiry}`;
        const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');

        if (signature === expectedSignature) {
            return { valid: true, username };
        }
        return { valid: false };
    } catch {
        return { valid: false };
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { username, password } = req.body;

        if (username === VALID_USER && password === VALID_PASS) {
            const token = generateToken(username);
            return res.status(200).json({
                success: true,
                token,
                expiresIn: 24 * 60 * 60 * 1000 // 24 hours in ms
            });
        }

        return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

