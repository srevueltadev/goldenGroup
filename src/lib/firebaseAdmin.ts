import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let db: Firestore | null = null;

export function getDb(): Firestore {
    if (db) return db;

    let app: App;
    if (!getApps().length) {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not set');
        app = initializeApp({ credential: cert(JSON.parse(raw)) });
    } else {
        app = getApps()[0];
    }

    db = getFirestore(app);
    return db;
}
