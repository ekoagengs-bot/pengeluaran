// MoniKas V2 - Firebase Web App configuration
// Replace the values below with the config from your Firebase Web App.
// Firebase Web config is intended to be used in client-side apps; protect your data with Firestore Security Rules.
export const firebaseConfig = {
  apiKey: "GANTI_API_KEY",
  authDomain: "GANTI_PROJECT.firebaseapp.com",
  projectId: "GANTI_PROJECT_ID",
  storageBucket: "GANTI_PROJECT.firebasestorage.app",
  messagingSenderId: "GANTI_SENDER_ID",
  appId: "GANTI_APP_ID"
};

export const isFirebaseConfigured = !Object.values(firebaseConfig).some(v => String(v).startsWith('GANTI_'));
