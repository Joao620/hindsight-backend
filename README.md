# TinyBase Synchronizer

> A public WebSocket synchronizer server for TinyBase.

## Usage

Channels are keyed by the request path, so different synchronization contexts can happen without interfering with each other.

```js
const serverKey = "my-application/some-channel";
const mergeableStore = createMergeableStore();
const synchronizer = await createWsSynchronizer(
  mergeableStore,
  new WebSocket(`wss://tinybase-synchronizer.crz.li/${serverKey}`)
);
await synchronizer.startSync();
```

Read the [TinyBase documentation](https://tinybase.org/guides/synchronization/) for more information.

## Legal

By pointing your application or software to connect to `wss://tinybase-synchronizer.crz.li` you agree to be **lawful good**. We reserve the right to monitor, restrict, or terminate access at any time without notice. Your use of this server is at your own risk, and we are not liable for any damages or losses resulting from its use.

This software is not endorsed by or affiliated with TinyBase. It is provided as is, without warranty of any kind, under the terms of [Apache License, Version 2.0](./LICENSE.md).
