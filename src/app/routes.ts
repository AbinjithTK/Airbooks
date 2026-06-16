import { createBrowserRouter } from 'react-router';
import { AppLayout } from './components/app-layout';
import { LibraryPage } from './pages/library';
import { BookReader } from './components/book-reader';
import { SharePage } from './pages/share';
import { EmbedPage } from './pages/embed';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppLayout,
    children: [
      { index: true, Component: LibraryPage },
      { path: 'read/:id', Component: BookReader },
    ],
  },
  // Standalone public routes — no AppLayout, no auth required
  { path: 'share/:shareId', Component: SharePage },
  { path: 'embed/:shareId', Component: EmbedPage },
]);
