import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DiamondIcon from '@mui/icons-material/Diamond';
import { useServices } from '../../ServiceProvider';

interface RegisterFormValues {
  serialNumber: string;
  weightGrams: string;
  purityFineness: string;
  originCountry: string;
  refinery: string;
  assayDate: string;
  storageLocation: string;
}

export function RegisterGoldBar() {
  const navigate = useNavigate();
  const { api } = useServices();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    defaultValues: {
      serialNumber: '',
      weightGrams: '',
      purityFineness: '',
      originCountry: '',
      refinery: '',
      assayDate: '',
      storageLocation: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await api.createGoldBar({
        requestBody: {
          // CRITICAL: @parties must be included — party automation fills from JWT
          '@parties': {},
          serialNumber: values.serialNumber.trim(),
          weightGrams: parseFloat(values.weightGrams),
          purityFineness: parseFloat(values.purityFineness),
          originCountry: values.originCountry.trim(),
          refinery: values.refinery.trim(),
          assayDate: values.assayDate.trim(),
          storageLocation: values.storageLocation.trim(),
        } as Record<string, unknown>,
      });
      const created = result as { '@id'?: string };
      navigate(created['@id'] ? `/gold-bars/${created['@id']}` : '/gold-bars');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to register gold bar. Please try again.';
      setSubmitError(msg);
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/gold-bars')}
        sx={{ mb: 2, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
      >
        Back to Gold Bars
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <DiamondIcon sx={{ color: '#0bd2a2', fontSize: 28 }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
            Register Gold Bar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add a new gold bar to the ESG Gold Fund registry
          </Typography>
        </Box>
      </Box>

      {submitError && (
        <Alert severity="error" onClose={() => setSubmitError(null)} sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      <Card sx={{ border: '1px solid', borderColor: 'divider', maxWidth: 760 }}>
        <CardContent sx={{ p: 3 }}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>

            {/* Physical Details Section */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0bd2a2', mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
              Physical Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="serialNumber"
                  control={control}
                  rules={{ required: 'Serial number is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Serial Number *"
                      fullWidth
                      size="small"
                      placeholder="e.g. GB-001-2024"
                      error={!!errors.serialNumber}
                      helperText={errors.serialNumber?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Controller
                  name="weightGrams"
                  control={control}
                  rules={{
                    required: 'Weight is required',
                    pattern: { value: /^\d+(\.\d+)?$/, message: 'Must be a positive number' },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Weight (g) *"
                      fullWidth
                      size="small"
                      placeholder="e.g. 1000"
                      type="number"
                      inputProps={{ min: 0, step: '0.001' }}
                      error={!!errors.weightGrams}
                      helperText={errors.weightGrams?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Controller
                  name="purityFineness"
                  control={control}
                  rules={{
                    required: 'Purity is required',
                    pattern: { value: /^\d+(\.\d+)?$/, message: 'Must be a number (e.g. 999.9)' },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Purity (‰) *"
                      fullWidth
                      size="small"
                      placeholder="e.g. 999.9"
                      type="number"
                      inputProps={{ min: 0, max: 1000, step: '0.1' }}
                      error={!!errors.purityFineness}
                      helperText={errors.purityFineness?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="assayDate"
                  control={control}
                  rules={{ required: 'Assay date is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Assay Date *"
                      fullWidth
                      size="small"
                      placeholder="e.g. 2024-01-15"
                      error={!!errors.assayDate}
                      helperText={errors.assayDate?.message ?? 'ISO-8601 format: YYYY-MM-DD'}
                    />
                  )}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Provenance Section */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0bd2a2', mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
              Provenance
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="originCountry"
                  control={control}
                  rules={{ required: 'Origin country is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Origin Country *"
                      fullWidth
                      size="small"
                      placeholder="e.g. South Africa"
                      error={!!errors.originCountry}
                      helperText={errors.originCountry?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="refinery"
                  control={control}
                  rules={{ required: 'Refinery is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Refinery *"
                      fullWidth
                      size="small"
                      placeholder="e.g. Rand Refinery"
                      error={!!errors.refinery}
                      helperText={errors.refinery?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="storageLocation"
                  control={control}
                  rules={{ required: 'Storage location is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Storage Location *"
                      fullWidth
                      size="small"
                      placeholder="e.g. Zurich Vault A"
                      error={!!errors.storageLocation}
                      helperText={errors.storageLocation?.message}
                    />
                  )}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/gold-bars')}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <DiamondIcon />}
              >
                {submitting ? 'Registering...' : 'Register Gold Bar'}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
