/**
 * Einmaliges Bootstrap für den ersten FLX-Rent-Administrator.
 *
 * - Fragt E-Mail und Passwort interaktiv ab (Passwort ohne Echo).
 * - Hasht mit bcryptjs, Kostenfaktor 12 (wie users.ts / NextAuth-Vergleich).
 * - Legt genau einen aktiven ADMIN an.
 * - Bricht ab, wenn bereits ein ADMIN existiert.
 * - Ändert keine anderen Geschäftsdaten.
 *
 * Aufruf: npm run bootstrap:admin
 * Keine Passwort-Argumente auf der Kommandozeile verwenden.
 */

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 12;

const prisma = new PrismaClient();

function assertNoPasswordArgs() {
  const dangerous = process.argv.slice(2).some((arg) => {
    const lower = arg.toLowerCase();
    return (
      lower.startsWith("--password") ||
      lower.startsWith("-p=") ||
      lower === "-p" ||
      lower.startsWith("password=")
    );
  });
  if (dangerous) {
    throw new Error(
      "Passwort darf nicht als Kommandozeilenargument übergeben werden. Bitte interaktiv eingeben."
    );
  }
}

async function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = input;
    const stdout = output;

    if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
      reject(
        new Error(
          "Kein interaktives Terminal. Bitte in einem lokalen Terminal ausführen: npm run bootstrap:admin"
        )
      );
      return;
    }

    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let value = "";

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
    };

    const onData = (chunk: string) => {
      const chars = chunk.split("");
      for (const char of chars) {
        if (char === "\n" || char === "\r" || char === "\u0004") {
          cleanup();
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u0003") {
          cleanup();
          stdout.write("\n");
          reject(new Error("Abgebrochen."));
          return;
        }
        if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        if (char < " " && char !== "\t") {
          continue;
        }
        value += char;
      }
    };

    stdin.on("data", onData);
  });
}

async function readLine(prompt: string): Promise<string> {
  const rl = createInterface({ input, output });
  try {
    return (await rl.question(prompt)).trim();
  } finally {
    rl.close();
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function main() {
  assertNoPasswordArgs();

  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true, email: true, isActive: true, createdAt: true },
  });

  if (existingAdmin) {
    console.log("Es existiert bereits ein Administrator.");
    console.log(`E-Mail: ${existingAdmin.email}`);
    console.log(`Aktiv: ${existingAdmin.isActive}`);
    console.log("Es wurde nichts verändert.");
    return;
  }

  console.log("FLX Rent – Erstanlage Administrator");
  console.log("Das Passwort wird nicht angezeigt und nicht protokolliert.\n");

  const emailRaw = await readLine("E-Mail: ");
  const email = emailRaw.trim().toLowerCase();
  if (!isValidEmail(email)) {
    throw new Error("Ungültige E-Mail-Adresse.");
  }

  const emailTaken = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (emailTaken) {
    throw new Error("Diese E-Mail-Adresse ist bereits vergeben.");
  }

  const firstName = (await readLine("Vorname [Admin]: ")) || "Admin";
  const lastName = (await readLine("Nachname [FLX]: ")) || "FLX";

  const password = await readHidden("Passwort (min. 12 Zeichen): ");
  const passwordConfirm = await readHidden("Passwort wiederholen: ");

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben.`);
  }
  if (password !== passwordConfirm) {
    throw new Error("Passwörter stimmen nicht überein.");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Passwortvariablen so früh wie möglich verwerfen
  password.replace(/./g, "\0");
  passwordConfirm.replace(/./g, "\0");

  const created = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: "ADMIN",
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  console.log("\nAdministrator angelegt.");
  console.log(`E-Mail: ${created.email}`);
  console.log(`Name: ${created.firstName} ${created.lastName}`);
  console.log(`Rolle: ${created.role}`);
  console.log(`Aktiv: ${created.isActive}`);
  console.log(`ID: ${created.id}`);
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    console.error(`Fehler: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
