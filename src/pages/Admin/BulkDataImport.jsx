import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  History,
  KeyRound,
  Check,
  RotateCcw,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import ConfirmDialog from '../../components/ConfirmDialog';
import { usePortalData } from '../../context/PortalDataContext';
import { bulkImportApi } from '../../utils/apiClient';

const STUDENT_COLUMNS = [
  'Register Number',
  'Student Name',
  'Email',
  'Department',
  'Academic Year',
  'Section',
  'Semester',
];

const FACULTY_COLUMNS = [
  'Faculty ID',
  'Faculty Name',
  'Email',
  'Department',
  'Designation',
  'Specialization',
];

const PAGE_SIZE = 50;

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 KB';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getRowStatusBadge(status) {
  if (status === 'VALID') {
    return { text: 'Valid', variant: 'success' };
  }
  if (status === 'DUPLICATE') {
    return { text: 'Duplicate', variant: 'warning' };
  }
  return { text: 'Invalid', variant: 'danger' };
}

function StepTracker({ currentStep }) {
  const steps = [
    { num: 1, label: 'Select File' },
    { num: 2, label: 'Validate Data' },
    { num: 3, label: 'Preview Records' },
    { num: 4, label: 'Confirm Import' },
  ];

  return (
    <div className="step-bar" aria-label="Bulk import workflow steps">
      {steps.map((step) => {
        const isDone = currentStep > step.num;
        const isActive = currentStep === step.num;
        return (
          <div
            key={step.num}
            className={`step-pill ${isActive ? 'is-active' : ''} ${isDone ? 'is-done' : ''}`}
          >
            <span className="step-pill-num">
              {isDone ? <Check size={12} /> : step.num}
            </span>
            <span>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function BulkImportSection({
  sectionLabel,
  title,
  description,
  importType,
  columns,
  monoColumn,
  isAdminSignedIn,
  backendConnected,
  departments,
  maxTeamsPerGuide,
  onDownloadTemplate,
  onPreview,
  onConfirm,
  onImportSuccess,
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [step, setStep] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  const [errorBanner, setErrorBanner] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [confirmResult, setConfirmResult] = useState(null);
  const [strategy, setStrategy] = useState('IMPORT_VALID_ONLY');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const inputId = `bulk-file-input-${importType.toLowerCase()}`;

  const resetWorkflow = () => {
    setSelectedFile(null);
    setStep(1);
    setErrorBanner(null);
    setPreviewData(null);
    setConfirmResult(null);
    setStatusFilter('ALL');
    setSearchQuery('');
    setCurrentPage(1);
    setIsConfirmDialogOpen(false);
  };

  const handleFileChosen = (file) => {
    if (!file) {
      return;
    }
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.csv')) {
      setErrorBanner({
        title: 'Unsupported File Format',
        message: 'Only Excel (.xlsx) and CSV (.csv) files are supported.',
      });
      return;
    }
    setSelectedFile(file);
    setPreviewData(null);
    setConfirmResult(null);
    setErrorBanner(null);
    setStep(1);
  };

  const handleDownloadTemplateClick = async () => {
    setErrorBanner(null);
    setIsDownloadingTemplate(true);
    try {
      await onDownloadTemplate();
    } catch (err) {
      setErrorBanner({
        title: 'Template Download Failed',
        message:
          err.status === 401 || err.status === 403
            ? 'Admin authentication is required to download templates. Please sign in on the Admin Login page.'
            : err.message || 'Unable to download Excel template.',
      });
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleValidateFile = async () => {
    if (!selectedFile) {
      setErrorBanner({
        title: 'No File Selected',
        message: 'Please choose an Excel (.xlsx) or CSV (.csv) file first.',
      });
      return;
    }
    setErrorBanner(null);
    setConfirmResult(null);
    setStep(2);
    setIsValidating(true);

    try {
      const response = await onPreview(selectedFile);
      setPreviewData(response);
      setStatusFilter('ALL');
      setSearchQuery('');
      setCurrentPage(1);
      setStep(3);
    } catch (err) {
      setStep(1);
      setErrorBanner({
        title: 'Validation Failed',
        message:
          err.status === 401 || err.status === 403
            ? 'Admin JWT session expired or unauthorized. Please sign in at Admin Login.'
            : err.message || 'Unable to parse and validate the uploaded file.',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleOpenConfirm = () => {
    setErrorBanner(null);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmImport = async () => {
    if (!previewData?.importToken) {
      return;
    }
    setIsConfirmDialogOpen(false);
    setIsConfirming(true);
    setErrorBanner(null);

    try {
      const result = await onConfirm(previewData.importToken, strategy);
      setConfirmResult(result);
      setStep(4);
      if (result.ok) {
        await onImportSuccess();
      }
    } catch (err) {
      setErrorBanner({
        title: 'Import Failed',
        message: err.message || 'Transaction failed while importing records.',
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDownloadFailedReport = async (failedRows) => {
    if (!failedRows || failedRows.length === 0) {
      return;
    }
    setIsDownloadingReport(true);
    try {
      await bulkImportApi.downloadFailedReport(importType, failedRows);
    } catch (err) {
      setErrorBanner({
        title: 'Failed Report Error',
        message: err.message || 'Could not generate the failed records report.',
      });
    } finally {
      setIsDownloadingReport(false);
    }
  };

  const filteredPreviewRows = useMemo(() => {
    if (!previewData?.rows) {
      return [];
    }
    const q = searchQuery.trim().toLowerCase();
    return previewData.rows.filter((row) => {
      if (statusFilter === 'VALID' && row.status !== 'VALID') {
        return false;
      }
      if (statusFilter === 'DUPLICATE' && row.status !== 'DUPLICATE') {
        return false;
      }
      if (statusFilter === 'INVALID' && row.status !== 'INVALID') {
        return false;
      }
      if (statusFilter === 'FAILED' && row.status === 'VALID') {
        return false;
      }
      if (!q) {
        return true;
      }
      const inData = Object.values(row.data || {}).some((v) =>
        String(v || '').toLowerCase().includes(q)
      );
      const inErrors = (row.errors || []).some((e) =>
        String(e || '').toLowerCase().includes(q)
      );
      return inData || inErrors || String(row.rowNumber).includes(q);
    });
  }, [previewData, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPreviewRows.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = filteredPreviewRows.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const previewFailedRows = useMemo(
    () => (previewData?.rows || []).filter((r) => r.status !== 'VALID'),
    [previewData]
  );

  const canAttemptConfirm =
    previewData &&
    !isConfirming &&
    ((strategy === 'IMPORT_VALID_ONLY' && previewData.validRecords > 0) ||
      (strategy === 'FAIL_ON_ANY_ERROR' && previewData.totalRecords > 0));

  return (
    <SectionCard
      title={`${sectionLabel}. ${title}`}
      subtitle={description}
      icon={FileSpreadsheet}
    >
      <div className="bulk-section-body">
        <div className="bulk-toolbar">
          <StepTracker currentStep={step} />
          <div className="bulk-toolbar-actions">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleDownloadTemplateClick}
              disabled={!backendConnected || !isAdminSignedIn || isDownloadingTemplate}
            >
              {isDownloadingTemplate ? (
                <Loader2 size={15} className="spin" />
              ) : (
                <Download size={15} />
              )}
              <span>Download {importType === 'STUDENT' ? 'Student' : 'Faculty'} Template (.xlsx)</span>
            </button>
            {(selectedFile || previewData || confirmResult) && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={resetWorkflow}
                disabled={isValidating || isConfirming}
              >
                <RotateCcw size={15} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        <div className="bulk-meta-strip">
          <div>
            <strong>Required Columns:</strong>{' '}
            <span>{columns.join(' | ')}</span>
          </div>
          <div>
            <strong>Valid Departments:</strong>{' '}
            <span>{departments.map((d) => d.code).join(', ')} (Code or Full Name)</span>
          </div>
          {importType === 'FACULTY' && (
            <div className="bulk-capacity-note">
              <ShieldCheck size={14} />
              <span>
                Admin-Configured Guide Allocation Limit:{' '}
                <strong>
                  {maxTeamsPerGuide != null
                    ? `${maxTeamsPerGuide} Teams / Guide`
                    : 'Not configured yet (set in Team & Guide Capacity Settings)'}
                </strong>{' '}
                (Excel uploads cannot override allocation limits).
              </span>
            </div>
          )}
        </div>

        {errorBanner && (
          <AlertBanner
            variant="danger"
            title={errorBanner.title}
            message={errorBanner.message}
          />
        )}

        {/* Step 1 & Step 2: File Selection + Validate */}
        {step <= 2 && (
          <div className="upload-step-container">
            <label
              htmlFor={inputId}
              className={`upload-dropzone ${isDragging ? 'is-dragging' : ''} ${
                !isAdminSignedIn || !backendConnected ? 'is-disabled' : ''
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                if (isAdminSignedIn && backendConnected) {
                  setIsDragging(true);
                }
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (!isAdminSignedIn || !backendConnected) {
                  return;
                }
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  handleFileChosen(file);
                }
              }}
            >
              <input
                id={inputId}
                type="file"
                accept=".xlsx,.csv"
                className="upload-hidden-input"
                disabled={!isAdminSignedIn || !backendConnected || isValidating}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileChosen(file);
                  }
                  e.target.value = '';
                }}
              />
              <div className="upload-dropzone-icon">
                {isValidating ? (
                  <Loader2 size={24} className="spin" />
                ) : (
                  <Upload size={24} />
                )}
              </div>
              <div className="upload-dropzone-text">
                {selectedFile ? (
                  <>
                    <strong>{selectedFile.name}</strong>
                    <span>
                      Selected ({formatFileSize(selectedFile.size)}) &mdash; Click to choose a different file
                    </span>
                  </>
                ) : (
                  <>
                    <strong>Drag &amp; drop an Excel (.xlsx) or CSV (.csv) file here, or click to browse</strong>
                    <span>
                      {importType === 'STUDENT'
                        ? 'Leading zeros in Register Numbers (e.g., 0043611901) are preserved automatically.'
                        : 'Passwords must not be placed in Excel files. Faculty can set their own password on First-Time Activation using their Faculty ID or Email.'}
                    </span>
                  </>
                )}
              </div>
            </label>

            <div className="upload-step-footer">
              <span className="text-muted-sm">
                Step 1 &rarr; Step 2 validates the entire file without saving anything to MySQL yet.
              </span>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleValidateFile}
                disabled={
                  !selectedFile || !isAdminSignedIn || !backendConnected || isValidating
                }
              >
                {isValidating ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>Validating File...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Validate Uploaded Data (Step 2)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Validation Preview Table + Strategy + Confirm */}
        {step === 3 && previewData && (
          <div className="bulk-preview-panel">
            <div className="bulk-summary-grid">
              <div className="bulk-stat-box">
                <span className="bulk-stat-label">Total Rows</span>
                <strong className="bulk-stat-value">{previewData.totalRecords}</strong>
              </div>
              <div className="bulk-stat-box is-valid">
                <span className="bulk-stat-label">Valid Records</span>
                <strong className="bulk-stat-value">{previewData.validRecords}</strong>
              </div>
              <div className="bulk-stat-box is-duplicate">
                <span className="bulk-stat-label">Duplicates</span>
                <strong className="bulk-stat-value">{previewData.duplicateRecords}</strong>
              </div>
              <div className="bulk-stat-box is-invalid">
                <span className="bulk-stat-label">Invalid Records</span>
                <strong className="bulk-stat-value">{previewData.invalidRecords}</strong>
              </div>
            </div>

            {previewData.failedRecords > 0 && (
              <AlertBanner
                variant="warning"
                title="Validation Issues Found (No Records Imported Yet)"
                message={`${previewData.failedRecords} out of ${previewData.totalRecords} row(s) have validation or duplicate errors. Review the highlighted errors below or download the Failed Records Report before confirming.`}
              />
            )}

            <div className="strategy-box">
              <div className="strategy-box-title">Select Import Strategy (Step 4 Confirmation Policy)</div>
              <div className="strategy-options">
                <label className="strategy-option">
                  <input
                    type="radio"
                    name={`strategy-${importType}`}
                    value="IMPORT_VALID_ONLY"
                    checked={strategy === 'IMPORT_VALID_ONLY'}
                    onChange={(e) => setStrategy(e.target.value)}
                  />
                  <div>
                    <strong>Import Valid Records Only &amp; Report Failures</strong>
                    <span>
                      Atomically commits {previewData.validRecords} valid record(s) into MySQL and skips the{' '}
                      {previewData.failedRecords} failed row(s) with a downloadable error report.
                    </span>
                  </div>
                </label>

                <label className="strategy-option">
                  <input
                    type="radio"
                    name={`strategy-${importType}`}
                    value="FAIL_ON_ANY_ERROR"
                    checked={strategy === 'FAIL_ON_ANY_ERROR'}
                    onChange={(e) => setStrategy(e.target.value)}
                  />
                  <div>
                    <strong>Strict All-or-Nothing (Abort if Any Error Exists)</strong>
                    <span>
                      Requires 100% clean data. Aborts the entire transaction and commits 0 rows if even 1 error or duplicate is present.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="preview-controls-row">
              <div className="filter-pills">
                {[
                  { key: 'ALL', label: `All (${previewData.totalRecords})` },
                  { key: 'VALID', label: `Valid (${previewData.validRecords})` },
                  { key: 'FAILED', label: `All Failed (${previewData.failedRecords})` },
                  { key: 'DUPLICATE', label: `Duplicates (${previewData.duplicateRecords})` },
                  { key: 'INVALID', label: `Invalid (${previewData.invalidRecords})` },
                ].map((pill) => (
                  <button
                    key={pill.key}
                    type="button"
                    className={`filter-pill ${statusFilter === pill.key ? 'is-active' : ''}`}
                    onClick={() => {
                      setStatusFilter(pill.key);
                      setCurrentPage(1);
                    }}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              <input
                type="search"
                className="form-input preview-search-input"
                placeholder="Filter rows by name, ID, email, error..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="table-wrapper preview-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Row #</th>
                    <th>Status</th>
                    {columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                    <th>Validation Messages</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length + 3} className="preview-empty-cell">
                        No rows match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row) => {
                      const badge = getRowStatusBadge(row.status);
                      return (
                        <tr
                          key={row.rowNumber}
                          className={row.status !== 'VALID' ? 'preview-row-error' : ''}
                        >
                          <td className="mono-cell">{row.rowNumber}</td>
                          <td>
                            <StatusBadge text={badge.text} variant={badge.variant} />
                          </td>
                          {columns.map((col) => (
                            <td
                              key={col}
                              className={col === monoColumn ? 'mono-cell' : ''}
                            >
                              {row.data?.[col] || <span className="text-muted-sm">--</span>}
                            </td>
                          ))}
                          <td>
                            {row.errors && row.errors.length > 0 ? (
                              <ul className="preview-error-list">
                                {row.errors.map((errMsg, idx) => (
                                  <li key={idx}>{errMsg}</li>
                                ))}
                              </ul>
                            ) : (
                              <span className="preview-ok-text">Ready to import</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="preview-pagination">
                <span className="text-muted-sm">
                  Showing page {safePage} of {totalPages} ({filteredPreviewRows.length} matching rows)
                </span>
                <div className="table-actions">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            <div className="bulk-confirm-bar">
              <div className="table-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={resetWorkflow}
                  disabled={isConfirming}
                >
                  Choose Different File
                </button>
                {previewFailedRows.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleDownloadFailedReport(previewFailedRows)}
                    disabled={isDownloadingReport}
                  >
                    <Download size={15} />
                    <span>Download Validation Issues (.xlsx)</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenConfirm}
                disabled={!canAttemptConfirm}
              >
                {isConfirming ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>Importing to MySQL...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>
                      Confirm &amp; Import{' '}
                      {strategy === 'IMPORT_VALID_ONLY'
                        ? `${previewData.validRecords} Valid Record(s)`
                        : 'Entire Batch'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Final Import Result Summary */}
        {step === 4 && confirmResult && (
          <div className="bulk-result-panel">
            <AlertBanner
              variant={confirmResult.ok ? 'success' : 'danger'}
              title={
                confirmResult.ok
                  ? 'Bulk Import Completed'
                  : 'Import Aborted — Zero Records Committed'
              }
              message={confirmResult.message}
            />

            <div className="bulk-summary-grid">
              <div className="bulk-stat-box">
                <span className="bulk-stat-label">Total Rows</span>
                <strong className="bulk-stat-value">{confirmResult.totalRecords}</strong>
              </div>
              <div className="bulk-stat-box is-valid">
                <span className="bulk-stat-label">Successfully Imported</span>
                <strong className="bulk-stat-value">
                  {confirmResult.successfullyImported}
                </strong>
              </div>
              <div className="bulk-stat-box is-invalid">
                <span className="bulk-stat-label">Failed Total</span>
                <strong className="bulk-stat-value">{confirmResult.failedRecords}</strong>
              </div>
              <div className="bulk-stat-box is-duplicate">
                <span className="bulk-stat-label">Duplicate</span>
                <strong className="bulk-stat-value">{confirmResult.duplicateRecords}</strong>
              </div>
              <div className="bulk-stat-box is-invalid">
                <span className="bulk-stat-label">Invalid</span>
                <strong className="bulk-stat-value">{confirmResult.invalidRecords}</strong>
              </div>
            </div>

            <div className="bulk-confirm-bar">
              <div className="table-actions">
                {confirmResult.failedRows && confirmResult.failedRows.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleDownloadFailedReport(confirmResult.failedRows)}
                    disabled={isDownloadingReport}
                  >
                    {isDownloadingReport ? (
                      <Loader2 size={15} className="spin" />
                    ) : (
                      <Download size={15} />
                    )}
                    <span>Download Failed Records Report (.xlsx)</span>
                  </button>
                )}
              </div>

              <button type="button" className="btn btn-primary" onClick={resetWorkflow}>
                <Upload size={16} />
                <span>Upload Another {importType === 'STUDENT' ? 'Student' : 'Faculty'} File</span>
              </button>
            </div>

            {confirmResult.failedRows && confirmResult.failedRows.length > 0 && (
              <div className="bulk-subtable-wrap">
                <h3 className="bulk-subtable-title">
                  <AlertTriangle size={16} />
                  <span>Failed Records ({confirmResult.failedRows.length})</span>
                </h3>
                <div className="table-wrapper preview-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Row #</th>
                        <th>Status</th>
                        <th>Identifier</th>
                        <th>Name</th>
                        <th>Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {confirmResult.failedRows.slice(0, 50).map((row) => {
                        const badge = getRowStatusBadge(row.status);
                        return (
                          <tr key={row.rowNumber}>
                            <td className="mono-cell">{row.rowNumber}</td>
                            <td>
                              <StatusBadge text={badge.text} variant={badge.variant} />
                            </td>
                            <td className="mono-cell">
                              {row.data?.[monoColumn] || '--'}
                            </td>
                            <td>
                              {row.data?.[importType === 'STUDENT' ? 'Student Name' : 'Faculty Name'] ||
                                '--'}
                            </td>
                            <td>
                              <ul className="preview-error-list">
                                {(row.errors || []).map((errMsg, idx) => (
                                  <li key={idx}>{errMsg}</li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {confirmResult.importedInvitations &&
              confirmResult.importedInvitations.length > 0 && (
                <div className="bulk-subtable-wrap">
                  <h3 className="bulk-subtable-title">
                    <KeyRound size={16} />
                    <span>
                      Imported Accounts Ready for First-Time Login (
                      {confirmResult.importedInvitations.length})
                    </span>
                  </h3>
                  <p className="text-muted-sm" style={{ marginBottom: '10px' }}>
                    Imported users can open &ldquo;First-Time Activation&rdquo; on the Student or Guide Login page and set their own password directly using their {monoColumn} or Email (no token required).
                  </p>
                  <div className="table-wrapper preview-table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{monoColumn}</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Department</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {confirmResult.importedInvitations.slice(0, 50).map((inv) => (
                          <tr key={inv.identifier}>
                            <td className="mono-cell">{inv.identifier}</td>
                            <td>{inv.fullName}</td>
                            <td>{inv.email}</td>
                            <td>{inv.department}</td>
                            <td>
                              <StatusBadge text="Pending First Login" variant="info" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        title={`Confirm ${importType === 'STUDENT' ? 'Student' : 'Faculty'} Bulk Import`}
        confirmLabel="Proceed with Import"
        onConfirm={handleConfirmImport}
        onCancel={() => setIsConfirmDialogOpen(false)}
      >
        <div className="info-list">
          <div className="info-row">
            <span className="info-key">File</span>
            <span className="info-val">{previewData?.fileName}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Strategy</span>
            <span className="info-val">
              {strategy === 'IMPORT_VALID_ONLY'
                ? 'Import Valid Records Only'
                : 'Strict All-or-Nothing'}
            </span>
          </div>
          <div className="info-row">
            <span className="info-key">Valid Records</span>
            <span className="info-val">{previewData?.validRecords ?? 0}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Failed / Duplicate Rows</span>
            <span className="info-val">{previewData?.failedRecords ?? 0}</span>
          </div>
        </div>
        <p className="modal-note">
          {strategy === 'FAIL_ON_ANY_ERROR' && (previewData?.failedRecords ?? 0) > 0
            ? 'Warning: Because Strict All-or-Nothing is selected and failed rows exist, the server will abort this import with 0 rows written.'
            : 'Valid records will be inserted transactionally into MySQL with Pending Activation status and zero plain-text passwords.'}
        </p>
      </ConfirmDialog>
    </SectionCard>
  );
}

function BulkDataImport() {
  const {
    backendConnected,
    authSession,
    departments,
    maxTeamsPerGuide,
    students,
    facultyList,
    refreshPortalData,
  } = usePortalData();

  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const isAdminSignedIn = authSession?.role === 'ADMIN';

  const loadImportHistory = useCallback(async () => {
    if (!backendConnected || !isAdminSignedIn) {
      setHistoryLogs([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const logs = await bulkImportApi.getHistory();
      setHistoryLogs(Array.isArray(logs) ? logs : []);
    } catch {
      setHistoryLogs([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [backendConnected, isAdminSignedIn]);

  useEffect(() => {
    loadImportHistory();
  }, [loadImportHistory]);

  const handleImportSuccess = async () => {
    await refreshPortalData();
    await loadImportHistory();
  };

  return (
    <div>
      <div className="page-header-row">
        <PageHeader
          title="Bulk Data Import"
          subtitle="Validate, preview, and transactionally import Student and Faculty rosters from Excel (.xlsx) or CSV (.csv) into MySQL."
        />
        <div className="max-team-size-pill">
          Live MySQL Counts: {students.length} Students &middot; {facultyList.length} Faculty
        </div>
      </div>

      {!backendConnected && (
        <AlertBanner
          variant="danger"
          title="Spring Boot Backend Unavailable"
          message="Unable to reach the backend API server. Ensure Spring Boot and MySQL/TiDB are online to enable bulk Excel/CSV parsing, template downloads, and database imports."
        />
      )}

      {backendConnected && !isAdminSignedIn && (
        <AlertBanner
          variant="warning"
          title="Admin Authentication Required for Bulk Import"
          message={
            <span>
              Bulk import endpoints are restricted by RBAC to Admin JWT tokens.{' '}
              <Link to="/login/admin" style={{ fontWeight: 700, textDecoration: 'underline' }}>
                Sign in at Admin Login
              </Link>{' '}
              to upload files or download templates.
            </span>
          }
        />
      )}

      <div className="bulk-sections-stack">
        <BulkImportSection
          sectionLabel="A"
          title="Upload Student Details"
          description="Supports .xlsx and .csv with leading-zero Register Number preservation and per-row MySQL validation."
          importType="STUDENT"
          columns={STUDENT_COLUMNS}
          monoColumn="Register Number"
          isAdminSignedIn={isAdminSignedIn}
          backendConnected={backendConnected}
          departments={departments}
          maxTeamsPerGuide={maxTeamsPerGuide}
          onDownloadTemplate={bulkImportApi.downloadStudentTemplate}
          onPreview={bulkImportApi.previewStudents}
          onConfirm={bulkImportApi.confirmStudents}
          onImportSuccess={handleImportSuccess}
        />

        <BulkImportSection
          sectionLabel="B"
          title="Upload Faculty Details"
          description="Supports .xlsx and .csv with automatic guide allocation limit enforcement and first-login account provisioning."
          importType="FACULTY"
          columns={FACULTY_COLUMNS}
          monoColumn="Faculty ID"
          isAdminSignedIn={isAdminSignedIn}
          backendConnected={backendConnected}
          departments={departments}
          maxTeamsPerGuide={maxTeamsPerGuide}
          onDownloadTemplate={bulkImportApi.downloadFacultyTemplate}
          onPreview={bulkImportApi.previewFaculty}
          onConfirm={bulkImportApi.confirmFaculty}
          onImportSuccess={handleImportSuccess}
        />

        <SectionCard
          title="Recent Bulk Import Audit Logs"
          subtitle="Tracks committed Admin bulk uploads in MySQL"
          icon={History}
          flush
        >
          {historyLoading ? (
            <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader2 size={16} className="spin" />
              <span className="text-muted-sm">Loading import audit logs...</span>
            </div>
          ) : historyLogs.length === 0 ? (
            <div style={{ padding: '20px' }}>
              <p className="text-muted-sm">
                {isAdminSignedIn
                  ? 'No bulk imports have been committed yet.'
                  : 'Sign in as Admin to inspect bulk import audit logs.'}
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Category</th>
                    <th>File Name</th>
                    <th>Strategy</th>
                    <th>Total</th>
                    <th>Imported</th>
                    <th>Failed</th>
                    <th>Admin User</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="mono-cell">#{log.id}</td>
                      <td>
                        <StatusBadge
                          text={log.importType}
                          variant={log.importType === 'STUDENT' ? 'info' : 'success'}
                        />
                      </td>
                      <td>{log.fileName}</td>
                      <td>{log.strategy}</td>
                      <td>{log.totalRecords}</td>
                      <td>
                        <strong>{log.importedRecords}</strong>
                      </td>
                      <td>{log.failedRecords}</td>
                      <td className="mono-cell">{log.importedBy}</td>
                      <td className="text-muted-sm">
                        {log.createdAt ? String(log.createdAt).replace('T', ' ').slice(0, 19) : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

export default BulkDataImport;

