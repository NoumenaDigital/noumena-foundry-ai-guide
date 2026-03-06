import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DiamondIcon from '@mui/icons-material/Diamond';
import { Link as RouterLink } from 'react-router-dom';
import { useServices } from '../../ServiceProvider';
import { useAuth } from '../../AuthProvider';

type GoldBarState = 'registered' | 'certified' | 'decommissioned';

interface GoldBarItem {
  '@id': string;
  '@state': GoldBarState;
  serialNumber?: string;
  weightGrams?: number;
  purityFineness?: number;
  originCountry?: string;
  refinery?: string;
  storageLocation?: string;
  esgRating?: string;
  certificationBody?: string;
}

function stateChip(state: GoldBarState) {
  const map: Record<GoldBarState, { label: string; color: string; bg: string }> = {
    registered: { label: 'Registered', color: '#fa8b45', bg: 'rgba(250,139,69,0.1)' },
    certified:  { label: 'Certified',  color: '#22c55e', bg: 'rgba(34,197,94,0.1)'  },
    decommissioned: { label: 'Decommissioned', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  };
  const s = map[state] ?? map.registered;
  return (
    <Chip
      label={s.label}
      size="small"
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: '0.75rem' }}
    />
  );
}

function esgChip(rating: string | undefined) {
  if (!rating) return <Typography variant="body2" color="text.secondary">—</Typography>;
  const map: Record<string, { color: string; bg: string }> = {
    A: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    B: { color: '#fa8b45', bg: 'rgba(250,139,69,0.1)' },
    C: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  };
  const s = map[rating] ?? { color: '#6b7280', bg: 'rgba(107,114,128,0.1)' };
  return (
    <Chip label={rating} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, minWidth: 32 }} />
  );
}

export function GoldBarOverview() {
  const { api } = useServices();
  const { authenticated, hasRole } = useAuth();
  const [bars, setBars] = useState<GoldBarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!authenticated) return;
    api
      .getGoldBarList({ pageSize: 100, includeCount: true })
      .then((res) => {
        setBars((res as { items?: GoldBarItem[] }).items ?? []);
      })
      .catch(() => setError('Failed to load gold bars. Please try again.'))
      .finally(() => setLoading(false));
  }, [api, authenticated]);

  const filtered = bars.filter((bar) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      bar.serialNumber?.toLowerCase().includes(q) ||
      bar.originCountry?.toLowerCase().includes(q) ||
      bar.refinery?.toLowerCase().includes(q) ||
      bar.storageLocation?.toLowerCase().includes(q) ||
      bar['@state']?.includes(q)
    );
  });

  // Stats
  const total = bars.length;
  const certified = bars.filter((b) => b['@state'] === 'certified').length;
  const registered = bars.filter((b) => b['@state'] === 'registered').length;
  const totalWeightKg = bars.reduce((sum, b) => sum + (b.weightGrams ?? 0), 0) / 1000;

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DiamondIcon sx={{ color: '#0bd2a2', fontSize: 28 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
              Gold Bars
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ESG Gold Fund — Provenance Registry
            </Typography>
          </Box>
        </Box>
        {hasRole('ops') && (
          <Button
            component={RouterLink}
            to="/gold-bars/register"
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
          >
            Register Bar
          </Button>
        )}
      </Box>

      {/* KPI Stats Row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        {[
          { label: 'Total Bars', value: total, color: 'primary.main' },
          { label: 'Certified', value: certified, color: '#22c55e' },
          { label: 'Awaiting Cert.', value: registered, color: '#fa8b45' },
          { label: 'Total Weight', value: `${totalWeightKg.toFixed(2)} kg`, color: '#0bd2a2' },
        ].map(({ label, value, color }) => (
          <Card key={label} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography
                sx={{
                  fontSize: '1.875rem',
                  fontWeight: 800,
                  color,
                  lineHeight: 1.1,
                  mb: 0.5,
                }}
              >
                {loading ? '—' : value}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'text.secondary',
                }}
              >
                {label}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Table Card */}
      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 0 }}>
          {/* Search Bar */}
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <TextField
              placeholder="Search by serial number, origin, refinery or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#6b7280', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{ maxWidth: 480 }}
            />
          </Box>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={28} />
            </Box>
          )}

          {error && (
            <Box sx={{ p: 2 }}>
              <Alert severity="error">{error}</Alert>
            </Box>
          )}

          {!loading && !error && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Serial Number</TableCell>
                    <TableCell align="right">Weight (g)</TableCell>
                    <TableCell align="right">Purity (‰)</TableCell>
                    <TableCell>Origin</TableCell>
                    <TableCell>Refinery</TableCell>
                    <TableCell>Storage</TableCell>
                    <TableCell>ESG</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 6, color: '#6b7280' }}>
                        {search ? 'No results match your search.' : 'No gold bars registered yet.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((bar) => (
                      <TableRow
                        key={bar['@id']}
                        hover
                        sx={{ '&:hover': { bgcolor: 'rgba(11,210,162,0.04)' } }}
                      >
                        <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.875rem' }}>
                          {bar.serialNumber ?? '—'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                          {bar.weightGrams?.toLocaleString() ?? '—'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontFamily: 'monospace', color: bar.purityFineness && bar.purityFineness >= 999 ? '#0bd2a2' : undefined }}>
                          {bar.purityFineness ?? '—'}
                        </TableCell>
                        <TableCell>{bar.originCountry ?? '—'}</TableCell>
                        <TableCell>{bar.refinery ?? '—'}</TableCell>
                        <TableCell sx={{ color: '#6b7280', fontSize: '0.8125rem' }}>
                          {bar.storageLocation ?? '—'}
                        </TableCell>
                        <TableCell>{esgChip(bar.esgRating)}</TableCell>
                        <TableCell>{stateChip(bar['@state'])}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="View details">
                            <IconButton
                              component={RouterLink}
                              to={`/gold-bars/${bar['@id']}`}
                              size="small"
                              sx={{ color: 'primary.main' }}
                            >
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
