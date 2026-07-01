import dayjs from 'dayjs';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Radio from '@mui/material/Radio';
import Stack from '@mui/material/Stack';
import FormLabel from '@mui/material/FormLabel';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';

import { useRouter, useParams } from 'src/routes/hooks';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { mapArrayToLabelValue } from 'src/utils/helper';
import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';
import { BatchStage, RESIDENT_STATUS, generateRoleBasedRoute } from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import { setTitleAsync } from 'src/redux/slices/admin/title-slice';
import { getBatchManagerById } from 'src/services/common-module/batch-manager-services';
import { fetchInventoryTypes, fetchEOICampaignList } from 'src/redux/actions/admin/eoi-manager-actions';
import { fetchBatchStatsAction, mapBatchVouchersAction, createBatchManagerAction, updateBatchManagerAction, fetchUnmappedCountAction } from 'src/redux/actions/common-module/batch-manager-actions';

import { toast } from 'src/components/snackbar';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

import BatchPreviewTable from './components/batch-preview-table';
import { BatchManagerIdBreakdown } from './batch-manager-id-breakdown';
import BatchListingDialogBox from './components/batch-listing-dialog-box';
import {
  mapBatchStatsResponseToModel,
  selectBreakdownRowForResidency,
} from './utils/batch-manager-shared';
import { mapApiResultToRows, type BatchPreviewRow, type BatchPreviewEditablePatch } from './utils/batch-preview-build-rows';
import {
  BatchManagerConfigurationForm,
  type BatchManagerConfigurationFormValues,
} from './batch-manager-configuration-form';

import type { DialogType, NotifySubmitPayload } from './components/batch-listing-dialog-box';

// ----------------------------------------------------------------------

/** Same formatter as configuration form for 12h display. */
// Removed: formatScheduleTimeForCopy moved to shared utils.

// ----------------------------------------------------------------------

/** Batch Manager only: NRI + Indian (exclude PIO/OCI from shared `RESIDENT_STATUS`). */
const RESIDENCY_OPTIONS = [RESIDENT_STATUS.Nri, RESIDENT_STATUS.Indian].map((label) => ({
  value: label,
  label,
}));

/** Section container aligned with EOI dashboard / EOICards (see eoi-dashboard-list-view, eoi-cards). */
const BATCH_PANEL_CARD_SX = {
  width: '100%',
  borderRadius: '16px',
  overflow: 'hidden',
  backgroundColor: '#fff',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  color: '#1C252E',
  p: { xs: 2, md: 3 },
} as const;

const batchStageRadioSx = {
  color: '#637381',
  '&.Mui-checked': {
    color: '#1A407D',
  },
} as const;

const batchStageLabelSx = {
  fontWeight: 600,
  color: '#1C252E',
  fontSize: '14px',
  lineHeight: '12px',
  letterSpacing: '0px',
  mb: 0.5,
  '&.Mui-focused': {
    color: '#1C252E',
  },
  '&.Mui-error': {
    color: '#1C252E',
  },
  '& .MuiFormLabel-asterisk': {
    color: 'red',
  },
} as const;

const batchStageOptionLabelSx = {
  '& .MuiFormControlLabel-label': {
    fontFamily: 'Poppins',
    fontWeight: 400,
    fontSize: '14px',
    lineHeight: '22px',
    color: '#1C252E',
  },
} as const;

function toSingleAutocompleteValue(
  value: string | number | (string | number)[] | null
): string | number {
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value;
}

// ----------------------------------------------------------------------

type BatchStageConfigurationCardProps = {
  batchStage: BatchStage | '';
  setBatchStage: (stage: BatchStage | '') => void;
  residentStatus: string | number;
  setResidentStatus: (status: string | number) => void;
  typology: (string | number)[];
  setTypology: (typology: (string | number)[]) => void;
  isIndianResidency: boolean;
  typologyOptions: { label: string; value: string | number }[];
  setSessionBatchId: (id: string | null) => void;
  isEditMode: boolean;
};

