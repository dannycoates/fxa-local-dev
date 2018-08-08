// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, you can obtain one at https://mozilla.org/MPL/2.0/.

use socketlabs::{
    error::Error as SocketLabsError, message::Message, request::Request,
    response::PostMessageErrorCode,
};

use super::{Headers, Provider};
use app_errors::{AppError, AppErrorKind, AppResult};
use settings::{Sender, Settings, SocketLabs as SocketLabsSettings};

pub struct SocketLabsProvider {
    settings: SocketLabsSettings,
    sender: Sender,
}

impl SocketLabsProvider {
    pub fn new(settings: &Settings) -> SocketLabsProvider {
        SocketLabsProvider {
            settings: settings.socketlabs.clone().expect("socketlabs settings"),
            sender: settings.sender.clone(),
        }
    }
}

impl Provider for SocketLabsProvider {
    fn send(
        &self,
        to: &str,
        cc: &[&str],
        headers: Option<&Headers>,
        subject: &str,
        body_text: &str,
        body_html: Option<&str>,
    ) -> AppResult<String> {
        let mut message = Message::new(
            self.sender.address.0.clone(),
            Some(self.sender.name.0.clone()),
        );
        message.add_to(to, None);
        for address in cc.iter() {
            message.add_cc(*address, None);
        }
        if let Some(headers) = headers {
            message.add_headers(headers.clone());
        }
        message.set_subject(subject);
        message.set_text(body_text);
        if let Some(html) = body_html {
            message.set_html(html);
        }

        Request::new(
            self.settings.serverid,
            self.settings.key.clone(),
            vec![message],
        )?.send()
        .map_err(From::from)
        .and_then(|response| {
            if response.error_code == PostMessageErrorCode::Success {
                Ok("".to_string())
            } else {
                Err(AppErrorKind::ProviderError {
                    name: String::from("SocketLabs"),
                    description: format!("{:?}: {}", response.error_code, response.error_code),
                }.into())
            }
        })
    }
}

impl From<SocketLabsError> for AppError {
    fn from(error: SocketLabsError) -> AppError {
        AppErrorKind::ProviderError {
            name: String::from("SocketLabs"),
            description: format!("{}", error),
        }.into()
    }
}
