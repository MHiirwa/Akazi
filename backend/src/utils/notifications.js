import { reportCriticalFailure } from "./logger.js";
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "Akazi <onboarding@resend.dev>";
let resendClient = null;
async function getResendClient() {
  if (process.env.NODE_ENV === "test") return null;
  if (resendClient) return resendClient;
  if (!RESEND_API_KEY) return null;
  const { Resend } = await import("resend");
  resendClient = new Resend(RESEND_API_KEY);
  return resendClient;
}
async function sendNotification({ to, subject, html, text, message }) {
  if (process.env.NODE_ENV === "test") {
    return { delivered: false, simulated: true };
  }
  const body = text || message || "";
  try {
    const resend = await getResendClient();
    if (!resend) {
      console.log(
        `[notification:dev] to=${to} subject="${subject}" message="${body}"`,
      );
      return { delivered: false, simulated: true };
    }
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      ...(html ? { html } : {}),
      text: body,
    });
    return { delivered: true };
  } catch (err) {
    reportCriticalFailure("email.send", err, { to, subject });
    return { delivered: false, error: err.message };
  }
}
export { sendNotification };
