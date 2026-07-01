import React from 'react';

interface DecorativeShapeProps {
  readonly gradientColor: string;
}

function DecorativeShape({ gradientColor }: DecorativeShapeProps) {

  return (
    <div
      style={{
        position: 'absolute',
        top: '-40px',
        right: '-100px',
        width: '160px',
        height: '160px',
        borderRadius: `calc(3 * var(--shape-borderRadius))`,
        transform: 'rotate(40deg)',
        background: `linear-gradient(180deg, ${gradientColor} 1%, ${gradientColor} 0%)`,
        opacity: 0.12,
      }}
    />
  );
}

export default DecorativeShape;
