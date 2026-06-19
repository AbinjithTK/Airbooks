import { createBrowserRouter } from 'react-router';
import { AppLayout } from './components/app-layout';
import { LibraryPage } from './pages/library';
import { BookReader } from './components/book-reader';
import { CreateBookPage } from './pages/create';
import { WriterPage } from './pages/write';
import { ChoicePage } from './pages/choice';
import { SharePage } from './pages/share';
import { EmbedPage } from './pages/embed';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppLayout,
    children: [
      { index: true, Component: LibraryPage },
      { path: 'read/:id', Component: BookReader },
      { path: 'new', Component: ChoicePage },
      { path: 'create', Component: CreateBookPage },
      { path: 'write/:id', Component: WriterPage },
    ],
  },
  { path: 'share/:shareId', Component: SharePage },
  { path: 'embed/:shareId', Component: EmbedPage },
]);
