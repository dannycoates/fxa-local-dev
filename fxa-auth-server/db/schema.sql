
CREATE TABLE IF NOT EXISTS accounts (
  uid BINARY(16) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE KEY,
  emailCode CHAR(8) NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  kA BINARY(32) NOT NULL,
  wrapKb BINARY(32) NOT NULL,
  authSalt BINARY(32) NOT NULL,
  verifyHash BINARY(32) NOT NULL
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS srpTokens (
  tokenid BINARY(32) PRIMARY KEY,
  tokendata BINARY(32) NOT NULL,
  uid BINARY(16) NOT NULL,
  INDEX srp_uid (uid)
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS authTokens (
  tokenid BINARY(32) PRIMARY KEY,
  tokendata BINARY(32) NOT NULL,
  uid BINARY(16) NOT NULL,
  INDEX auth_uid (uid)
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS sessionTokens (
  tokenid BINARY(32) PRIMARY KEY,
  tokendata BINARY(32) NOT NULL,
  uid BINARY(16) NOT NULL,
  INDEX session_uid (uid)
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS keyfetchTokens (
  tokenid BINARY(32) PRIMARY KEY,
  tokendata BINARY(32) NOT NULL,
  uid BINARY(16) NOT NULL,
  INDEX key_uid (uid)
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS resetTokens (
  tokenid BINARY(32) PRIMARY KEY,
  tokendata BINARY(32) NOT NULL,
  uid BINARY(16) NOT NULL UNIQUE KEY
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS passwordForgotTokens (
  tokenid BINARY(32) PRIMARY KEY,
  tokendata BINARY(32) NOT NULL,
  uid BINARY(16) NOT NULL UNIQUE KEY,
  passcode INT UNSIGNED NOT NULL,
  created BIGINT UNSIGNED NOT NULL,
  tries SMALLINT UNSIGNED NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS passwordChangeTokens (
  tokenid BINARY(32) PRIMARY KEY,
  tokendata BINARY(32) NOT NULL,
  uid BINARY(16) NOT NULL,
  verifyHash BINARY(32) NOT NULL,
  authSalt BINARY(32) NOT NULL,
  INDEX session_uid (uid)
) ENGINE=InnoDB;
