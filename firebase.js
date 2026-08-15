// Firebase configuration for Follayt
const firebaseConfig = {
  apiKey: "AIzaSyAPTTDTPzDpKQjpPvze1IBsJQJw74_ua34",
  authDomain: "custom-graphics-36c50.firebaseapp.com",
  projectId: "custom-graphics-36c50",
  storageBucket: "custom-graphics-36c50.firebasestorage.app",
  messagingSenderId: "130011001835",
  appId: "1:130011001835:web:1ba6e4e4b3c7a6f0b7dfae",
  measurementId: "G-94YQXEFZDD"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Enable offline persistence (optional)
db.enablePersistence().catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistence failed: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Persistence not available');
  }
});

console.log('Firebase initialized for Follayt');
