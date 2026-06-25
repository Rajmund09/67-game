import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "game-32d4f.firebaseapp.com",
  projectId: "game-32d4f",
  storageBucket: "game-32d4f.firebasestorage.app",
  messagingSenderId: "664232389357",
  appId: "1:664232389357:web:ed04c2cee213a17b1fbae4",
  measurementId: "G-Z4RPLBJ1B2",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const database = getDatabase(app);
export const auth = getAuth(app);
