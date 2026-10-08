import type { Firestore } from 'firebase-admin/firestore';
import { expect, it, vi } from 'vitest';
import { playerDatabase } from '@/lib/server/player-database';
import type { PlayerTransaction } from '@/lib/server/player-engine';

function fixture() {
  const getAll = vi.fn(async (...refs: {path:string}[]) => refs.map(({path}) => ({data: () => path === 'items/missing' ? undefined : {path}})));
  const get = vi.fn();
  const set = vi.fn();
  const tx = {getAll, get, set};
  const db = {doc: (path:string) => ({path}), runTransaction: async (work: (value:typeof tx) => Promise<unknown>) => work(tx)};
  return {db, tx, adapter: playerDatabase(db as unknown as Firestore)};
}

it('reads a document group with one database call while preserving optional and missing slots', async () => {
  const {adapter, tx} = fixture();
  const result = await adapter.transaction(view => view.getAll(['items/first', null, 'items/missing', 'items/last']));
  expect(result).toEqual([{path:'items/first'}, undefined, undefined, {path:'items/last'}]);
  expect(tx.getAll).toHaveBeenCalledExactlyOnceWith({path:'items/first'}, {path:'items/missing'}, {path:'items/last'});
  expect(tx.get).not.toHaveBeenCalled();
});

it('skips the database for an empty group', async () => {
  const {adapter, tx} = fixture();
  expect(await adapter.transaction(view => view.getAll([null, null]))).toEqual([undefined, undefined]);
  expect(tx.getAll).not.toHaveBeenCalled();
});

it('does not apply queued writes if a grouped read fails', async () => {
  const {adapter, tx} = fixture();
  tx.getAll.mockRejectedValueOnce(new Error('read failed'));
  await expect(adapter.transaction(async view => {
    view.put('items/reward', {xp:20});
    await view.getAll(['items/first']);
  })).rejects.toThrow('read failed');
  expect(tx.set).not.toHaveBeenCalled();
});

it('reads fresh data on each Firestore transaction retry', async () => {
  const {db, tx} = fixture();
  tx.getAll.mockResolvedValueOnce([{data:()=>({path:'original'})}]).mockResolvedValueOnce([{data:()=>({path:'retry'})}]);
  const retryDb = {...db, runTransaction: async (work: (value:typeof tx) => Promise<unknown>) => {await work(tx); return work(tx);}};
  const adapter = playerDatabase(retryDb as unknown as Firestore);
  const result = await adapter.transaction((view:PlayerTransaction) => view.getAll(['items/first']));
  expect(result).toEqual([{path:'retry'}]);
  expect(tx.getAll).toHaveBeenCalledTimes(2);
});
