// FirebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyA95eAZBHlzHvVuSQWkXOXl_dCENO9a_qY",
  authDomain: "attendanceapp-2f814.firebaseapp.com",
  projectId: "attendanceapp-2f814",
  storageBucket: "attendanceapp-2f814.firebasestorage.app",
  messagingSenderId: "233501790067",
  appId: "1:233501790067:web:032d4fc83acd01e4687f06"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export { auth, db };