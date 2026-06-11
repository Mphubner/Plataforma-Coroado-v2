import React from 'react';

export function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 150">
      {/* Ring */}
      <circle cx="75" cy="75" r="50" stroke="currentColor" strokeWidth="18" fill="none" />
      
      {/* Crown Base */}
      <path d="M 45,95 Q 75,100 105,95 L 100,105 Q 75,110 50,105 Z" fill="currentColor" />
      
      {/* Crown Body */}
      <path d="M 45,85 L 35,55 Q 55,75 75,45 Q 95,75 115,55 L 105,85 Q 75,92 45,85 Z" fill="currentColor" />
      
      {/* Crown Dots */}
      <circle cx="35" cy="50" r="6" fill="currentColor" />
      <circle cx="75" cy="38" r="7" fill="currentColor" />
      <circle cx="115" cy="50" r="6" fill="currentColor" />

      {/* Text */}
      <g transform="translate(150, 110)" fill="currentColor" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" letterSpacing="4">
        {/* C */}
        <path d="M 60,0 C 35,0 15,-15 15,-40 L 15,-60 C 15,-85 35,-100 60,-100 C 85,-100 100,-85 100,-60 L 75,-60 C 75,-75 70,-80 60,-80 C 50,-80 40,-75 40,-60 L 40,-40 C 40,-25 50,-20 60,-20 C 70,-20 75,-25 75,-40 L 100,-40 C 100,-15 85,0 60,0 Z" />
        {/* O */}
        <path d="M 160,0 C 135,0 115,-15 115,-40 L 115,-60 C 115,-85 135,-100 160,-100 C 185,-100 205,-85 205,-60 L 205,-40 C 205,-15 185,0 160,0 Z M 160,-20 C 170,-20 180,-25 180,-40 L 180,-60 C 180,-75 170,-80 160,-80 C 150,-80 140,-75 140,-60 L 140,-40 C 140,-25 150,-20 160,-20 Z" />
        {/* R */}
        <path d="M 220,0 L 220,-100 L 270,-100 C 300,-100 315,-85 315,-60 C 315,-45 305,-30 280,-25 L 315,0 L 285,0 L 255,-35 L 245,-35 L 245,0 L 220,0 Z M 245,-55 L 270,-55 C 285,-55 290,-60 290,-65 C 290,-70 285,-75 270,-75 L 245,-75 L 245,-55 Z" />
        {/* O */}
        <path d="M 370,0 C 345,0 325,-15 325,-40 L 325,-60 C 325,-85 345,-100 370,-100 C 395,-100 415,-85 415,-60 L 415,-40 C 415,-15 395,0 370,0 Z M 370,-20 C 380,-20 390,-25 390,-40 L 390,-60 C 390,-75 380,-80 370,-80 C 360,-80 350,-75 350,-60 L 350,-40 C 350,-25 360,-20 370,-20 Z" />
        {/* Lambda A */}
        <path d="M 430,0 L 465,-100 L 490,-100 L 525,0 L 495,0 L 477,-55 L 460,0 Z " />
        {/* D */}
        <path d="M 540,0 L 540,-100 L 585,-100 C 625,-100 640,-80 640,-50 C 640,-20 625,0 585,0 L 540,0 Z M 565,-20 L 585,-20 C 605,-20 615,-30 615,-50 C 615,-70 605,-80 585,-80 L 565,-80 L 565,-20 Z" />
        {/* O */}
        <path d="M 690,0 C 665,0 645,-15 645,-40 L 645,-60 C 645,-85 665,-100 690,-100 C 715,-100 735,-85 735,-60 L 735,-40 C 735,-15 715,0 690,0 Z M 690,-20 C 700,-20 710,-25 710,-40 L 710,-60 C 710,-75 700,-80 690,-80 C 680,-80 670,-75 670,-60 L 670,-40 C 670,-25 680,-20 690,-20 Z" />
      </g>
    </svg>
  );
}

export function Icon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150">
      <circle cx="75" cy="75" r="50" stroke="currentColor" strokeWidth="18" fill="none" />
      <path d="M 45,95 Q 75,100 105,95 L 100,105 Q 75,110 50,105 Z" fill="currentColor" />
      <path d="M 45,85 L 35,55 Q 55,75 75,45 Q 95,75 115,55 L 105,85 Q 75,92 45,85 Z" fill="currentColor" />
      <circle cx="35" cy="50" r="6" fill="currentColor" />
      <circle cx="75" cy="38" r="7" fill="currentColor" />
      <circle cx="115" cy="50" r="6" fill="currentColor" />
    </svg>
  );
}
