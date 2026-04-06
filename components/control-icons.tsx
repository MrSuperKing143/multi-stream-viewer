import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconFrame({
  children,
  viewBox = "0 0 24 24",
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.9}
      viewBox={viewBox}
      {...props}
    >
      {children}
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M8 6.5v11l8.75-5.5L8 6.5Z" fill="currentColor" stroke="none" />
    </IconFrame>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <rect
        fill="currentColor"
        height="11"
        rx="1"
        stroke="none"
        width="3.25"
        x="7"
        y="6.5"
      />
      <rect
        fill="currentColor"
        height="11"
        rx="1"
        stroke="none"
        width="3.25"
        x="13.75"
        y="6.5"
      />
    </IconFrame>
  );
}

export function VolumeIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M5 15h3.25L13 18.5V5.5L8.25 9H5Z" />
      <path d="M16.25 9.25a4.1 4.1 0 0 1 0 5.5" />
      <path d="M18.75 7a7.2 7.2 0 0 1 0 10" />
    </IconFrame>
  );
}

export function MuteIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M5 15h3.25L13 18.5V5.5L8.25 9H5Z" />
      <path d="m16.25 9.25 4.5 5.5" />
      <path d="m20.75 9.25-4.5 5.5" />
    </IconFrame>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M20 5v5h-5" />
      <path d="M4 19v-5h5" />
      <path d="M18.2 9A7.5 7.5 0 0 0 6 6.4L4 10" />
      <path d="M5.8 15A7.5 7.5 0 0 0 18 17.6L20 14" />
    </IconFrame>
  );
}

export function BroadcastIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <circle cx="12" cy="12" fill="currentColor" r="1.8" stroke="none" />
      <path d="M8.4 8.4a5.1 5.1 0 0 0 0 7.2" />
      <path d="M15.6 8.4a5.1 5.1 0 0 1 0 7.2" />
      <path d="M5.4 5.4a9.3 9.3 0 0 0 0 13.2" />
      <path d="M18.6 5.4a9.3 9.3 0 0 1 0 13.2" />
    </IconFrame>
  );
}

export function SoloIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" fill="currentColor" r="2.2" stroke="none" />
      <path d="M12 3v2.5" />
      <path d="M12 18.5V21" />
      <path d="M3 12h2.5" />
      <path d="M18.5 12H21" />
    </IconFrame>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M6.5 7.5h11a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 3v-3H6.5A2.5 2.5 0 0 1 4 15V10a2.5 2.5 0 0 1 2.5-2.5Z" />
      <path d="M8.75 11.75h6.5" />
      <path d="M8.75 14.75h4.25" />
    </IconFrame>
  );
}
