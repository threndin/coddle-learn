import nodemailer, { type Transporter } from "nodemailer";
import { config } from "../../config.js";
import { prisma } from "../../shared/db.js";
import {
  buildNewContentBroadcastEmail,
  buildReviewDecisionEmail,
  type BroadcastApprovedItemInput,
  type ReviewDecisionEmailInput,
} from "./email.templates.js";

let cachedTransporter: Transporter | null = null;

function createEmailTransporter(): Transporter {
  const { smtp } = config.email;

  if (smtp.host && smtp.host.trim()) {
    return nodemailer.createTransport({
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
};

/**
 * Send a single email with safe error handling and dev logging.
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const { to, subject, html, text } = options;
  if (!to || !to.includes("@")) {
    return false;
  }

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
      console.log(`[email] Sent email to "${to}" (id: ${info.messageId})`);
    }
    return true;
  } catch (error) {
    console.error(
      `[email] Failed to send email to "${to}" with subject "${subject}":`,
      error,
    );
    return false;
  }
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
 * Sends sequentially with throttling to comply with Zoho Mail / SMTP burst rate limits.
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

      const delayMs = config.email.rateDelayMs || 1000;
      console.log(
        `[email:broadcast] Starting broadcast of new ${payload.kind} "${payload.title}" to ${users.length} users (throttled at ${delayMs}ms delay between emails)...`,
      );

      let sentCount = 0;
      let errorCount = 0;

      // Send sequentially with throttling to prevent Zoho 550 5.4.6 Unusual sending activity detected
      for (let i = 0; i < users.length; i++) {
        const user = users[i]!;
        try {
          const { subject, html, text } = buildNewContentBroadcastEmail({
            recipientName: user.name,
            ...payload,
          });

          const ok = await sendEmail({
            to: user.email,
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
