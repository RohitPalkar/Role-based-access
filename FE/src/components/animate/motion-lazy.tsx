import { domMax, LazyMotion } from 'framer-motion';

// ----------------------------------------------------------------------

type Props = Readonly<{
  children: React.ReactNode;
}>;

export function MotionLazy({ children }: Props) {
  return (
    <LazyMotion strict features={domMax}>
      {children}
    </LazyMotion>
  );
}
