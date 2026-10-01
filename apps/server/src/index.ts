import os from "node:os";
import { buildApp } from "./app";
import { DB_PATH, initDb } from "./db/client";
import { seedIfEmpty } from "./db/seed";
import { scheduleBackups } from "./modules/backup/service";

const PORT = Number(process.env.PORT ?? 3000);

function lanAddresses(): string[] {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i): i is os.NetworkInterfaceInfo => !!i && i.family === "IPv4" && !i.internal)
    .map((i) => i.address);
}

async function main() {
  initDb();
  seedIfEmpty();
  const app = await buildApp();
  scheduleBackups((msg) => console.error(msg));
  await app.listen({ port: PORT, host: "0.0.0.0" });

  console.log("");
  console.log("  ==============================================");
  console.log("   Logiciel du garage démarré");
  console.log(`   Sur ce PC      : http://localhost:${PORT}`);
  for (const ip of lanAddresses()) console.log(`   Sur la tablette : http://${ip}:${PORT}`);
  console.log(`   Base de données : ${DB_PATH}`);
  console.log("   Laissez cette fenêtre ouverte pendant l'utilisation.");
  console.log("  ==============================================");
  console.log("");
}

main().catch((err) => {
  console.error("Impossible de démarrer :", err);
  process.exit(1);
});
