export default class MySimpleRouter {
  constructor() {
    /**
     * @type {Array<{method: string, path: string, handler: Function, parts: Array<string>, paramIndexes: Array<number>}>}
     */
    this.routes = [];
  }

  register(method, path, handler) {
    const parts = path.split("/").filter(Boolean);
    const paramIndexes = [];
    parts.forEach((part, i) => {
      if (part.startsWith(":")) paramIndexes.push(i);
    });
    this.routes.push({ method, path, handler, parts, paramIndexes });
  }

  /**
   * 
   * @param {string} path 
   * @param {import('koa').Middleware} handler 
   */
  get(path, handler) {
    this.register("GET", path, handler);
  }

  /**
   * 
   * @param {string} path 
   * @param {import('koa').Middleware} handler 
   */
  post(path, handler) {
    this.register("POST", path, handler);
  }

  routesMiddleware() {
    /**
     * @param {import('koa').Context} ctx 
     */
    return async (ctx, next) => {
      // /rooms/:id
      const reqParts = ctx.path.split("/").filter(Boolean);
      for (const route of this.routes) {
        if (ctx.method !== route.method) continue;
        if (route.parts.length !== reqParts.length) continue;

        const params = {};
        let matched = true;
        for (let i = 0; i < route.parts.length; i++) {
          const part = route.parts[i];
          if (part.startsWith(":")) {
            params[part.slice(1)] = reqParts[i];
          } else if (part !== reqParts[i]) {
            matched = false;
            break;
          }
        }

        if (matched) {
          ctx.params = params;
          await route.handler(ctx);
          return;
        }
      }
      await next();
    };
  }
}