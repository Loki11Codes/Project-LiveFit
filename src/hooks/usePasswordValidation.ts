import { useState, useMemo } from "react";

export interface PasswordChecks {
  minimumLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function usePasswordValidation() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordMatch = useMemo(() => {
    if (!confirmPassword) return null;
    return password === confirmPassword;
  }, [confirmPassword, password]);

  const passwordChecks = useMemo<PasswordChecks>(
    () => ({
      minimumLength: password.length >= 12,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[^\w]/.test(password),
    }),
    [password],
  );

  const isPasswordValid = useMemo(() => {
    return (
      passwordChecks.minimumLength &&
      passwordChecks.hasUpper &&
      passwordChecks.hasLower &&
      passwordChecks.hasNumber &&
      passwordChecks.hasSpecial
    );
  }, [passwordChecks]);

  return {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    passwordMatch,
    passwordChecks,
    isPasswordValid,
  };
}
