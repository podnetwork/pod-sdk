use anyhow::anyhow;
use base64::Engine;
use serde::{Deserialize, Serialize, Serializer};
use utoipa::ToSchema;

pub const DEFAULT_QUERY_LIMIT: usize = 100;

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct CursorPaginationRequest {
    #[serde(default)]
    pub cursor: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: Option<usize>,
    #[serde(default)]
    pub newest_first: Option<bool>,
}

#[derive(Debug, Clone)]
pub struct CursorPagination {
    pub cursor_start: Option<String>,
    pub cursor_end: Option<String>,
    pub limit: usize,
    pub newest_first: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ApiPaginatedResult<T: Serialize> {
    pub items: Vec<T>,
    #[serde(serialize_with = "serialize_cursor")]
    pub cursor: Option<(String, String)>,
}

pub fn serialize_cursor<S>(
    cursor: &Option<(String, String)>,
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match cursor {
        Some((start, end)) => {
            let cursor_str = format!("{start}|{end}");
            let encoded = base64::engine::general_purpose::STANDARD.encode(cursor_str);
            serializer.serialize_str(&encoded)
        }
        None => serializer.serialize_none(),
    }
}

fn default_limit() -> Option<usize> {
    Some(DEFAULT_QUERY_LIMIT)
}

impl CursorPaginationRequest {
    pub fn new(cursor: Option<String>, limit: Option<usize>, newest_first: Option<bool>) -> Self {
        Self {
            cursor,
            limit,
            newest_first,
        }
    }
}

impl Default for CursorPaginationRequest {
    fn default() -> Self {
        Self {
            cursor: None,
            limit: Some(DEFAULT_QUERY_LIMIT),
            newest_first: Some(true),
        }
    }
}

impl TryFrom<CursorPaginationRequest> for CursorPagination {
    type Error = anyhow::Error;

    fn try_from(request: CursorPaginationRequest) -> Result<Self, Self::Error> {
        let (cursor_start, cursor_end) = match request.cursor.clone() {
            Some(cursor) => {
                let decoded = base64::engine::general_purpose::STANDARD
                    .decode(&cursor)
                    .map_err(|e| anyhow!("Failed to decode cursor: {e}"))?;
                let decoded_str = String::from_utf8(decoded)
                    .map_err(|e| anyhow!("Failed to decode cursor as UTF-8: {e}"))?;
                let parts: Vec<&str> = decoded_str.split('|').collect();

                if parts.len() != 2 {
                    (None, None)
                } else {
                    (Some(parts[0].to_string()), Some(parts[1].to_string()))
                }
            }
            None => (None, None),
        };

        if request.newest_first.is_some() && request.cursor.is_some() {
            return Err(anyhow!(
                "Cannot have both newest_first and a cursor specified"
            ));
        }

        Ok(CursorPagination {
            cursor_start,
            cursor_end,
            limit: request.limit.unwrap_or(DEFAULT_QUERY_LIMIT),
            newest_first: request.newest_first,
        })
    }
}
