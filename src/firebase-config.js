// src/firebase-config.js

//import Firebase services
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyArPJLVPGTasAXMYW6FJDfuLeganvMeoGY",
    authDomain: "implicitex.firebaseapp.com",
    projectId: "implicitex",
    storageBucket: "implicitex.firebasestorage.app",
    messagingSenderId: "442625368135",
    appId: "1:442625368135:web:9eae936ad638624df61162"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export initialized services
export const auth = getAuth(app);
export const db = getFirestore(app);
