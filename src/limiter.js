import flameLimit from "flame-limit";

const limiter = flameLimit({
  limit: 6,
  windowMs: 30 * 1000,
  strategy: "token",
  onLimit: (req, res, next, resetTime) => {
    res.writeHead(429);
    res.end();
    next();
  },
});

export default function limiterMiddleware(ctx) {
  return new Promise((resolve) => {
    limiter(ctx.req, ctx.res, () => {
      resolve();
    });
  });
}
