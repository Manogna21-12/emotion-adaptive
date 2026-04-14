const errorHandler = (err, req, res, next) => {
  console.error('Error Trace:', err.stack);
  
  // If no status code is set, default to 500 internal server error
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = errorHandler;
