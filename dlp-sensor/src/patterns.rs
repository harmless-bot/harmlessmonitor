use lazy_static::lazy_static;
use regex::Regex;
use std::sync::RwLock;
use serde::{Deserialize, Serialize};

#[derive(Clone)]
pub struct Pattern {
    pub id: String,
    pub name: String,
    pub regex: Option<Regex>,
    pub severity: u8,
    pub category: String,
    pub enabled: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RuleConfig {
    pub id: String,
    pub enabled: bool,
}

lazy_static! {
    pub static ref PATTERNS: RwLock<Vec<Pattern>> = RwLock::new(vec![
        Pattern {
            id: "CREDIT_CARD".to_string(),
            name: "Credit Cards".to_string(),
            regex: Some(Regex::new(r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})\b").unwrap()),
            severity: 8,
            category: "PII".to_string(),
            enabled: true,
        },
        Pattern {
            id: "SSN".to_string(),
            name: "Social Security Numbers".to_string(),
            regex: Some(Regex::new(r"\b\d{3}-\d{2}-\d{4}\b").unwrap()),
            severity: 10,
            category: "PII".to_string(),
            enabled: true,
        },
        Pattern {
            id: "JWT".to_string(),
            name: "JWT Tokens".to_string(),
            regex: Some(Regex::new(r"eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}").unwrap()),
            severity: 7,
            category: "AUTH".to_string(),
            enabled: true,
        },
        Pattern {
            id: "API_KEY".to_string(),
            name: "API Keys".to_string(),
            regex: Some(Regex::new(r#"(?i)(?:api[_-]?key|api[_-]?token|access[_-]?token)\s*[=:]\s*["']?([A-Za-z0-9_\-]{20,})"#).unwrap()),
            severity: 9,
            category: "AUTH".to_string(),
            enabled: true,
        },
        Pattern {
            id: "PRIVATE_KEY".to_string(),
            name: "Private Keys".to_string(),
            regex: Some(Regex::new(r"-----BEGIN (?:RSA )?PRIVATE KEY-----").unwrap()),
            severity: 10,
            category: "CRYPTO".to_string(),
            enabled: true,
        },
        Pattern {
            id: "EMAIL_BULK".to_string(),
            name: "Email Dumps".to_string(),
            regex: Some(Regex::new(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}").unwrap()),
            severity: 6,
            category: "PII".to_string(),
            enabled: true,
        }
    ]);
}

pub fn update_rules(configs: Vec<RuleConfig>) {
    if let Ok(mut patterns) = PATTERNS.write() {
        for p in patterns.iter_mut() {
            if let Some(cfg) = configs.iter().find(|c| c.id == p.id) {
                p.enabled = cfg.enabled;
            }
        }
    }
}
