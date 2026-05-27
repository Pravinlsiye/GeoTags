/* @refresh reload */
import { render } from 'solid-js/web'
import { Router, Route } from '@solidjs/router'
import './index.css'
import App from './App.tsx'
import UploadPage from './pages/UploadPage.tsx'
import CameraPage from './pages/CameraPage.tsx'

const root = document.getElementById('root')

// BASE_URL = "/GeoTags/" in production, "/" in dev
// Router base must not have trailing slash
const base = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

render(
  () => (
    <Router root={App} base={base}>
      <Route path="/" component={UploadPage} />
      <Route path="/camera" component={CameraPage} />
    </Router>
  ),
  root!,
)
