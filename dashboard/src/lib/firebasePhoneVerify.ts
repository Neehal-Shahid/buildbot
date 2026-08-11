import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { firebaseAuth } from "./firebase";

// One invisible reCAPTCHA verifier per DOM container id, reused across
// send-code clicks (Firebase requires a fresh verifier instance per number
// only if the previous one was cleared, but keeping one alive per
// container avoids re-rendering the widget unnecessarily).
const verifiers = new Map<string, RecaptchaVerifier>();

function getVerifier(containerId: string): RecaptchaVerifier {
  let v = verifiers.get(containerId);
  if (!v) {
    v = new RecaptchaVerifier(firebaseAuth, containerId, { size: "invisible" });
    verifiers.set(containerId, v);
  }
  return v;
}

// Sends a real SMS OTP via Firebase to `phoneNumber` (E.164, e.g.
// +923001234567) and returns a ConfirmationResult — call .confirm(code)
// on it once the user types the code back in.
export async function sendPhoneVerificationCode(
  phoneNumber: string,
  containerId: string,
): Promise<ConfirmationResult> {
  const verifier = getVerifier(containerId);
  return signInWithPhoneNumber(firebaseAuth, phoneNumber, verifier);
}
