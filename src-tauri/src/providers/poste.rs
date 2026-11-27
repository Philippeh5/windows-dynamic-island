//! The user's own command post ("Poste"): plan limits of the machine where the
//! agents run, its announcements and the shared calendar, read from a small
//! token-protected gateway.
//!
//! The requests are made here, so the token stays in the Windows Credential
//! Manager and never reaches the webview. The address is the `poste.url`
//! setting. On first run both are taken over from the former Poste plugin
//! (`Documents\ile-poste\plugin.json`), when it is there.

use std::sync::Mutex;
use std::sync::Arc;
use std::sync::mpsc::{self, RecvTimeoutError, Sender};
use std::time::Duration;

use serde::Serialize;
use serde_json::{Value, json};
use tauri::Manager;

use super::{Provider, credentials, now_ms};
use crate::hub::Hub;
use crate::settings::{self, Settings};

pub const ID: &str = "poste";
const TOKEN_TARGET: &str = "dynamic-island:poste";
const URL_KEY: &str = "poste.url";
const STATE_EVERY: Duration = Duration::from_secs(12);
const AGENDA_EVERY_MS: u64 = 60_000;

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct State {
    configured: bool,
    connected: bool,
    quotas: Value,
    announces: Value,
    events: Value,
    agenda_error: Option<String>,
    /// The user's own to-do lists (Google Tasks).
    task_lists: Value,
    tasks_error: Option<String>,
}

#[derive(Default)]
pub struct PosteProvider {
    hub: Mutex<Option<Arc<Hub>>>,
    wake: Mutex<Option<Sender<()>>>,
}

fn saved_url(hub: &Hub) -> Option<String> {
    let value = hub.app().state::<Settings>().get(URL_KEY)?;
    let url = value.as_str()?.trim().trim_end_matches('/').to_string();
    url.starts_with("https://").then_some(url)
}

/// Takes the address and token over from the plugin this replaces.
fn adopt_plugin_config(hub: &Hub) {
    if saved_url(hub).is_some() && credentials::read(TOKEN_TARGET).is_some() {
        return;
    }
    let Ok(home) = std::env::var("USERPROFILE") else {
        return;
    };
    let file = std::path::Path::new(&home)
        .join("Documents")
        .join("ile-poste")
        .join("plugin.json");
    let Ok(text) = std::fs::read_to_string(file) else {
        return;
    };
    let Ok(manifest) = serde_json::from_str::<Value>(&text) else {
        return;
    };
    let default = |key: &str| {
        manifest["settings"]
            .as_array()?
            .iter()
            .find(|s| s["key"] == key)?["default"]
            .as_str()
            .filter(|v| !v.is_empty())
            .map(str::to_string)
    };
    if let Some(token) = default("token")
        && let Err(e) = credentials::write(TOKEN_TARGET, &token)
    {
        log::warn!("poste: token not saved: {e}");
    }
    if saved_url(hub).is_none()
        && let Some(url) = default("url")
    {
        settings::set(hub.app(), URL_KEY, Value::String(url));
    }
}

fn request(hub: &Hub, method: &str, path: &str, body: Option<&Value>) -> Result<Value, String> {
    let url = saved_url(hub).ok_or("not configured")?;
    let token = credentials::read(TOKEN_TARGET).ok_or("not configured")?;
    // https only and no redirects: the token goes to the configured host alone.
    let agent: ureq::Agent = ureq::Agent::config_builder()
        .https_only(true)
        .http_status_as_error(false)
        .max_redirects(0)
        .timeout_global(Some(Duration::from_secs(60)))
        .build()
        .into();
    let address = format!("{url}{path}");
    let bearer = format!("Bearer {token}");
    let response = match (method, body) {
        ("POST", body) => agent
            .post(&address)
            .header("Authorization", &bearer)
            .header("Content-Type", "application/json")
            .send(body.cloned().unwrap_or_else(|| json!({})).to_string()),
        _ => agent.get(&address).header("Authorization", &bearer).call(),
    };
    let mut response = response.map_err(|e| e.to_string())?;
    let text = response
        .body_mut()
        .read_to_string()
        .map_err(|e| e.to_string())?;
    let mut answer: Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    if answer["ok"] != true {
        return Err(answer["error"]["message"]
            .as_str()
            .unwrap_or("request refused")
            .to_string());
    }
    Ok(answer["data"].take())
}

