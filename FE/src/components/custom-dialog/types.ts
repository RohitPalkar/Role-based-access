import type { DialogProps } from '@mui/material/Dialog';
import type { IconifyIcon, IconifyIconSize } from '@iconify/react';

// ----------------------------------------------------------------------

export type ConfirmDialogProps = Omit<DialogProps, 'title' | 'content' | 'onClose'> & {
  onClose?: () => void;
  title: React.ReactNode;
  centerTitle?: boolean;
  action: React.ReactNode;
  content?: React.ReactNode;
  showCancel?: boolean;
  /** When true, backdrop click and Escape do not call onClose. */
  disableBackdropClose?: boolean;
  showCloseButton?: boolean; 
  showDivider?: boolean;
  icon?: DialogIconProps;
  cancelLabel?: string;
  cancelDisabled?: boolean;
  onCancel?: () => void;
  leftAlignTitle?: boolean;
  contentTextAlign?: 'left' | 'center';
  topIcon?: string; 
  isLarge?: boolean;
  isMedium?: boolean;
  titlePadding?: string | number; 
};

type DialogIconProps = {
  name?:string | IconifyIcon,
  width?:IconifyIconSize
}