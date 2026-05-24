import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  withText?: boolean;
  textClassName?: string;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  withText = false,
  textClassName = '',
}) => {
  // Determine pixel sizes
  const dimensions = {
    sm: { box: 'w-8 h-8', text: 'text-sm' },
    md: { box: 'w-10 h-10', text: 'text-base' },
    lg: { box: 'w-14 h-14', text: 'text-xl' },
    xl: { box: 'w-24 h-24', text: 'text-3xl' },
  }[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`} id="influencer-verse-brand-logo">
      {/* Dynamic Animated Vector Logo */}
      <div className={`${dimensions.box} relative shrink-0 transition-transform duration-300 hover:scale-105`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]"
        >
          <defs>
            {/* The signature gold-to-purple gradient with pink midpoints exactly as the user's logo */}
            <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E2A350" />      {/* Vintage Gold */}
              <stop offset="50%" stopColor="#EC4899" />     {/* Bright Pink */}
              <stop offset="100%" stopColor="#8B5CF6" />    {/* Dynamic Purple */}
            </linearGradient>

            <linearGradient id="star-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFA07A" />      {/* Peach */}
              <stop offset="100%" stopColor="#EC4899" />    {/* Pink */}
            </linearGradient>
            
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Styled Circular Outer Orbit with cutout / gaps */}
          <path
            d="M 37 80 C 18 73 10 50 18 30 C 26 10 49 5 68 15 C 80 22 86 35 84 48 C 83 55 80 61 74 67 C 69 72 63 76 56 79"
            stroke="url(#logo-gradient)"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
            className="animate-[pulse_4s_infinite_alternate]"
          />
          <path
            d="M 35 83 C 44 87 53 87 62 82 C 67 79 71 75 75 70"
            stroke="url(#logo-gradient)"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />

          {/* Serif I Numeral */}
          <g transform="translate(-1, 0)">
            {/* Main Slab */}
            <path
              d="M 40 31 L 46 31 M 40 69 L 46 69 M 43 31 L 43 69"
              stroke="url(#logo-gradient)"
              strokeWidth="5"
              strokeLinecap="square"
            />
            {/* Beautiful Serifs for 'I' base and top */}
            <path d="M 38 31 L 48 31" stroke="url(#logo-gradient)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 38 69 L 48 69" stroke="url(#logo-gradient)" strokeWidth="2.5" strokeLinecap="round" />
          </g>

          {/* Stylized V Numeral */}
          <g>
            {/* Thick left stroke of V */}
            <path
              d="M 49.5 31.5 L 59 69"
              stroke="url(#logo-gradient)"
              strokeWidth="5.5"
              strokeLinecap="round"
            />
            {/* Thin right stroke of V */}
            <path
              d="M 59 69 L 71 31"
              stroke="url(#logo-gradient)"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            {/* Horizontal serif caps on left wing top */}
            <path d="M 46.5 31.5 L 54.5 31.5" stroke="url(#logo-gradient)" strokeWidth="2" strokeLinecap="round" />
            {/* Horizontal serif caps on right wing top */}
            <path d="M 66 31 L 74 31" stroke="url(#logo-gradient)" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Signature 4-pointed Star on V's top-right corner */}
          <g transform="translate(71, 28)">
            {/* Star glow overlay */}
            <path
              d="M 0 -13 C 0 -3 3 0 13 0 C 3 0 0 3 0 13 C 0 3 -3 0 -13 0 C -3 0 0 -3 0 -13 Z"
              fill="url(#star-gradient)"
              filter="url(#glow)"
              opacity="0.6"
            />
            {/* Star shape */}
            <path
              d="M 0 -11 C 0 -2 2 0 11 0 C 2 0 0 2 0 11 C 0 2 -2 0 -11 0 C -2 0 0 -2 0 -11 Z"
              fill="url(#star-gradient)"
            />
          </g>
        </svg>
      </div>

      {/* Dynamic typography */}
      {withText && (
        <div className="flex flex-col justify-center leading-none">
          <span 
            className={`font-black tracking-[0.25em] text-white uppercase font-sans ${dimensions.text} ${textClassName}`}
          >
            Influencer
          </span>
          <span 
            className="text-[0.62em] font-extrabold tracking-[0.43em] uppercase bg-gradient-to-r from-[#E2A350] via-[#EC4899] to-[#8B5CF6] bg-clip-text text-transparent mt-0.5"
          >
            Verse
          </span>
        </div>
      )}
    </div>
  );
};
