import { Link, useNavigate } from 'react-router';
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowSortingFeature,
  sortFn_text,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { useMyWords } from '../../application/hooks/useMyWords';
import { errorMessage } from '../../domain/errors';
import type { Flashcard } from '../../domain/types';
import { AppShell } from '../components/AppShell';
import { Button } from '../components/Button';
import { ErrorView, LoadingView } from '../components/StateViews';
import { TextField } from '../components/TextField';

const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { text: sortFn_text },
});

const column = createColumnHelper<typeof features, Flashcard>();

const columns = column.columns([
  column.accessor('frenchText', { sortFn: 'text' }),
  column.accessor('englishTranslation', { enableSorting: false }),
]);

function WordTable({ words }: { words: Flashcard[] }) {
  const table = useTable({ features, columns, data: words, globalFilterFn: 'includesString' });

  const search = table.state.globalFilter ?? '';
  const frenchColumn = table.getColumn('frenchText')!;
  const direction = frenchColumn.getIsSorted();
  const nextLabel = direction === 'asc' ? 'Sort Z to A' : 'Sort A to Z';
  const rows = table.getRowModel().rows;

  return (
    <>
      <TextField label="Search words" type="search" value={search} onChange={table.setGlobalFilter} autoComplete="off" autoCapitalize="none" />
      <Button variant="secondary" onClick={() => frenchColumn.toggleSorting(direction === 'asc')}>{nextLabel}</Button>
      {rows.length === 0 ? <p className="muted">No words match "{search}".</p> : (
        <ul className="word-list">
          {rows.map((row) => (
            <li key={row.id}>
              <Link to={`/words/${row.original.flashcardId}`} className="word-row" aria-label={`Edit ${row.original.frenchText}`}>
                <span className="big">{row.original.frenchText}</span>
                <span className="muted">{row.original.englishTranslation}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function MyWordsScreen() {
  const words = useMyWords();
  const navigate = useNavigate();

  return (
    <AppShell title="My words" backTo="/">
      {words.isPending ? <LoadingView label="Loading your words…" /> : null}
      {words.isError ? <ErrorView message={errorMessage(words.error)} onRetry={() => void words.refetch()} /> : null}
      {words.isSuccess && words.data.length === 0 ? <p className="muted">You haven't added any words yet.</p> : null}
      {words.isSuccess && words.data.length > 0 ? <WordTable words={words.data} /> : null}
      <Button variant="secondary" onClick={() => navigate('/add')}>Add a word</Button>
    </AppShell>
  );
}
