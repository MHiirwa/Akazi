const COLORS = {
  bg: "#FBF8F2",
  surface: "#FFFFFF",
  text: "#1C1A17",
  muted: "#6B6459",
  primary: "#1B6B4A",
  primaryDark: "#124A33",
  accent: "#D9A441",
  border: "#E7E1D3",
};
const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function layout({ title, preview = "", bodyHtml, footerHtml }) {
  const footer =
    footerHtml ||
    `You're receiving this email because you have an Akazi account.<br>
          &copy; ${new Date().getFullYear()} Akazi. All rights reserved.`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:${FONT};color:${COLORS.text};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${preview}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding:0 8px 20px;">
          <span style="font-size:22px;font-weight:700;letter-spacing:-0.01em;color:${COLORS.primaryDark};">Akazi</span>
        </td></tr>
        <tr><td style="background:${COLORS.surface};border:1px solid ${COLORS.border};border-radius:12px;padding:32px;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:20px 8px 0;color:${COLORS.muted};font-size:12px;line-height:1.6;">
          ${footer}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
function button(label, href) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="border-radius:8px;background:${COLORS.primary};">
      <a href="${href}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
    </td></tr>
  </table>`;
}
const h1 = (t) =>
  `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${COLORS.text};">${t}</h1>`;
const p = (t) =>
  `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${COLORS.text};">${t}</p>`;
const muted = (t) =>
  `<p style="margin:0;font-size:13px;line-height:1.6;color:${COLORS.muted};">${t}</p>`;
const firstName = (fullName) => (fullName || "there").split(" ")[0];
function welcomeEmail({ fullName, role }) {
  const isEmployer = role === "EMPLOYER";
  const name = firstName(fullName);
  const nextStep = isEmployer
    ? "Your employer account is under review. Once an admin verifies it, you'll be able to post job listings and review applicants."
    : "Complete your profile and start browsing openings — a fuller profile helps employers find you.";
  const bodyHtml = `
    ${h1(`Welcome to Akazi, ${name}! 🎉`)}
    ${p("Your account is ready. Akazi connects job seekers, freelancers, and employers across Rwanda and beyond.")}
    ${p(nextStep)}
    ${button("Go to your dashboard", `${appUrl()}/dashboard`)}
    ${muted("If you didn't create this account, you can safely ignore this email.")}
  `;
  return {
    subject: "Welcome to Akazi",
    html: layout({
      title: "Welcome to Akazi",
      preview: "Your Akazi account is ready.",
      bodyHtml,
    }),
    text: `Welcome to Akazi, ${name}!

Your account is ready. ${nextStep}

Go to your dashboard: ${appUrl()}/dashboard

If you didn't create this account, you can safely ignore this email.`,
  };
}
function passwordResetEmail({ fullName, resetUrl, expiresMinutes = 60 }) {
  const name = firstName(fullName);
  const bodyHtml = `
    ${h1("Reset your password")}
    ${p(`Hi ${name}, we received a request to reset the password for your Akazi account. Click the button below to choose a new one.`)}
    ${button("Reset password", resetUrl)}
    ${p(`This link expires in ${expiresMinutes} minutes and can only be used once.`)}
    ${muted(`If you didn't request a password reset, no action is needed — your password stays the same. For your reference, the link is:<br><a href="${resetUrl}" style="color:${COLORS.primary};word-break:break-all;">${resetUrl}</a>`)}
  `;
  return {
    subject: "Reset your Akazi password",
    html: layout({
      title: "Reset your password",
      preview: "Reset your Akazi password",
      bodyHtml,
    }),
    text: `Hi ${name},

We received a request to reset your Akazi password.
Reset it here (expires in ${expiresMinutes} minutes, one-time use):
${resetUrl}

If you didn't request this, no action is needed.`,
  };
}
const STATUS_COPY = {
  REVIEWED: {
    title: "Your application is being reviewed",
    line: "has moved your application to review.",
  },
  ACCEPTED: {
    title: "Good news about your application! 🎉",
    line: "has accepted your application.",
  },
  REJECTED: {
    title: "Update on your application",
    line: "has decided not to move forward with your application this time.",
  },
};
function applicationStatusEmail({ fullName, jobTitle, status, reason }) {
  const name = firstName(fullName);
  const copy = STATUS_COPY[status] || {
    title: "Update on your application",
    line: `updated your application status to ${status}.`,
  };
  const reasonHtml = reason ? p(`<strong>Feedback from the employer:</strong><br>${reason}`) : "";
  const bodyHtml = `
    ${h1(copy.title)}
    ${p(`Hi ${name}, the employer for <strong>${jobTitle}</strong> ${copy.line}`)}
    ${reasonHtml}
    ${button("View your applications", `${appUrl()}/dashboard`)}
    ${muted("Log in to your Akazi dashboard any time to track all of your applications.")}
  `;
  return {
    subject: `Your application for ${jobTitle}`,
    html: layout({
      title: "Application update",
      preview: copy.title,
      bodyHtml,
    }),
    text: `Hi ${name},

The employer for "${jobTitle}" ${copy.line}${reason ? `\n\nFeedback from the employer: ${reason}` : ""}

View your applications: ${appUrl()}/dashboard`,
  };
}
function jobAlertEmail({
  jobTitle,
  jobLocation,
  jobType,
  jobUrl,
  unsubscribeUrl,
}) {
  const metaLine = [jobLocation, jobType].filter(Boolean).join(" · ");
  const bodyHtml = `
    ${h1("A new job matches your alert")}
    ${p(`A new opening was just posted on Akazi that matches what you're looking for:`)}
    ${p(`<strong style="font-size:17px;">${jobTitle}</strong>${metaLine ? `<br><span style="color:${COLORS.muted};font-size:14px;">${metaLine}</span>` : ""}`)}
    ${button("View this job", jobUrl)}
    ${muted("Log in or browse Akazi any time to see all current openings.")}
  `;
  const footerHtml = `
    You're receiving this because you subscribed to Akazi job alerts.<br>
    <a href="${unsubscribeUrl}" style="color:${COLORS.muted};text-decoration:underline;">Unsubscribe from job alerts</a><br>
    &copy; ${new Date().getFullYear()} Akazi. All rights reserved.`;
  return {
    subject: `New job on Akazi: ${jobTitle}`,
    html: layout({
      title: "New job match",
      preview: `${jobTitle}${metaLine ? ` — ${metaLine}` : ""}`,
      bodyHtml,
      footerHtml,
    }),
    text: `A new job matching your alert was posted on Akazi:

${jobTitle}${
      metaLine
        ? `
${metaLine}`
        : ""
    }

View it: ${jobUrl}

Unsubscribe from job alerts: ${unsubscribeUrl}`,
  };
}
function appUrl() {
  return (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
}
export {
  appUrl,
  applicationStatusEmail,
  jobAlertEmail,
  passwordResetEmail,
  welcomeEmail,
};
