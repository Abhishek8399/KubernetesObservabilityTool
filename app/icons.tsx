import type { SVGProps } from "react";
const paths: Record<string, React.ReactNode> = {
  volume: (
    <>
      <path d="m11 4-6 5H2v6h3l6 5V4Z" />
      <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
    </>
  ),
  mute: (
    <>
      <path d="m11 4-6 5H2v6h3l6 5V4Z" />
      <path d="m16 9 5 6m0-6-5 6" />
    </>
  ),
  cube: (
    <>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4 7.5 8 4.5 8-4.5M12 12v9M8 5.2l8 4.6" />
    </>
  ),
  cpu: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="3" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
      <path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4" />
    </>
  ),
  network: (
    <>
      <rect x="8" y="2" width="8" height="6" rx="1.5" />
      <rect x="1" y="16" width="8" height="6" rx="1.5" />
      <rect x="15" y="16" width="8" height="6" rx="1.5" />
      <path d="M12 8v4M5 16v-4h14v4" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2 21 6v6c0 5-9 10-9 10S3 17 3 12V6l9-4Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12h18M5 6h14M5 18h14" />
    </>
  ),
  git: (
    <>
      <circle cx="6" cy="5" r="2" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M6 7v10m0-5h6c4 0 6-2 6-4" />
    </>
  ),
  pulse: (
    <>
      <path d="M2 12h4l3-8 6 16 3-8h4" />
    </>
  ),
  orbit: (
    <>
      <circle cx="12" cy="12" r="3" />
      <ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-35 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(35 12 12)" />
    </>
  ),
  layers: (
    <>
      <path d="m12 2 10 6-10 6L2 8l10-6Zm-9 11 9 6 9-6M3 18l9 5 9-5" />
    </>
  ),
  search: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 6 6" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
  play: <path d="m7 4 14 8-14 8V4Z" />,
  pause: (
    <>
      <path d="M8 4v16M16 4v16" />
    </>
  ),
  reset: (
    <>
      <path d="M3 9a9 9 0 1 1 0 7M3 3v6h6" />
    </>
  ),
  arrow: (
    <>
      <path d="M3 12h18m-7-7 7 7-7 7" />
    </>
  ),
  book: (
    <>
      <path d="M12 5c-3-3-7-3-10-2v16c3-1 7-1 10 2 3-3 7-3 10-2V3c-3-1-7-1-10 2Zm0 0v16" />
    </>
  ),
  expand: (
    <>
      <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />
    </>
  ),
  check: <path d="m4 12 5 5L20 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  copy: (
    <>
      <rect x="8" y="8" width="13" height="13" rx="2" />
      <path d="M16 8V3H3v13h5" />
    </>
  ),
  terminal: (
    <>
      <rect x="2" y="3" width="20" height="18" rx="3" />
      <path d="m6 8 4 4-4 4m7 0h5" />
    </>
  ),
  star: <path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1 3-6Z" />,
};
export function Icon({
  name,
  size = 20,
  ...props
}: SVGProps<SVGSVGElement> & { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] ?? paths.cube}
    </svg>
  );
}
