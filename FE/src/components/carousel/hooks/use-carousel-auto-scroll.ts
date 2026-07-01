import type { EmblaCarouselType } from 'embla-carousel';

import { useState, useEffect, useCallback } from 'react';

import type { UseCarouselAutoPlayReturn } from '../types';

// ----------------------------------------------------------------------

export function useCarouselAutoScroll(mainApi?: EmblaCarouselType): UseCarouselAutoPlayReturn {
  const [isPlaying, setIsPlaying] = useState(false);

  const onClickAutoplay = useCallback(
    (callback: () => void) => {
      const autoScroll = mainApi?.plugins()?.autoScroll;
      if (!autoScroll) return;

      const resetOrStop =
            // @ts-ignore
        autoScroll.options.stopOnInteraction === false ? autoScroll.reset : autoScroll.stop;
      // @ts-ignore
      resetOrStop();
      callback();
    },
    [mainApi]
  );

  const onTogglePlay = useCallback(() => {
    const autoScroll = mainApi?.plugins()?.autoScroll;
    if (!autoScroll) return;
      // @ts-ignore
    const playOrStop = autoScroll.isPlaying() ? autoScroll.stop : autoScroll.play;
          // @ts-ignore
    playOrStop();
  }, [mainApi]);

  useEffect(() => {
    const autoScroll = mainApi?.plugins()?.autoScroll;
    if (!autoScroll) return;
      // @ts-ignore
    setIsPlaying(autoScroll.isPlaying());
    mainApi
          // @ts-ignore
      .on('autoScroll:play', () => setIsPlaying(true))
            // @ts-ignore
      .on('autoScroll:stop', () => setIsPlaying(false))
      .on('reInit', () => setIsPlaying(false));
  }, [mainApi]);

  return { isPlaying, onTogglePlay, onClickAutoplay };
}
