export function BrandLogo({ size = "sm" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? 30 : 34;
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex flex-shrink-0 items-center justify-center rounded-lg bg-accent"
        style={{ width: box, height: box }}
      >
        <svg
          width={box * 0.5}
          height={box * 0.5}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      </div>
      <span className="text-[15px] font-bold tracking-tight text-text">
        BuildVolt
      </span>
    </div>
  );
}
