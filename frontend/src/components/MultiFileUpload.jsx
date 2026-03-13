import { useRef, useState } from 'react';
import { parseProjectZip } from '../api/index.js';
import {
  createProjectFile,
  createStarterProject,
  inferFileType,
  mergeProjectFiles
} from '../utils/projectFiles.js';

async function readTextFiles(fileList) {
  const files = [];
  const warnings = [];

  for (const file of Array.from(fileList)) {
    const type = inferFileType(file.name);
    if (!type) {
      warnings.push(`Skipped unsupported file "${file.name}"`);
      continue;
    }

    files.push({
      name: file.name,
      type,
      content: await file.text()
    });
  }

  return { files, warnings };
}

export function MultiFileUpload({
  files,
  onChange,
  onMessage,
  disabled = false
}) {
  const [loadingZip, setLoadingZip] = useState(false);
  const fileInputRef = useRef(null);
  const zipInputRef = useRef(null);

  const report = (message, tone = 'info') => {
    onMessage?.({ message, tone });
  };

  const applyIncomingFiles = (incomingFiles, warnings = []) => {
    if (incomingFiles.length > 0) {
      onChange?.(mergeProjectFiles(files, incomingFiles));
      report(`Loaded ${incomingFiles.length} file${incomingFiles.length !== 1 ? 's' : ''}.`, 'success');
    }

    if (warnings.length > 0) {
      report(warnings.join(' '), incomingFiles.length > 0 ? 'info' : 'error');
    }
  };

  const handlePlainFiles = async (selectedFiles) => {
    const { files: parsedFiles, warnings } = await readTextFiles(selectedFiles);
    applyIncomingFiles(parsedFiles, warnings);
  };

  const handleZipFile = async (zipFile) => {
    setLoadingZip(true);
    try {
      const result = await parseProjectZip(zipFile);
      applyIncomingFiles(result.files || [], result.warnings || []);
    } catch (error) {
      report(error.message, 'error');
    } finally {
      setLoadingZip(false);
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    if (disabled || loadingZip) return;

    const droppedFiles = Array.from(event.dataTransfer.files || []);
    if (droppedFiles.length === 1 && droppedFiles[0].name.toLowerCase().endsWith('.zip')) {
      await handleZipFile(droppedFiles[0]);
      return;
    }

    await handlePlainFiles(droppedFiles);
  };

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !disabled && !loadingZip && fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && !disabled && !loadingZip) {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`rounded-2xl border-2 border-dashed px-5 py-7 sm:px-6 sm:py-8 text-center transition-colors ${disabled || loadingZip
          ? 'border-[var(--border-color)] opacity-60 cursor-not-allowed'
          : 'border-[#4e9af1]/35 hover:border-[#4e9af1] cursor-pointer'
          }`}
      >
        <p className="text-sm sm:text-base font-semibold text-[var(--text-strong)] mb-1">
          Drag and drop `.html`, `.css`, and `.js` files here
        </p>
        <p className="text-xs sm:text-sm text-[var(--text-faint)]">
          Click to pick multiple files at once. Unsupported files are skipped.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 2xl:grid-cols-6">
        <button
          type="button"
          disabled={disabled || loadingZip}
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#2f80ed] text-[var(--text-strong)] hover:bg-[#1a6cda] disabled:opacity-50"
        >
          Select Files
        </button>
        <button
          type="button"
          disabled={disabled || loadingZip}
          onClick={() => zipInputRef.current?.click()}
          className="px-3 py-2.5 rounded-xl text-xs font-semibold border border-[var(--border-color)] text-[var(--text-muted)] hover:border-[#4e9af1]/45 hover:text-[#4e9af1] disabled:opacity-50"
        >
          {loadingZip ? 'Extracting ZIP…' : 'Upload ZIP'}
        </button>
        <button
          type="button"
          disabled={disabled || loadingZip}
          onClick={() => {
            const nextFiles = createStarterProject(files);
            onChange?.(nextFiles);
            report('Created starter HTML, CSS, and JS files.', 'success');
          }}
          className="px-3 py-2.5 rounded-xl text-xs font-semibold border border-[var(--border-color)] text-[var(--text-muted)] hover:border-[#3fb950]/45 hover:text-[#3fb950] disabled:opacity-50 col-span-2 lg:col-span-1"
        >
          Start In Editor
        </button>
        {['html', 'css', 'js'].map((type) => (
          <button
            key={type}
            type="button"
            disabled={disabled || loadingZip}
            onClick={() => {
              const nextFiles = createProjectFile(files, type);
              onChange?.(nextFiles);
              report(`Added ${type.toUpperCase()} file for editing.`, 'success');
            }}
            className="px-3 py-2.5 rounded-xl text-xs font-semibold border border-[var(--border-color)] text-[var(--text-muted)] hover:border-[#4e9af1]/45 hover:text-[#4e9af1] disabled:opacity-50"
          >
            Add {type.toUpperCase()}
          </button>
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.css,.js,text/html,text/css,application/javascript,text/javascript"
        multiple
        className="hidden"
        onChange={async (event) => {
          await handlePlainFiles(event.target.files || []);
          event.target.value = '';
        }}
      />
      <input
        ref={zipInputRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={async (event) => {
          const [zipFile] = Array.from(event.target.files || []);
          if (zipFile) await handleZipFile(zipFile);
          event.target.value = '';
        }}
      />
    </div>
  );
}