/// An event id goes into the request path: nothing but id characters.
fn event_id(value: &Value) -> Result<&str, String> {
    value
        .as_str()
        .filter(|id| {
            !id.is_empty()
                && id
                    .chars()
                    .all(|c| c.is_ascii_alphanumeric() || "_@.-=".contains(c))
                && id.chars().any(|c| c != '.')
        })
        .ok_or_else(|| "invalid event id".to_string())
}

fn task_path(payload: &Value) -> Result<String, String> {
    Ok(format!(
        "/v1/gtasks/{}/{}",
        event_id(&payload["list"])?,
        event_id(&payload["task"])?
    ))
}

impl Provider for PosteProvider {
    fn id(&self) -> &'static str {
        ID
    }

    fn start(self: Arc<Self>, hub: Arc<Hub>) {
        let (tx, rx) = mpsc::channel();
        *self.hub.lock().unwrap() = Some(hub.clone());
        *self.wake.lock().unwrap() = Some(tx);
        std::thread::spawn(move || {
            adopt_plugin_config(&hub);
            let mut state = State::default();
            let mut agenda_at = 0u64;
            loop {
                state.configured =
                    saved_url(&hub).is_some() && credentials::read(TOKEN_TARGET).is_some();
                if state.configured {
                    match request(&hub, "GET", "/v1/state", None) {
                        Ok(data) => {
                            state.connected = true;
                            state.quotas = data["quotas"].clone();
                            state.announces = data["announces"].clone();
                        }
                        Err(e) => {
                            log::debug!("poste: {e}");
                            state.connected = false;
                        }
                    }
                    if state.connected && now_ms().saturating_sub(agenda_at) >= AGENDA_EVERY_MS {
                        agenda_at = now_ms();
                        match request(&hub, "GET", "/v1/agenda", None) {
                            Ok(data) => {
                                state.events = data["events"].clone();
                                state.agenda_error = None;
                            }
                            Err(e) => state.agenda_error = Some(e),
                        }
                        // The calendar shows up first: the to-do lists take longer to read.
                        hub.publish(ID, state.clone());
                        match request(&hub, "GET", "/v1/gtasks", None) {
                            Ok(data) => {
                                state.task_lists = data["lists"].clone();
                                state.tasks_error = None;
                            }
                            Err(e) => state.tasks_error = Some(e),
                        }
                    }
                }
                hub.publish(ID, state.clone());
                match rx.recv_timeout(STATE_EVERY) {
                    // Something changed: read the calendar again right away.
                    Ok(()) => agenda_at = 0,
                    Err(RecvTimeoutError::Timeout) => {}
                    Err(RecvTimeoutError::Disconnected) => return,
                }
            }
        });
    }

    fn action(&self, action: &str, payload: Value) -> Result<Value, String> {
        let hub = self.hub.lock().unwrap().clone().ok_or("not started")?;
        let result = match action {
            "refresh" => Ok(Value::Null),
            "saveEvent" => {
                let body = json!({
                    "title": payload["title"],
                    "start": payload["start"],
                    "minutes": payload["minutes"],
                });
                let path = match &payload["id"] {
                    Value::Null => "/v1/agenda".to_string(),
                    id => format!("/v1/agenda/{}", event_id(id)?),
                };
                request(&hub, "POST", &path, Some(&body))
            }
            "deleteEvent" => {
                let path = format!("/v1/agenda/{}/delete", event_id(&payload["id"])?);
                request(&hub, "POST", &path, Some(&json!({ "confirm": true })))
            }
            "addTask" => {
                let body = json!({ "list": payload["list"], "title": payload["title"], "due": payload["due"] });
                request(&hub, "POST", "/v1/gtasks", Some(&body))
            }
            "completeTask" => {
                let path = task_path(&payload)?;
                request(&hub, "POST", &path, Some(&json!({ "done": true })))
            }
            "deleteTask" => {
                let path = format!("{}/delete", task_path(&payload)?);
                request(&hub, "POST", &path, Some(&json!({ "confirm": true })))
            }
            _ => Err(format!("poste: unsupported action '{action}'")),
        };
        if let Some(wake) = self.wake.lock().unwrap().as_ref() {
            let _ = wake.send(());
        }
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn event_ids_cannot_change_the_path() {
        assert!(event_id(&json!("abc_123@google.com")).is_ok());
        for bad in ["", "..", "a/b", "a?b", "a b"] {
            assert!(event_id(&json!(bad)).is_err(), "{bad}");
        }
    }
}
