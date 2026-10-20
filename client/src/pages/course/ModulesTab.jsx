import { Layers } from 'lucide-react';
import ComingSoon from '../../components/ComingSoon.jsx';

// Placeholder until modules (Week 1, Week 2... grouping assignments and files) are built.
export default function ModulesTab() {
  return (
    <div className="tab-panel">
      <ComingSoon icon={Layers} title="Modules">
        Your instructor will be able to organize the course into weeks or units here.
      </ComingSoon>
    </div>
  );
}
