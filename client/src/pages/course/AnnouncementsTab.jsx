import { useOutletContext } from 'react-router';
import { useAuth } from '../../auth/AuthContext.jsx';
import AnnouncementsPanel from '../../components/AnnouncementsPanel.jsx';

// This course's announcements. Its instructor can post new ones here.
export default function AnnouncementsTab() {
  const { course } = useOutletContext();
  const { user } = useAuth();
  const url = `/api/courses/${course.id}/announcements`;
  return (
    <div className="tab-panel">
      <AnnouncementsPanel loadUrl={url} postUrl={course.instructor_id === user.id ? url : undefined} />
    </div>
  );
}
