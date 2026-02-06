import jwt from "jsonwebtoken";

/**
 * Generates a signed JWT token for a user
 * @param {String} userId - MongoDB _id of the user
 * @returns {String} - Signed JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

export default generateToken;
