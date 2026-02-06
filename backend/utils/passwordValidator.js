/**
 * Password strength validator
 */
export const validatePasswordStrength = (password) => {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: errors.length === 0 ? 'strong' : 
              errors.length <= 2 ? 'medium' : 'weak'
  };
};

/**
 * Check if password is in common passwords list
 */
export const isCommonPassword = (password) => {
  const commonPasswords = [
    'password', '123456', '12345678', '123456789', '12345',
    'qwerty', 'abc123', 'password1', '1234567', 'admin',
    'letmein', 'welcome', 'monkey', 'sunshine', 'password123',
    'admin123', 'login', 'passw0rd', 'master', 'hello'
  ];
  
  return commonPasswords.includes(password.toLowerCase());
};