// ---------------------------------------------------------------------------
// Default email templates for LiteBase Auth
// ---------------------------------------------------------------------------

export type EmailTemplateType = "confirmation" | "recovery" | "magic_link" | "invite";

export const EMAIL_TEMPLATE_TYPES: readonly EmailTemplateType[] = [
  "confirmation",
  "recovery",
  "magic_link",
  "invite",
] as const;

export interface EmailTemplate {
  readonly type: EmailTemplateType;
  readonly subject: string;
  readonly html: string;
}

// ---------------------------------------------------------------------------
// Shared styles (dark theme matching ClawLabz deployed templates)
// ---------------------------------------------------------------------------

const WRAPPER_OPEN = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>LiteBase</title>
</head>
<body style="margin:0;padding:0;background-color:#111111;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#111111;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="background-color:#1a1a2e;border-radius:12px;max-width:480px;width:100%;">
<!-- Logo -->
<tr><td align="center" style="padding:36px 40px 20px 40px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="font-size:28px;font-style:italic;font-weight:700;color:#00ff88;letter-spacing:-0.5px;">LITE</td>
<td style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">BASE</td>
</tr>
</table>
</td></tr>`;

const WRAPPER_CLOSE = `<!-- Footer -->
<tr><td align="center" style="padding:24px 40px 36px 40px;">
<p style="margin:0;font-size:12px;color:#666666;line-height:1.6;">
This email was sent by LiteBase. If you did not request this, you can safely ignore it.
</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

function wrapButton(text: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
<tr><td align="center" style="border-radius:8px;background-color:#00ff88;">
<a href="${href}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#111111;text-decoration:none;border-radius:8px;">
${text}
</a>
</td></tr>
</table>`;
}

// ---------------------------------------------------------------------------
// Confirmation template
// ---------------------------------------------------------------------------

const confirmationHtml = `${WRAPPER_OPEN}
<!-- Heading -->
<tr><td align="center" style="padding:8px 40px 4px 40px;">
<h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Confirm Your Email</h1>
</td></tr>
<tr><td align="center" style="padding:4px 40px 20px 40px;">
<p style="margin:0;font-size:14px;color:#aaaaaa;line-height:1.6;">
Your verification code is
</p>
</td></tr>
<!-- Code -->
<tr><td align="center" style="padding:0 40px 24px 40px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
<tr><td style="background-color:#111111;border:1px solid #333333;border-radius:8px;padding:16px 36px;">
<span style="font-size:32px;font-weight:700;color:#00ff88;letter-spacing:6px;font-family:'Courier New',Courier,monospace;">{{ .Token }}</span>
</td></tr>
</table>
</td></tr>
<!-- Button -->
<tr><td align="center" style="padding:0 40px 16px 40px;">
${wrapButton("Verify Email", "{{ .ConfirmationURL }}")}
</td></tr>
<!-- Note -->
<tr><td align="center" style="padding:0 40px 8px 40px;">
<p style="margin:0;font-size:12px;color:#888888;line-height:1.6;">
Code expires in 60 minutes
</p>
</td></tr>
${WRAPPER_CLOSE}`;

// ---------------------------------------------------------------------------
// Recovery template
// ---------------------------------------------------------------------------

const recoveryHtml = `${WRAPPER_OPEN}
<!-- Heading -->
<tr><td align="center" style="padding:8px 40px 4px 40px;">
<h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Reset Your Password</h1>
</td></tr>
<tr><td align="center" style="padding:4px 40px 28px 40px;">
<p style="margin:0;font-size:14px;color:#aaaaaa;line-height:1.6;">
We received a request to reset your password. Click the button below to choose a new password.
</p>
</td></tr>
<!-- Button -->
<tr><td align="center" style="padding:0 40px 16px 40px;">
${wrapButton("Reset Password", "{{ .ConfirmationURL }}")}
</td></tr>
<!-- Note -->
<tr><td align="center" style="padding:0 40px 8px 40px;">
<p style="margin:0;font-size:12px;color:#888888;line-height:1.6;">
If you did not request a password reset, no action is needed.
</p>
</td></tr>
${WRAPPER_CLOSE}`;

// ---------------------------------------------------------------------------
// Magic link template
// ---------------------------------------------------------------------------

const magicLinkHtml = `${WRAPPER_OPEN}
<!-- Heading -->
<tr><td align="center" style="padding:8px 40px 4px 40px;">
<h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Your Magic Link</h1>
</td></tr>
<tr><td align="center" style="padding:4px 40px 28px 40px;">
<p style="margin:0;font-size:14px;color:#aaaaaa;line-height:1.6;">
Click the button below to sign in to your account. No password needed.
</p>
</td></tr>
<!-- Button -->
<tr><td align="center" style="padding:0 40px 16px 40px;">
${wrapButton("Sign In", "{{ .ConfirmationURL }}")}
</td></tr>
<!-- Note -->
<tr><td align="center" style="padding:0 40px 8px 40px;">
<p style="margin:0;font-size:12px;color:#888888;line-height:1.6;">
Link expires in 60 minutes
</p>
</td></tr>
${WRAPPER_CLOSE}`;

// ---------------------------------------------------------------------------
// Invite template
// ---------------------------------------------------------------------------

const inviteHtml = `${WRAPPER_OPEN}
<!-- Heading -->
<tr><td align="center" style="padding:8px 40px 4px 40px;">
<h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">You've Been Invited</h1>
</td></tr>
<tr><td align="center" style="padding:4px 40px 28px 40px;">
<p style="margin:0;font-size:14px;color:#aaaaaa;line-height:1.6;">
You have been invited to join the platform. Click the button below to accept the invitation and create your account.
</p>
</td></tr>
<!-- Button -->
<tr><td align="center" style="padding:0 40px 16px 40px;">
${wrapButton("Accept Invite", "{{ .ConfirmationURL }}")}
</td></tr>
<!-- Note -->
<tr><td align="center" style="padding:0 40px 8px 40px;">
<p style="margin:0;font-size:12px;color:#888888;line-height:1.6;">
If you were not expecting this invitation, you can safely ignore this email.
</p>
</td></tr>
${WRAPPER_CLOSE}`;

// ---------------------------------------------------------------------------
// Default templates map
// ---------------------------------------------------------------------------

export const DEFAULT_TEMPLATES: Record<EmailTemplateType, EmailTemplate> = {
  confirmation: {
    type: "confirmation",
    subject: "Confirm your email address",
    html: confirmationHtml,
  },
  recovery: {
    type: "recovery",
    subject: "Reset your password",
    html: recoveryHtml,
  },
  magic_link: {
    type: "magic_link",
    subject: "Your magic link",
    html: magicLinkHtml,
  },
  invite: {
    type: "invite",
    subject: "You have been invited",
    html: inviteHtml,
  },
};

// ---------------------------------------------------------------------------
// Template variable replacement for previews
// ---------------------------------------------------------------------------

export function replaceTemplateVariables(
  html: string,
  siteUrl: string,
): string {
  return html
    .replace(/\{\{\s*\.Token\s*\}\}/g, "123456")
    .replace(
      /\{\{\s*\.ConfirmationURL\s*\}\}/g,
      `${siteUrl}/auth/v1/verify?token=sample`,
    )
    .replace(/\{\{\s*\.SiteURL\s*\}\}/g, siteUrl);
}
