type CustomerSupportIconProps = {
  size?: number;
  className?: string;
};

/**
 * Custom Etukas Customer Support icon:
 * friendly support executive with headset & mic framed inside a 24/7 support arrow loop,
 * paired with an Etukas Red chat bubble (top-right) and phone handset (bottom-left).
 */
export function CustomerSupportIcon({ size = 28, className = "" }: CustomerSupportIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Top-left 24/7 support arrow arc */}
      <path
        d="M44.5 9.2A26.2 26.2 0 0 0 5.6 31.2"
        stroke="#434A5E"
        strokeWidth="3.3"
        strokeLinecap="round"
      />
      <path
        d="M2.2 27.6L5.6 31.6L9.4 27.9"
        stroke="#434A5E"
        strokeWidth="3.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Bottom-right loop arc */}
      <path
        d="M55.8 21.8A26.2 26.2 0 0 1 31.6 58.4"
        stroke="#434A5E"
        strokeWidth="3.3"
        strokeLinecap="round"
      />

      {/* Support agent hair (back) */}
      <path
        d="M22.2 26.5C22.2 19.6 26.5 15.8 32 15.8C37.5 15.8 41.8 19.6 41.8 26.5V33.6C41.8 35.3 40.4 36.4 38.8 36.4H25.2C23.6 36.4 22.2 35.3 22.2 33.6V26.5Z"
        fill="#7B5444"
      />

      {/* Neck & shoulders */}
      <path d="M28.6 33.2H35.4V38.8H28.6V33.2Z" fill="#F4C29F" />
      <path
        d="M17.8 47V43.8C17.8 40.3 20.6 38.2 25.4 37.5L28.4 37L32 43.2L35.6 37L38.6 37.5C43.4 38.2 46.2 40.3 46.2 43.8V47H17.8Z"
        fill="#4A5266"
      />
      {/* Crisp shirt neckline */}
      <path d="M27.3 37.1L29.1 47H34.9L36.7 37.1C34.2 38.7 29.8 38.7 27.3 37.1Z" fill="#E6F1F8" />

      {/* Face */}
      <path
        d="M24.6 25.6C24.6 21.1 27.8 18.2 32 18.2C36.2 18.2 39.4 21.1 39.4 25.6V27.6C39.4 31.9 36.1 35.1 32 35.1C27.9 35.1 24.6 31.9 24.6 27.6V25.6Z"
        fill="#FBD3B3"
      />
      {/* Subtle face highlight */}
      <path
        d="M24.6 25.6C24.6 22.1 26.6 19.5 29.5 18.6C27.6 20 26.6 22.4 26.6 25.6V27.6C26.6 30.8 28.2 33.5 30.6 34.8C27.1 34.2 24.6 31.2 24.6 27.6V25.6Z"
        fill="#FCE3CD"
      />

      {/* Parted hair bangs */}
      <path
        d="M24.1 24.6C24.5 19.6 27.7 16.9 32.1 16.9C36.6 16.9 39.6 19.5 40 24.3C37.2 23.6 34.4 22.4 31.8 20.6C29.4 22.8 26.9 24.1 24.1 24.6Z"
        fill="#7B5444"
      />

      {/* Headset headband */}
      <path
        d="M22.4 27.2V23.4C22.4 16.7 26.7 12.6 32 12.6C37.3 12.6 41.6 16.7 41.6 23.4V27.2"
        stroke="#434A5E"
        strokeWidth="2.9"
        strokeLinecap="round"
      />
      {/* Headset earcups */}
      <rect x="19.8" y="24.2" width="3.8" height="7" rx="1.8" fill="#434A5E" />
      <rect x="40.4" y="24.2" width="3.8" height="7" rx="1.8" fill="#434A5E" />
      {/* Boom mic */}
      <path
        d="M41.8 30.2V31.7C41.8 32.9 40.8 33.7 39.4 33.7H32.2"
        stroke="#434A5E"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Top-right Etukas Red live chat bubble */}
      <path
        d="M44.6 4.8H59.4C60.9 4.8 62.1 6 62.1 7.5V16.6C62.1 18.1 60.9 19.3 59.4 19.3H53.8L48.6 24.1L49.4 19.3H44.6C43.1 19.3 41.9 18.1 41.9 16.6V7.5C41.9 6 43.1 4.8 44.6 4.8Z"
        fill="#E0313A"
      />
      {/* Subtle Etukas Red left edge depth */}
      <path
        d="M44.6 4.8H46.6C45.1 4.8 43.9 6 43.9 7.5V16.6C43.9 18.1 45.1 19.3 46.6 19.3H44.6C43.1 19.3 41.9 18.1 41.9 16.6V7.5C41.9 6 43.1 4.8 44.6 4.8Z"
        fill="#C52228"
      />
      {/* Crisp chat message bars inside bubble */}
      <path
        d="M46.6 10.1H57.8M46.6 14.3H53.1M56.2 14.3H57.8"
        stroke="#EEF6FB"
        strokeWidth="2.3"
        strokeLinecap="round"
      />

      {/* Bottom-left Etukas Red phone handset */}
      <path
        d="M8.5 36.2H11.8C13.3 36.2 14.5 37.3 14.7 38.8L15.3 43.1C15.5 44.2 15 45.3 14.1 45.9L12.7 46.8C14.1 49.4 16.2 51.4 18.8 52.8L19.7 51.4C20.3 50.5 21.4 50 22.5 50.2L26.8 50.8C28.3 51 29.4 52.2 29.4 53.7V57C29.4 58.6 28.1 59.9 26.4 59.8C14.8 59.1 6.4 50.7 5.7 39.1C5.6 37.5 6.9 36.2 8.5 36.2Z"
        fill="#E0313A"
      />
      {/* Subtle handset rim highlight */}
      <path
        d="M8.5 36.2H10.5C9 36.3 7.9 37.6 8 39.2C8.7 49.8 16.2 57.6 26.8 58.8C27.5 58.9 28.1 58.7 28.6 58.4C28.1 59.3 27.3 59.8 26.4 59.8C14.8 59.1 6.4 50.7 5.7 39.1C5.6 37.5 6.9 36.2 8.5 36.2Z"
        fill="#C52228"
      />
    </svg>
  );
}
