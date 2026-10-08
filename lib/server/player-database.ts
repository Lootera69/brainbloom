import type { Firestore } from "firebase-admin/firestore";
import type { Data, PlayerDatabase, PlayerTransaction } from "@/lib/server/player-engine";
import { readScoringPuzzle } from "@/lib/server/player-puzzles";

export function playerDatabase(db: Firestore): PlayerDatabase {
  return {
    transaction: (work) => db.runTransaction(async (transaction) => {
      const writes: { path: string; data: Data; merge: boolean }[] = [];
      const view: PlayerTransaction = {
        get: async (path) => (await transaction.get(db.doc(path))).data(),
        getAll: async (paths) => {
          const refs = paths.flatMap((path) => path === null ? [] : [db.doc(path)]);
          const snapshots = refs.length ? await transaction.getAll(...refs) : [];
          let index = 0;
          return paths.map((path) => path === null ? undefined : snapshots[index++].data());
        },
        publishedPuzzles: async () => {
          const snapshot = await transaction.get(db.collection("puzzles").where("published", "==", true));
          return snapshot.docs.map((doc) => readScoringPuzzle(doc.id, doc.data())).filter((puzzle) => puzzle !== null);
        },
        put: (path, data, merge = false) => { writes.push({ path, data, merge }); },
      };
      const result = await work(view);
      for (const write of writes) transaction.set(db.doc(write.path), write.data, { merge: write.merge });
      return result;
    }),
  };
}
