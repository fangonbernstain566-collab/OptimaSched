export const errorHandler = (err, req, res, next) => {
  console.error(`[🚨 Server Exception] Context: ${req.method} ${req.url}`);
  console.error(err.stack);

  // Default fallback values
  let statusCode = err.statusCode || 500;
  let message = err.message || "An unexpected inner system error occurred.";

  // Gracefully handle Prisma specific exceptions
  if (err.code && err.code.startsWith('P')) {
    statusCode = 400;
    message = `Database constraint error occurred (Code: ${err.code})`;
  }

  return res.status(statusCode).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  });
};