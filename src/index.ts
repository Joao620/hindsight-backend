/// <reference types="../worker-configuration.d.ts" />

import {
  WsServerDurableObject,
  getWsServerDurableObjectFetch,
} from 'tinybase/synchronizers/synchronizer-ws-server-durable-object';
import { createMergeableStore } from 'tinybase';
import { createDurableObjectSqlStoragePersister } from 'tinybase/persisters/persister-durable-object-sql-storage';
import type { MergeableStore, IdAddedOrRemoved } from 'tinybase';
import type { Persister, Persists } from 'tinybase/persisters';

// ────────────────────────────────────────────────────────────────────────────
// Environment bindings
// ────────────────────────────────────────────────────────────────────────────

interface Env {
  ROOMS: DurableObjectNamespace<RetroRoomDO>;
  LOGS_API_URL: string;
  BASIC_AUTH_USER: string;
  BASIC_AUTH_PASS: string;
}

// Maps TinyBase table names → logs API endpoints
const TABLE_TO_ENDPOINT: Record<string, string> = {
  users: '/api/users',
  boards: '/api/boards',
  columns: '/api/board-columns',
  cards: '/api/cards',
};

// ────────────────────────────────────────────────────────────────────────────
// Durable Object — one instance per room path
// ────────────────────────────────────────────────────────────────────────────

export class RetroRoomDO extends WsServerDurableObject {
  private store: MergeableStore | undefined;
  private _env: Env;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this._env = env;
  }

  createPersister(): Persister<Persists.MergeableStoreOnly> {
    const store = createMergeableStore();
    this.store = store;

    // React to data changes and forward them to the logs API
    this.setupMetricsListeners(store);

    return createDurableObjectSqlStoragePersister(
      store,
      this.ctx.storage.sql,
      {
        mode: 'fragmented',
        storagePrefix: 'retro_',
      },
    );
  }

  // ── Metrics listeners ──────────────────────────────────────────────────

  private setupMetricsListeners(store: MergeableStore): void {
    // Row data changed in any table → POST to the matching API endpoint
    store.addRowListener(null, null, (s, tableId, rowId) => {
      const endpoint = TABLE_TO_ENDPOINT[tableId];
      if (!endpoint) return; // table not tracked

      const rowData = s.getRow(tableId, rowId);
      if (Object.keys(rowData).length === 0) return; // row was deleted

      this.forwardToApi(endpoint, rowId, rowData);
    });

    // Any Value changed (e.g. participants_count) → POST to /api/participants
    store.addValueListener(null, (s, valueId, newValue) => {
      if (valueId === 'participants_count' && typeof newValue === 'number') {
        this.forwardToApi('/api/participants', valueId, { count: newValue });
      }
    });
  }

  // ── API forwarder ──────────────────────────────────────────────────────

  private async forwardToApi(
    endpoint: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const base = this._env.LOGS_API_URL.replace(/\/+$/, '');
    const url = `${base}${endpoint}`;
    console.log(url)
    const body = { id, ...data };

    const auth = btoa(
      `${this._env.BASIC_AUTH_USER}:${this._env.BASIC_AUTH_PASS}`,
    );

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        console.error(
          `[METRICS] POST ${endpoint} → ${res.status} ${await res.text().catch(() => '')}`,
        );
      }
    } catch (e) {
      console.error(`[METRICS] POST ${endpoint} failed:`, e);
    }
  }

  // ── TinyBase lifecycle hooks ───────────────────────────────────────────

  onClientId(
    pathId: string,
    clientId: string,
    addedOrRemoved: IdAddedOrRemoved,
  ): void {
    const count = this.getClientIds().length;
    const action = addedOrRemoved === 1 ? 'JOIN' : 'LEAVE';

    console.info(
      `[${action}] client=${clientId} path=${pathId} remaining=${count}`,
    );

    if (this.store) {
      this.store.setValue('participants_count', count);
    }
  }

  onPathId(pathId: string, addedOrRemoved: IdAddedOrRemoved): void {
    const action = addedOrRemoved === 1 ? 'CREATED' : 'EMPTIED';
    console.info(`[ROOM ${action}] path=${pathId}`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Worker entry point — routes WebSocket upgrades to Durable Objects
// ────────────────────────────────────────────────────────────────────────────

export default {
  fetch: getWsServerDurableObjectFetch('ROOMS'),
};
