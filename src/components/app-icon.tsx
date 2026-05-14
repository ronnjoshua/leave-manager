import Image from "next/image";

export function AppIcon({ size = 40 }: { size?: number }) {
  return (
    <Image
      src="/images/leave-tracker-icon.png"
      alt="Leave Tracker"
      width={size}
      height={size}
      className="rounded-xl"
      priority
    />
  );
}
