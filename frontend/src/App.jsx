import Dashboard from './components/Dashboard';
import BystanderView from './components/BystanderView';

export default function App() {
  const isBystander = new URLSearchParams(window.location.search).get('bystander') === '1';

  return isBystander ? <BystanderView /> : <Dashboard />;
}
