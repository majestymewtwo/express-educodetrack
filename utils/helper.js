const xss = require("xss");

const clean = (v) => (typeof v === "string" ? xss(v.trim()) : v);

const isValidLength = (value, min, max) => {
  if (typeof value !== "string") return false;
  const len = value.trim().length;
  return len >= min && len <= max;
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

module.exports = {
  clean,
  isValidLength,
  isValidEmail
};
