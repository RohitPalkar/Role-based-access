import type { IconButtonProps } from '@mui/material/IconButton';
import type { INotificationItem } from 'src/types/admin/feature/notification';

import { m } from 'framer-motion';
// eslint-disable-next-line import/no-extraneous-dependencies
import { io } from 'socket.io-client';
import { useState, useEffect } from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import InfiniteScroll from 'react-infinite-scroll-component';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import SvgIcon from '@mui/material/SvgIcon';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { useBoolean } from 'src/hooks/use-boolean';

import {
  getNotificationList,
  markNotificationAsRead,
  getUnreadNotificationCount,
} from 'src/services/admin-services/notification-service';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { varHover } from 'src/components/animate';

import { NotificationItem } from './notification-item';

export type NotificationsDrawerProps = IconButtonProps;

export function NotificationsDrawer({ sx, ...other }: NotificationsDrawerProps) {
  const drawer = useBoolean();

  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10); // Set a default limit for pagination
  const [notifications, setNotifications] = useState<INotificationItem[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [totalUnRead, setTotalUnRead] = useState<number>(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      setIsLoading(true);

      try {
        const data = await getNotificationList({
          page,
          limit,
          notifications: [],
          total: 0,
        });
        setNotifications((prevNotifications) => {
          const newNotifications = data?.notifications?.filter(
            (newNotification) =>
              !prevNotifications?.some(
                (prevNotification) => prevNotification?.id === newNotification?.id
              )
          );
          return [...prevNotifications, ...newNotifications];
        });
        setIsLoading(false);
        setHasMore(data?.notifications?.length > 0); // Check if more data is available
      } catch (error) {
        console.error(error)
        setIsLoading(false);
      }
    };
    fetchNotifications();
  }, [page, limit]);

  useEffect(() => {
    // on drawer close setting page to 1 and getting first 10 notifications
    if (drawer.value === false) {
      setPage(1);
      setHasMore(true);
    }
  }, [drawer]);

  useEffect(() => {
    const fetchUnreadNotificationCount = async () => {
      setIsLoading(true);

      try {
        const data = await getUnreadNotificationCount();
        setTotalUnRead(data);
        setIsLoading(false);
      } catch (error) {
        console.error(error)
        setIsLoading(false);
      }
    };
    fetchUnreadNotificationCount();
  }, [notifications]);

  // Notification Count WebSocket
  useEffect(() => {
    // Initialize the socket connection
    const socket = io(import.meta.env.VITE_WEB_SOCKET_URL );

    // On connection
    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    // Handle connection error
    socket.on('connect_error', (error: any) => {
      console.log('connect_error', error);
    });

    // Handle new notifications
    socket.on('newNotification', (notificationObj: any) => {
      console.log('newNotification', notificationObj);
      // Assuming setTotalUnRead is a state setter
      if (notificationObj?.messageCount !== undefined) {
        setTotalUnRead(notificationObj?.messageCount); // Update notification count
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });

    // Cleanup the socket connection on unmount
    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('newNotification');
      socket.off('disconnect');
      socket.disconnect();
    };
  }, []);

  const handleMarkAllAsRead = () => {
    setNotifications(notifications?.map((notification) => ({ ...notification, isRead: true })));

    const markNotificationAsReadMethod = async () => {
      try {
        const data = await markNotificationAsRead();
        setTotalUnRead(0);
        toast.success(data);
      } catch (error) {
        console.log(error.message);
      }
    };
    markNotificationAsReadMethod();
    drawer.onFalse();
  };

  const renderHead = (
    <Stack direction="row" alignItems="center" sx={{ py: 2, pl: 2.5, pr: 1, minHeight: 68 }}>
      <Typography variant="h6" sx={{ flexGrow: 1 }}>
        Notifications
      </Typography>

      {!!totalUnRead && (
        <Tooltip title="Mark all as read" enterTouchDelay={0}>
          <IconButton color="primary" onClick={handleMarkAllAsRead}>
            <Iconify icon="eva:done-all-fill" />
          </IconButton>
        </Tooltip>
      )}

      <IconButton onClick={drawer.onFalse} sx={{ display: { xs: 'inline-flex', sm: 'none' } }}>
        <Iconify icon="mingcute:close-line" />
      </IconButton>
    </Stack>
  );

  const handleScroll = (e: any) => {
    const bottom = e.target.scrollHeight === e.target.scrollTop + e.target.clientHeight;
    if (bottom && hasMore) {
      setPage((prevPage) => prevPage + 1);
    }
  };

  const renderList = (
    <Box
      sx={{
        overflowX: 'hidden', // 🔹 Prevents horizontal scrolling
        WebkitOverflowScrolling: 'touch', // 🔹 Ensures smooth scrolling on mobile
        '&::-webkit-scrollbar': { display: 'none' }, // 🔹 Hides scrollbar on WebKit browsers
        overscrollBehavior: 'contain', // 🔹 Prevents outer div from scrolling when at top/bottom
      }}
    >
      <InfiniteScroll
        scrollableTarget="notification-scroll-container"
        dataLength={notifications.length}
        next={() => {
          setPage((prevPage) => prevPage + 1);
        }}
        hasMore={hasMore}
        loader={
          isLoading && (
            <p style={{ textAlign: 'center' }}>
              <h4>Loading...</h4>
            </p>
          )
        }
        endMessage={<p style={{ textAlign: 'center' }}>No more notifications</p>}
        scrollThreshold={0.95} // Adjust this to fine-tune the trigger point
      >
        <Box
          component="ul"
          onScroll={handleScroll}
          sx={{
            '@media (max-width: 1920px) and (max-height: 1080px)': {
              maxHeight: 'calc(95vh - 70px)',
            },
            overflowY: 'auto',
          }}
        >
          {notifications.map((notification: INotificationItem) => (
            <Box component="li" key={notification.id} sx={{ display: 'flex' }}>
              <NotificationItem notification={notification} />
            </Box>
          ))}
        </Box>
      </InfiniteScroll>
    </Box>
  );

  return (
    <>
      <IconButton
        component={m.button}
        whileTap="tap"
        whileHover="hover"
        variants={varHover(1.05)}
        onClick={drawer.onTrue}
        sx={sx}
        {...other}
      >
        <Badge badgeContent={totalUnRead} color="error">
          <SvgIcon>
            <path
              fill="currentColor"
              d="M18.75 9v.704c0 .845.24 1.671.692 2.374l1.108 1.723c1.011 1.574.239 3.713-1.52 4.21a25.794 25.794 0 0 1-14.06 0c-1.759-.497-2.531-2.636-1.52-4.21l1.108-1.723a4.393 4.393 0 0 0 .693-2.374V9c0-3.866 3.022-7 6.749-7s6.75 3.134 6.75 7"
              opacity="0.5"
            />
            <path
              fill="currentColor"
              d="M12.75 6a.75.75 0 0 0-1.5 0v4a.75.75 0 0 0 1.5 0zM7.243 18.545a5.002 5.002 0 0 0 9.513 0c-3.145.59-6.367.59-9.513 0"
            />
          </SvgIcon>
        </Badge>
      </IconButton>

      <Drawer
        open={drawer.value}
        onClose={drawer.onFalse}
        anchor="right"
        slotProps={{ backdrop: { invisible: true } }}
        PaperProps={{ sx: { width: 1, maxWidth: 420 } }}
      >
        {renderHead}
        {notifications.length ? (
          renderList
        ) : (
          <p style={{ textAlign: 'center', marginTop: '400px' }}>No Notification Found!</p>
        )}
      </Drawer>
    </>
  );
}
