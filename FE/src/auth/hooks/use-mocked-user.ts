// To get the user from the <AuthContext/>, you can use

// To:
// eslint-disable-next-line import/no-cycle
import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

export function useMockedUser() {
  const { user } = useAuthContext();

  return { user };
}
