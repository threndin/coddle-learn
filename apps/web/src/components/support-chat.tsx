"use client";

import { useEffect } from "react";

const ORIGIN = "https://chatatp-agent-builder-backend.onrender.com";

const WIDGET_ATTRS: Record<string, string> = {
  "data-agent-token": "uWol-t8CuuxmKREIRJuLszUdJSHXS7Nv",
  "data-api-base": `${ORIGIN}/dapi/web-chat`,
  "data-ui-stylesheet": `${ORIGIN}/static/chatatp-ui.css`,
  "data-position": "bottom-right",
  "data-theme": "light",
  "data-primary-color": "#004CC8",
  "data-secondary-color": "#003A9E",
  "data-width": "400",
  "data-height": "500",
  "data-title": "Support",
  "data-show-powered-by": "true",
  "data-studio-url": "https://studio.chat-atp.com",
  "data-identity-from-session": "false",
};

let widgetPromise: Promise<void> | null = null;

function appendStylesheet(href: string) {
  if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function appendScript(src: string, attrs?: Record<string, string>) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.getAttribute("data-loaded") === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    if (attrs) {
      for (const [key, value] of Object.entries(attrs)) {
        script.setAttribute(key, value);
      }
    }
    script.addEventListener("load", () => {
      script.setAttribute("data-loaded", "true");
      resolve();
    });
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
    document.body.appendChild(script);
  });
}

function loadWidget() {
  if (!widgetPromise) {
    widgetPromise = (async () => {
      appendStylesheet(`${ORIGIN}/static/chatatp-ui.css`);
      await appendScript(`${ORIGIN}/static/agent-chat-widget-app.js`);
      await appendScript(`${ORIGIN}/static/agent-chat-widget.js`, WIDGET_ATTRS);
    })().catch((error: unknown) => {
      widgetPromise = null;
      throw error;
    });
  }
  return widgetPromise;
}

export function SupportChat() {
  useEffect(() => {
    loadWidget().catch(() => {
      // The page stays usable if the support host is unreachable.
    });
  }, []);

  return null;
}