function BatchStageConfigurationCard({
  batchStage,
  setBatchStage,
  residentStatus,
  setResidentStatus,
  typology,
  setTypology,
  isIndianResidency,
  typologyOptions,
  setSessionBatchId,
  isEditMode,
}: Readonly<BatchStageConfigurationCardProps>) {
  return (
    <Card sx={BATCH_PANEL_CARD_SX}>
      <Grid container spacing={2} alignItems="flex-start">
        <Grid item xs={12} md={6}>
          <ControlledAutocomplete
            label="Residency"
            options={RESIDENCY_OPTIONS}
            value={residentStatus}
            onChange={(value) => {
              setResidentStatus(toSingleAutocompleteValue(value));
            }}
            placeholder="Select Status"
            disabled={!batchStage || isEditMode}
            required
          />
        </Grid>
        {isIndianResidency ? (
          <Grid item xs={12} md={6}>
            <ControlledAutocomplete
              label={uiText.batchManager.typologyLabel}
              options={typologyOptions}
              value={typology}
              onChange={(value) => setTypology(Array.isArray(value) ? value : [])}
              placeholder={uiText.batchManager.selectTypologyPlaceholder}
              multiple
              disabled={!batchStage || isEditMode}
              required
              error={typology.length === 0}
              helperText={typology.length === 0 ? uiText.batchManager.typologyHelper : ''}
            />
          </Grid>
        ) : null}
      </Grid>
    </Card>
  );
}

function mapBatchResponseToConfig(data: any): BatchManagerConfigurationFormValues {
  if (!data) {
    return {
      idTypes: [],
      batchName: '',
      startDate: '',
      endDate: '',
      sameTimeForAllDates: false,
      sharedStartTime: '09:00',
      sharedEndTime: '18:00',
      schedule: [],
      durationMinutes: '',
      recordsPerBatch: '',
      openBatchBefore: '',
    };
  }
  const schedule = (data.days || []).map((d: any) => ({
    date: d.date || '',
    startTime: d.startTime || '09:00',
    endTime: d.endTime || '18:00',
  }));

  const startDate = schedule.length > 0 ? schedule[0].date : '';
  const endDate = schedule.length > 0 ? schedule[schedule.length - 1].date : '';

  const sameTimeForAllDates = schedule.length > 0 && schedule.every(
    (s: any) => s.startTime === schedule[0]?.startTime && s.endTime === schedule[0]?.endTime
  );

  return {
    idTypes: data.preferenceIds || [],
    batchName: data.name || '',
    startDate,
    endDate,
    sameTimeForAllDates,
    sharedStartTime: sameTimeForAllDates ? schedule[0]?.startTime : '09:00',
    sharedEndTime: sameTimeForAllDates ? schedule[0]?.endTime : '18:00',
    schedule,
    durationMinutes: data.slotDuration ? String(data.slotDuration) : '',
    recordsPerBatch: data.capacityPerSlot ? String(data.capacityPerSlot) : '',
    openBatchBefore: data.openBatchBefore ? String(data.openBatchBefore) : '',
  };
}

