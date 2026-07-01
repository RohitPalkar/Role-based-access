import type { SettingsState } from 'src/components/settings';
import type { NavSectionProps } from 'src/components/nav-section';
import type { Theme, SxProps, CSSObject, Breakpoint } from '@mui/material/styles';

import { useMemo } from 'react';

import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import { useBoolean } from 'src/hooks/use-boolean';

import { varAlpha, stylesMode } from 'src/theme/styles';

import { bulletColor } from 'src/components/nav-section';
import { useSettingsContext } from 'src/components/settings';

import { usePermission } from 'src/rbac/hooks/use-permission';
import { filterNavByPermissions } from 'src/rbac/utils';

import { Main } from './main';
import { NavMobile } from './nav-mobile';
import { layoutClasses } from '../classes';
import { NavVertical } from './nav-vertical';
import { NavHorizontal } from './nav-horizontal';
import { HeaderBase } from '../core/header-base';
import { _account } from '../config-nav-account';
import { LayoutSection } from '../core/layout-section';
import { NavBottomArea } from '../components/nav-bottom-area';

// ----------------------------------------------------------------------

export type DashboardLayoutProps = Readonly<{
  sx?: SxProps<Theme>;
  children: React.ReactNode;
  data?: {
    nav?: NavSectionProps['data'];
  };
  navData: NavSectionProps['data'];
}>;

export function DashboardLayout({ sx, children, data,navData }: DashboardLayoutProps) {
  const theme = useTheme();

  const mobileNavOpen = useBoolean();

  const settings = useSettingsContext();

  const permissionCtx = usePermission();
  const filteredNavData = useMemo(
    () => filterNavByPermissions(navData, permissionCtx),
    [navData, permissionCtx]
  );

  const navColorVars = useNavColorVars(theme, settings);

  const layoutQuery: Breakpoint = 'lg';

  const isMobile = useMediaQuery(theme.breakpoints.down(layoutQuery));

  const isNavMini = settings.navLayout === 'mini';

  const isNavHorizontal = settings.navLayout === 'horizontal';

  const isNavVertical = isNavMini || settings.navLayout === 'vertical';

  const renderSidebar = () => {
    if (!filteredNavData) {
      return null;
    }
    return (
      <NavVertical
        data={filteredNavData}
        bottomAreaData={{
          account: _account,
          notifications: [],
        }}
        isNavMini={isNavMini}
        layoutQuery={layoutQuery}
        enabledRootRedirect
        onToggleNav={() => {
          if (settings?.setField && settings?.navLayout) {
            settings.setField(
              'navLayout',
              settings.navLayout === 'vertical' ? 'mini' : 'vertical'
            );
          }
        }}
      />
    );
  };

  return (
    <>
      {filteredNavData && (
        <NavMobile
          data={filteredNavData}
          open={mobileNavOpen.value}
          onClose={mobileNavOpen.onFalse}
          enabledRootRedirect
          cssVars={navColorVars.section}
          slots={{
            bottomArea: (
              <NavBottomArea
                data={{
                  account: _account,
                  notifications: [],
                }}
                isNavMini={false}
              />
            ),
          }}
        />
      )}

      <LayoutSection
        /** **************************************
         * Header
         *************************************** */
        headerSection={
          isMobile && filteredNavData ? (
            <HeaderBase
              layoutQuery={layoutQuery}
              disableElevation={isNavVertical}
              onOpenNav={mobileNavOpen.onTrue}
              data={{
                nav: filteredNavData,
                langs: [],
                account: _account,
                contacts: [],
                workspaces: [],
                notifications: [],
              }}
              slotsDisplay={{
                signIn: false,
                purchase: false,
                helpLink: false,
                notifications: false,
                account: false,
                menuButton: true,
                workspaces: true,
              }}
              slots={{
                bottomArea: isNavHorizontal ? (
                  <NavHorizontal
                    data={filteredNavData}
                    layoutQuery={layoutQuery}
                    enabledRootRedirect
                    cssVars={navColorVars.section}
                  />
                ) : null,
              }}
              slotProps={{
                toolbar: {
                  sx: {
                    [`& [data-slot="logo"]`]: {
                      display: 'none',
                    },
                    [`& [data-area="right"]`]: {
                      gap: { xs: 0, sm: 0.75 },
                    },
                  },
                },
                container: {
                  maxWidth: false,
                },
              }}
            />
          ) : null
        }
        /** **************************************
         * Sidebar
         *************************************** */
        sidebarSection={isNavHorizontal ? null :renderSidebar()}
        /** **************************************
         * Footer
         *************************************** */
        footerSection={null}
        /** **************************************
         * Style
         *************************************** */
        cssVars={{
          ...navColorVars.layout,
          '--layout-transition-easing': 'linear',
          '--layout-transition-duration': '120ms',
          '--layout-nav-mini-width': '88px',
          '--layout-nav-vertical-width': '300px',
          '--layout-nav-horizontal-height': '64px',
          '--layout-dashboard-content-pt': isMobile ? theme.spacing(1) : theme.spacing(2),
          '--layout-dashboard-content-pb': theme.spacing(8),
          '--layout-dashboard-content-px': theme.spacing(5),
        }}
        sx={{
          [`& .${layoutClasses.hasSidebar}`]: {
            [theme.breakpoints.up(layoutQuery)]: {
              transition: theme.transitions.create(['padding-left'], {
                easing: 'var(--layout-transition-easing)',
                duration: 'var(--layout-transition-duration)',
              }),
              pl: isNavMini ? 'var(--layout-nav-mini-width)' : 'var(--layout-nav-vertical-width)',
            },
          },
          ...sx,
        }}
      >
        <Main isNavHorizontal={isNavHorizontal}>{children}</Main>
      </LayoutSection>
    </>
  );
}

