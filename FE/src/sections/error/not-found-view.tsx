import { m } from 'framer-motion';

import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAppSelector } from 'src/hooks/use-redux';

import { ROLES } from 'src/utils/constant';

import { SimpleLayout } from 'src/layouts/simple';
import { PageNotFoundIllustration } from 'src/assets/illustrations';

import { varBounce, MotionContainer } from 'src/components/animate';

// ----------------------------------------------------------------------

export function NotFoundView() {
  const { user } = useAppSelector((state) => state.auth);
  let homeRoute = '/';
  switch (user?.role) {
    case ROLES.SuperAdmin:
      homeRoute = paths.superAdmin.root;
      break;
    case ROLES.Admin:
      homeRoute = paths.admin.root;
      break;
    case ROLES.RM:
      homeRoute = paths.rm.root;
      break;
    case ROLES.FinanceAdmin:
      homeRoute = paths.financeAdmin.root;
      break;
    case ROLES.CRM:
      homeRoute = paths.crm.root;
      break;
    case ROLES.GRE:
      homeRoute = paths.gre.root;
      break;
    case ROLES.MIS:
      homeRoute = paths.mis.root;
      break;
    case ROLES.SALES_TL:
      homeRoute = paths.salesTL.root;
      break;
    case ROLES.SALES_RSH:
      homeRoute = paths.salesRSH.root;
      break;
    case ROLES.SALES_BH:
      homeRoute = paths.salesBH.root;
      break;
    case ROLES.PROJECT_HEAD:
      homeRoute = paths.projectHead.root;
      break;
    case ROLES.BIS:
      homeRoute = paths.bis.root;
      break;
    case ROLES.CRM_TL:
      homeRoute = paths.crmTl.root;
      break;
    case ROLES.CRM_HEAD:
      homeRoute = paths.crmHead.root;
      break;
    case ROLES.FINANCE_USER:
      homeRoute = paths.financeUser.root;
      break;
    case ROLES.FINANCE_HEAD:
      homeRoute = paths.financeHead.root;
      break;
    case ROLES.LOYALTY:
      homeRoute = paths.loyalty.root;
      break;
    default:
      homeRoute = paths.auth.jwt.signIn;
  }

  return (
    <SimpleLayout content={{ compact: true }}>
      <Container component={MotionContainer}>
        <m.div variants={varBounce().in}>
          <Typography variant="h3" sx={{ mb: 2 }}>
            Sorry, page not found!
          </Typography>
        </m.div>

        <m.div variants={varBounce().in}>
          <Typography sx={{ color: 'text.secondary' }}>
            Sorry, we couldn’t find the page you’re looking for. Perhaps you’ve mistyped the URL? Be
            sure to check your spelling.
          </Typography>
        </m.div>

        <m.div variants={varBounce().in}>
          <PageNotFoundIllustration sx={{ my: { xs: 5, sm: 5 } }} />
        </m.div>

        <Button component={RouterLink} href={homeRoute} size="large" variant="contained">
          Go to home
        </Button>
      </Container>
    </SimpleLayout>
  );
}
