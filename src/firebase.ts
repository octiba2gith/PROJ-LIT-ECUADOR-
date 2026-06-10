import { initializeApp } from 'firebase/app';
import { 
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Book, Order, LayoutDesignConfig, StockNotification } from './types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth();

// --- Mandatory Firestore Error Handler diagnostics ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error Detailed Logs:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Connection validation on startup ---
export async function validateFirebaseConnection() {
  try {
    // Tests reading a test schema document silently
    await getDocFromServer(doc(db, 'configs', 'connection_test'));
    console.log('Firebase Firestore connection test successful.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.warn("Please check your network and Firebase configuration. Local caching will keep operating.", error);
    }
  }
}

// Ensure first test on startup
validateFirebaseConnection();

// --- Recursive helper to clean undefined values before sending to Firestore ---
function removeUndefined<T extends object>(obj: T): T {
  const clean = { ...obj } as any;
  Object.keys(clean).forEach(key => {
    if (clean[key] === undefined) {
      delete clean[key];
    } else if (clean[key] !== null && typeof clean[key] === 'object') {
      if (Array.isArray(clean[key])) {
        clean[key] = clean[key].map((item: any) => 
          (typeof item === 'object' && item !== null) ? removeUndefined(item) : item
        );
      } else {
        clean[key] = removeUndefined(clean[key]);
      }
    }
  });
  return clean;
}

// --- Firestore Read / Write Services ---

// 1. Books / Catalog
export async function fetchBooks(): Promise<Book[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'books'));
    const booksList: Book[] = [];
    querySnapshot.forEach((docSnap) => {
      booksList.push(docSnap.data() as Book);
    });
    return booksList;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'books');
    return [];
  }
}

export async function saveBook(book: Book): Promise<void> {
  try {
    const cleanedBook = removeUndefined(book);
    await setDoc(doc(db, 'books', cleanedBook.id), cleanedBook);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `books/${book.id}`);
  }
}

export async function deleteBook(bookId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'books', bookId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `books/${bookId}`);
  }
}

// 2. Orders
export async function fetchOrders(): Promise<Order[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'orders'));
    const ordersList: Order[] = [];
    querySnapshot.forEach((docSnap) => {
      ordersList.push(docSnap.data() as Order);
    });
    return ordersList.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'orders');
    return [];
  }
}

export async function saveOrder(order: Order): Promise<void> {
  try {
    const cleanedOrder = removeUndefined(order);
    await setDoc(doc(db, 'orders', cleanedOrder.id), cleanedOrder);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `orders/${order.id}`);
  }
}

// 3. Layout / Design Configs
export async function fetchDesignConfig(): Promise<LayoutDesignConfig | null> {
  try {
    const docSnap = await getDoc(doc(db, 'configs', 'designConfig'));
    if (docSnap.exists()) {
      return docSnap.data() as LayoutDesignConfig;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'configs/designConfig');
    return null;
  }
}

export async function saveDesignConfig(config: LayoutDesignConfig): Promise<void> {
  try {
    const cleanedConfig = removeUndefined(config);
    await setDoc(doc(db, 'configs', 'designConfig'), cleanedConfig);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'configs/designConfig');
  }
}

// 4. Users (Registered accounts stored globally)
export interface GlobalUser {
  name: string;
  email: string;
  password?: string;
}

export async function fetchGlobalUserByEmail(email: string): Promise<GlobalUser | null> {
  try {
    const safeId = email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    const docSnap = await getDoc(doc(db, 'users', safeId));
    if (docSnap.exists()) {
      return docSnap.data() as GlobalUser;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${email}`);
    return null;
  }
}

export async function fetchGlobalUsers(): Promise<GlobalUser[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const usersList: GlobalUser[] = [];
    querySnapshot.forEach((docSnap) => {
      usersList.push(docSnap.data() as GlobalUser);
    });
    return usersList;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
    return [];
  }
}

export async function registerGlobalUser(user: GlobalUser): Promise<void> {
  try {
    const cleanedUser = removeUndefined(user);
    // We sanitize and index users by their email in lowercase to prevent duplicates
    const safeId = user.email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    await setDoc(doc(db, 'users', safeId), cleanedUser);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.email}`);
  }
}

export async function updateGlobalUserPassword(email: string, newPass: string, name: string): Promise<void> {
  try {
    const safeId = email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    await setDoc(doc(db, 'users', safeId), {
      name,
      email: email.trim().toLowerCase(),
      password: newPass
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${email}`);
  }
}

// 4.5 Firebase Authentication Helpers with Email Link Verification
export async function registerAuthWithVerification(name: string, email: string, pass: string): Promise<any> {
  const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
  const user = userCredential.user;
  
  // Update Auth Profile Display Name
  await updateProfile(user, { displayName: name });
  
  // Send email verification link
  await sendEmailVerification(user);
  
  // Sync details in Firestore
  await registerGlobalUser({
    name,
    email: email.trim().toLowerCase(),
    password: pass
  });
  
  return user;
}

export async function loginWithAuthCheck(email: string, pass: string): Promise<any> {
  const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
  return userCredential.user;
}

export async function loginWithGoogle(): Promise<any> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const userCredential = await signInWithPopup(auth, provider);
  const user = userCredential.user;
  
  // Sync details in Firestore if exists
  if (user.email) {
    await registerGlobalUser({
      name: user.displayName || 'Usuario de Google',
      email: user.email.trim().toLowerCase()
    });
  }
  
  return user;
}

export async function checkEmailVerifiedStatus(): Promise<boolean> {
  if (auth.currentUser) {
    await auth.currentUser.reload();
    return auth.currentUser.emailVerified;
  }
  return false;
}

export async function resendVerificationEmail(): Promise<void> {
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
  } else {
    throw new Error("No hay usuario activo para reenviar el correo de verificación.");
  }
}

// 5. Notifications
export async function fetchNotifications(): Promise<StockNotification[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'notifications'));
    const notifList: StockNotification[] = [];
    querySnapshot.forEach((docSnap) => {
      notifList.push(docSnap.data() as StockNotification);
    });
    return notifList;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'notifications');
    return [];
  }
}

export async function saveNotification(notif: StockNotification): Promise<void> {
  try {
    const cleanedNotif = removeUndefined(notif);
    await setDoc(doc(db, 'notifications', cleanedNotif.id), cleanedNotif);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `notifications/${notif.id}`);
  }
}
