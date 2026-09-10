import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { verifyToken } from './login';

export function withAuth(handler: NextApiHandler): NextApiHandler {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No autorizado' });
        }

        const token = authHeader.substring(7);
        const { valid } = verifyToken(token);

        if (!valid) {
            return res.status(401).json({ error: 'Token inválido o expirado' });
        }

        return handler(req, res);
    };
}

