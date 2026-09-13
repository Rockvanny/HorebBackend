function maskEmail(email) {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const visible = user.slice(0, 1);
  return `${visible}${'*'.repeat(Math.max(user.length - 1, 3))}@${domain}`;
}

module.exports = { maskEmail };
