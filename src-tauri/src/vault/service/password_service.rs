use rand::rngs::OsRng;
use rand::seq::SliceRandom;
use rand::Rng;

use crate::vault::dto::secret_dto::GeneratePasswordOptions;
use crate::vault::error::VaultError;

const MIN_PASSWORD_LENGTH: usize = 12;
const UPPERCASE_CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE_CHARS: &[u8] = b"abcdefghijklmnopqrstuvwxyz";
const DIGIT_CHARS: &[u8] = b"0123456789";
const SYMBOL_CHARS: &[u8] = b"!@#$%^&*()-_=+[]{};:,.<>?/|~";

pub struct PasswordService;

impl PasswordService {
    pub fn generate_password(
        &self,
        options: &GeneratePasswordOptions,
    ) -> Result<String, VaultError> {
        Self::validate_options(options)?;

        let mut character_sets = Vec::new();
        if options.include_uppercase {
            character_sets.push(Self::build_charset(
                UPPERCASE_CHARS,
                options.exclude_ambiguous,
            ));
        }
        if options.include_lowercase {
            character_sets.push(Self::build_charset(
                LOWERCASE_CHARS,
                options.exclude_ambiguous,
            ));
        }
        if options.include_digits {
            character_sets.push(Self::build_charset(DIGIT_CHARS, options.exclude_ambiguous));
        }
        if options.include_symbols {
            character_sets.push(Self::build_charset(SYMBOL_CHARS, options.exclude_ambiguous));
        }

        let mut all_characters = Vec::new();
        for character_set in &character_sets {
            all_characters.extend_from_slice(character_set);
        }

        if all_characters.is_empty() {
            return Err(VaultError::Validation(
                "password generator has no available characters".to_string(),
            ));
        }

        let mut rng = OsRng;
        let mut password_bytes = Vec::with_capacity(options.length);

        for character_set in &character_sets {
            let next_index = rng.gen_range(0..character_set.len());
            password_bytes.push(character_set[next_index]);
        }

        while password_bytes.len() < options.length {
            let next_index = rng.gen_range(0..all_characters.len());
            password_bytes.push(all_characters[next_index]);
        }

        password_bytes.shuffle(&mut rng);

        Ok(String::from_utf8(password_bytes)
            .expect("password generator uses ASCII characters only"))
    }

    fn validate_options(options: &GeneratePasswordOptions) -> Result<(), VaultError> {
        if options.length < MIN_PASSWORD_LENGTH {
            return Err(VaultError::Validation(format!(
                "password length must be at least {MIN_PASSWORD_LENGTH}"
            )));
        }

        if !options.include_uppercase
            && !options.include_lowercase
            && !options.include_digits
            && !options.include_symbols
        {
            return Err(VaultError::Validation(
                "at least one password character set must be enabled".to_string(),
            ));
        }

        Ok(())
    }

    fn build_charset(characters: &[u8], exclude_ambiguous: bool) -> Vec<u8> {
        if !exclude_ambiguous {
            return characters.to_vec();
        }

        characters
            .iter()
            .copied()
            .filter(|character| {
                !matches!(*character as char, '0' | '1' | 'I' | 'O' | 'i' | 'l' | 'o')
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::{PasswordService, MIN_PASSWORD_LENGTH};
    use crate::vault::dto::secret_dto::GeneratePasswordOptions;
    use crate::vault::error::VaultError;

    fn default_options() -> GeneratePasswordOptions {
        GeneratePasswordOptions {
            length: 20,
            include_uppercase: true,
            include_lowercase: true,
            include_digits: true,
            include_symbols: true,
            exclude_ambiguous: false,
        }
    }

    #[test]
    fn generated_password_matches_requested_length() {
        let service = PasswordService;
        let options = GeneratePasswordOptions {
            length: 32,
            ..default_options()
        };

        let password = service.generate_password(&options).unwrap();

        assert_eq!(password.len(), 32);
    }

    #[test]
    fn generated_password_includes_requested_character_classes() {
        let service = PasswordService;
        let password = service.generate_password(&default_options()).unwrap();

        assert!(password
            .chars()
            .any(|character| character.is_ascii_uppercase()));
        assert!(password
            .chars()
            .any(|character| character.is_ascii_lowercase()));
        assert!(password.chars().any(|character| character.is_ascii_digit()));
        assert!(password
            .chars()
            .any(|character| !character.is_ascii_alphanumeric()));
    }

    #[test]
    fn generated_password_rejects_invalid_options() {
        let service = PasswordService;

        let short_password_error = service
            .generate_password(&GeneratePasswordOptions {
                length: MIN_PASSWORD_LENGTH - 1,
                ..default_options()
            })
            .unwrap_err();
        let no_charset_error = service
            .generate_password(&GeneratePasswordOptions {
                length: 20,
                include_uppercase: false,
                include_lowercase: false,
                include_digits: false,
                include_symbols: false,
                exclude_ambiguous: false,
            })
            .unwrap_err();

        assert!(matches!(short_password_error, VaultError::Validation(_)));
        assert!(matches!(no_charset_error, VaultError::Validation(_)));
    }

    #[test]
    fn generated_password_excludes_ambiguous_characters_when_requested() {
        let service = PasswordService;
        let options = GeneratePasswordOptions {
            length: 40,
            exclude_ambiguous: true,
            ..default_options()
        };

        let password = service.generate_password(&options).unwrap();

        assert!(!password
            .chars()
            .any(|character| matches!(character, '0' | '1' | 'I' | 'O' | 'i' | 'l' | 'o')));
    }
}
