import React from "react";

// The DT Lift mark: a red bumper plate with "DT" stencilled across it (source: public/brand/mark.svg).
const STENCIL_D = "M0 0h4v22H0z M5 0h2a9 11 0 0 1 0 22H5v-4h2a5 7 0 0 0 0-14H5z";
const STENCIL_T = "M0 0h14v4H0z M5 5h4v17H5z";

export default function Logo({ className = "h-10 w-10", ring = true }: { className?: string; ring?: boolean }) {
    return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
            <circle cx="34.5" cy="34.5" r="27.5" fill="var(--ink)" />
            <circle cx="31" cy="31" r="27.5" fill="var(--plate)" stroke="var(--ink)" strokeWidth="3" />
            {ring && (
                <circle
                    cx="31"
                    cy="31"
                    r="21"
                    fill="none"
                    stroke="var(--ink)"
                    strokeWidth="1.5"
                    strokeDasharray="2.5 3"
                    opacity=".55"
                />
            )}
            <g fill="var(--ink)">
                <path transform="translate(18.5 21)" d={STENCIL_D} />
                <path transform="translate(33 21)" d={STENCIL_T} />
            </g>
        </svg>
    );
}
