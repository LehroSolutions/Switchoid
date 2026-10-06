export function LogoMark({ size = 34 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 48 58" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="logo-upper" x1="13" y1="3" x2="40" y2="40" gradientUnits="userSpaceOnUse"><stop stopColor="#11ffe5"/><stop offset=".45" stopColor="#abffeb"/><stop offset=".7" stopColor="#fff5e4"/><stop offset="1" stopColor="#ff62d5"/></linearGradient>
      <linearGradient id="logo-lower" x1="7" y1="20" x2="33" y2="54" gradientUnits="userSpaceOnUse"><stop stopColor="#10daed"/><stop offset=".45" stopColor="#378fe6"/><stop offset="1" stopColor="#c584ff"/></linearGradient>
    </defs>
    <path d="M22 4Q25 2 28 4L39 11Q43 13 43 18V39Q43 43 39 45L28 52L20 46L33 38V20L22 13Z" fill="url(#logo-upper)"/>
    <path d="M12 13L20 18V26L12 31V40L24 47L31 43L39 48L27 55Q24 57 20 55L8 48Q4 46 4 41V23Q4 19 8 17Z" fill="url(#logo-lower)"/>
    <path d="M20 25Q24 22 28 25L34 29V36L26 41L18 37V29Z" fill="#152944"/>
    <path d="M12 31L20 26L28 31V40L20 44L12 39Z" fill="#619eee"/>
  </svg>
}
