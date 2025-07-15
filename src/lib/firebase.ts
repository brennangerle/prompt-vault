import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyCZh5t7UlcYgOrBhIPenAAziUDngLoWDBA",
  authDomain: "prompt-vault-bw4ot.firebaseapp.com",
  databaseURL: "https://prompt-vault-bw4ot-default-rtdb.firebaseio.com",
  projectId: "prompt-vault-bw4ot",
  storageBucket: "prompt-vault-bw4ot.firebasestorage.app",
  messagingSenderId: "503971097906",
  appId: "1:503971097906:web:27be68884326dd15153b2b",
  measurementId: "G-F43290QWP7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const database = getDatabase(app);
export const auth = getAuth(app);

// Initialize Analytics (only on client side)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;