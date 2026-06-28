const { HttpError } = require('./errors');

const USERNAME_REGEX = /^[a-zA-Z0-9_\u4e00-\u9fff]{2,16}$/;

const isValidUsername = name => typeof name === 'string' && USERNAME_REGEX.test(name);

function requireValidUsername(username, message = 'Invalid username') {
  if (!isValidUsername(username)) throw new HttpError(400, message);
  return username;
}

function requireExistingUser(repository, username, message = 'User not found') {
  const user = repository.getUser(username);
  if (!user) throw new HttpError(404, message);
  return user;
}

module.exports = { isValidUsername, requireValidUsername, requireExistingUser };
