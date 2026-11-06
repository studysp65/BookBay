// Account controller: a customer views and updates their own details.
// The user id always comes from the login token (req.user.id), never from the
// request, so nobody can view or change another person's account.
const bcrypt = require('bcryptjs');
const { matchedData } = require('express-validator');
const userModel = require('../models/userModel');
const { securityLog } = require('../utils/logger');
const AppError = require('../utils/AppError');

// GET /api/v1/account
const getAccount = async (req, res) => {
  const user = await userModel.findById(req.user.id);
  if (!user) {
    throw new AppError(404, 'Account not found.');
  }
  res.status(200).json({ status: 'success', data: { user } });
};

// PUT /api/v1/account
const updateAccount = async (req, res) => {
  const { name, email, address, currentPassword, newPassword } = matchedData(req);

  const user = await userModel.findByIdWithPassword(req.user.id);
  if (!user) {
    throw new AppError(404, 'Account not found.');
  }

  const emailChanged = email !== user.email;

  // Changing the email or password needs the current password
  if (emailChanged || newPassword) {
    if (!currentPassword) {
      throw new AppError(400, 'Please enter your current password to change your email or password.');
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      securityLog('account_update_wrong_password', { userId: user.id, ip: req.ip });
      // 400, not 401: the user IS logged in, they just typed the wrong password
      throw new AppError(400, 'Your current password is incorrect.');
    }
  }

  if (emailChanged) {
    const existing = await userModel.findByEmailWithPassword(email);
    if (existing) {
      throw new AppError(409, 'That email is already used by another account.');
    }
  }

  await userModel.updateDetails(user.id, {
    name,
    email,
    address: address ? address : null,
  });

  if (newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userModel.updatePassword(user.id, passwordHash);
    securityLog('password_changed', { userId: user.id, ip: req.ip });
  }

  const updated = await userModel.findById(user.id);
  res.status(200).json({
    status: 'success',
    message: 'Your details have been saved.',
    data: { user: updated },
  });
};

module.exports = { getAccount, updateAccount };
