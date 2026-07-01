/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Theme, SxProps } from '@mui/material/styles';

import { Main, CompactContent } from './main';
import { LayoutSection } from '../core/layout-section';

// ----------------------------------------------------------------------

export type SimpleLayoutProps = Readonly<{
  sx?: SxProps<Theme>;
  children: React.ReactNode;
  content?: {
    compact?: boolean;
  };
}>;

export function SimpleLayout({ sx, children, content }: SimpleLayoutProps) {
  return (
    <LayoutSection
      /** **************************************
       * Header
       *************************************** */
      // headerSection={
      //   <HeaderBase
      //     layoutQuery={layoutQuery}
      //     onOpenNav={mobileNavOpen.onTrue}
      //     slotsDisplay={{
      //       signIn: false,
      //       account: false,
      //       purchase: false,
      //       contacts: false,
      //       searchbar: false,
      //       workspaces: false,
      //       menuButton: false,
      //       localization: false,
      //       notifications: false,
      //     }}
      //     slotProps={{ container: { maxWidth: false } }}
      //   />
      // }
      /** **************************************
       * Footer
       *************************************** */
      footerSection={null}
      /** **************************************
       * Style
       *************************************** */
      cssVars={{
        '--layout-simple-content-compact-width': '448px',
      }}
      sx={sx}
    >
      <Main>{content?.compact ? <CompactContent>{children}</CompactContent> : children}</Main>
    </LayoutSection>
  );
}