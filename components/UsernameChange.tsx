"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/contexts/ToastContext";
import { useTranslations } from "@/components/TranslationsProvider";

interface UsernameChangeProps {
  currentUsername: string;
  canChange: boolean;
  onUsernameChanged: (newUsername: string) => void;
}

export default function UsernameChange({ 
  currentUsername, 
  canChange,
  onUsernameChanged 
}: UsernameChangeProps) {
  const { t } = useTranslations();
  const { showToast } = useToast();
  const [newUsername, setNewUsername] = useState("");
  const [isChanging, setIsChanging] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [isAvailable, setIsAvailable] = useState(false);

  // Validate username format
  const validateFormat = (username: string): boolean => {
    if (username.length < 3 || username.length > 30) {
      setValidationMessage(t("onboarding.usernameMinLength"));
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setValidationMessage(t("onboarding.onlyAlphanumeric"));
      return false;
    }
    return true;
  };

  // Check availability with debounce
  useEffect(() => {
    if (!newUsername || newUsername === currentUsername) {
      setValidationMessage("");
      setIsAvailable(false);
      return;
    }

    if (!validateFormat(newUsername)) {
      setIsAvailable(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsValidating(true);
      try {
        const res = await fetch("/api/username/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: newUsername }),
        });
        const data = await res.json();
        
        if (data.available) {
          setValidationMessage("✓ " + t("onboarding.usernameAvailable"));
          setIsAvailable(true);
        } else {
          setValidationMessage("✗ " + t("onboarding.usernameTaken"));
          setIsAvailable(false);
        }
      } catch (error) {
        console.error("Error checking username:", error);
        setValidationMessage(t("onboarding.usernameCheckError"));
        setIsAvailable(false);
      } finally {
        setIsValidating(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [newUsername, currentUsername, t]);

  const handleChange = async () => {
    if (!isAvailable || !newUsername) return;

    setIsChanging(true);
    try {
      const res = await fetch("/api/username/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername }),
      });

      const data = await res.json();

      if (data.success) {
        showToast(
          t("settings.usernameChanged") || "Username changed successfully!",
          "success"
        );
        onUsernameChanged(newUsername);
        setShowConfirm(false);
        setNewUsername("");
      } else {
        showToast(data.error || "Failed to change username", "error");
      }
    } catch (error) {
      console.error("Error changing username:", error);
      showToast(t("settings.errorUpdate"), "error");
    } finally {
      setIsChanging(false);
    }
  };

  if (!canChange) {
    return (
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "1.25rem",
        }}
      >
        <h3 style={{ 
          fontSize: "1.125rem", 
          fontWeight: "600",
          marginBottom: "0.5rem",
          color: "var(--foreground)"
        }}>
          {t("settings.username")}
        </h3>
        <p style={{ 
          fontSize: "0.875rem", 
          color: "var(--foreground-secondary)",
          marginBottom: "0.75rem"
        }}>
          @{currentUsername}
        </p>
        <div style={{
          background: "var(--accent-light)",
          border: "1px solid var(--accent)",
          borderRadius: "8px",
          padding: "0.75rem",
          fontSize: "0.875rem",
          color: "var(--foreground-secondary)"
        }}>
          ℹ️ {t("settings.usernameChangeLimit") || "You've already used your free username change."}
          <br />
          <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>
            {t("settings.usernameChangeFuture") || "In the future, you may be able to change it using karma or other rewards."}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "1.25rem",
      }}
    >
      <h3 style={{ 
        fontSize: "1.125rem", 
        fontWeight: "600",
        marginBottom: "0.5rem",
        color: "var(--foreground)"
      }}>
        {t("settings.changeUsername") || "Change Username"}
      </h3>
      <p style={{ 
        fontSize: "0.875rem", 
        color: "var(--foreground-secondary)",
        marginBottom: "1rem"
      }}>
        {t("settings.currentUsername")}: <strong>@{currentUsername}</strong>
      </p>

      {!showConfirm ? (
        <>
          <div style={{
            background: "linear-gradient(135deg, var(--brand-light) 0%, var(--accent-light) 100%)",
            border: "1px solid var(--brand)",
            borderRadius: "8px",
            padding: "0.75rem",
            marginBottom: "1rem",
            fontSize: "0.875rem",
            color: "var(--foreground)"
          }}>
            ⚠️ <strong>{t("settings.usernameChangeOnce") || "You can change your username only once for free."}</strong>
            <br />
            <span style={{ fontSize: "0.75rem", opacity: 0.9 }}>
              {t("settings.usernameChangeWarning") || "Choose carefully! Future changes may require karma or payment."}
            </span>
          </div>

          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "500",
              marginBottom: "0.5rem",
              color: "var(--foreground)"
            }}>
              {t("settings.newUsername") || "New Username"}
            </label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
              placeholder={t("onboarding.usernamePlaceholder")}
              style={{
                width: "100%",
                padding: "0.625rem 0.875rem",
                background: "var(--input-bg)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "0.9375rem",
                color: "var(--foreground)",
                outline: "none",
              }}
            />
            {validationMessage && (
              <p style={{
                marginTop: "0.5rem",
                fontSize: "0.875rem",
                color: isAvailable ? "var(--success)" : "var(--danger)"
              }}>
                {isValidating ? t("onboarding.checking") : validationMessage}
              </p>
            )}
          </div>

          <button
            onClick={() => setShowConfirm(true)}
            disabled={!isAvailable || isValidating}
            style={{
              padding: "0.625rem 1.25rem",
              background: isAvailable && !isValidating ? "var(--brand)" : "var(--border)",
              color: isAvailable && !isValidating ? "#fff" : "var(--foreground-secondary)",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.9375rem",
              fontWeight: "500",
              cursor: isAvailable && !isValidating ? "pointer" : "not-allowed",
              opacity: isAvailable && !isValidating ? 1 : 0.6,
            }}
          >
            {t("settings.continueChange") || "Continue"}
          </button>
        </>
      ) : (
        <div style={{
          background: "var(--danger-light)",
          border: "2px solid var(--danger)",
          borderRadius: "8px",
          padding: "1rem",
        }}>
          <h4 style={{ 
            fontSize: "1rem", 
            fontWeight: "600",
            marginBottom: "0.75rem",
            color: "var(--danger)"
          }}>
            ⚠️ {t("settings.confirmChange") || "Confirm Username Change"}
          </h4>
          <p style={{ 
            fontSize: "0.875rem", 
            marginBottom: "1rem",
            color: "var(--foreground)"
          }}>
            {t("settings.confirmChangeText") || "Are you sure you want to change your username from"}{" "}
            <strong>@{currentUsername}</strong> {t("settings.toUsername") || "to"} <strong>@{newUsername}</strong>?
            <br />
            <br />
            <strong>{t("settings.confirmChangeWarning") || "This action cannot be undone for free."}</strong>
          </p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={handleChange}
              disabled={isChanging}
              style={{
                flex: 1,
                padding: "0.625rem",
                background: "var(--danger)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "0.9375rem",
                fontWeight: "500",
                cursor: isChanging ? "not-allowed" : "pointer",
                opacity: isChanging ? 0.6 : 1,
              }}
            >
              {isChanging ? t("settings.changing") || "Changing..." : t("settings.confirmButton") || "Yes, Change Username"}
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                setNewUsername("");
              }}
              disabled={isChanging}
              style={{
                flex: 1,
                padding: "0.625rem",
                background: "var(--card-bg)",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "0.9375rem",
                fontWeight: "500",
                cursor: isChanging ? "not-allowed" : "pointer",
              }}
            >
              {t("settings.cancel") || "Cancel"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
