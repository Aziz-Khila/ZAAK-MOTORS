import { db } from "./client";
import { documentLines, parts, serviceTemplates, settings } from "./schema";

const d = (dinars: number) => Math.round(dinars * 1000);

const SAMPLE_PARTS = [
  { key: "huile", reference: "HUI-5W30-5L", designation: "Huile moteur 5W30 (bidon 5 L)", purchasePrice: d(55), salePrice: d(70), stock: 6, minStock: 2 },
  { key: "filtreHuile", reference: "FH-STD", designation: "Filtre à huile", purchasePrice: d(12), salePrice: d(18), stock: 10, minStock: 3 },
  { key: "filtreAir", reference: "FA-STD", designation: "Filtre à air", purchasePrice: d(15), salePrice: d(22), stock: 6, minStock: 2 },
  { key: "plaquettes", reference: "PLQ-AV", designation: "Plaquettes de frein avant (jeu)", purchasePrice: d(45), salePrice: d(65), stock: 4, minStock: 2 },
  { key: "disques", reference: "DSQ-AV", designation: "Disque de frein avant", purchasePrice: d(60), salePrice: d(85), stock: 4, minStock: 2 },
  { key: "embrayage", reference: "KIT-EMB", designation: "Kit embrayage", purchasePrice: d(250), salePrice: d(330), stock: 1, minStock: 0 },
  { key: "distribution", reference: "KIT-DIST", designation: "Kit distribution", purchasePrice: d(180), salePrice: d(250), stock: 1, minStock: 0 },
  { key: "pompeEau", reference: "PMP-EAU", designation: "Pompe à eau", purchasePrice: d(70), salePrice: d(95), stock: 1, minStock: 0 },
  { key: "amortisseur", reference: "AMO-AV", designation: "Amortisseur avant", purchasePrice: d(110), salePrice: d(150), stock: 2, minStock: 0 },
] as const;

type PartKey = (typeof SAMPLE_PARTS)[number]["key"];
type TemplateLine = { labor: string; hours: number } | { part: PartKey; qty: number };

const TEMPLATES: { name: string; category: string; lines: TemplateLine[] }[] = [
  { name: "Vidange", category: "Entretien", lines: [{ labor: "Vidange moteur", hours: 0.5 }, { part: "huile", qty: 1 }, { part: "filtreHuile", qty: 1 }] },
  { name: "Révision", category: "Entretien", lines: [{ labor: "Révision complète", hours: 1.5 }, { part: "huile", qty: 1 }, { part: "filtreHuile", qty: 1 }, { part: "filtreAir", qty: 1 }] },
  { name: "Remplacement plaquettes", category: "Freinage", lines: [{ labor: "Remplacement plaquettes avant", hours: 1 }, { part: "plaquettes", qty: 1 }] },
  { name: "Freinage (disques + plaquettes)", category: "Freinage", lines: [{ labor: "Remplacement disques et plaquettes avant", hours: 1.5 }, { part: "disques", qty: 2 }, { part: "plaquettes", qty: 1 }] },
  { name: "Remplacement embrayage", category: "Transmission", lines: [{ labor: "Remplacement kit embrayage", hours: 5 }, { part: "embrayage", qty: 1 }] },
  { name: "Distribution", category: "Moteur", lines: [{ labor: "Remplacement kit distribution + pompe à eau", hours: 4 }, { part: "distribution", qty: 1 }, { part: "pompeEau", qty: 1 }] },
  { name: "Diagnostic électronique", category: "Diagnostic", lines: [{ labor: "Diagnostic électronique (valise)", hours: 0.5 }] },
  { name: "Suspension (amortisseurs avant)", category: "Suspension", lines: [{ labor: "Remplacement amortisseurs avant", hours: 2 }, { part: "amortisseur", qty: 2 }] },
];

/** Données de départ, insérées uniquement lors du premier démarrage. */
export function seedIfEmpty() {
  const existing = db.select({ id: settings.id }).from(settings).get();
  if (existing) return;

  db.transaction((tx) => {
    tx.insert(settings).values({ id: 1, garageName: "Mon garage" }).run();

    const partIds = {} as Record<PartKey, { id: number; reference: string; designation: string; purchasePrice: number; salePrice: number }>;
    for (const { key, ...p } of SAMPLE_PARTS) {
      const row = tx.insert(parts).values(p).returning().get();
      partIds[key] = row;
    }

    for (const t of TEMPLATES) {
      const tpl = tx.insert(serviceTemplates).values({ name: t.name, category: t.category }).returning().get();
      t.lines.forEach((l, position) => {
        if ("labor" in l) {
          tx.insert(documentLines)
            .values({ docType: "template", docId: tpl.id, position, type: "main_oeuvre", designation: l.labor, quantity: l.hours, unitPrice: 0 })
            .run();
        } else {
          const p = partIds[l.part];
          tx.insert(documentLines)
            .values({
              docType: "template",
              docId: tpl.id,
              position,
              type: "piece",
              designation: p.designation,
              reference: p.reference,
              partId: p.id,
              quantity: l.qty,
              unitPrice: p.salePrice,
              unitCost: p.purchasePrice,
              total: Math.round(l.qty * p.salePrice),
            })
            .run();
        }
      });
    }
  });
}
