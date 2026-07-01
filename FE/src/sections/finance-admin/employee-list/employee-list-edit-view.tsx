import type { RootState, AppDispatch } from 'src/redux/store';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { useParams } from 'src/routes/hooks';

import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import { getEmployeeById } from 'src/redux/actions/finance-admin/employee-list-actions';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import EmployeeListStructureEditCreateForm from './component/employee-edit-form';

const EmployeeListEditView = () => {
  const params = useParams();
  const { employeeDetails } = useSelector((state: RootState) => state.employeeList);
  const dispatch: AppDispatch = useDispatch();

  useEffect(() => {
    dispatch(getEmployeeById(Number(params.id)));
  }, [dispatch, params.id]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={uiText.employeeList.form.create.editTitle}
    sx={stickyBreadcrumbsStyles} 
      />
      {employeeDetails && !Array.isArray(employeeDetails) && (
        <EmployeeListStructureEditCreateForm id={params.id} currentEmployee={employeeDetails} />
      )}
    </DashboardContent>
  );
};

export default EmployeeListEditView;
