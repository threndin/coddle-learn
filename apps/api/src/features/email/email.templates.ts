import { config } from "../../config.js";

function escapeHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function resolveAbsoluteUrl(
  url: string | null | undefined,
  baseOrigin = config.webOrigin,
): string | null {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${baseOrigin.replace(/\/$/, "")}${cleanPath}`;
}

export function getEmailLogoUrl(): string {
  if (config.email.logoUrl && config.email.logoUrl.trim()) {
    return config.email.logoUrl.trim();
  }
  return `${config.webOrigin.replace(/\/$/, "")}/logo.png`;
}

type BaseLayoutOptions = {
  title: string;
  previewText?: string;
  bodyContent: string;
};

/**
 * Base responsive HTML email layout with header logo and clean footer.
 */
export function baseEmailLayout({
  title,
  previewText,
  bodyContent,
}: BaseLayoutOptions): string {
  const logoUrl = getEmailLogoUrl();
  const year = new Date().getFullYear();
  const dashboardUrl = `${config.webOrigin}/dashboard`;
  const settingsUrl = `${config.webOrigin}/settings?tab=profile`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    table {
      border-collapse: collapse;
    }
    img {
      border: 0;
      outline: none;
      text-decoration: none;
    }
    a {
      color: #004cc8;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        padding: 12px !important;
      }
      .email-card {
        padding: 24px 18px !important;
      }
      .hero-image {
        max-height: 220px !important;
      }
      .btn {
        display: block !important;
        width: 100% !important;
        text-align: center !important;
        box-sizing: border-box !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
  ${
    previewText
      ? `<div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #f8fafc;">
          ${escapeHtml(previewText)}
        </div>`
      : ""
  }
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; margin: 0 auto;">
          <!-- Top Header with Logo -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <a href="${config.webOrigin}" target="_blank" style="display: inline-block;">
                <img src="${logoUrl}" alt="Coddle Learn" width="160" style="display: block; max-width: 160px; height: auto; margin: 0 auto; border: 0;" />
              </a>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td class="email-card" style="background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; padding: 36px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.04);">
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 28px; padding-bottom: 12px; color: #64748b; font-size: 13px; line-height: 20px;">
              <p style="margin: 0 0 10px 0; font-weight: 500; color: #475569;">
                <a href="${config.webOrigin}" target="_blank" style="color: #004cc8; font-weight: 600;">Coddle Learn</a> &bull; Learn, Build, Share, Grow.
              </p>
              <p style="margin: 0 0 12px 0;">
                <a href="${dashboardUrl}" style="color: #64748b; text-decoration: underline;">Dashboard</a> &nbsp;&bull;&nbsp;
                <a href="${settingsUrl}" style="color: #64748b; text-decoration: underline;">Notification Settings</a> &nbsp;&bull;&nbsp;
                <a href="${config.webOrigin}/courses" style="color: #64748b; text-decoration: underline;">Explore Courses</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                &copy; ${year} Coddle Learn. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type ReviewDecisionEmailInput = {
  recipientName: string;
  action: "approve" | "decline";
  kind: "course" | "project" | "resource" | "tool";
  title: string;
  summary?: string | null;
  imageUrl?: string | null;
  href: string;
  note?: string | null;
  metadata?: Record<string, string | number | undefined>;
};

export function buildReviewDecisionEmail(input: ReviewDecisionEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const isApproved = input.action === "approve";
  const kindLabel =
    input.kind === "course"
      ? "Course"
      : input.kind === "project"
        ? "Project"
        : input.kind === "resource"
          ? "Resource"
          : "Tool";

  const resolvedImageUrl = resolveAbsoluteUrl(input.imageUrl);
  const targetUrl = resolveAbsoluteUrl(input.href) ?? config.webOrigin;
  const firstName = input.recipientName?.trim().split(/\s+/)[0] || "there";

  const subject = isApproved
    ? `🎉 Your ${kindLabel.toLowerCase()} "${input.title}" has been approved!`
    : `Update on your ${kindLabel.toLowerCase()} "${input.title}"`;

  const previewText = isApproved
    ? `Great news! Your ${kindLabel.toLowerCase()} "${input.title}" has been approved and published on Coddle Learn.`
    : `Our review team has reviewed your ${kindLabel.toLowerCase()} "${input.title}" and shared feedback.`;

  const badgeBg = isApproved ? "#dcfce7" : "#fef3c7";
  const badgeColor = isApproved ? "#15803d" : "#b45309";
  const badgeBorder = isApproved ? "#bbf7d0" : "#fde68a";
  const badgeText = isApproved
    ? "✓ APPROVED &amp; PUBLISHED"
    : "✎ CHANGES REQUESTED";

  const ctaText = isApproved
    ? `View Live ${kindLabel}`
    : `Update &amp; Resubmit ${kindLabel}`;

  const bodyContent = `
    <!-- Status Badge -->
    <div style="margin-bottom: 20px;">
      <span style="display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; padding: 4px 12px; border-radius: 9999px;">
        ${badgeText}
      </span>
    </div>

    <!-- Heading -->
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">
      ${
        isApproved
          ? `Your ${kindLabel.toLowerCase()} is now live!`
          : `Feedback on your ${kindLabel.toLowerCase()} submission`
      }
    </h1>

    <!-- Greeting & Message -->
    <p style="margin: 0 0 18px 0; font-size: 15px; line-height: 24px; color: #334155;">
      Hi ${escapeHtml(firstName)},
    </p>
    <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #334155;">
      ${
        isApproved
          ? `Congratulations! Your ${kindLabel.toLowerCase()} <strong style="color: #0f172a;">${escapeHtml(
              input.title,
            )}</strong> has been approved by the Coddle Learn review team. It is now published and available to all learners in our community.`
          : `Thank you for contributing to Coddle Learn. Our review team has reviewed your ${kindLabel.toLowerCase()} <strong style="color: #0f172a;">${escapeHtml(
              input.title,
            )}</strong> and requested a few changes before it can be published.`
      }
    </p>

    <!-- Reviewer Note Callout (if present) -->
    ${
      input.note && input.note.trim()
        ? `<div style="background-color: ${isApproved ? "#f0fdf4" : "#fffbeb"}; border-left: 4px solid ${
            isApproved ? "#22c55e" : "#f59e0b"
          }; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 0 0 24px 0;">
            <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: ${
              isApproved ? "#15803d" : "#b45309"
            };">
              Reviewer Feedback
            </p>
            <p style="margin: 0; font-size: 14px; line-height: 22px; color: #1e293b; font-style: italic;">
              &ldquo;${escapeHtml(input.note.trim())}&rdquo;
            </p>
          </div>`
        : ""
    }

    <!-- Content Preview Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 28px; overflow: hidden;">
      ${
        resolvedImageUrl
          ? `<tr>
              <td style="padding: 0; line-height: 0;">
                <img src="${resolvedImageUrl}" alt="${escapeHtml(
                  input.title,
                )}" class="hero-image" style="width: 100%; max-height: 240px; object-fit: cover; display: block; border-bottom: 1px solid #e2e8f0;" />
              </td>
            </tr>`
          : ""
      }
      <tr>
        <td style="padding: 20px;">
          <h2 style="margin: 0 0 8px 0; font-size: 17px; font-weight: 600; color: #0f172a;">
            ${escapeHtml(input.title)}
          </h2>
          ${
            input.summary
              ? `<p style="margin: 0; font-size: 14px; line-height: 21px; color: #475569;">
                  ${escapeHtml(input.summary)}
                </p>`
              : ""
          }
        </td>
      </tr>
    </table>

    <!-- Call to Action Button -->
    <div style="text-align: center; margin: 28px 0 12px 0;">
      <a href="${targetUrl}" target="_blank" class="btn" style="display: inline-block; background-color: #004cc8; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 13px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 76, 200, 0.2);">
        ${ctaText} &rarr;
      </a>
    </div>

    ${
      !isApproved
        ? `<p style="margin: 20px 0 0 0; font-size: 13px; line-height: 20px; color: #64748b; text-align: center;">
            Make the requested edits and resubmit directly in your studio. If you have questions, our community is here to help!
          </p>`
        : ""
    }
  `;

  const html = baseEmailLayout({
    title: subject,
    previewText,
    bodyContent,
  });

  const text =
    `${subject}\n\n` +
    `Hi ${firstName},\n\n` +
    (isApproved
      ? `Great news! Your ${kindLabel.toLowerCase()} "${input.title}" has been approved and published on Coddle Learn.\n\n`
      : `Our review team has reviewed your ${kindLabel.toLowerCase()} "${input.title}" and requested some changes before it can be published.\n\n`) +
    (input.note ? `Reviewer feedback: "${input.note.trim()}"\n\n` : "") +
    (input.summary ? `Summary: ${input.summary}\n\n` : "") +
    `View on Coddle Learn: ${targetUrl}\n\n` +
    `— The Coddle Learn Team\n${config.webOrigin}`;

  return { subject, html, text };
}

export type BroadcastApprovedItemInput = {
  recipientName?: string;
  kind: "course" | "project" | "resource" | "tool";
  title: string;
  summary?: string | null;
  imageUrl?: string | null;
  href: string;
  externalUrl?: string | null;
  metadata?: {
    level?: string;
    category?: string;
    type?: string;
    estimatedHours?: number;
    authorName?: string;
    skills?: string[];
  };
};

export function buildNewContentBroadcastEmail(
  input: BroadcastApprovedItemInput,
): {
  subject: string;
  html: string;
  text: string;
} {
  const kindLabel =
    input.kind === "course"
      ? "Course"
      : input.kind === "project"
        ? "Project"
        : input.kind === "resource"
          ? "Resource"
          : "Tool";

  const resolvedImageUrl = resolveAbsoluteUrl(input.imageUrl);
  const targetUrl = resolveAbsoluteUrl(input.href) ?? config.webOrigin;
  const firstName = input.recipientName?.trim().split(/\s+/)[0] || "Developer";

  const subject = `New ${kindLabel}: ${input.title}`;
  const previewText = `Explore the newly published ${kindLabel.toLowerCase()} "${input.title}" now available on Coddle Learn.`;

  const metaChips: string[] = [];
  if (input.metadata?.level) {
    metaChips.push(
      `Level: ${input.metadata.level.charAt(0).toUpperCase() + input.metadata.level.slice(1)}`,
    );
  }
  if (input.metadata?.category) {
    metaChips.push(`Category: ${input.metadata.category}`);
  }
  if (input.metadata?.type) {
    metaChips.push(`Type: ${input.metadata.type}`);
  }
  if (input.metadata?.estimatedHours) {
    metaChips.push(`~${input.metadata.estimatedHours} hrs`);
  }
  if (input.metadata?.skills && input.metadata.skills.length > 0) {
    metaChips.push(input.metadata.skills.slice(0, 3).join(", "));
  }

  const chipsHtml =
    metaChips.length > 0
      ? `<div style="margin: 12px 0 0 0;">
          ${metaChips
            .map(
              (chip) =>
                `<span style="display: inline-block; background-color: #e2e8f0; color: #334155; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 6px; margin-right: 6px; margin-bottom: 6px;">
                  ${escapeHtml(chip)}
                </span>`,
            )
            .join("")}
        </div>`
      : "";

  const ctaButtonLabel =
    input.kind === "course"
      ? "Start Course"
      : input.kind === "project"
        ? "Start Project"
        : input.kind === "tool"
          ? "Explore Tool"
          : "Check Out Resource";

  const bodyContent = `
    <!-- Top Badge -->
    <div style="margin-bottom: 16px;">
      <span style="display: inline-block; background-color: #eff6ff; color: #004cc8; border: 1px solid #bfdbfe; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; padding: 4px 12px; border-radius: 9999px;">
        NEW ${kindLabel.toUpperCase()}
      </span>
    </div>

    <!-- Headline -->
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">
      A new ${kindLabel.toLowerCase()} is ready for you!
    </h1>

    <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 24px; color: #334155;">
      Hi ${escapeHtml(firstName)},
    </p>
    <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #334155;">
      A new ${kindLabel.toLowerCase()} was just published on Coddle Learn to help you level up your tech skills:
    </p>

    <!-- Showcase Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 28px; overflow: hidden;">
      ${
        resolvedImageUrl
          ? `<tr>
              <td style="padding: 0; line-height: 0;">
                <a href="${targetUrl}" target="_blank" style="display: block;">
                  <img src="${resolvedImageUrl}" alt="${escapeHtml(
                    input.title,
                  )}" class="hero-image" style="width: 100%; max-height: 260px; object-fit: cover; display: block; border-bottom: 1px solid #e2e8f0;" />
                </a>
              </td>
            </tr>`
          : ""
      }
      <tr>
        <td style="padding: 22px;">
          <h2 style="margin: 0 0 10px 0; font-size: 19px; font-weight: 700; color: #0f172a; line-height: 1.35;">
            <a href="${targetUrl}" target="_blank" style="color: #0f172a; text-decoration: none;">
              ${escapeHtml(input.title)}
            </a>
          </h2>
          ${
            input.summary
              ? `<p style="margin: 0 0 12px 0; font-size: 14px; line-height: 22px; color: #475569;">
                  ${escapeHtml(input.summary)}
                </p>`
              : ""
          }
          ${
            input.metadata?.authorName
              ? `<p style="margin: 0 0 10px 0; font-size: 13px; color: #64748b;">
                  Contributed by <strong style="color: #334155;">${escapeHtml(
                    input.metadata.authorName,
                  )}</strong>
                </p>`
              : ""
          }
          ${chipsHtml}
        </td>
      </tr>
    </table>

    <!-- Call to Action -->
    <div style="text-align: center; margin: 24px 0 16px 0;">
      <a href="${targetUrl}" target="_blank" class="btn" style="display: inline-block; background-color: #004cc8; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 13px 34px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 76, 200, 0.2);">
        ${ctaButtonLabel} &rarr;
      </a>
    </div>
  `;

  const html = baseEmailLayout({
    title: subject,
    previewText,
    bodyContent,
  });

  const text =
    `${subject}\n\n` +
    `Hi ${firstName},\n\n` +
    `A new ${kindLabel.toLowerCase()} is now available on Coddle Learn:\n\n` +
    `Title: ${input.title}\n` +
    (input.summary ? `Summary: ${input.summary}\n` : "") +
    (input.metadata?.authorName
      ? `Contributed by: ${input.metadata.authorName}\n`
      : "") +
    (metaChips.length > 0 ? `Details: ${metaChips.join(" • ")}\n` : "") +
    `\nLink: ${targetUrl}\n` +
    (input.externalUrl ? `Direct URL: ${input.externalUrl}\n` : "") +
    `\n— The Coddle Learn Team\n${config.webOrigin}`;

  return { subject, html, text };
}

export type LoginNotificationEmailInput = {
  recipientName: string;
  email: string;
  signedInAt?: Date;
  ip?: string | null;
  userAgent?: string | null;
  isNewUser?: boolean;
};

export function buildLoginNotificationEmail(
  input: LoginNotificationEmailInput,
): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName = input.recipientName?.trim().split(/\s+/)[0] || "there";
  const dateStr = (input.signedInAt ?? new Date()).toUTCString();
  const dashboardUrl = `${config.webOrigin}/dashboard`;
  const securityUrl = `${config.webOrigin}/settings?tab=profile`;

  const isNew = Boolean(input.isNewUser);
  const subject = isNew
    ? "Welcome to Coddle Learn! Sign-in confirmation"
    : "Successful sign-in to Coddle Learn";

  const previewText = isNew
    ? "Welcome to Coddle Learn. Your developer account is ready."
    : `We detected a successful sign-in to your account on ${dateStr}.`;

  const bodyContent = `
    <!-- Top Badge -->
    <div style="margin-bottom: 20px;">
      <span style="display: inline-block; background-color: #eff6ff; color: #004cc8; border: 1px solid #bfdbfe; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; padding: 4px 12px; border-radius: 9999px;">
        ${isNew ? "WELCOME TO CODDLE LEARN" : "ACCOUNT SECURITY"}
      </span>
    </div>

    <!-- Heading -->
    <h1 style="margin: 0 0 14px 0; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">
      ${isNew ? "Welcome to Coddle Learn!" : "New sign-in to your account"}
    </h1>

    <p style="margin: 0 0 18px 0; font-size: 15px; line-height: 24px; color: #334155;">
      Hi ${escapeHtml(firstName)},
    </p>
    <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #334155;">
      ${
        isNew
          ? `Welcome to Coddle Learn! Your account has been created and you're all set to start discovering developer roadmaps, courses, tools, and hands-on projects.`
          : `We detected a successful sign-in to your Coddle Learn account. Here are the sign-in details:`
      }
    </p>

    <!-- Details Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 24px; padding: 18px 20px;">
      <tr>
        <td style="padding: 6px 0; font-size: 14px; color: #64748b; width: 120px;">
          Account:
        </td>
        <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #0f172a;">
          ${escapeHtml(input.email)}
        </td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 14px; color: #64748b;">
          Time (UTC):
        </td>
        <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #0f172a;">
          ${escapeHtml(dateStr)}
        </td>
      </tr>
      ${
        input.ip
          ? `<tr>
              <td style="padding: 6px 0; font-size: 14px; color: #64748b;">
                IP Address:
              </td>
              <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #0f172a;">
                ${escapeHtml(input.ip)}
              </td>
            </tr>`
          : ""
      }
      ${
        input.userAgent
          ? `<tr>
              <td style="padding: 6px 0; font-size: 14px; color: #64748b;">
                Device / App:
              </td>
              <td style="padding: 6px 0; font-size: 13px; color: #334155;">
                ${escapeHtml(input.userAgent.slice(0, 100))}
              </td>
            </tr>`
          : ""
      }
    </table>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 28px 0 20px 0;">
      <a href="${dashboardUrl}" target="_blank" class="btn" style="display: inline-block; background-color: #004cc8; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 13px 34px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 76, 200, 0.2);">
        Go to Dashboard &rarr;
      </a>
    </div>

    <!-- Security notice -->
    <div style="background-color: #f1f5f9; border-radius: 8px; padding: 14px 16px; margin-top: 24px;">
      <p style="margin: 0; font-size: 13px; line-height: 20px; color: #475569;">
        <strong>Didn't sign in?</strong> If you did not make this request, someone else may be trying to access your account. Please check your <a href="${securityUrl}" style="color: #004cc8; text-decoration: underline;">account settings</a> immediately.
      </p>
    </div>
  `;

  const html = baseEmailLayout({
    title: subject,
    previewText,
    bodyContent,
  });

  const text =
    `${subject}\n\n` +
    `Hi ${firstName},\n\n` +
    (isNew
      ? `Welcome to Coddle Learn! Your account has been created.\n\n`
      : `We detected a successful sign-in to your Coddle Learn account.\n\n`) +
    `Account: ${input.email}\n` +
    `Time: ${dateStr}\n` +
    (input.ip ? `IP Address: ${input.ip}\n` : "") +
    (input.userAgent ? `Device: ${input.userAgent}\n` : "") +
    `\nGo to your dashboard: ${dashboardUrl}\n\n` +
    `If you did not sign in recently, please secure your account immediately.\n\n` +
    `— The Coddle Learn Team\n${config.webOrigin}`;

  return { subject, html, text };
}
