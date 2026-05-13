interface BrandLogoProps {
  size?: number;
  className?: string;
  title?: string;
}

/**
 * VoxelCraft brand mark — a minimal isometric cube in three orange shades,
 * matching the Dark Pro Studio palette. Designed to read well from ~16px
 * up. Three polygons, no text — text accompanies it where appropriate.
 */
export default function BrandLogo({ size = 32, className, title }: BrandLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      {/* Top face — lightest */}
      <polygon
        points="16,3 29,10 16,17 3,10"
        fill="#fb923c"
        stroke="rgba(0,0,0,0.22)"
        strokeWidth={0.6}
        strokeLinejoin="round"
      />
      {/* Right face — medium (brand accent) */}
      <polygon
        points="29,10 29,23 16,30 16,17"
        fill="#f97316"
        stroke="rgba(0,0,0,0.22)"
        strokeWidth={0.6}
        strokeLinejoin="round"
      />
      {/* Left face — darkest (shadow side) */}
      <polygon
        points="3,10 16,17 16,30 3,23"
        fill="#c2410c"
        stroke="rgba(0,0,0,0.22)"
        strokeWidth={0.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}
