import {useCallback, useRef} from 'react';
import {css} from '@emotion/react';
import styled from '@emotion/styled';
import Color from 'color';

import {Button} from 'sentry/components/button';
import {IconChevron} from 'sentry/icons';
import {t} from 'sentry/locale';
import {space, type ValidSize} from 'sentry/styles/space';
import {useRefChildrenVisibility} from 'sentry/utils/useRefChildrenVisibility';

interface ScrollCarouselProps {
  children: React.ReactNode;
  className?: string;
  gap?: ValidSize;
}

/**
 * This number determines what percentage of an element must be within the
 * visible scroll region for it to be considered 'visible'. If it is visible
 * but slightly off screen it will be skipped when scrolling
 *
 * For example, if set to 0.85, and 15% of the element is out of the scroll
 * area to the right, pressing the right arrow will skip over scrolling to
 * this element, and will scroll to the next invisible one.
 */
const DEFAULT_VISIBLE_RATIO = 0.85;

/**
 * This number determines how many items to jump when scrolling left or right
 * when the arrow buttons are clicked
 */
const DEFAULT_JUMP_ITEM_COUNT = 2;

export function ScrollCarousel({children, className, gap = 1}: ScrollCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const {visibility, childrenEls} = useRefChildrenVisibility({
    children,
    scrollContainerRef,
    visibleRatio: DEFAULT_VISIBLE_RATIO,
  });

  const isAtStart = visibility.at(0) ?? true;
  const isAtEnd = visibility.at(-1) ?? true;

  const scrollLeft = useCallback(() => {
    const scrollIndex = visibility.findIndex(Boolean);
    // Clamp the scroll index to the first visible item
    const clampedIndex = Math.max(scrollIndex - DEFAULT_JUMP_ITEM_COUNT, 0);
    childrenEls[clampedIndex]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'start',
    });
  }, [visibility, childrenEls]);

  const scrollRight = useCallback(() => {
    const scrollIndex = visibility.findLastIndex(Boolean);
    // Clamp the scroll index to the last visible item
    const clampedIndex = Math.min(
      scrollIndex + DEFAULT_JUMP_ITEM_COUNT,
      visibility.length - 1
    );
    childrenEls[clampedIndex]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'end',
    });
  }, [visibility, childrenEls]);

  return (
    <ScrollCarouselWrapper>
      <ScrollContainer
        ref={scrollContainerRef}
        className={className}
        style={{gap: space(gap)}}
      >
        {children}
      </ScrollContainer>
      {!isAtStart && <LeftMask />}
      {!isAtEnd && <RightMask />}
      {!isAtStart && (
        <StyledArrowButton
          onClick={scrollLeft}
          style={{left: 0}}
          aria-label={t('Scroll left')}
          icon={<StyledIconChevron direction="left" />}
          borderless
        />
      )}
      {!isAtEnd && (
        <StyledArrowButton
          onClick={scrollRight}
          style={{right: 0}}
          aria-label={t('Scroll right')}
          icon={<StyledIconChevron direction="right" />}
          borderless
        />
      )}
    </ScrollCarouselWrapper>
  );
}

const ScrollCarouselWrapper = styled('div')`
  position: relative;
  overflow: hidden;
`;

const ScrollContainer = styled('div')`
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;

  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
  &::-webkit-scrollbar {
    display: none;
  }
`;

const StyledArrowButton = styled(Button)`
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  min-height: 14px;
  height: 14px;
  width: 14px;
  padding: 10px;
  border-radius: 100%;
  z-index: 1;
  color: ${p => p.theme.subText};
  opacity: 0.6;
  background-color: ${p => p.theme.background};

  &:hover {
    opacity: 1;
    background-color: ${p => p.theme.backgroundSecondary};
  }
`;

const Mask = css`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 40px;
  pointer-events: none;
  z-index: 1;
`;

const LeftMask = styled('div')`
  ${Mask}
  left: 0;
  background: linear-gradient(
    90deg,
    ${p => p.theme.background} 50%,
    ${p => Color(p.theme.background).alpha(0.09).rgb().string()} 100%
  );
`;

const RightMask = styled('div')`
  ${Mask}
  right: 0;
  background: linear-gradient(
    270deg,
    ${p => p.theme.background} 50%,
    ${p => Color(p.theme.background).alpha(0.09).rgb().string()} 100%
  );
`;

const StyledIconChevron = styled(IconChevron)`
  margin-left: 1px;
`;
