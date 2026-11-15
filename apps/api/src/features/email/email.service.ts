import nodemailer, { type Transporter } from "nodemailer";
import { config } from "../../config.js";
import { prisma } from "../../shared/db.js";
import {
  buildLoginNotificationEmail,
  buildNewContentBroadcastEmail,
  buildReviewDecisionEmail,
  type BroadcastApprovedItemInput,
  type LoginNotificationEmailInput,
  type ReviewDecisionEmailInput,
} from "./email.templates.js";

let cachedTransporter: Transporter | null = null;

function createEmailTransporter(): Transporter {
  const { smtp } = config.email;

  if (smtp.host && smtp.host.trim()) {
    return nodemailer.createTransport({
      pool: true,
      maxConnections: 1, // Zoho Mail and standard SMTP providers limit concurrent connections
      maxMessages: 100,
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth:
        smtp.user && smtp.pass
          ? {
              user: smtp.user,
              pass: smtp.pass,
            }
          : undefined,
    });
  }

  // Development/fallback transporter when SMTP is not configured
  return nodemailer.createTransport({
    streamTransport: true,
    newline: "unix",
    buffer: true,
  });
}

export function getTransporter(): Transporter {
  if (!cachedTransporter) {
    cachedTransporter = createEmailTransporter();
  }
  return cachedTransporter;
}

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text: string;
  recipientName?: string | null;
};

function parseEmailAddress(raw: string): { address: string; name?: string } {
  const match = raw.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
  if (match && match[2]) {
    const name = match[1]?.trim();
    const address = match[2].trim();
    return name ? { address, name } : { address };
  }
  return { address: raw.trim() };
}

/**
 * Send email via ZeptoMail REST API (v1.1)
 */
async function sendZeptoEmail(options: SendEmailOptions): Promise<boolean> {
  const { to, subject, html, text, recipientName } = options;
  const { url, token } = config.email.zepto;

  if (!token || !token.trim()) {
    console.error("[email:zepto] ZEPTOMAIL_TOKEN is not set.");
    return false;
  }

  const cleanToken = token.trim();
  const authHeader = cleanToken.startsWith("Zoho-enczapikey")
    ? cleanToken
    : `Zoho-enczapikey ${cleanToken}`;

  const fromObj = parseEmailAddress(config.email.from);
  const toObj = parseEmailAddress(to);
  if (recipientName && !toObj.name) {
    toObj.name = recipientName;
  }

  const body = {
    from: fromObj,
    to: [
      {
        email_address: toObj,
      },
    ],
    subject,
    htmlbody: html,
    ...(text ? { textbody: text } : {}),
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;

    if (!res.ok) {
      console.error(
        `[email:zepto] Failed to send to "${to}" (HTTP ${res.status}):`,
        JSON.stringify(data ?? {}),
      );
      return false;
    }

    const requestId =
      typeof data?.request_id === "string" ? data.request_id : "ok";
    console.log(`[email:zepto] Sent email to "${to}" (request_id: ${requestId})`);
    return true;
  } catch (error) {
    console.error(`[email:zepto] Network error sending to "${to}":`, error);
    return false;
  }
}

/**
 * Send email via SMTP (Zoho / Custom SMTP)
 */
async function sendSmtpEmail(options: SendEmailOptions): Promise<boolean> {
  const { to, subject, html, text } = options;
  const transporter = getTransporter();
  const hasSmtp = Boolean(
    config.email.smtp.host && config.email.smtp.host.trim(),
  );

  try {
    const info = await transporter.sendMail({
      from: config.email.from,
      to,
      subject,
      html,
      text,
    });

    if (!hasSmtp) {
      console.log(
        `[email:dev] Mock sent email to "${to}" | Subject: "${subject}" (SMTP_HOST not set, logging only)`,
      );
    } else {
      console.log(`[email:zoho] Sent email to "${to}" (id: ${info.messageId})`);
    }
    return true;
  } catch (error) {
    console.error(
      `[email:zoho] Failed to send email to "${to}" with subject "${subject}":`,
      error,
    );
    return false;
  }
}

