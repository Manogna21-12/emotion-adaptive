const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Return early with validation errors formatted
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }
  
  // Proceed to next middleware or controller if valid
  next();
};

module.exports = validate;
