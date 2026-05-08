import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { generatePassword } from "../api/secretApi";
import {
  DEFAULT_GENERATED_PASSWORD_LENGTH,
  MIN_GENERATED_PASSWORD_LENGTH,
} from "../constants/security";
import type { GeneratePasswordOptions } from "../types";
import { getVaultErrorMessage } from "../../../lib/vault";

type PasswordGeneratorControlsProps = {
  disabled: boolean;
  onChangeValue: (value: string) => void;
  value: string;
};

const DEFAULT_PASSWORD_OPTIONS: GeneratePasswordOptions = {
  length: DEFAULT_GENERATED_PASSWORD_LENGTH,
  include_uppercase: true,
  include_lowercase: true,
  include_digits: true,
  include_symbols: true,
  exclude_ambiguous: false,
};

export function PasswordGeneratorControls({
  disabled,
  onChangeValue,
  value,
}: PasswordGeneratorControlsProps) {
  const feedbackTimerRef = useRef<number | null>(null);

  const [options, setOptions] = useState<GeneratePasswordOptions>(DEFAULT_PASSWORD_OPTIONS);
  const [generatorError, setGeneratorError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const enabledCharacterSets = [
    options.include_uppercase,
    options.include_lowercase,
    options.include_digits,
    options.include_symbols,
  ].filter(Boolean).length;
  const validationMessage =
    options.length < MIN_GENERATED_PASSWORD_LENGTH
      ? `Use at least ${MIN_GENERATED_PASSWORD_LENGTH} characters.`
      : enabledCharacterSets === 0
        ? "Select at least one character set."
        : null;

  const clearCopyFeedback = () => {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
    setCopyMessage(null);
  };

  const updateOptions = (patch: Partial<GeneratePasswordOptions>) => {
    setOptions((currentOptions) => ({
      ...currentOptions,
      ...patch,
    }));
    setGeneratorError(null);
    clearCopyFeedback();
  };

  const handleGenerate = async () => {
    if (validationMessage) {
      setGeneratorError(validationMessage);
      clearCopyFeedback();
      return;
    }

    setIsGenerating(true);
    setGeneratorError(null);
    clearCopyFeedback();

    try {
      const nextPassword = await generatePassword(options);
      onChangeValue(nextPassword);
    } catch (error) {
      setGeneratorError(getVaultErrorMessage(error));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    setGeneratorError(null);
    clearCopyFeedback();

    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard access is unavailable.");
      }

      await navigator.clipboard.writeText(value);
      setCopyMessage("Password copied to clipboard.");
      feedbackTimerRef.current = window.setTimeout(() => {
        setCopyMessage(null);
        feedbackTimerRef.current = null;
      }, 2000);
    } catch (error) {
      setGeneratorError(getVaultErrorMessage(error));
    }
  };

  const isBusy = disabled || isGenerating;

  return (
    <section className="generator-panel">
      <div className="generator-panel__header">
        <div 
          onClick={() => setIsExpanded(!isExpanded)} 
          style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
        >
          <h4>Password generator</h4>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>

        <div className="value-row__actions">
          <button
            className="button-secondary button-small"
            disabled={isBusy}
            onClick={() => {
              void handleGenerate();
            }}
            type="button"
          >
            {isGenerating ? "Generating..." : "Generate"}
          </button>
          {value.length > 0 ? (
            <button
              className="button-secondary button-small"
              disabled={isBusy}
              onClick={() => {
                void handleCopy();
              }}
              type="button"
            >
              Copy
            </button>
          ) : null}
        </div>
      </div>

      <div className={`generator-panel__collapsible ${isExpanded ? "is-expanded" : ""}`}>
        <div className="generator-grid">
          <label className="field">
            <span>Length</span>
            <input
              disabled={isBusy}
              min={MIN_GENERATED_PASSWORD_LENGTH}
              onChange={(event) =>
                updateOptions({
                  length: Number.parseInt(event.currentTarget.value, 10) || 0,
                })
              }
              type="number"
              value={options.length}
            />
          </label>

          <label className="checkbox-field generator-grid__checkbox--top">
            <input
              checked={options.include_uppercase}
              disabled={isBusy}
              onChange={(event) => updateOptions({ include_uppercase: event.currentTarget.checked })}
              type="checkbox"
            />
            <span>Uppercase</span>
          </label>

          <label className="checkbox-field">
            <input
              checked={options.include_lowercase}
              disabled={isBusy}
              onChange={(event) => updateOptions({ include_lowercase: event.currentTarget.checked })}
              type="checkbox"
            />
            <span>Lowercase</span>
          </label>

          <label className="checkbox-field">
            <input
              checked={options.include_digits}
              disabled={isBusy}
              onChange={(event) => updateOptions({ include_digits: event.currentTarget.checked })}
              type="checkbox"
            />
            <span>Digits</span>
          </label>

          <label className="checkbox-field">
            <input
              checked={options.include_symbols}
              disabled={isBusy}
              onChange={(event) => updateOptions({ include_symbols: event.currentTarget.checked })}
              type="checkbox"
            />
            <span>Symbols</span>
          </label>

          <label className="checkbox-field">
            <input
              checked={options.exclude_ambiguous}
              disabled={isBusy}
              onChange={(event) => updateOptions({ exclude_ambiguous: event.currentTarget.checked })}
              type="checkbox"
            />
            <span>Exclude ambiguous</span>
          </label>
        </div>
      </div>

      {generatorError ? <p className="error-banner">{generatorError}</p> : null}
      {copyMessage ? (
        <div aria-live="polite" className="status-toast" role="status">
          {copyMessage}
        </div>
      ) : null}
    </section>
  );
}
