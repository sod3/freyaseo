import { mongoCollection } from "@/src/lib/mongo";

const LOCK_ID = "global-backup-restore-lock";
const LOCK_TTL_MS = 15 * 60 * 1000;

type BackupLock = {
  _id: string;
  operation: "backup" | "restore";
  operationId: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
};

export class BackupBusyError extends Error {
  constructor(message = "Another backup or restore operation is already running.") {
    super(message);
    this.name = "BackupBusyError";
  }
}

async function removeExpiredLock() {
  await (await mongoCollection<BackupLock>("websiteBackupLocks")).deleteOne({ _id: LOCK_ID, expiresAt: { $lte: new Date() } });
}

export async function acquireBackupLock(operation: BackupLock["operation"], operationId: string, userId: string) {
  const locks = await mongoCollection<BackupLock>("websiteBackupLocks");
  await removeExpiredLock();
  const now = new Date();
  try {
    await locks.insertOne({
      _id: LOCK_ID,
      operation,
      operationId,
      userId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + LOCK_TTL_MS),
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) throw new BackupBusyError();
    throw error;
  }
}

export async function renewBackupLock(operationId: string) {
  await (await mongoCollection<BackupLock>("websiteBackupLocks")).updateOne(
    { _id: LOCK_ID, operationId },
    { $set: { expiresAt: new Date(Date.now() + LOCK_TTL_MS) } },
  );
}

export async function releaseBackupLock(operationId: string) {
  await (await mongoCollection<BackupLock>("websiteBackupLocks")).deleteOne({ _id: LOCK_ID, operationId });
}

export async function assertNoRestoreInProgress() {
  await removeExpiredLock();
  const lock = await (await mongoCollection<BackupLock>("websiteBackupLocks")).findOne(
    { _id: LOCK_ID, operation: "restore", expiresAt: { $gt: new Date() } },
    { projection: { _id: 1 } },
  );
  if (lock) throw new BackupBusyError("The website is being restored. Try this change again after the restore finishes.");
}