export default function BatchManagerView() {
  const { id } = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { userRole } = useRoleBasedPermissions({ module: 'batchManager', });
  const { campaigns, loading: campaignsLoading } = useAppSelector((state) => state.eoiManager);
  const { batchStatsData, previewLoading, batchSlotsData, unmappedCount } = useAppSelector((state) => state.batchManager);
  const { inventoryTypes } = useAppSelector(
    (state) => state.eoiManager
  );
  const [campaignId, setCampaignId] = useState<string | number>('');
  const [residentStatus, setResidentStatus] = useState<string | number>('');
  /** Typology applies when residency is Indian (multi-select). */
  const [typology, setTypology] = useState<(string | number)[]>([]);
  /** ID types selected in the configuration form (lifted so we can dispatch unmapped-count). */
  const [configIdTypes, setConfigIdTypes] = useState<(string | number)[]>([]);
  /** Empty until the user picks a stage (required before residency and configuration). */
  const [batchStage, setBatchStage] = useState<BatchStage | ''>('');
  const [dialog, setDialog] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>('NOTIFY_CX');
  const [isNotifySubmitting, setIsNotifySubmitting] = useState(false);

  const isIndianResidency = residentStatus === RESIDENT_STATUS.Indian;
  const TYPOLOGY_OPTIONS = mapArrayToLabelValue(inventoryTypes, 'name', 'id')
  const isBaseConfigComplete = Boolean(campaignId && batchStage && residentStatus);
  const isTypologyValid = !isIndianResidency || typology.length > 0;
  const batchSetupComplete = isBaseConfigComplete && isTypologyValid;

  /** Populated from the preview API response (not built on the client). */
  const [previewRows, setPreviewRows] = useState<BatchPreviewRow[]>([]);
  const [previewBatchName, setPreviewBatchName] = useState('');
  const [initialConfig, setInitialConfig] = useState<BatchManagerConfigurationFormValues | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionBatchId, setSessionBatchId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isUserMapped, setIsUserMapped] = useState(false);

  const isEditMode = Boolean(id);

  const breakdownModel = useMemo(
    () => mapBatchStatsResponseToModel(batchStatsData),
    [batchStatsData]
  );
  const hasVoucherRecords = breakdownModel.allRecords.rowTotal > 0;
  const breakdownScopeRow = useMemo(
    () => selectBreakdownRowForResidency(breakdownModel, residentStatus),
    [breakdownModel, residentStatus]
  );


  const clearServerPreview = useCallback(() => {
    setPreviewRows([]);
    setPreviewBatchName('');
    setInitialConfig(null);
  }, []);

  const buildBatchPayload = useCallback(
    (_values: BatchManagerConfigurationFormValues) => ({
      campaignId: Number(campaignId),
      name: _values.batchName,
      stage: batchStage,
      residentialStatus: residentStatus?.toString() || '',
      slotDuration: Number(_values.durationMinutes),
      capacityPerSlot: Number(_values.recordsPerBatch),
      openBatchBefore: Number(_values.openBatchBefore),
      preferenceIds: _values.idTypes,
      days: _values.schedule.map((d) => ({
        date: d.date,
        startTime: d.startTime,
        endTime: d.endTime,
      })),
      ...(residentStatus === RESIDENT_STATUS.Indian ? { typology } : {}),
    }),
    [campaignId, batchStage, residentStatus, typology]
  );

  const handleNotifySubmit = useCallback(async (payload: NotifySubmitPayload) => {
    const batchId = id || sessionBatchId;
    if (!batchId) {
      toast.error('Batch ID is required');
      throw new Error('Batch ID is required');
    }

    setIsNotifySubmitting(true);
    try {
      const body = {
        notifyAt: payload.mode === 'now' ? undefined : dayjs(`${payload.date} ${payload.time}`).toISOString(),
      };
      await dispatch(mapBatchVouchersAction({ batchId: String(batchId), body })).unwrap();
      toast.success('Customers notified successfully');
      setIsUserMapped(true);
      setDialog(false);
      router.push(generateRoleBasedRoute(userRole, 'batch/listing'));
    } catch (error: any) {
      toast.error(error || 'Failed to notify customers');
    } finally {
      setIsNotifySubmitting(false);
    }
  }, [dispatch, id, sessionBatchId, router, userRole]);

  const handleNotifyCx = useCallback(() => {
    setDialogType('NOTIFY_CX');
    setDialog(true);
  }, []);

  const handlePreviewFromApi = useCallback(
    async (_values: BatchManagerConfigurationFormValues) => {
      if (!campaignId || !batchStage || !residentStatus) {
        toast.error('Missing configuration data');
        return;
      }

      const payload = buildBatchPayload(_values);
      const activeId = id || sessionBatchId;
      const isUpdating = Boolean(activeId);
      try {
        const action = isUpdating
          ? updateBatchManagerAction({ ...payload, id: activeId! })
          : createBatchManagerAction(payload);

        const resultAction = await dispatch(action);

        if (
          !createBatchManagerAction.fulfilled.match(resultAction) &&
          !updateBatchManagerAction.fulfilled.match(resultAction)
        ) {
          const errorMsg =
            typeof resultAction.payload === 'string'
              ? resultAction.payload
              : 'Failed to fetch preview';
          toast.error(errorMsg);
          return;
        }

        const newBatchId = resultAction.payload.data?.id || resultAction.payload.data?.batchId;
        if (!isUpdating && newBatchId) {
          setSessionBatchId(newBatchId);
        } else if (isUpdating) {
          setRefreshKey((prev) => prev + 1);
        }

        setPreviewBatchName(_values.batchName);

        const successMsg =
          resultAction.payload?.message ||
          (isUpdating ? 'Batch updated successfully' : 'Preview generated successfully');
        toast.success(successMsg);
      } catch (error) {
        console.error('Batch Manager: Preview generation failed', error);
        toast.error('An unexpected error occurred');
      }
    },
    [campaignId, batchStage, residentStatus, buildBatchPayload, dispatch, id, sessionBatchId]
  );

  const handleRowApply = useCallback((rowIndex: number, patch: BatchPreviewEditablePatch) => {
    setPreviewRows((prev) => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], ...patch };
      return next;
    });
  }, []);

  const handleGenerateBatches = useCallback(async () => {
    handleNotifyCx();
  }, [handleNotifyCx]);

  useEffect(() => {
    if (!batchSetupComplete && !isEditMode && !loading) {
      clearServerPreview();
    }
  }, [batchSetupComplete, clearServerPreview, isEditMode, loading]);

  useEffect(() => {
    if (!isIndianResidency) {
      setTypology([]);
    }
  }, [isIndianResidency]);

  const campaignOptions = useMemo(
    () =>
      (campaigns ?? []).map((c) => ({
        value: c.id,
        label: c.campaignName,
      })),
    [campaigns]
  );

  useEffect(() => {
    dispatch(setTitleAsync(uiText.batchManager.pageTitle));
  }, [dispatch]);

  useEffect(() => {
    if (batchStatsData && !hasVoucherRecords) {
      toast.error("No vouchers found for the selected campaign and batch stage.");
    }
  }, [batchStatsData, hasVoucherRecords]);

  useEffect(() => {
    dispatch(
      fetchEOICampaignList({
        page: 1,
        limit: 200,
      })
    ).catch((err: unknown) => {
      console.error('Batch manager: failed to load campaign list', err);
    });
  }, [dispatch]);

  useEffect(() => {
    if (campaignId && batchStage) {
      dispatch(fetchBatchStatsAction({ campaignId, stage: batchStage }))
    }
  }, [batchStage, campaignId, dispatch]);

  useEffect(() => {
    dispatch(fetchInventoryTypes());
  }, [dispatch]);

  // Dispatch unmapped-count whenever the three filter fields change (and base config is ready)
  useEffect(() => {
    if (!campaignId || !batchStage || !residentStatus || configIdTypes.length === 0) return;
    if (isIndianResidency && typology.length === 0) return;

    dispatch(
      fetchUnmappedCountAction({
        campaignId: Number(campaignId),
        stage: batchStage,
        residentialStatus: residentStatus.toString(),
        preferenceIds: configIdTypes.map(String),
        typology: isIndianResidency ? typology.map(String) : [],
      })
    );
  }, [campaignId, batchStage, residentStatus, typology, configIdTypes, isIndianResidency, dispatch]);

  useEffect(() => {
    const fetchBatchData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await getBatchManagerById({ id });
        if (data) {
          // Pre-fill top level states
          setCampaignId(data.campaignId || '');
          setBatchStage(data.stage);
          setResidentStatus(data.residentialStatus || '');

          // Typology (inventoryTypeIds) if Indian
          if (data.residentialStatus === RESIDENT_STATUS.Indian && data.typology) {
            setTypology(data.typology);
          }

          setIsUserMapped(Boolean(data.isUserMapped));

          // Pre-fill configuration form
          setInitialConfig(mapBatchResponseToConfig(data));
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to fetch batch details');
      } finally {
        setLoading(false);
      }
    };

    fetchBatchData();
  }, [id]);

  // Slots list is loaded by BatchPreviewTable when batchId becomes available (create flow).

  useEffect(() => {
    const activeId = id || sessionBatchId;
    if (activeId && batchSlotsData?.result) {
      setPreviewRows(mapApiResultToRows(batchSlotsData.result));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, sessionBatchId, batchSlotsData]);


  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <DashboardContent>
      <Box sx={stickyBreadcrumbsStyles}>
        <CustomBreadcrumbs
          heading={isEditMode ? uiText.batchManager.actions.editBatch : uiText.batchManager.breadcrumbsHeading}
          links={[
            {
              name: uiText.batchManager.batchListingHeading,
              href: generateRoleBasedRoute(userRole, 'batch/listing'),
            },
            {
              name: isEditMode ? 'Edit Batch' : 'Create Batch',
              href: '#',
            },
          ]}
        />
      </Box>

      <Stack spacing={3} mt={2}>
        <Card sx={BATCH_PANEL_CARD_SX}>
          <Grid container spacing={3} alignItems="flex-start">
            <Grid item xs={12} md={6}>
              <ControlledAutocomplete
                label={uiText.batchManager.campaignLabel}
                options={campaignOptions}
                value={campaignId}
                onChange={(value) => {
                  const next = toSingleAutocompleteValue(value);
                  setCampaignId(next);
                  if (!next) {
                    setBatchStage('');
                    setResidentStatus('');
                    setTypology([]);
                  }
                }}
                placeholder={uiText.batchManager.selectCampaignPlaceholder}
                disabled={campaignsLoading || isEditMode}
                required
              />
            </Grid>
            {campaignId && (
              <Grid item xs={12} md={6}>
                <FormControl component="fieldset" fullWidth disabled={isEditMode}>
                  <FormLabel id="batch-stage-label" component="legend" required sx={batchStageLabelSx}>
                    {uiText.batchManager.batchStageLabel}
                  </FormLabel>
                  <RadioGroup
                    row
                    aria-labelledby="batch-stage-label"
                    name="batch-stage"
                    value={batchStage}
                    onChange={(e) => {
                      setBatchStage(e.target.value as BatchStage);
                    }}
                    sx={{ ml: 1, mt: 1 }}
                  >
                    <FormControlLabel
                      value={BatchStage.UNIT_ALLOTMENT}
                      control={<Radio sx={batchStageRadioSx} />}
                      label={uiText.batchManager.unitAllotment}
                      sx={batchStageOptionLabelSx}
                    />
                    <FormControlLabel
                      value={BatchStage.LAUNCH}
                      control={<Radio sx={batchStageRadioSx} />}
                      label={uiText.batchManager.launch}
                      sx={batchStageOptionLabelSx}
                    />
                  </RadioGroup>
                  {batchStage ? null : (
                    <Typography
                      variant="caption"
                      sx={{ display: 'block', mt: 0.5, ml: 1, color: 'red', fontFamily: 'Poppins' }}
                    >
                      {uiText.batchManager.selectBatchStageHint}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
            )}
          </Grid>
        </Card>

        {campaignId && batchStage ? <BatchManagerIdBreakdown model={breakdownModel}/> : null}

        {campaignId && batchStage && hasVoucherRecords ? (
          <BatchStageConfigurationCard
            batchStage={batchStage}
            setBatchStage={setBatchStage}
            residentStatus={residentStatus}
            setResidentStatus={setResidentStatus}
            typology={typology}
            setTypology={setTypology}
            isIndianResidency={isIndianResidency}
            typologyOptions={TYPOLOGY_OPTIONS}
            setSessionBatchId={setSessionBatchId}
            isEditMode={isEditMode}
          />
        ) : null}


        {campaignId && isBaseConfigComplete && hasVoucherRecords ? (
          <>
            <BatchManagerConfigurationForm
              initialData={initialConfig}
              breakdownScopeRow={breakdownScopeRow}
              onPreview={handlePreviewFromApi}
              onConfigurationChange={isEditMode ? undefined : clearServerPreview}
              onIdTypesChange={setConfigIdTypes}
              loading={previewLoading}
              canPreview={isTypologyValid}
              unmappedCount={unmappedCount}
            />
            {(id || sessionBatchId) && (
              <BatchPreviewTable
                rows={previewRows}
                batchName={previewBatchName}
                userRole={userRole}
                onRowApply={handleRowApply}
                onGenerateBatches={handleGenerateBatches}
                editingEnabled
                isEditMode={isEditMode}
                generateBatchesDisabled={(previewRows.length === 0 && !id && !sessionBatchId) || isUserMapped}
                generateBatchesDisabledReason={isUserMapped ? 'EOIs are already mapped for this batch' : uiText.batchManager.previewGenerateDisabledReason}
                batchId={id || sessionBatchId || undefined}
                refreshKey={refreshKey}
              />
            )}
          </>
        ) : null}
        <BatchListingDialogBox
          dialog={dialog}
          setDialog={setDialog}
          type={dialogType}
          onNotifySubmit={handleNotifySubmit}
          isNotifySubmitting={isNotifySubmitting}
        />
      </Stack>
    </DashboardContent>
  );
}
