import { LocalStorage } from "@raycast/api";
import { SAPSystem } from "./types";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as crypto from "crypto";

const SYSTEMS_KEY = "sap-systems";
const ENCRYPTION_KEY = "sap-connector-encryption-key-v1";

// Simple encryption for password storage
function getEncryptionKey(): Buffer {
  // Create a consistent 32-byte key from the encryption key string
  return crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
}

export function encryptPassword(password: string): string {
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv("aes-256-cbc", key as crypto.CipherKey, iv as crypto.BinaryLike);
  let encrypted = cipher.update(password, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export function decryptPassword(encryptedPassword: string): string {
  try {
    const [ivHex, encrypted] = encryptedPassword.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv("aes-256-cbc", key as crypto.CipherKey, iv as crypto.BinaryLike);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return "";
  }
}

export async function getSAPSystems(): Promise<SAPSystem[]> {
  const systemsJson = await LocalStorage.getItem<string>(SYSTEMS_KEY);
  if (!systemsJson) return [];
  try {
    return JSON.parse(systemsJson);
  } catch {
    return [];
  }
}

export async function saveSAPSystems(systems: SAPSystem[]): Promise<void> {
  await LocalStorage.setItem(SYSTEMS_KEY, JSON.stringify(systems));
}

export async function getPassword(systemId: string): Promise<string> {
  const encryptedPassword = await LocalStorage.getItem<string>(`password-${systemId}`);
  if (!encryptedPassword) return "";
  return decryptPassword(encryptedPassword);
}

export async function savePassword(systemId: string, password: string): Promise<void> {
  const encrypted = encryptPassword(password);
  await LocalStorage.setItem(`password-${systemId}`, encrypted);
}

export async function deletePassword(systemId: string): Promise<void> {
  await LocalStorage.removeItem(`password-${systemId}`);
}

export async function addSAPSystem(
  system: Omit<SAPSystem, "id" | "createdAt" | "updatedAt">,
  password: string,
): Promise<SAPSystem> {
  const systems = await getSAPSystems();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const newSystem: SAPSystem = {
    ...system,
    id,
    createdAt: now,
    updatedAt: now,
  };

  systems.push(newSystem);
  await saveSAPSystems(systems);
  await savePassword(id, password);

  return newSystem;
}

export async function updateSAPSystem(
  id: string,
  updates: Partial<Omit<SAPSystem, "id" | "createdAt">>,
  password?: string,
): Promise<void> {
  const systems = await getSAPSystems();
  const index = systems.findIndex((s) => s.id === id);

  if (index !== -1) {
    systems[index] = {
      ...systems[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await saveSAPSystems(systems);

    if (password !== undefined) {
      await savePassword(id, password);
    }
  }
}

export async function deleteSAPSystem(id: string): Promise<void> {
  const systems = await getSAPSystems();
  const filtered = systems.filter((s) => s.id !== id);
  await saveSAPSystems(filtered);
  await deletePassword(id);
}

export async function createAndOpenSAPCFile(system: SAPSystem): Promise<string> {
  const password = await getPassword(system.id);

  // Build the connection string
  // Format: conn=/H/{application server}/S/32{instance number}&user={username}&lang={language}&client={client}&pass={password}
  const connectionString = `conn=/H/${system.applicationServer}/S/32${system.instanceNumber}&user=${system.username}&lang=${system.language}&clnt=${system.client}&pass=${password}`;

  // Create temp directory if it doesn't exist
  const tempDir = path.join(os.tmpdir(), "sap-connector");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Create the .sapc file
  const fileName = `${system.systemId}_${system.client}.sapc`;
  const filePath = path.join(tempDir, fileName);

  fs.writeFileSync(filePath, connectionString, "utf8");

  return filePath;
}

export function validateInstanceNumber(value: string): string | undefined {
  if (!/^\d{2}$/.test(value)) {
    return "Instance number must be exactly 2 digits (e.g., 00, 01, 99)";
  }
  return undefined;
}

export function validateClient(value: string): string | undefined {
  if (!/^\d{3}$/.test(value)) {
    return "Client must be exactly 3 digits (e.g., 100, 800)";
  }
  return undefined;
}
