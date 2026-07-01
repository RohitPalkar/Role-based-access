import type { EmblaCarouselType } from 'embla-carousel';

import { useState, useEffect, useCallback } from 'react';

import type { UseCarouselAutoPlayReturn } from '../types';

// ----------------------------------------------------------------------

export function useCarouselAutoPlay(mainApi?: EmblaCarouselType): UseCarouselAutoPlayReturn {
  const [isPlaying, setIsPlaying] = useState(false);

  const onClickAutoplay = useCallback(
    (callback: () => void) => {
      const autoplay = mainApi?.plugins()?.autoplay;
      if (!autoplay) return;

      const resetOrStop =
            // @ts-ignore
        autoplay.options.stopOnInteraction === false ? autoplay.reset : autoplay.stop;
      // @ts-ignore
      resetOrStop();
      callback();
    },
    [mainApi]
  );

  const onTogglePlay = useCallback(() => {
    const autoplay = mainApi?.plugins()?.autoplay;
    if (!autoplay) return;
      // @ts-ignore
    const playOrStop = autoplay.isPlaying() ? autoplay.stop : autoplay.play;
          // @ts-ignore
    playOrStop();
  }, [mainApi]);

  useEffect(() => {
    const autoplay = mainApi?.plugins()?.autoplay;
    if (!autoplay) return;
      // @ts-ignore
    setIsPlaying(autoplay.isPlaying());
    mainApi
          // @ts-ignore
      .on('autoplay:play', () => setIsPlaying(true))
            // @ts-ignore
      .on('autoplay:stop', () => setIsPlaying(false))
      .on('reInit', () => setIsPlaying(false));
  }, [mainApi]);

  return { isPlaying, onTogglePlay, onClickAutoplay };
}
