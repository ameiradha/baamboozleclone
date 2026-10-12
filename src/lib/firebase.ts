import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// Test initial connection as required by Firebase skill
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // If offline or backend is temporarily unavailable, Firestore falls back to cache/offline mode
    if (error instanceof Error) {
      const isOfflineOrUnavailable = 
        error.message.includes('the client is offline') || 
        error.message.includes('unavailable') || 
        (error as any).code === 'unavailable';
      if (isOfflineOrUnavailable) {
        console.warn('Firestore is running in offline/cached mode or backend is unreachable.');
      } else {
        console.warn('Firestore test connection status:', error.message);
      }
    }
  }
}

export { signInWithPopup, signOut };
