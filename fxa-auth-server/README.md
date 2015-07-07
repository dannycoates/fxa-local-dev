Firefox Accounts Mailer
==========================

[![Build Status](https://travis-ci.org/mozilla/fxa-auth-mailer.svg?branch=master)](https://travis-ci.org/mozilla/fxa-auth-mailer)

Library to send out verification emails in the [fxa-auth-server](https://github.com/mozilla/fxa-auth-server/) which renders emails from a template (and handles localization).

The emails are written to postfix which tends sends them off to SES.

The auth-mailer also includes a restify API to send emails, but the auth server is using it as a library at the moment.

## Prerequisites

* node 0.10.x or higher
* npm
* postfix

## L10N

After updating a string in one of the templates in `./templates` you'll need to extract the strings using [this script](https://raw.githubusercontent.com/mozilla/fxa-content-server-l10n/master/scripts/extract_strings.sh):

``extract_strings.sh [--mailer-repo ./fxa-auth-mailer] [--content-repo ./fxa-content-server] [--l10n-repo ./fxa-content-server-l10n] train_number``