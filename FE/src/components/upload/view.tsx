import { useState, useCallback } from 'react';

import { Upload } from './upload';

// ----------------------------------------------------------------------

export function UploadView() {

  const [file, setFile] = useState<File | string | null>(null);
  
  const handleDropSingleFile = useCallback((acceptedFiles: File[]) => {
    const newFile = acceptedFiles[0];
    setFile(newFile);
  }, []);

  return <Upload value={file} onDrop={handleDropSingleFile} onDelete={() => setFile(null)} />;
}
