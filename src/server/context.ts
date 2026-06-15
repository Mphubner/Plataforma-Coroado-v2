import type express from 'express';
import type { RequestHandler } from 'express';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { cleanText, COLLECTIONS } from '../lib/domain';

export type AuthedRequest = express.Request & {
  authUser?: admin.auth.DecodedIdToken;
  userProfile?: admin.firestore.DocumentData;
};

export type ServerAuthContext = {
  authUser?: admin.auth.DecodedIdToken;
  userProfile?: admin.firestore.DocumentData;
};

const VALID_ROLES = new Set([
  'member',
  'cellLeader',
  'ministryLeader',
  'supervisor',
  'networkPastor',
  'auxPastor',
  'seniorPastor',
  'admin',
]);

export const OWNER_EMAIL = process.env.PLATFORM_OWNER_EMAIL || 'marcospereirahubner@gmail.com';
export const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'tenant-1';
export const FIRESTORE_DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

export function getAdminApp() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }

  return admin.app();
}

export function getAdminDb() {
  return getFirestore(getAdminApp(), FIRESTORE_DATABASE_ID);
}

export async function loadUserProfile(uid: string) {
  const snapshot = await getAdminDb().collection(COLLECTIONS.users).doc(uid).get();
  return snapshot.exists ? snapshot.data() : null;
}

export async function resolveFirebaseAuth(req: express.Request): Promise<ServerAuthContext> {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  return resolveFirebaseAuthToken(token);
}

export async function resolveOptionalFirebaseAuth(req: express.Request): Promise<ServerAuthContext> {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return {};
  }

  try {
    return await resolveFirebaseAuthToken(token);
  } catch {
    return {};
  }
}

export async function resolveFirebaseAuthToken(token: string): Promise<ServerAuthContext> {
  if (!token) {
    throw new Error('Autenticacao obrigatoria');
  }

  getAdminApp();
  const decoded = await admin.auth().verifyIdToken(token);
  const profile = await loadUserProfile(decoded.uid);

  return {
    authUser: decoded,
    userProfile: profile || undefined,
  };
}

export function getRoles(profile?: admin.firestore.DocumentData | null) {
  return Array.isArray(profile?.roles) ? profile.roles.map(String) : [];
}

export function hasAnyRole(profile: admin.firestore.DocumentData | null | undefined, roles: string[]) {
  const currentRoles = getRoles(profile);
  return currentRoles.some(role => roles.includes(role));
}

export const authenticateFirebase: RequestHandler = async (req: AuthedRequest, res, next) => {
  try {
    const authContext = await resolveFirebaseAuth(req);
    req.authUser = authContext.authUser;
    req.userProfile = authContext.userProfile;
    next();
  } catch (error) {
    console.error('Firebase auth verification failed:', error);
    res.status(401).json({ success: false, error: 'Sessao invalida ou expirada' });
  }
};

export function requireRoles(roles: string[]): RequestHandler {
  return (req: AuthedRequest, res, next) => {
    const isOwner = req.authUser?.email === OWNER_EMAIL;
    if (isOwner || hasAnyRole(req.userProfile, roles)) {
      next();
      return;
    }

    res.status(403).json({ success: false, error: 'Permissao insuficiente' });
  };
}

export function sanitizeRoles(input: unknown) {
  if (!Array.isArray(input)) return null;
  const roles = Array.from(new Set(input.map(String).filter(role => VALID_ROLES.has(role))));
  return roles.length > 0 ? roles : null;
}

export function cleanString(value: unknown, max = 500) {
  return cleanText(value, max);
}

export function getMercadoPagoAccessToken() {
  return process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || '';
}