// ----------------------------------------------------------------------

function useNavColorVars(
  theme: Theme,
  settings: SettingsState
): Record<'layout' | 'section', CSSObject> {
  const {
    vars: { palette },
  } = theme;

  return useMemo(() => {
    switch (settings.navColor) {
      case 'integrate':
        return {
          layout: {
            '--layout-nav-bg': palette.background.default,
            '--layout-nav-horizontal-bg': varAlpha(palette.background.defaultChannel, 0.8),
            '--layout-nav-border-color': varAlpha(palette.grey['500Channel'], 0.12),
            '--layout-nav-text-primary-color': palette.text.primary,
            '--layout-nav-text-secondary-color': palette.text.secondary,
            '--layout-nav-text-disabled-color': palette.text.disabled,
            [stylesMode.dark]: {
              '--layout-nav-border-color': varAlpha(palette.grey['500Channel'], 0.08),
              '--layout-nav-horizontal-bg': varAlpha(palette.background.defaultChannel, 0.96),
            },
          },
          section: {},
        };
      case 'apparent':
        return {
          layout: {
            '--layout-nav-bg': palette.grey[900],
            '--layout-nav-horizontal-bg': varAlpha(palette.grey['900Channel'], 0.96),
            '--layout-nav-border-color': 'transparent',
            '--layout-nav-text-primary-color': palette.common.white,
            '--layout-nav-text-secondary-color': palette.grey[500],
            '--layout-nav-text-disabled-color': palette.grey[600],
            [stylesMode.dark]: {
              '--layout-nav-bg': palette.grey[800],
              '--layout-nav-horizontal-bg': varAlpha(palette.grey['800Channel'], 0.8),
            },
          },
          section: {
            // caption
            '--nav-item-caption-color': palette.grey[600],
            // subheader
            '--nav-subheader-color': palette.grey[600],
            '--nav-subheader-hover-color': palette.common.white,
            // item
            '--nav-item-color': palette.grey[500],
            '--nav-item-root-active-color': palette.primary.light,
            '--nav-item-root-open-color': palette.common.white,
            // bullet
            '--nav-bullet-light-color': bulletColor.dark,
            // sub
            ...(settings.navLayout === 'vertical' && {
              '--nav-item-sub-active-color': palette.common.white,
              '--nav-item-sub-open-color': palette.common.white,
            }),
          },
        };
      default:
        throw new Error(`Invalid color: ${settings.navColor}`);
    }
  }, [
    palette.background.default,
    palette.background.defaultChannel,
    palette.common.white,
    palette.grey,
    palette.primary.light,
    palette.text.disabled,
    palette.text.primary,
    palette.text.secondary,
    settings.navColor,
    settings.navLayout,
  ]);
}
