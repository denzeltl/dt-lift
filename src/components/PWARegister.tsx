"use client";

import { useEffect } from "react";

const shouldRegisterServiceWorker = () => {
    if (typeof window === "undefined") return false;

    const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
    return process.env.NODE_ENV === "production" && !isLocalHost && "serviceWorker" in navigator;
};

export default function PWARegister() {
    useEffect(() => {
        if (typeof window === "undefined") return;

        const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

        if (!shouldRegisterServiceWorker()) {
            if ("serviceWorker" in navigator && (process.env.NODE_ENV !== "production" || isLocalHost)) {
                navigator.serviceWorker
                    .getRegistrations()
                    .then((registrations) => {
                        return Promise.all(registrations.map((registration) => registration.unregister()));
                    })
                    .catch(() => {
                        // Ignore cleanup failures in local development.
                    });
            }
            return;
        }

        const handleRegister = () => {
            navigator.serviceWorker
                .register("/sw.js")
                .then((reg) => {
                    console.log("Service worker registered successfully:", reg.scope);
                })
                .catch((err) => {
                    console.error("Service worker registration failed:", err);
                });
        };

        // Register after page load
        if (document.readyState === "complete") {
            handleRegister();
        } else {
            window.addEventListener("load", handleRegister);
            return () => window.removeEventListener("load", handleRegister);
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleBeforeInstall = (e: Event) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            window.deferredPrompt = e;
            // Dispatch custom event to let components know installation is ready
            window.dispatchEvent(new CustomEvent("dt-lift-install-available"));
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstall);
        return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    }, []);

    return null;
}

// Declare type for window global
declare global {
    interface Window {
        deferredPrompt?: Event;
    }
}
