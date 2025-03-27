const errorHandler = (err, req, res, next) => {
  // Default error status code is 500 (Server Error)
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Set response status code
  res.status(statusCode);
  
  // Send JSON response with error details
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = { errorHandler };
