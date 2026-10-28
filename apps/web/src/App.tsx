import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './components/layout/AdminLayout'
import { PublicLayout } from './components/layout/PublicLayout'
import { LoginPage } from './features/auth/LoginPage'
import { ArticleEditorPage } from './features/admin/ArticleEditorPage'
import { ArticlesPage } from './features/admin/ArticlesPage'
import { DashboardPage } from './features/admin/DashboardPage'
import { AuditPage, BreakingPage, CategoriesPage, LiveAdminPage, MediaPage, UsersPage } from './features/admin/DeskPages'
import { ArticlePage } from './features/articles/ArticlePage'
import { ListingPage } from './features/articles/ListingPage'
import { CategoryPage } from './features/categories/CategoryPage'
import { HomePage } from './features/home/HomePage'
import { LivePage } from './features/live/LivePage'
import { AboutPage } from './features/pages/AboutPage'
import { ContactPage } from './features/pages/ContactPage'
import { NotFoundPage } from './features/pages/NotFoundPage'
import { SearchPage } from './features/search/SearchPage'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/en" replace />} />
      <Route path="/:lang" element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="article/:slug" element={<ArticlePage />} />
        <Route path="local" element={<ListingPage kind="local" />} />
        <Route path="state" element={<ListingPage kind="state" />} />
        <Route path="national" element={<ListingPage kind="national" />} />
        <Route path="category/:slug" element={<CategoryPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="trending" element={<ListingPage kind="trending" />} />
        <Route path="top" element={<ListingPage kind="top" />} />
        <Route path="breaking" element={<ListingPage kind="breaking" />} />
        <Route path="live" element={<LivePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="articles" element={<ArticlesPage />} />
        <Route path="articles/new" element={<ArticleEditorPage />} />
        <Route path="articles/:id" element={<ArticleEditorPage />} />
        <Route path="review" element={<ArticlesPage preset="submitted" />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="breaking" element={<BreakingPage />} />
        <Route path="live" element={<LiveAdminPage />} />
        <Route path="media" element={<MediaPage />} />
        <Route path="audit" element={<AuditPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
