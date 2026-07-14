import RecordListView from '../components/RecordListView';

/** Services view — shares the mirrored list/editor logic with Projects. */
export default function ServicesView() {
  return <RecordListView kind="service" />;
}
