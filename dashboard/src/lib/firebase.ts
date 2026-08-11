import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase web config values are safe to embed client-side (this is how
// every Firebase web app ships) — access is controlled by Firebase's
// authorized-domains list and security rules, not by keeping this secret.
const firebaseConfig = {
  apiKey: "AIzaSyD0FNBzgzRfm7-7n9MaQQsvpwO_7qv7x1M",
  authDomain: "buildvolt-1b5e0.firebaseapp.com",
  projectId: "buildvolt-1b5e0",
  storageBucket: "buildvolt-1b5e0.firebasestorage.app",
  messagingSenderId: "781218974180",
  appId: "1:781218974180:web:1e2b017a97a39f5b129ff1",
  measurementId: "G-CJPKZM9QQ8",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
