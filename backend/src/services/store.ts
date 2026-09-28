import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface ConversationRecord {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  userId: string;
  sender: 'user' | 'ai';
  text: string;
  memories?: { text: string }[];
  createdAt: string;
}

interface SessionRecord { token: string; userId: string; createdAt: string; }
interface StoreData { users: UserRecord[]; sessions: SessionRecord[]; conversations: ConversationRecord[]; messages: MessageRecord[]; }

const dataDir = path.resolve(process.cwd(), 'data');
const dataFile = path.join(dataDir, 'store.json');
const emptyStore: StoreData = { users: [], sessions: [], conversations: [], messages: [] };

async function readStore(): Promise<StoreData> {
  try {
    const raw = await fs.readFile(dataFile, 'utf8');
    return JSON.parse(raw) as StoreData;
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(dataFile, JSON.stringify(emptyStore, null, 2));
    return structuredClone(emptyStore);
  }
}

async function writeStore(data: StoreData): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  const temp = `${dataFile}.tmp`;
  await fs.writeFile(temp, JSON.stringify(data, null, 2));
  await fs.rename(temp, dataFile);
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

export async function createUser(name: string, email: string, password: string): Promise<UserRecord> {
  const store = await readStore();
  if (store.users.some((u) => u.email === email.toLowerCase())) throw new Error('An account with this email already exists.');
  const user: UserRecord = { id: crypto.randomUUID(), name, email: email.toLowerCase(), passwordHash: hashPassword(password), createdAt: new Date().toISOString() };
  store.users.push(user);
  await writeStore(store);
  return user;
}

export async function findUserByEmail(email: string): Promise<UserRecord | undefined> {
  const store = await readStore();
  return store.users.find((u) => u.email === email.toLowerCase());
}

export async function findUserById(id: string): Promise<UserRecord | undefined> {
  const store = await readStore();
  return store.users.find((u) => u.id === id);
}

export async function createSession(userId: string): Promise<string> {
  const store = await readStore();
  const token = crypto.randomBytes(32).toString('hex');
  store.sessions.push({ token, userId, createdAt: new Date().toISOString() });
  await writeStore(store);
  return token;
}

export async function getUserByToken(token: string): Promise<UserRecord | undefined> {
  const store = await readStore();
  const session = store.sessions.find((s) => s.token === token);
  if (!session) return undefined;
  return store.users.find((u) => u.id === session.userId);
}

export async function createConversation(userId: string, title = 'New Chat'): Promise<ConversationRecord> {
  const store = await readStore();
  const now = new Date().toISOString();
  const conversation: ConversationRecord = { id: crypto.randomUUID(), userId, title: title.slice(0, 80) || 'New Chat', createdAt: now, updatedAt: now };
  store.conversations.push(conversation);
  await writeStore(store);
  return conversation;
}

export async function listConversations(userId: string): Promise<ConversationRecord[]> {
  const store = await readStore();
  return store.conversations.filter((c) => c.userId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getConversation(userId: string, conversationId: string): Promise<ConversationRecord | undefined> {
  const store = await readStore();
  return store.conversations.find((c) => c.id === conversationId && c.userId === userId);
}

export async function updateConversationTitle(userId: string, conversationId: string, title: string): Promise<void> {
  const store = await readStore();
  const conversation = store.conversations.find((c) => c.id === conversationId && c.userId === userId);
  if (!conversation) return;
  conversation.title = title.slice(0, 80) || 'New Chat';
  conversation.updatedAt = new Date().toISOString();
  await writeStore(store);
}

export async function addMessage(message: Omit<MessageRecord, 'id' | 'createdAt'>): Promise<MessageRecord> {
  const store = await readStore();
  const record: MessageRecord = { ...message, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  store.messages.push(record);
  const conversation = store.conversations.find((c) => c.id === message.conversationId && c.userId === message.userId);
  if (conversation) conversation.updatedAt = record.createdAt;
  await writeStore(store);
  return record;
}

export async function listMessages(userId: string, conversationId: string): Promise<MessageRecord[]> {
  const store = await readStore();
  const owned = store.conversations.some((c) => c.id === conversationId && c.userId === userId);
  if (!owned) return [];
  return store.messages.filter((m) => m.conversationId === conversationId && m.userId === userId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
