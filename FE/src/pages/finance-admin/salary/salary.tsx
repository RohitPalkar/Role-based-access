import { useAppDispatch } from "src/hooks/use-redux";

import { setTitleAsync } from "src/redux/slices/admin/title-slice";

import { SalaryView } from "src/sections/finance-admin/salary/salary-view";

function Salary() {
  const dispatch = useAppDispatch();
  
  dispatch(setTitleAsync('Salary'));
  return <SalaryView />;
}

export default Salary;
