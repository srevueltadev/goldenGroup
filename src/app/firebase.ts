import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyA4k57dNGuLhsEefgkkqIbeJMeXWGhAbxw",
    authDomain: "goldsilver-app.firebaseapp.com",
    projectId: "goldsilver-app",
    storageBucket: "goldsilver-app.firebasestorage.app",
    messagingSenderId: "688065379716",
    appId: "1:688065379716:web:c08649d54200eccd8db1d1",
    measurementId: "G-E5WB4HSEY2"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);

// Auth: client-side only — firebase/auth uses browser APIs unavailable in SSR
if (typeof window !== "undefined") {
    import("firebase/auth").then(({ getAuth, signInAnonymously, onAuthStateChanged }) => {
        const auth = getAuth(app);
        onAuthStateChanged(auth, user => {
            if (!user) signInAnonymously(auth).catch(console.error);
        });
    });
}