/**
 * Send a single email with active provider (ZeptoMail or Zoho/SMTP) and safe fallback.
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const { to, subject } = options;
  if (!to || !to.includes("@")) {
    return false;
  }

  if (config.email.provider === "zepto") {
    if (!config.email.zepto.token || !config.email.zepto.token.trim()) {
      console.log(
        `[email:dev] Mock sent email to "${to}" | Subject: "${subject}" (provider=zepto but ZEPTOMAIL_TOKEN not set)`,
      );
      return true;
    }
    return sendZeptoEmail(options);
  }

  return sendSmtpEmail(options);
}

export type ReviewDecisionEmailPayload = Omit<
  ReviewDecisionEmailInput,
  "recipientName"
> & {
  recipientEmail: string;
  recipientName?: string | null;
};

/**
 * Send an email to the creator / submitter when their content is approved or rejected (changes requested).
 */
export async function sendReviewDecisionEmail(
  payload: ReviewDecisionEmailPayload,
): Promise<boolean> {
  const { recipientEmail, recipientName, ...rest } = payload;
  if (!recipientEmail || !recipientEmail.trim()) {
    return false;
  }

  const { subject, html, text } = buildReviewDecisionEmail({
    recipientName: recipientName || "there",
    ...rest,
  });

  return sendEmail({
    to: recipientEmail.trim(),
    recipientName: recipientName || null,
    subject,
    html,
    text,
  });
}

export type LoginEmailPayload = {
  recipientEmail: string;
  recipientName?: string | null;
  signedInAt?: Date;
  ip?: string | null;
  userAgent?: string | null;
  isNewUser?: boolean;
};

/**
 * Send an email notification when a user signs in.
 */
export async function sendLoginNotificationEmail(
  payload: LoginEmailPayload,
): Promise<boolean> {
  const { recipientEmail, recipientName, ...rest } = payload;
  if (!recipientEmail || !recipientEmail.trim()) {
    return false;
  }

  const { subject, html, text } = buildLoginNotificationEmail({
    recipientName: recipientName || "there",
    email: recipientEmail.trim(),
    ...rest,
  });

  return sendEmail({
    to: recipientEmail.trim(),
    recipientName: recipientName || null,
    subject,
    html,
    text,
  });
}

export type BroadcastApprovedItemPayload = Omit<
  BroadcastApprovedItemInput,
  "recipientName"
>;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Asynchronously broadcast an email to all active users that a newly approved item is available.
 * Sends sequentially with throttling to comply with provider burst rate limits.
 * Runs in the background without blocking caller HTTP response.
 */
export function broadcastApprovedItem(
  payload: BroadcastApprovedItemPayload,
): void {
  // Fire and forget in the background
  setImmediate(async () => {
    try {
      // Find all active learners who haven't muted learning notifications
      const users = await prisma.user.findMany({
        where: {
          suspendedAt: null,
          notifyLearning: true,
          email: { contains: "@" },
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (users.length === 0) {
        console.log(
          `[email:broadcast] No active users to notify for new ${payload.kind}.`,
        );
        return;
      }

      const delayMs = config.email.rateDelayMs || 500;
      console.log(
        `[email:broadcast] Starting broadcast of new ${payload.kind} "${payload.title}" to ${users.length} users using ${config.email.provider.toUpperCase()} (delay: ${delayMs}ms)...`,
      );

      let sentCount = 0;
      let errorCount = 0;

      for (let i = 0; i < users.length; i++) {
        const user = users[i]!;
        try {
          const { subject, html, text } = buildNewContentBroadcastEmail({
            recipientName: user.name,
            ...payload,
          });

          const ok = await sendEmail({
            to: user.email,
            recipientName: user.name,
            subject,
            html,
            text,
          });

          if (ok) {
            sentCount++;
            console.log(
              `[email:broadcast] [${i + 1}/${users.length}] Sent to ${user.email} ✓`,
            );
          } else {
            errorCount++;
            console.error(
              `[email:broadcast] [${i + 1}/${users.length}] Failed to send to ${user.email}`,
            );
          }
        } catch (err) {
          errorCount++;
          console.error(
            `[email:broadcast] [${i + 1}/${users.length}] Error sending to ${user.email}:`,
            err,
          );
        }

        if (i < users.length - 1 && delayMs > 0) {
          await sleep(delayMs);
        }
      }

      console.log(
        `[email:broadcast] Finished broadcast of "${payload.title}" (${payload.kind}): ${sentCount} sent, ${errorCount} errors.`,
      );
    } catch (error) {
      console.error(
        `[email:broadcast] Fatal failure during broadcast of new ${payload.kind} "${payload.title}":`,
        error,
      );
    }
  });
}
