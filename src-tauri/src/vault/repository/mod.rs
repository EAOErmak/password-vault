pub mod account_repository;
pub mod platform_repository;
pub mod secret_repository;
pub mod value_repository;

use rusqlite::{Connection, Transaction};

pub(crate) trait SqlExecutor {
    fn connection(&self) -> &Connection;
}

impl SqlExecutor for Connection {
    fn connection(&self) -> &Connection {
        self
    }
}

impl<'connection> SqlExecutor for Transaction<'connection> {
    fn connection(&self) -> &Connection {
        self
    }
}
