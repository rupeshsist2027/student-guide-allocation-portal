export const AUTH_SESSION_STORAGE_KEY = 'sgap_auth_session';

const RAW_API_BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? String(import.meta.env.VITE_API_BASE_URL).trim()
    : '';

export const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, '');

export function resolveApiUrl(url) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function getAuthSession() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthSession(session) {
  try {
    if (!session) {
      localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    } else {
      localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function clearAuthSession() {
  setAuthSession(null);
}

async function parseErrorMessage(response) {
  try {
    const data = await response.json();
    if (data?.message) {
      return data.message;
    }
  } catch {
    // Ignore JSON parse fallback
  }
  if (response.status === 502 || response.status === 503 || response.status === 504) {
    return 'Backend server is starting up or temporarily unavailable. If hosted on a free tier, wait 30-60 seconds for cold start and retry.';
  }
  return `Request failed with status ${response.status}`;
}

export async function apiFetch(url, options = {}) {
  const session = getAuthSession();
  const headers = new Headers(options.headers || {});

  if (session?.token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${session.token}`);
  }

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData && options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response;
  try {
    response = await fetch(resolveApiUrl(url), {
      ...options,
      headers,
    });
  } catch {
    const err = new Error(
      'Unable to reach the backend server. On Render Free tier, the backend may be waking up after inactivity (30-60s). Please wait a moment and try again.'
    );
    err.status = 0;
    throw err;
  }

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response;
}

export async function apiDownloadBlob(url, options = {}) {
  const response = await apiFetch(url, options);
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match ? match[1] : 'download.xlsx';

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export const authApi = {
  login: (identifier, password, expectedRole) =>
    apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, expectedRole }),
    }),
  firstLoginSetup: (identifier, newPassword, expectedRole) =>
    apiFetch('/api/auth/first-login-setup', {
      method: 'POST',
      body: JSON.stringify({ identifier, newPassword, expectedRole }),
    }),
  me: () => apiFetch('/api/auth/me'),
};

export const portalApi = {
  pingHealth: async () => {
    try {
      const response = await fetch(resolveApiUrl('/actuator/health'));
      if (!response.ok) {
        return false;
      }
      const data = await response.json();
      return Boolean(data && String(data.status).toUpperCase() === 'UP');
    } catch {
      return false;
    }
  },
  getBootstrap: () => apiFetch('/api/portal/bootstrap'),
  getAdminStatistics: () => apiFetch('/api/admin/statistics'),
  updateAdminStatistics: (totalStudents, totalFaculty) =>
    apiFetch('/api/admin/statistics', {
      method: 'PUT',
      body: JSON.stringify({ totalStudents, totalFaculty }),
    }),
  getTeamSettings: () => apiFetch('/api/admin/team-settings'),
  updateTeamSettings: (
    studentsPerTeam,
    maxTeamsPerFaculty,
    maxTeamsMode = 'manual',
    customMaxTeamsPerGuide = null
  ) =>
    apiFetch('/api/admin/team-settings', {
      method: 'PUT',
      body: JSON.stringify({
        studentsPerTeam,
        maxTeamsPerFaculty,
        maxTeamsMode,
        customMaxTeamsPerGuide,
      }),
    }),
  adminDeleteTeam: (teamId) =>
    apiFetch(`/api/admin/teams/${encodeURIComponent(teamId)}`, {
      method: 'DELETE',
    }),
  publishAnnouncement: (title, message) =>
    apiFetch('/api/admin/announcements', {
      method: 'POST',
      body: JSON.stringify({ title, message }),
    }),
  createTeam: (registerNumber) =>
    apiFetch('/api/student/teams', {
      method: 'POST',
      body: JSON.stringify({ registerNumber }),
    }),
  deleteTeam: (teamId, registerNumber) =>
    apiFetch(
      `/api/student/teams/${encodeURIComponent(teamId)}?registerNumber=${encodeURIComponent(registerNumber)}`,
      { method: 'DELETE' }
    ),
  addTeamMember: (teamId, actingRegisterNumber, targetRegisterNumber) =>
    apiFetch('/api/student/teams/members', {
      method: 'POST',
      body: JSON.stringify({ teamId, actingRegisterNumber, targetRegisterNumber }),
    }),
  removeTeamMember: (teamId, actingRegisterNumber, targetRegisterNumber) =>
    apiFetch('/api/student/teams/members', {
      method: 'DELETE',
      body: JSON.stringify({ teamId, actingRegisterNumber, targetRegisterNumber }),
    }),
  selectGuide: (teamId, actingRegisterNumber, facultyId) =>
    apiFetch('/api/student/select-guide', {
      method: 'POST',
      body: JSON.stringify({ teamId, actingRegisterNumber, facultyId }),
    }),
  updateProjectTitle: (teamId, actingRegisterNumber, projectTitle) =>
    apiFetch('/api/student/project-title', {
      method: 'PUT',
      body: JSON.stringify({ teamId, actingRegisterNumber, projectTitle }),
    }),
  submitProgressNote: (teamId, studentName, note) =>
    apiFetch('/api/student/progress-note', {
      method: 'POST',
      body: JSON.stringify({ teamId, studentName, note }),
    }),
  addTopic: (payload) =>
    apiFetch('/api/faculty/topics', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateTopic: (topicId, payload) =>
    apiFetch(`/api/faculty/topics/${encodeURIComponent(topicId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteTopic: (topicId, facultyId) =>
    apiFetch(
      `/api/faculty/topics/${encodeURIComponent(topicId)}?facultyId=${encodeURIComponent(facultyId)}`,
      { method: 'DELETE' }
    ),
  updateProgress: (payload) =>
    apiFetch('/api/faculty/progress', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};

export const bulkImportApi = {
  previewStudents: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch('/api/admin/students/import/preview', {
      method: 'POST',
      body: formData,
    });
  },
  confirmStudents: (importToken, strategy) =>
    apiFetch('/api/admin/students/import/confirm', {
      method: 'POST',
      body: JSON.stringify({ importToken, strategy }),
    }),
  previewFaculty: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch('/api/admin/faculty/import/preview', {
      method: 'POST',
      body: formData,
    });
  },
  confirmFaculty: (importToken, strategy) =>
    apiFetch('/api/admin/faculty/import/confirm', {
      method: 'POST',
      body: JSON.stringify({ importToken, strategy }),
    }),
  downloadStudentTemplate: () => apiDownloadBlob('/api/admin/students/import/template'),
  downloadFacultyTemplate: () => apiDownloadBlob('/api/admin/faculty/import/template'),
  downloadFailedReport: (importType, failedRows) =>
    apiDownloadBlob('/api/admin/import/failed-report', {
      method: 'POST',
      body: JSON.stringify({ importType, failedRows }),
    }),
  getHistory: () => apiFetch('/api/admin/import/history'),
  getDepartments: () => apiFetch('/api/admin/departments'),
};

