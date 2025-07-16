/**
 * Reads the request body from a Koa context as a Buffer, enforcing a max size limit.
 * 
 * @param {import('koa').Context} ctx - The Koa context object.
 * @param {number} maxSize - Maximum allowed size in bytes.
 * @returns {Promise<Buffer>} The full request body as a Buffer.
 * @throws {Error} If the request body exceeds the size limit.
 */
export default async function readRequestBodyBuffer(ctx, maxSize) {
  let size = 0;
  const chunks = [];

  for await (const chunk of ctx.req) {
    size += chunk.length;

    if (size > maxSize) {
      const err = new Error('Payload too large');
      err.status = 413;
      throw err;
    }

    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}
