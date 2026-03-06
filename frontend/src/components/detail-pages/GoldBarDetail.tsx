import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VerifiedIcon from '@mui/icons-material/Verified';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EnergySavingsLeafIcon from '@mui/icons-material/EnergySavingsLeaf';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DiamondIcon from '@mui/icons-material/Diamond';
import { useServices } from '../../ServiceProvider';
import { useAuth } from '../../AuthProvider';

type GoldBarState = 'registered' | 'certified' | 'decommissioned';

interface GoldBarProtocol {
  '@id': string;
  '@state': GoldBarState;
  '@actions'?: Record<string, unknown>;
  serialNumber?: string;
  weightGrams?: number;
  purityFineness?: number;
  originCountry?: string;
  refinery?: string;
  assayDate?: string;
  storageLocation?: string;
  certificationBody?: string;
  certificationNumber?: string;
  esgRating?: string;
  esgNotes?: string;
}

function stateChip(state: GoldBarState) {
  const map: Record<GoldBarState, { label: string; color: string; bg: string }> = {
    registered: { label: 'Registered', color: '#fa8b45', bg: 'rgba(250,139,69,0.1)' },
    certified:  { label: 'Certified',  color: '#22c55e', bg: 'rgba(34,197,94,0.1)'  },
    decommissioned: { label: 'Decommissioned', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  };
  const s = map[state] ?? map.registered;
  return <Chip label={s.label} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600 }} />;
}

function InfoRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, minWidth: 160 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, color: 'text.primary', textAlign: 'right', fontFamily: typeof value === 'number' ? 'monospace' : undefined }}
      >
        {value ?? '—'}
      </Typography>
    </Box>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card sx={{ border: '1px solid', borderColor: 'divider', mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          {icon}
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {title}
          </Typography>
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}

export function GoldBarDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { api } = useServices();
  const { authenticated, hasRole } = useAuth();

  const [bar, setBar] = useState<GoldBarProtocol | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Dialog state
  const [certifyOpen, setCertifyOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [esgOpen, setEsgOpen] = useState(false);
  const [decommissionOpen, setDecommissionOpen] = useState(false);

  // Form values
  const [certifyForm, setCertifyForm] = useState({ body: '', number: '', rating: 'A', notes: '' });
  const [locationForm, setLocationForm] = useState({ location: '' });
  const [esgForm, setEsgForm] = useState({ rating: 'A', notes: '' });

  const load = () => {
    if (!authenticated || !id) return;
    api
      .getGoldBarById({ id })
      .then((res) => setBar(res as GoldBarProtocol))
      .catch(() => setError('Failed to load gold bar details.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [api, authenticated, id]); // eslint-disable-line

  const hasAction = (action: string) =>
    bar?.['@actions'] != null && action in (bar['@actions'] as Record<string, unknown>);

  const withAction = async (fn: () => Promise<unknown>) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await fn();
      setLoading(true);
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Action failed. Please try again.';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCertify = () =>
    withAction(() =>
      api.certifyGoldBar({
        id: id!,
        requestBody: {
          body: certifyForm.body,
          number: certifyForm.number,
          rating: certifyForm.rating,
          notes: certifyForm.notes,
        } as Record<string, unknown>,
      })
    ).then(() => setCertifyOpen(false));

  const handleUpdateLocation = () =>
    withAction(() =>
      api.updateLocationGoldBar({
        id: id!,
        requestBody: { location: locationForm.location } as Record<string, unknown>,
      })
    ).then(() => setLocationOpen(false));

  const handleUpdateEsg = () =>
    withAction(() =>
      api.updateEsgDetailsGoldBar({
        id: id!,
        requestBody: { rating: esgForm.rating, notes: esgForm.notes } as Record<string, unknown>,
      })
    ).then(() => setEsgOpen(false));

  const handleDecommission = () =>
    withAction(() =>
      api.decommissionGoldBar({ id: id!, requestBody: {} as Record<string, unknown> })
    ).then(() => setDecommissionOpen(false));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !bar) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="error">{error ?? 'Gold bar not found.'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/gold-bars')} sx={{ mt: 2 }}>
          Back to Gold Bars
        </Button>
      </Box>
    );
  }

  const isOps = hasRole('ops');
  const esgRatingColor = bar.esgRating === 'A' ? '#22c55e' : bar.esgRating === 'B' ? '#fa8b45' : bar.esgRating === 'C' ? '#ef4444' : '#6b7280';

  return (
    <Box>
      {/* Back + Header */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/gold-bars')}
        sx={{ mb: 2, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
      >
        Back to Gold Bars
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 3,
              backgroundColor: 'rgba(18,10,77,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DiamondIcon sx={{ color: 'primary.main', fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.25 }}>
              {bar.serialNumber ?? 'Gold Bar'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {stateChip(bar['@state'])}
              {bar.esgRating && (
                <Chip
                  label={`ESG ${bar.esgRating}`}
                  size="small"
                  sx={{ bgcolor: `${esgRatingColor}18`, color: esgRatingColor, fontWeight: 700 }}
                />
              )}
            </Box>
          </Box>
        </Box>

        {/* Action Buttons — ops only, visibility driven by @actions from backend */}
        {isOps && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {hasAction('certify') && (
              <Button
                variant="contained"
                color="secondary"
                startIcon={<VerifiedIcon />}
                onClick={() => setCertifyOpen(true)}
                disabled={actionLoading}
              >
                Certify
              </Button>
            )}
            {hasAction('updateLocation') && (
              <Button
                variant="outlined"
                startIcon={<LocationOnIcon />}
                onClick={() => setLocationOpen(true)}
                disabled={actionLoading}
              >
                Update Location
              </Button>
            )}
            {hasAction('updateEsgDetails') && (
              <Button
                variant="outlined"
                startIcon={<EnergySavingsLeafIcon />}
                onClick={() => setEsgOpen(true)}
                disabled={actionLoading}
              >
                Update ESG
              </Button>
            )}
            {hasAction('decommission') && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteOutlineIcon />}
                onClick={() => setDecommissionOpen(true)}
                disabled={actionLoading}
              >
                Decommission
              </Button>
            )}
          </Box>
        )}
      </Box>

      {actionError && (
        <Alert severity="error" onClose={() => setActionError(null)} sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Physical Details */}
        <Grid item xs={12} md={6}>
          <SectionCard title="Physical Details" icon={<DiamondIcon sx={{ color: 'primary.main', fontSize: 20 }} />}>
            <InfoRow label="Serial Number" value={bar.serialNumber} />
            <InfoRow label="Weight" value={bar.weightGrams ? `${bar.weightGrams.toLocaleString()} g` : undefined} />
            <InfoRow label="Purity" value={bar.purityFineness ? `${bar.purityFineness}‰` : undefined} />
            <InfoRow label="Assay Date" value={bar.assayDate} />
          </SectionCard>
        </Grid>

        {/* Provenance */}
        <Grid item xs={12} md={6}>
          <SectionCard title="Provenance" icon={<LocationOnIcon sx={{ color: '#0bd2a2', fontSize: 20 }} />}>
            <InfoRow label="Origin Country" value={bar.originCountry} />
            <InfoRow label="Refinery" value={bar.refinery} />
            <InfoRow label="Storage Location" value={bar.storageLocation} />
          </SectionCard>
        </Grid>

        {/* Certification */}
        <Grid item xs={12} md={6}>
          <SectionCard title="Certification" icon={<VerifiedIcon sx={{ color: '#22c55e', fontSize: 20 }} />}>
            {bar.certificationBody ? (
              <>
                <InfoRow label="Certification Body" value={bar.certificationBody} />
                <InfoRow label="Certificate Number" value={bar.certificationNumber} />
              </>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                Not yet certified.
              </Typography>
            )}
          </SectionCard>
        </Grid>

        {/* ESG Assessment */}
        <Grid item xs={12} md={6}>
          <SectionCard title="ESG Assessment" icon={<EnergySavingsLeafIcon sx={{ color: '#22c55e', fontSize: 20 }} />}>
            {bar.esgRating ? (
              <>
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500, mb: 0.5 }}>
                    ESG Rating
                  </Typography>
                  <Typography sx={{ fontSize: '2.25rem', fontWeight: 800, color: esgRatingColor, lineHeight: 1 }}>
                    {bar.esgRating}
                  </Typography>
                </Box>
                {bar.esgNotes && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500, mb: 0.5 }}>
                      Assessment Notes
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.6 }}>
                      {bar.esgNotes}
                    </Typography>
                  </>
                )}
              </>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                No ESG assessment recorded.
              </Typography>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* Certify Dialog */}
      <Dialog open={certifyOpen} onClose={() => setCertifyOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Certify Gold Bar</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            label="Certification Body"
            fullWidth
            margin="dense"
            value={certifyForm.body}
            onChange={(e) => setCertifyForm((f) => ({ ...f, body: e.target.value }))}
            placeholder="e.g. LBMA"
          />
          <TextField
            label="Certificate Number"
            fullWidth
            margin="dense"
            value={certifyForm.number}
            onChange={(e) => setCertifyForm((f) => ({ ...f, number: e.target.value }))}
            placeholder="e.g. LBMA-2024-001234"
          />
          <TextField
            select
            label="ESG Rating"
            fullWidth
            margin="dense"
            value={certifyForm.rating}
            onChange={(e) => setCertifyForm((f) => ({ ...f, rating: e.target.value }))}
          >
            <MenuItem value="A">A — Excellent</MenuItem>
            <MenuItem value="B">B — Good</MenuItem>
            <MenuItem value="C">C — Satisfactory</MenuItem>
          </TextField>
          <TextField
            label="ESG Notes"
            fullWidth
            margin="dense"
            multiline
            rows={3}
            value={certifyForm.notes}
            onChange={(e) => setCertifyForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Describe ESG criteria and findings..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCertifyOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleCertify}
            disabled={actionLoading || !certifyForm.body || !certifyForm.number}
          >
            Certify Bar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Location Dialog */}
      <Dialog open={locationOpen} onClose={() => setLocationOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Update Storage Location</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            label="New Storage Location"
            fullWidth
            margin="dense"
            value={locationForm.location}
            onChange={(e) => setLocationForm({ location: e.target.value })}
            placeholder="e.g. Zurich Vault B"
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLocationOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpdateLocation}
            disabled={actionLoading || !locationForm.location}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update ESG Dialog */}
      <Dialog open={esgOpen} onClose={() => setEsgOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Update ESG Assessment</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            select
            label="ESG Rating"
            fullWidth
            margin="dense"
            value={esgForm.rating}
            onChange={(e) => setEsgForm((f) => ({ ...f, rating: e.target.value }))}
          >
            <MenuItem value="A">A — Excellent</MenuItem>
            <MenuItem value="B">B — Good</MenuItem>
            <MenuItem value="C">C — Satisfactory</MenuItem>
          </TextField>
          <TextField
            label="ESG Notes"
            fullWidth
            margin="dense"
            multiline
            rows={3}
            value={esgForm.notes}
            onChange={(e) => setEsgForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Describe ESG criteria and findings..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEsgOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleUpdateEsg}
            disabled={actionLoading}
          >
            Save ESG Details
          </Button>
        </DialogActions>
      </Dialog>

      {/* Decommission Confirmation Dialog */}
      <Dialog open={decommissionOpen} onClose={() => setDecommissionOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#ef4444' }}>Decommission Gold Bar</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to decommission bar <strong>{bar.serialNumber}</strong>? This action is
            irreversible — the bar will be permanently removed from the active fund registry.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDecommissionOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDecommission}
            disabled={actionLoading}
          >
            Decommission
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
