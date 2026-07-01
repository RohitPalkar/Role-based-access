import { useSelector } from 'react-redux';
import React, { useState, useEffect } from 'react'

import { Box, Card, Button, Tooltip, Typography } from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { INVENTORY_STATUS, generateRoleBasedRoute } from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';
import towerIcon from 'src/assets/icons/tower-icon.svg';

import { Label } from 'src/components/label';
import { EmptyContent } from 'src/components/empty-content';

import ViewTypeTabs from '../eoi-dashboard/components/view-type-tabs';

const jsonValue = uiText.EOIJson.UnitInventoryView.towerView;

const getTooltipContent = (unit: any) => {
  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case INVENTORY_STATUS.AVAILABLE:
        return 'success';
      case INVENTORY_STATUS.BLOCKED_BY_RM:
      case INVENTORY_STATUS.BLOCKED_BY_MANAGEMENT:
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 1 }}>
      <Typography sx={{ fontWeight: 700, fontSize: '16px', mb: 1 }}>
        {unit.unitNumber}
      </Typography>

      <Typography sx={{ fontSize: '12px' }}>
        {jsonValue.tooltip.tower}: <b>{unit.towerName || 'N/A'}</b>
      </Typography>

      <Typography sx={{ fontSize: '12px' }}>
        {jsonValue.tooltip.floor}: <b>{unit.floor || 'N/A'}</b>
      </Typography>

      <Typography sx={{ fontSize: '12px' }}>
        {jsonValue.tooltip.facingDirection}: <b>{unit.facing || 'N/A'}</b>
      </Typography>

      <Typography sx={{ fontSize: '12px' }}>
        {jsonValue.tooltip.unitType}: <b>{unit.configuration || 'N/A'}</b>
      </Typography>

      <Typography sx={{ fontSize: '12px' }}>
        {jsonValue.tooltip.series}: <b>{unit.series || 'N/A'}</b>
      </Typography>

      <Typography sx={{ fontSize: '12px' }}>
        {jsonValue.tooltip.status}:
        <Label variant="soft" color={getStatusColor(unit?.status)} sx={{ ml: 0.5 }}>
          {unit?.status || '-'}
        </Label>
      </Typography>
    </Box>
  );
};

const isUnitBlocked = (status?: string) => status === INVENTORY_STATUS.BLOCKED_BY_RM || status === INVENTORY_STATUS.BLOCKED_BY_MANAGEMENT;

const UnitInventoryTowerView = () => {
  const route = useRouter();
  const [tabValue, setTabValue] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<{
    unitNumber: string;
    floor: string;
  } | null>(null);
  const { unitInventoryData, towerOptions } = useSelector((state: any) => state.unitInventory);
  const { userRole } = useRoleBasedPermissions({ module: 'unitInventory' });

  const towerTabs = React.useMemo(() => {
    const towerOrder = towerOptions?.map((t: any) => t.value) || [];
    const inventoryTowers = new Set(
      unitInventoryData?.map((item: any) => item.towerName)
    );

    const orderedTowers = towerOrder.filter((tower: string) =>
      inventoryTowers.has(tower)
    );

    return orderedTowers.map((tower: any) => ({
      label: tower,
      value: tower,
    }));
  }, [unitInventoryData, towerOptions]);

  useEffect(() => {
    if (towerTabs.length) {
      setTabValue(towerTabs[0].value);
    }
  }, [towerTabs]);

  useEffect(() => {
    setSelectedUnit(null);
  }, [tabValue]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setTabValue(newValue);
  };

  const groupedData = unitInventoryData?.reduce((acc: any, unit: any) => {
    if (!acc[unit.towerName]) {
      acc[unit.towerName] = {};
    }

    if (!acc[unit.towerName][unit.floor]) {
      acc[unit.towerName][unit.floor] = [];
    }

    acc[unit.towerName][unit.floor].push(unit);

    return acc;
  }, {});

  return (
    <Card sx={{ mt: 2, padding: '20px' }}>
      <Typography sx={{ fontSize: '18px', fontWeight: 600 }}>
        {jsonValue.title}
      </Typography>
      <ViewTypeTabs
        value={tabValue}
        onChange={handleTabChange}
        options={towerTabs}
        fullWidth
        noLeftMargin
      />

    {!unitInventoryData?.length || !towerTabs.length ? (
      <EmptyContent sx={{ py: 10 }} />
    ) : (
      Object.entries(groupedData?.[tabValue] || {})
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([floor, units]: any, index: number) => {

          const selectedUnitData =
            selectedUnit?.floor === floor
              ? units.find((u: any) => u.unitNumber === selectedUnit?.unitNumber)
              : null;

        return (
          <Card
            key={index}
            sx={{
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '10px',
              padding: '17px',
              mt: 2,
            }}
          >
            {/* HEADER */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <img src={towerIcon} alt="tower-icon" />

                <Typography sx={{ fontSize: '16px', fontWeight: 600 }}>
                  {jsonValue.tooltip.floor} {floor}
                </Typography>

                <Typography sx={{ fontSize: '14px', color: '#6A7282' }}>
                  ({units.length} {units.length === 1 ? 'Unit' : 'Units'})
                </Typography>
              </Box>

              <Button
                size="small"
                variant="contained"
                onClick={() => route.push(generateRoleBasedRoute(userRole, `inventory/map-unit-to-voucher/${selectedUnitData?.id}`))}
                disabled={!selectedUnitData || isUnitBlocked(selectedUnitData?.status)}
                sx={{
                  px: 2,
                  fontSize: '14px',
                  backgroundColor: '#1A407D',
                  '&:hover': {
                    backgroundColor: '#174A9D',
                  },
                }}
              >
                {jsonValue.mapUnit}
              </Button>
            </Box>

            {/* UNIT CARDS */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                mt: 2,
                mb: 1,
                flexWrap: 'wrap',
              }}
            >
              {units.map((unit: any) => {
                const isSelected = selectedUnit?.unitNumber === unit.unitNumber && selectedUnit?.floor === unit.floor;

                return (
                  <Tooltip
                    key={`${unit.towerName}-${unit.floor}-${unit.unitNumber}`}
                    title={getTooltipContent(unit)}
                    arrow
                    placement="right"
                  >
                    <Card
                      onClick={() => {
                        if (isUnitBlocked(unit?.status)) return;

                        setSelectedUnit((prev) =>
                          prev?.unitNumber === unit.unitNumber
                            ? null
                            : { unitNumber: unit.unitNumber, floor: unit.floor }
                        )
                      }}
                      sx={{
                        backgroundColor: isUnitBlocked(unit?.status)
                          ? '#EDDDD9'
                          : isSelected
                            ? '#1A407D'
                            : '#EDF0F4',
                        color: isUnitBlocked(unit?.status)
                          ? '#B71D18'
                          : isSelected
                            ? '#FFFFFF'
                            : '#000',
                        height: '100px',
                        width: '100px',
                        padding:'0px 5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        cursor: isUnitBlocked(unit?.status) ? 'not-allowed' : 'pointer',
                        border: isUnitBlocked(unit?.status) ? '2px solid #B71D18' : '2px solid #1A407D',
                        textAlign: 'center',
                      }}
                    >
                      <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
                        {unit.unitNumber}
                      </Typography>
                    </Card>
                  </Tooltip>
                );
              })}
            </Box>
          </Card>
        );
      })
    )}
    </Card>
  )
}

export default UnitInventoryTowerView