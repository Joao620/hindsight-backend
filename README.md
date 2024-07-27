# TinySync

> A public WebSocket synchronizer server for TinyBase.

## Usage

Point your clients' WebSocket connection to `wss://tinysync.crz.li/<channel>` replacing `<channel>` with a channel key of your choosing. Stores connected to the same channel will synchronize with each other.

> ⚠️ Channel key can't be empty, i.e. connecting to `wss://tinysync.crz.li/` won't work.

### Example

```js
const channelKey = "my-application/a-room";
const mergeableStore = createMergeableStore();
const synchronizer = await createWsSynchronizer(
  mergeableStore,
  new WebSocket(`wss://tinysync.crz.li/${channelKey}`)
);
await synchronizer.startSync();
```

Read the [TinyBase documentation](https://tinybase.org/guides/synchronization/) for more information.

## Legal

By pointing your application or software to connect to `wss://tinysync.crz.li` you agree to be **lawful good**. We reserve the right to monitor, restrict, or terminate access at any time without notice. Your use of this server is at your own risk, and we are not liable for any damages or losses resulting from its use.

This software is not endorsed by or affiliated with TinyBase. It is provided as is, without warranty of any kind, under the terms of [Apache License, Version 2.0](./LICENSE.md).
