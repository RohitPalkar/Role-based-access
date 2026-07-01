import React, { useState } from 'react';

import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  Box,
  Card,
  Stack,
  Alert,
  Button,
  Divider,
  Tooltip,
  TextField,
  CardHeader,
  Typography,
  IconButton,
  CardContent,
} from '@mui/material';

import { decryptText, encryptText } from 'src/utils/encryption';

import { DashboardContent } from 'src/layouts/dashboard';

const EncryptionDebugger = () => {
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleEncrypt = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const result: string = await encryptText(input);
      setOutput(result);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Encryption failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecrypt = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const result: string = await decryptText(input);
      setOutput(result);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Decryption failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (): Promise<void> => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
  };

  return (
    <DashboardContent>
      <Box >
        <Card sx={{ borderRadius: 3, boxShadow: 4 }}>
          <CardHeader
            title="Encryption / Decryption Debugger"
            subheader="Use this tool to debug encrypted payloads in production"
          />
          <CardContent>
            <Stack spacing={2}>
              <TextField
                label="Input (Plain text or Encrypted text)"
                multiline
                minRows={5}
                fullWidth
                value={input}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                placeholder="Paste encrypted string (iv:data) or plain text"
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="contained"
                  startIcon={<LockIcon />}
                  onClick={handleEncrypt}
                  disabled={!input || loading}
                  color="primary"
                >
                  Encrypt
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<LockOpenIcon />}
                  onClick={handleDecrypt}
                  disabled={!input || loading}
                >
                  Decrypt
                </Button>
              </Stack>

              <Divider />

              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle1">Output</Typography>
                  <Tooltip title="Copy to clipboard">
                    <IconButton onClick={copyToClipboard} size="small">
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>

                <TextField
                  multiline
                  minRows={5}
                  fullWidth
                  value={output}
                  placeholder="Result will appear here"
                  InputProps={{ readOnly: true }}
                  sx={{ mt: 1 }}
                />
              </Box>

              {error && <Alert severity="error">{error}</Alert>}
            </Stack>
          </CardContent>
        </Card>
      </Box></DashboardContent>
  );
};

export default EncryptionDebugger;
