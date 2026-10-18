import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { LocaleProvider } from './context/LocaleContext';
import { DataProvider } from './context/DataContext';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import Collection from './pages/Collection';
import Product from './pages/Product';
import { About, Applications, Request, Contacts, Privacy, NotFound } from './pages/Pages';
import './styles.css';
const Admin = lazy(() => import('./pages/Admin'));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><HelmetProvider><BrowserRouter><LocaleProvider><DataProvider>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="applications" element={<Applications />} />
        <Route path="collection" element={<Collection />} />
        <Route path="collection/:slug" element={<Product />} />
        <Route path="request" element={<Request />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="admin/*" element={<Suspense fallback={<div className="data-status" role="status">Fragrances & Co…</div>}><Admin /></Suspense>} />
    </Routes>
  </DataProvider></LocaleProvider></BrowserRouter></HelmetProvider></React.StrictMode>,
);
