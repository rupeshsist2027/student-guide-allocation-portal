import { useState } from 'react';
import { Lightbulb, PlusCircle, Pencil, Trash2, Eye, X } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import AlertBanner from '../../components/AlertBanner';
import ConfirmDialog from '../../components/ConfirmDialog';
import { usePortalData } from '../../context/PortalDataContext';

const EMPTY_FORM = {
  projectTitle: '',
  projectDomain: '',
  description: '',
  technologiesUsed: '',
};

function GuideTopics() {
  const {
    currentFaculty,
    facultyTopics,
    addTopic,
    editTopic,
    deleteTopic,
  } = usePortalData();

  const [formState, setFormState] = useState(EMPTY_FORM);
  const [editingTopicId, setEditingTopicId] = useState(null);
  const [viewingTopic, setViewingTopic] = useState(null);
  const [deletingTopic, setDeletingTopic] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = editingTopicId
      ? await editTopic(editingTopicId, formState)
      : await addTopic(formState);

    if (!result.ok) {
      setFeedback({
        variant: 'danger',
        title: 'Cannot Save Topic',
        message: result.error,
      });
      return;
    }

    setFeedback({
      variant: 'success',
      title: editingTopicId ? 'Topic Updated' : 'Topic Added',
      message: editingTopicId
        ? `Project topic ${editingTopicId} has been updated.`
        : `New project topic "${result.topic.projectTitle}" (${result.topic.topicId}) added.`,
    });
    setEditingTopicId(null);
    setFormState(EMPTY_FORM);
  };

  const handleStartEdit = (topic) => {
    setFeedback(null);
    setEditingTopicId(topic.topicId);
    setFormState({
      projectTitle: topic.projectTitle,
      projectDomain: topic.projectDomain,
      description: topic.description,
      technologiesUsed: topic.technologiesUsed,
    });
  };

  const handleCancelEdit = () => {
    setEditingTopicId(null);
    setFormState(EMPTY_FORM);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTopic) {
      return;
    }
    const target = deletingTopic;
    setDeletingTopic(null);
    const result = await deleteTopic(target.topicId);
    if (!result.ok) {
      setFeedback({
        variant: 'danger',
        title: 'Delete Failed',
        message: result.error,
      });
      return;
    }
    if (editingTopicId === target.topicId) {
      handleCancelEdit();
    }
    setFeedback({
      variant: 'info',
      title: 'Topic Deleted',
      message: `Project topic "${target.projectTitle}" (${target.topicId}) was removed.`,
    });
  };

  return (
    <div>
      <PageHeader
        title="Project Topics"
        subtitle={`Manage proposed project topics offered by ${currentFaculty.facultyName}.`}
      />

      {feedback && (
        <AlertBanner
          variant={feedback.variant}
          title={feedback.title}
          message={feedback.message}
        />
      )}

      <div style={{ marginBottom: '24px' }}>
        <SectionCard
          title={editingTopicId ? `Edit Topic (${editingTopicId})` : 'Add Project Topic'}
          icon={editingTopicId ? Pencil : PlusCircle}
        >
          <form className="topic-form-grid" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="topic-title" className="form-label">
                Project Title
              </label>
              <input
                id="topic-title"
                type="text"
                className="form-input"
                placeholder="e.g., Campus Microservice Telemetry Portal"
                value={formState.projectTitle}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, projectTitle: e.target.value }))
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="topic-domain" className="form-label">
                Project Domain
              </label>
              <input
                id="topic-domain"
                type="text"
                className="form-input"
                placeholder="e.g., Cloud Computing"
                value={formState.projectDomain}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, projectDomain: e.target.value }))
                }
              />
            </div>

            <div className="form-group topic-form-span-2">
              <label htmlFor="topic-tech" className="form-label">
                Technologies Used
              </label>
              <input
                id="topic-tech"
                type="text"
                className="form-input"
                placeholder="e.g., React.js, Java Spring Boot, MySQL"
                value={formState.technologiesUsed}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    technologiesUsed: e.target.value,
                  }))
                }
              />
            </div>

            <div className="form-group topic-form-span-2">
              <label htmlFor="topic-desc" className="form-label">
                Description
              </label>
              <textarea
                id="topic-desc"
                rows={3}
                className="form-input"
                placeholder="Describe project objectives and scope..."
                value={formState.description}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            <div className="config-actions topic-form-span-2">
              <button type="submit" className="btn btn-primary">
                {editingTopicId ? <Pencil size={16} /> : <PlusCircle size={16} />}
                <span>{editingTopicId ? 'Save Changes' : 'Add Project Topic'}</span>
              </button>
              {editingTopicId && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleCancelEdit}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </SectionCard>
      </div>

      <SectionCard
        title="Published Project Topics"
        subtitle={`${facultyTopics.length} Topic${facultyTopics.length === 1 ? '' : 's'}`}
        icon={Lightbulb}
        flush
      >
        {facultyTopics.length === 0 ? (
          <div style={{ padding: '22px' }}>
            <div className="empty-state-box">
              <p className="empty-state-title">No Project Topics Published</p>
              <p className="empty-state-desc">
                Use the form above to add project topics for your allocated teams.
              </p>
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Topic ID</th>
                  <th>Project Title</th>
                  <th>Project Domain</th>
                  <th>Technologies Used</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {facultyTopics.map((topic) => (
                  <tr key={topic.topicId}>
                    <td>{topic.topicId}</td>
                    <td>{topic.projectTitle}</td>
                    <td>{topic.projectDomain}</td>
                    <td>{topic.technologiesUsed}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => setViewingTopic(topic)}
                        >
                          <Eye size={14} />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => handleStartEdit(topic)}
                        >
                          <Pencil size={14} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm btn-danger-outline"
                          onClick={() => setDeletingTopic(topic)}
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {viewingTopic && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setViewingTopic(null)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {viewingTopic.projectTitle} ({viewingTopic.topicId})
              </h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setViewingTopic(null)}
                aria-label="Close topic modal"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="info-list">
                <div className="info-row">
                  <span className="info-key">Topic ID</span>
                  <span className="info-val">{viewingTopic.topicId}</span>
                </div>
                <div className="info-row">
                  <span className="info-key">Project Domain</span>
                  <span className="info-val">{viewingTopic.projectDomain}</span>
                </div>
                <div className="info-row">
                  <span className="info-key">Technologies Used</span>
                  <span className="info-val">{viewingTopic.technologiesUsed}</span>
                </div>
              </div>
              <div style={{ marginTop: '14px' }}>
                <p className="info-key" style={{ marginBottom: '4px' }}>
                  Description
                </p>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                  {viewingTopic.description}
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setViewingTopic(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deletingTopic)}
        title="Delete Project Topic"
        confirmLabel="Delete Topic"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingTopic(null)}
      >
        {deletingTopic && (
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Are you sure you want to delete{' '}
            <strong>
              {deletingTopic.projectTitle} ({deletingTopic.topicId})
            </strong>
            ?
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}

export default GuideTopics;
